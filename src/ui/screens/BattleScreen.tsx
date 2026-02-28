import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { calcEffectiveCooldown } from '../../types'
import type { BattleEvent, BattleResult, Enemy, HeroState, Item } from '../../types'
import { useGameState, type PendingBattle } from '../GameStateContext'

// ---------------------------------------------------------------------------
// Visual identity maps
// ---------------------------------------------------------------------------

const SLOT_ICONS: Record<string, string> = {
  weapon: '🗡️',
  offhand: '🛡️',
  armor: '🧥',
  boots: '👢',
  ring: '💍',
  amulet: '📿',
  relic: '🔮',
}

const TAG_ICONS: Record<string, string> = {
  poison: '☠️',
  frost: '❄️',
  bleed: '🩸',
  thorns: '🌿',
  barrier: '🛡️',
  crit: '💥',
  fire: '🔥',
  burn: '🔥',
  melee: '⚔️',
  ranged: '🏹',
  beast: '🐺',
  elemental: '✨',
  physical: '⚔️',
  control: '🌀',
}

const ENEMY_VISUALS: Record<string, { icon: string; bg: string }> = {
  standard_scavenger: { icon: '🗑️', bg: 'bg-stone-100' },
  standard_blight_rat: { icon: '🐀', bg: 'bg-green-100' },
  standard_ice_imp: { icon: '🧊', bg: 'bg-sky-100' },
  standard_bone_archer: { icon: '💀', bg: 'bg-amber-100' },
  elite_iron_reaver: { icon: '⚙️', bg: 'bg-red-100' },
  elite_venom_matron: { icon: '🕷️', bg: 'bg-purple-100' },
  elite_frost_keeper: { icon: '🏔️', bg: 'bg-blue-100' },
  elite_war_hydra: { icon: '🐉', bg: 'bg-orange-100' },
}

const EFFECT_ICONS: Record<string, string> = {
  poison: '☠️',
  frost: '❄️',
  bleed: '🩸',
  barrier: '🛡️',
  thorns: '🌿',
  opener: '⚡',
}

const RARITY_BORDER: Record<string, string> = {
  Common: 'border-slate-300',
  Magic: 'border-blue-400',
  Rare: 'border-yellow-400',
  Epic: 'border-purple-400',
  Legendary: 'border-orange-400',
}

function getEnemyVisual(enemyId: string): { icon: string; bg: string } {
  const baseId = enemyId.replace(/_\d+$/, '')
  return ENEMY_VISUALS[baseId] ?? { icon: '👾', bg: 'bg-slate-100' }
}

function getTagIcon(tags: string[]): string {
  for (const tag of tags) {
    if (TAG_ICONS[tag]) return TAG_ICONS[tag]
  }
  return '⚔️'
}

// ---------------------------------------------------------------------------
// Playback engine hook
// ---------------------------------------------------------------------------

type PlaybackSpeed = 1 | 1.5 | 2

interface CombatantLiveState {
  id: string
  name: string
  hp: number
  maxHp: number
  alive: boolean
  barrier: number
  statuses: Array<{ type: string; expiresAt: number }>
  lastHitAt: number
  lastActionAt: number
}

interface PlaybackState {
  time: number
  hero: CombatantLiveState
  enemies: CombatantLiveState[]
  processedCount: number
  recentEvents: BattleEvent[]
  finished: boolean
  lastHeroAttackAt: number
}

function buildInitialPlaybackState(hero: HeroState, enemies: Enemy[]): PlaybackState {
  return {
    time: 0,
    hero: {
      id: 'hero',
      name: hero.name,
      hp: hero.hp,
      maxHp: hero.maxHp,
      alive: true,
      barrier: hero.archetypeId === 'thorns_warden' ? 16 : 0,
      statuses: [],
      lastHitAt: -10,
      lastActionAt: -10,
    },
    enemies: enemies.map((e, i) => ({
      id: `${e.id}_${i}`,
      name: e.name,
      hp: e.hp,
      maxHp: e.hp,
      alive: true,
      barrier: 0,
      statuses: [],
      lastHitAt: -10,
      lastActionAt: -10,
    })),
    processedCount: 0,
    recentEvents: [],
    finished: false,
    lastHeroAttackAt: -10,
  }
}

function advancePlayback(
  current: PlaybackState,
  events: BattleEvent[],
  newTime: number,
): PlaybackState {
  let next = { ...current, time: newTime }
  const newRecent: BattleEvent[] = [...current.recentEvents]

  let idx = current.processedCount
  while (idx < events.length && events[idx].timestamp <= newTime) {
    const ev = events[idx]
    newRecent.push(ev)
    next = applyEventToState(next, ev)
    idx++
  }

  // Keep only the latest 20 events in the feed
  if (newRecent.length > 20) {
    newRecent.splice(0, newRecent.length - 20)
  }

  const finished = idx >= events.length || next.hero.hp <= 0 || next.enemies.every((e) => !e.alive)

  return { ...next, processedCount: idx, recentEvents: newRecent, finished }
}

function applyEventToState(state: PlaybackState, ev: BattleEvent): PlaybackState {
  const hero = { ...state.hero }
  const enemies = state.enemies.map((e) => ({ ...e }))

  const findCombatant = (id: string) => {
    if (id === 'hero') return hero
    return enemies.find((e) => e.id === id)
  }

  const target = findCombatant(ev.target)
  const source = findCombatant(ev.source)

  switch (ev.type) {
    case 'attack': {
      if (target) {
        target.hp = Math.max(0, target.hp - ev.value)
        target.lastHitAt = ev.timestamp
      }
      if (source) {
        source.lastActionAt = ev.timestamp
      }
      if (ev.source === 'hero') {
        return { ...state, hero, enemies, lastHeroAttackAt: ev.timestamp }
      }
      break
    }
    case 'crit': {
      // Crit is informational - actual damage is applied via the attack event
      break
    }
    case 'barrier_absorb': {
      if (target) {
        target.barrier = Math.max(0, target.barrier - ev.value)
        target.lastHitAt = ev.timestamp
      }
      break
    }
    case 'thorns_reflect': {
      if (target) {
        target.hp = Math.max(0, target.hp - ev.value)
        target.lastHitAt = ev.timestamp
      }
      break
    }
    case 'status_apply': {
      if (target) {
        const statusType = ev.tags.find((t) => ['poison', 'frost', 'bleed', 'opener'].includes(t))
        if (statusType) {
          target.statuses = [...target.statuses, { type: statusType, expiresAt: ev.timestamp + 6 }]
        }
      }
      break
    }
    case 'status_tick': {
      if (target) {
        target.hp = Math.max(0, target.hp - ev.value)
        target.lastHitAt = ev.timestamp
      }
      break
    }
    case 'status_expire': {
      if (target) {
        const statusType = ev.tags[0]
        const idx = target.statuses.findIndex((s) => s.type === statusType)
        if (idx >= 0) {
          target.statuses = target.statuses.filter((_, i) => i !== idx)
        }
      }
      break
    }
    case 'kill': {
      if (target) {
        target.alive = false
        target.hp = 0
      }
      break
    }
    case 'hero_death': {
      hero.alive = false
      hero.hp = 0
      break
    }
    default:
      break
  }

  return { ...state, hero, enemies }
}

function useBattlePlayback(battle: BattleResult, hero: HeroState, enemies: Enemy[]) {
  const [speed, setSpeed] = useState<PlaybackSpeed>(1)
  const [playbackState, setPlaybackState] = useState<PlaybackState>(() =>
    buildInitialPlaybackState(hero, enemies),
  )
  const [paused, setPaused] = useState(false)
  const rafRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)
  const playbackTimeRef = useRef<number>(0)
  const battleDurationSec = battle.durationMs / 1000

  const tick = useCallback(
    (frameTime: number) => {
      if (lastFrameRef.current === 0) {
        lastFrameRef.current = frameTime
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const delta = (frameTime - lastFrameRef.current) / 1000
      lastFrameRef.current = frameTime

      playbackTimeRef.current = Math.min(
        playbackTimeRef.current + delta * speed,
        battleDurationSec + 0.5,
      )

      setPlaybackState((prev) => {
        if (prev.finished) return prev
        return advancePlayback(prev, battle.events, playbackTimeRef.current)
      })

      rafRef.current = requestAnimationFrame(tick)
    },
    [battle.events, battleDurationSec, speed],
  )

  useEffect(() => {
    if (paused || playbackState.finished) {
      cancelAnimationFrame(rafRef.current)
      return
    }

    lastFrameRef.current = 0
    rafRef.current = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafRef.current)
  }, [paused, playbackState.finished, tick])

  const skipToEnd = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    playbackTimeRef.current = battleDurationSec + 0.5
    setPlaybackState(
      advancePlayback(
        buildInitialPlaybackState(hero, enemies),
        battle.events,
        battleDurationSec + 0.5,
      ),
    )
  }, [battle.events, battleDurationSec, hero, enemies])

  return { playbackState, speed, setSpeed, paused, setPaused, skipToEnd }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SpeedControls = ({
  speed,
  onSetSpeed,
  paused,
  onTogglePause,
  onSkip,
  finished,
}: {
  speed: PlaybackSpeed
  onSetSpeed: (s: PlaybackSpeed) => void
  paused: boolean
  onTogglePause: () => void
  onSkip: () => void
  finished: boolean
}) => (
  <div className="flex items-center gap-2">
    {!finished && (
      <button
        type="button"
        className="rounded bg-slate-700 px-2 py-1 text-xs font-medium text-white"
        onClick={onTogglePause}
      >
        {paused ? '▶' : '⏸'}
      </button>
    )}
    {([1, 1.5, 2] as const).map((s) => (
      <button
        key={s}
        type="button"
        className={`rounded px-2 py-1 text-xs font-medium ${speed === s ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-700'}`}
        onClick={() => onSetSpeed(s)}
      >
        {s}x
      </button>
    ))}
    {!finished && (
      <button
        type="button"
        className="rounded bg-slate-500 px-2 py-1 text-xs text-white"
        onClick={onSkip}
      >
        Skip
      </button>
    )}
  </div>
)

const HpBar = ({
  current,
  max,
  color,
  barrier,
}: {
  current: number
  max: number
  color: string
  barrier?: number
}) => {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const barrierPct = barrier ? Math.max(0, Math.min(100 - pct, (barrier / max) * 100)) : 0

  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${pct}%` }}
      />
      {barrierPct > 0 && (
        <div
          className="absolute inset-y-0 rounded-full bg-cyan-400 opacity-60"
          style={{ left: `${pct}%`, width: `${barrierPct}%` }}
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-800">
        {Math.round(current)}/{max}
        {barrier && barrier > 0 ? ` +${Math.round(barrier)}` : ''}
      </div>
    </div>
  )
}

const StatusBadges = ({ statuses }: { statuses: Array<{ type: string; expiresAt: number }> }) => {
  if (statuses.length === 0) return null
  return (
    <div className="flex gap-1">
      {statuses.map((s, i) => (
        <span
          key={`${s.type}_${i}`}
          className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white"
        >
          {EFFECT_ICONS[s.type] ?? '?'} {s.type}
        </span>
      ))}
    </div>
  )
}

const HeroPanel = ({
  hero,
  playbackTime,
}: {
  hero: CombatantLiveState
  playbackTime: number
}) => {
  const recentlyHit = playbackTime - hero.lastHitAt < 0.4
  const archetypeLabel = hero.name.split(' ').pop() ?? hero.name

  return (
    <div
      className={`flex-1 rounded-lg border-2 p-3 transition-colors duration-200 ${
        !hero.alive
          ? 'border-rose-400 bg-rose-50'
          : recentlyHit
            ? 'border-red-400 bg-red-50'
            : 'border-emerald-300 bg-emerald-50'
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xl">🧑‍🦱</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{hero.name}</p>
          <p className="text-[10px] text-slate-500">{archetypeLabel}</p>
        </div>
      </div>
      <HpBar current={hero.hp} max={hero.maxHp} color="bg-emerald-500" barrier={hero.barrier} />
      <div className="mt-1">
        <StatusBadges statuses={hero.statuses} />
      </div>
    </div>
  )
}

const EnemyCard = ({
  enemy,
  playbackTime,
}: {
  enemy: CombatantLiveState
  playbackTime: number
}) => {
  const visual = getEnemyVisual(enemy.id)
  const recentlyHit = playbackTime - enemy.lastHitAt < 0.4
  const recentlyAttacked = playbackTime - enemy.lastActionAt < 0.5

  return (
    <div
      className={`rounded-lg border-2 p-2 transition-colors duration-200 ${
        !enemy.alive
          ? 'border-slate-300 bg-slate-100 opacity-50'
          : recentlyAttacked
            ? 'border-amber-400 bg-amber-50'
            : recentlyHit
              ? 'border-red-400 bg-red-50'
              : `border-slate-300 ${visual.bg}`
      }`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-lg">{visual.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{enemy.name}</p>
          {!enemy.alive && <p className="text-[10px] font-medium text-rose-600">Defeated</p>}
        </div>
      </div>
      {enemy.alive && (
        <>
          <HpBar current={enemy.hp} max={enemy.maxHp} color="bg-rose-500" />
          <div className="mt-1">
            <StatusBadges statuses={enemy.statuses} />
          </div>
        </>
      )}
    </div>
  )
}

const ItemActionBar = ({
  items,
  heroCooldown,
  lastAttackAt,
  playbackTime,
}: {
  items: Partial<Record<string, Item>>
  heroCooldown: number
  lastAttackAt: number
  playbackTime: number
}) => {
  const slots = Object.entries(items).filter(([, item]) => item != null) as [string, Item][]

  return (
    <div className="flex gap-1.5 overflow-x-auto py-1">
      {slots.map(([slot, item]) => {
        const isWeapon = slot === 'weapon'
        const elapsed = playbackTime - lastAttackAt
        const cooldownPct = isWeapon ? Math.min(1, elapsed / heroCooldown) : 1
        const justFired = isWeapon && elapsed < 0.3 && lastAttackAt >= 0

        return (
          <div
            key={slot}
            className={`relative flex min-w-[56px] flex-col items-center overflow-hidden rounded-lg border-2 p-1.5 text-center transition-all duration-150 ${
              justFired
                ? 'border-yellow-400 bg-yellow-50 scale-105'
                : `${RARITY_BORDER[item.rarity] ?? 'border-slate-300'} bg-white`
            }`}
          >
            {isWeapon && (
              <div
                className={`pointer-events-none absolute inset-x-0 bottom-0 z-0 transition-all duration-100 ${cooldownPct >= 1 ? 'bg-emerald-200' : 'bg-sky-200'}`}
                style={{ height: `${cooldownPct * 100}%` }}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10 text-base">{SLOT_ICONS[slot] ?? '?'}</span>
            <p className="relative z-10 mt-0.5 max-w-[52px] truncate text-[9px] font-medium leading-tight">
              {item.name}
            </p>
            {getTagIcon(item.tags) && (
              <span className="absolute -right-1 -top-1 z-10 text-[10px]">
                {getTagIcon(item.tags)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function formatEventText(ev: BattleEvent, enemies: Enemy[]): { text: string; color: string } {
  const sourceName =
    ev.source === 'hero'
      ? 'Hero'
      : ev.source === 'system'
        ? ''
        : (enemies.find((e) => ev.source.startsWith(e.id))?.name ?? ev.source)
  const targetName =
    ev.target === 'hero'
      ? 'Hero'
      : ev.target === 'system'
        ? ''
        : (enemies.find((e) => ev.target.startsWith(e.id))?.name ?? ev.target)

  switch (ev.type) {
    case 'battle_start':
      return { text: 'Battle begins!', color: 'text-sky-700' }
    case 'attack': {
      const val = Math.round(ev.value)
      if (ev.source === 'hero')
        return { text: `${sourceName} strikes ${targetName} for ${val}`, color: 'text-emerald-700' }
      return { text: `${sourceName} attacks ${targetName} for ${val}`, color: 'text-rose-700' }
    }
    case 'crit':
      return {
        text: `Critical hit! ${sourceName} crits ${targetName}`,
        color: 'text-amber-600',
      }
    case 'barrier_absorb':
      return {
        text: `${targetName}'s barrier absorbs ${Math.round(ev.value)}`,
        color: 'text-cyan-600',
      }
    case 'thorns_reflect':
      return {
        text: `Thorns reflect ${Math.round(ev.value)} to ${targetName}`,
        color: 'text-lime-700',
      }
    case 'status_apply': {
      const statusType = ev.tags[0] ?? 'effect'
      const icon = EFFECT_ICONS[statusType] ?? '✦'
      return {
        text: `${icon} ${sourceName} applies ${statusType} to ${targetName}`,
        color: 'text-violet-600',
      }
    }
    case 'status_tick': {
      const statusType = ev.tags[0] ?? 'dot'
      return {
        text: `${EFFECT_ICONS[statusType] ?? '•'} ${statusType} ticks ${targetName} for ${Math.round(ev.value)}`,
        color: 'text-violet-500',
      }
    }
    case 'status_expire': {
      const statusType = ev.tags[0] ?? 'effect'
      return { text: `${statusType} fades from ${targetName}`, color: 'text-slate-500' }
    }
    case 'kill':
      return { text: `${targetName} defeated!`, color: 'text-orange-600 font-bold' }
    case 'hero_death':
      return { text: `${targetName} has fallen!`, color: 'text-rose-700 font-bold' }
    case 'battle_end':
      return {
        text: ev.value === 1 ? 'Victory!' : 'Defeat...',
        color: ev.value === 1 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold',
      }
    default:
      return { text: `${ev.type}`, color: 'text-slate-500' }
  }
}

const EventFeed = ({
  events,
  enemies,
}: {
  events: BattleEvent[]
  enemies: Enemy[]
}) => {
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [events.length])

  return (
    <div
      ref={feedRef}
      className="max-h-32 space-y-0.5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2"
    >
      {events.length === 0 && (
        <p className="text-center text-xs text-slate-400">Waiting for battle to begin...</p>
      )}
      {events.map((ev, idx) => {
        const { text, color } = formatEventText(ev, enemies)
        return (
          <div key={idx} className={`text-xs ${color}`}>
            <span className="mr-1 text-slate-400">[{ev.timestamp.toFixed(1)}s]</span>
            {text}
          </div>
        )
      })}
    </div>
  )
}

const ResultOverlay = ({
  battle,
  pending,
}: {
  battle: BattleResult
  pending: PendingBattle
}) => {
  const navigate = useNavigate()
  const { clearPendingBattle } = useGameState()
  const isVictory = battle.winner === 'hero'
  const killCount = battle.events.filter((e) => e.type === 'kill').length
  const critCount = battle.events.filter((e) => e.type === 'crit' && e.source === 'hero').length

  const rarityColor: Record<string, string> = {
    Common: 'text-slate-600',
    Magic: 'text-blue-600',
    Rare: 'text-yellow-600',
    Epic: 'text-purple-600',
    Legendary: 'text-orange-500',
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border-2 border-slate-300 bg-white p-4">
      <div
        className={`rounded-lg border-2 p-3 text-center ${isVictory ? 'border-emerald-400 bg-emerald-50' : 'border-rose-400 bg-rose-50'}`}
      >
        <p className={`text-lg font-bold ${isVictory ? 'text-emerald-800' : 'text-rose-800'}`}>
          {isVictory ? 'Victory' : 'Defeat'}
        </p>
        <p className="text-sm text-slate-600">{pending.encounterName}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded border border-slate-200 p-2">
          <p className="text-xs text-slate-500">HP Remaining</p>
          <p className="font-medium">{Math.round(battle.hpRemaining)}</p>
        </div>
        <div className="rounded border border-slate-200 p-2">
          <p className="text-xs text-slate-500">Damage Dealt</p>
          <p className="font-medium">{Math.round(battle.damageDealt)}</p>
        </div>
        <div className="rounded border border-slate-200 p-2">
          <p className="text-xs text-slate-500">Damage Taken</p>
          <p className="font-medium">{Math.round(battle.damageTaken)}</p>
        </div>
        <div className="rounded border border-slate-200 p-2">
          <p className="text-xs text-slate-500">Duration</p>
          <p className="font-medium">{(battle.durationMs / 1000).toFixed(1)}s</p>
        </div>
      </div>

      <div className="flex gap-3 text-xs text-slate-600">
        <span>Defeated: {killCount}</span>
        <span>Crits: {critCount}</span>
        {pending.xpGained > 0 && (
          <span className="text-indigo-600">+{pending.xpGained} XP</span>
        )}
      </div>

      {pending.loot.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Loot</p>
          {pending.loot.map((item) => (
            <div
              key={item.instanceId}
              className={`rounded border border-slate-200 p-2 text-sm ${rarityColor[String(item.rarity)] ?? ''}`}
            >
              <span className="font-medium">{item.name}</span>
              <span className="ml-2 text-xs text-slate-500">{item.slot}</span>
              {item.affixes.length > 0 && (
                <span className="ml-2 text-xs text-slate-400">
                  ({item.affixes.map((a) => `+${a.value} ${a.stat}`).join(', ')})
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {isVictory && pending.loot.length === 0 && (
        <p className="text-sm text-slate-500">No loot dropped this time.</p>
      )}

      <button
        type="button"
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
        onClick={() => {
          clearPendingBattle()
          navigate('/map')
        }}
      >
        Continue
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Floating damage numbers
// ---------------------------------------------------------------------------

interface FloatingNumber {
  id: number
  value: number
  isCrit: boolean
  target: string
  source: string
  type: string
  timestamp: number
}

function useFloatingNumbers(events: BattleEvent[]) {
  const [numbers, setNumbers] = useState<FloatingNumber[]>([])
  const lastCountRef = useRef(0)
  const nextIdRef = useRef(0)

  useEffect(() => {
    if (events.length <= lastCountRef.current) return

    const newEvents = events.slice(lastCountRef.current)
    lastCountRef.current = events.length

    const newNumbers: FloatingNumber[] = []
    for (const ev of newEvents) {
      if (
        ev.value > 0 &&
        (ev.type === 'attack' ||
          ev.type === 'crit' ||
          ev.type === 'thorns_reflect' ||
          ev.type === 'status_tick' ||
          ev.type === 'barrier_absorb')
      ) {
        newNumbers.push({
          id: nextIdRef.current++,
          value: Math.round(ev.value),
          isCrit: ev.type === 'crit',
          target: ev.target,
          source: ev.source,
          type: ev.type,
          timestamp: ev.timestamp,
        })
      }
    }

    if (newNumbers.length > 0) {
      setNumbers((prev) => [...prev, ...newNumbers])
    }
  }, [events])

  // Clean up old floating numbers
  useEffect(() => {
    if (numbers.length === 0) return
    const timer = setTimeout(() => {
      setNumbers((prev) => prev.slice(Math.max(0, prev.length - 8)))
    }, 1200)
    return () => clearTimeout(timer)
  }, [numbers.length])

  return numbers
}

const FloatingDamage = ({ numbers, targetId }: { numbers: FloatingNumber[]; targetId: string }) => {
  const relevant = numbers.filter((n) => n.target === targetId).slice(-3)

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {relevant.map((n, idx) => {
        const isBarrier = n.type === 'barrier_absorb'
        const isThorns = n.type === 'thorns_reflect'
        const isDot = n.type === 'status_tick'
        const color = isBarrier
          ? 'text-cyan-500'
          : isThorns
            ? 'text-lime-600'
            : isDot
              ? 'text-violet-500'
              : n.source === 'hero'
                ? 'text-emerald-600'
                : 'text-rose-600'

        return (
          <span
            key={n.id}
            className={`absolute text-sm font-bold ${color} animate-bounce`}
            style={{
              right: `${10 + idx * 16}%`,
              top: `${10 + idx * 20}%`,
            }}
          >
            {n.isCrit ? '💥' : ''}-{n.value}
          </span>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main BattleScreen
// ---------------------------------------------------------------------------

export const BattleScreen = () => {
  const { pendingBattle, playerMode, clearPendingBattle } = useGameState()
  const navigate = useNavigate()

  if (!pendingBattle) {
    return (
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">No Active Battle</h1>
        <p className="text-sm text-slate-600">Start a battle from the encounter screen.</p>
        <Link to="/encounter" className="inline-block rounded bg-slate-900 px-3 py-2 text-sm text-white">
          Go to Encounter
        </Link>
      </section>
    )
  }

  return (
    <BattleScreenInner
      pending={pendingBattle}
      isDevMode={playerMode === 'dev'}
    />
  )
}

const BattleScreenInner = ({
  pending,
  isDevMode,
}: {
  pending: PendingBattle
  isDevMode: boolean
}) => {
  const { battle, enemies, heroSnapshot } = pending
  const heroCooldown = useMemo(
    () => calcEffectiveCooldown(2, heroSnapshot.haste),
    [heroSnapshot.haste],
  )

  const { playbackState, speed, setSpeed, paused, setPaused, skipToEnd } = useBattlePlayback(
    battle,
    heroSnapshot,
    enemies,
  )

  const floatingNumbers = useFloatingNumbers(playbackState.recentEvents)

  const tierLabel = pending.encounterType === 'elite' ? 'Elite' : 'Standard'
  const progressPct = Math.min(
    100,
    (playbackState.time / (battle.durationMs / 1000 + 0.01)) * 100,
  )

  return (
    <section className="space-y-3">
      {/* Header: title + speed controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">{pending.encounterName}</h1>
          <p className="text-[10px] text-slate-500">
            {tierLabel} Encounter
            {isDevMode && (
              <span className="ml-2 rounded bg-indigo-100 px-1 py-0.5 text-indigo-700">DEV</span>
            )}
          </p>
        </div>
        <SpeedControls
          speed={speed}
          onSetSpeed={setSpeed}
          paused={paused}
          onTogglePause={() => setPaused((p) => !p)}
          onSkip={skipToEnd}
          finished={playbackState.finished}
        />
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-sky-500 transition-all duration-200"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Battle arena: hero vs enemies */}
      <div className="flex gap-3">
        {/* Hero side */}
        <div className="relative flex-1">
          <HeroPanel hero={playbackState.hero} playbackTime={playbackState.time} />
          <FloatingDamage numbers={floatingNumbers} targetId="hero" />
        </div>

        {/* VS divider */}
        <div className="flex items-center">
          <span className="text-lg font-bold text-slate-300">VS</span>
        </div>

        {/* Enemy side */}
        <div className="flex flex-1 flex-col gap-2">
          {playbackState.enemies.map((enemy) => (
            <div key={enemy.id} className="relative">
              <EnemyCard enemy={enemy} playbackTime={playbackState.time} />
              <FloatingDamage numbers={floatingNumbers} targetId={enemy.id} />
            </div>
          ))}
        </div>
      </div>

      {/* Item/action bar */}
      <div>
        <p className="mb-1 text-[10px] font-medium text-slate-500">EQUIPPED BUILD</p>
        <ItemActionBar
          items={heroSnapshot.equippedItems}
          heroCooldown={heroCooldown}
          lastAttackAt={playbackState.lastHeroAttackAt}
          playbackTime={playbackState.time}
        />
      </div>

      {/* Event feed */}
      <div>
        <p className="mb-1 text-[10px] font-medium text-slate-500">BATTLE LOG</p>
        <EventFeed events={playbackState.recentEvents} enemies={enemies} />
      </div>

      {/* Result overlay when battle ends */}
      {playbackState.finished && <ResultOverlay battle={battle} pending={pending} />}
    </section>
  )
}
