import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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
  Common: 'border-slate-400',
  Magic: 'border-blue-500',
  Rare: 'border-yellow-500',
  Epic: 'border-purple-500',
  Legendary: 'border-orange-500',
}

const RARITY_GLOW: Record<string, string> = {
  Common: 'shadow-slate-300/40',
  Magic: 'shadow-blue-400/50',
  Rare: 'shadow-yellow-400/60',
  Epic: 'shadow-purple-400/60',
  Legendary: 'shadow-orange-400/70',
}

const RARITY_READY_RING: Record<string, string> = {
  Common: 'ring-slate-300',
  Magic: 'ring-blue-400',
  Rare: 'ring-yellow-400',
  Epic: 'ring-purple-400',
  Legendary: 'ring-orange-400',
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

function getStatLabels(item: Item): string[] {
  const labels: string[] = []
  const s = item.finalStats
  if (s.atk) labels.push(`+${s.atk} ATK`)
  if (s.def) labels.push(`+${s.def} DEF`)
  if (s.maxHp) labels.push(`+${s.maxHp} HP`)
  if (s.critChance) labels.push(`+${Math.round(s.critChance * 100)}% CRT`)
  if (s.critMultiplier && s.critMultiplier > 0) labels.push(`x${s.critMultiplier.toFixed(1)}`)
  if (s.haste) labels.push(`+${s.haste} SPD`)
  if (s.cooldown && s.cooldown < 0) labels.push(`${s.cooldown}s CD`)
  return labels.slice(0, 2)
}

// ---------------------------------------------------------------------------
// Per-item cooldown system – each item independently charges and fires
// ---------------------------------------------------------------------------

const SLOT_BASE_COOLDOWNS: Record<string, number> = {
  weapon: 4.0,
  offhand: 5.0,
  armor: 6.0,
  boots: 3.5,
  ring: 5.0,
  amulet: 5.5,
  relic: 7.0,
}

function getItemCooldown(slot: string, item: Item): number {
  const base = SLOT_BASE_COOLDOWNS[slot] ?? 5.0
  // Item cooldown stat (typically negative) makes it faster
  const cdMod = item.finalStats.cooldown ?? 0
  // Haste on the item also reduces cooldown
  const hasteMod = item.finalStats.haste ?? 0
  const adjusted = base + cdMod
  return Math.max(2.0, hasteMod > 0 ? adjusted / (1 + hasteMod / 100) : adjusted)
}

interface ItemCooldownInfo {
  progress: number
  justActivated: boolean
  cooldown: number
}

function computeItemCooldownState(
  slot: string,
  item: Item,
  playbackTime: number,
): ItemCooldownInfo {
  const cd = getItemCooldown(slot, item)
  // How many full cycles have completed since battle start?
  const cyclesSoFar = Math.floor(playbackTime / cd)
  const lastActivatedAt = cyclesSoFar * cd
  const elapsed = playbackTime - lastActivatedAt
  const progress = Math.min(1, elapsed / cd)
  // Show activation flash for 0.5s after each cooldown completion
  const justActivated = elapsed < 0.5 && cyclesSoFar > 0
  return { progress, justActivated, cooldown: cd }
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

  useEffect(() => {
    if (numbers.length === 0) return
    const timer = setTimeout(() => {
      setNumbers((prev) => prev.slice(Math.max(0, prev.length - 8)))
    }, 1200)
    return () => clearTimeout(timer)
  }, [numbers.length])

  return numbers
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
  <div className="flex items-center gap-1.5">
    {!finished && (
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-xs font-medium text-white"
        onClick={onTogglePause}
      >
        {paused ? '▶' : '⏸'}
      </button>
    )}
    {([1, 1.5, 2] as const).map((s) => (
      <button
        key={s}
        type="button"
        className={`h-7 rounded-lg px-2 text-[11px] font-bold ${
          speed === s
            ? 'bg-sky-600 text-white'
            : 'bg-slate-100 text-slate-600'
        }`}
        onClick={() => onSetSpeed(s)}
      >
        {s}x
      </button>
    ))}
    {!finished && (
      <button
        type="button"
        className="h-7 rounded-lg bg-slate-600 px-2.5 text-[11px] font-medium text-white"
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
  size = 'md',
}: {
  current: number
  max: number
  color: string
  barrier?: number
  size?: 'sm' | 'md'
}) => {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const barrierPct = barrier ? Math.max(0, Math.min(100 - pct, (barrier / max) * 100)) : 0
  const h = size === 'sm' ? 'h-2.5' : 'h-3.5'
  const fontSize = size === 'sm' ? 'text-[8px]' : 'text-[10px]'

  return (
    <div className={`relative ${h} w-full overflow-hidden rounded-full bg-slate-200`}>
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
      <div className={`absolute inset-0 flex items-center justify-center font-bold text-slate-700 ${fontSize}`}>
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
          className="rounded bg-slate-800 px-1 py-0.5 text-[9px] text-white"
        >
          {EFFECT_ICONS[s.type] ?? '?'} {s.type}
        </span>
      ))}
    </div>
  )
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
// Arena components – compact hero + enemies
// ---------------------------------------------------------------------------

const HeroPanel = ({
  hero,
  playbackTime,
}: {
  hero: CombatantLiveState
  playbackTime: number
}) => {
  const recentlyHit = playbackTime - hero.lastHitAt < 0.4

  return (
    <div
      className={`rounded-xl border-2 p-2.5 transition-colors duration-200 ${
        !hero.alive
          ? 'border-rose-400 bg-rose-50'
          : recentlyHit
            ? 'border-red-400 bg-red-50'
            : 'border-emerald-300 bg-emerald-50'
      }`}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-2xl">🧑‍🦱</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{hero.name}</p>
        </div>
      </div>
      <HpBar current={hero.hp} max={hero.maxHp} color="bg-emerald-500" barrier={hero.barrier} />
      <div className="mt-1">
        <StatusBadges statuses={hero.statuses} />
      </div>
    </div>
  )
}

const EnemyRow = ({
  enemy,
  playbackTime,
}: {
  enemy: CombatantLiveState
  playbackTime: number
}) => {
  const visual = getEnemyVisual(enemy.id)
  const recentlyHit = playbackTime - enemy.lastHitAt < 0.4
  const recentlyAttacked = playbackTime - enemy.lastActionAt < 0.5

  if (!enemy.alive) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 opacity-40">
        <span className="text-base">{visual.icon}</span>
        <p className="flex-1 truncate text-xs text-slate-400 line-through">{enemy.name}</p>
        <span className="text-[9px] font-semibold text-rose-500">KO</span>
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg border-2 px-2 py-1.5 transition-colors duration-200 ${
        recentlyAttacked
          ? 'border-amber-400 bg-amber-50'
          : recentlyHit
            ? 'border-red-400 bg-red-50'
            : `border-slate-200 ${visual.bg}`
      }`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-base">{visual.icon}</span>
        <p className="min-w-0 flex-1 truncate text-xs font-semibold">{enemy.name}</p>
      </div>
      <HpBar current={enemy.hp} max={enemy.maxHp} color="bg-rose-500" size="sm" />
      {enemy.statuses.length > 0 && (
        <div className="mt-0.5">
          <StatusBadges statuses={enemy.statuses} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Item Board – the autobattler centerpiece
// ---------------------------------------------------------------------------

const ItemCard = ({
  slot,
  item,
  cdInfo,
}: {
  slot: string
  item: Item
  cdInfo: ItemCooldownInfo
}) => {
  const { progress, justActivated, cooldown } = cdInfo
  const statLabels = getStatLabels(item)
  const tagIcon = getTagIcon(item.tags)

  return (
    <div
      className={`relative flex flex-col items-center overflow-hidden rounded-xl border-2 px-2 py-2 transition-all duration-200 ${
        justActivated
          ? `${RARITY_BORDER[item.rarity] ?? 'border-amber-400'} scale-[1.08] shadow-lg ${RARITY_GLOW[item.rarity] ?? 'shadow-amber-400/50'}`
          : progress >= 0.9
            ? `${RARITY_BORDER[item.rarity] ?? 'border-slate-300'} ring-2 ring-offset-1 ${RARITY_READY_RING[item.rarity] ?? 'ring-slate-300'} shadow-md ${RARITY_GLOW[item.rarity] ?? ''}`
            : 'border-slate-200 bg-slate-50'
      }`}
    >
      {/* Cooldown fill from bottom */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-0 transition-all duration-200 ${
          justActivated
            ? 'bg-amber-200/60'
            : progress >= 0.9
              ? 'bg-emerald-200/50'
              : 'bg-sky-200/40'
        }`}
        style={{ height: `${progress * 100}%` }}
        aria-hidden="true"
      />

      {/* Activation burst */}
      {justActivated && (
        <div className="pointer-events-none absolute inset-0 z-20 animate-ping rounded-xl bg-white/30" />
      )}

      {/* Tag icon badge */}
      <span className="absolute right-0.5 top-0.5 z-10 text-[10px]">{tagIcon}</span>

      {/* Slot icon */}
      <span className="relative z-10 text-xl leading-none">{SLOT_ICONS[slot] ?? '?'}</span>

      {/* Item name */}
      <p className="relative z-10 mt-1 max-w-full truncate text-center text-[10px] font-bold leading-tight text-slate-700">
        {item.name}
      </p>

      {/* Stat labels */}
      {statLabels.map((label) => (
        <p
          key={label}
          className={`relative z-10 text-[9px] font-semibold leading-tight ${
            justActivated ? 'text-amber-700' : 'text-slate-500'
          }`}
        >
          {label}
        </p>
      ))}

      {/* Cooldown bar */}
      <div className="relative z-10 mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
        <div
          className={`h-full rounded-full transition-all duration-200 ${
            justActivated
              ? 'bg-amber-400'
              : progress >= 0.9
                ? 'bg-emerald-400'
                : 'bg-sky-400'
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Cooldown timer label */}
      <p className="relative z-10 mt-0.5 text-[8px] tabular-nums text-slate-400">
        {justActivated ? 'ACTIVE' : `${cooldown.toFixed(1)}s`}
      </p>
    </div>
  )
}

const EmptySlot = ({ slot }: { slot: string }) => (
  <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-slate-200 px-2 py-2 opacity-30">
    <span className="text-lg leading-none">{SLOT_ICONS[slot] ?? '?'}</span>
    <p className="mt-1 text-[9px] capitalize text-slate-400">{slot}</p>
  </div>
)

const DISPLAY_SLOTS = ['weapon', 'offhand', 'armor', 'boots', 'ring', 'amulet', 'relic']

const ItemBoard = ({
  items,
  playbackTime,
}: {
  items: Partial<Record<string, Item>>
  playbackTime: number
}) => {
  const equippedSlots = DISPLAY_SLOTS.filter((s) => items[s] != null)
  const emptySlots = DISPLAY_SLOTS.filter((s) => items[s] == null)

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3">
      <div className="grid grid-cols-3 gap-2">
        {equippedSlots.map((slot) => {
          const item = items[slot]!
          const cdInfo = computeItemCooldownState(slot, item, playbackTime)
          return (
            <ItemCard
              key={slot}
              slot={slot}
              item={item}
              cdInfo={cdInfo}
            />
          )
        })}
        {emptySlots.map((slot) => (
          <EmptySlot key={slot} slot={slot} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Event feed – compact
// ---------------------------------------------------------------------------

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
        return { text: `Hero hits ${targetName} for ${val}`, color: 'text-emerald-700' }
      return { text: `${sourceName} hits Hero for ${val}`, color: 'text-rose-700' }
    }
    case 'crit':
      return { text: `CRIT! ${sourceName} crits ${targetName}`, color: 'text-amber-600' }
    case 'barrier_absorb':
      return { text: `Barrier absorbs ${Math.round(ev.value)}`, color: 'text-cyan-600' }
    case 'thorns_reflect':
      return { text: `Thorns reflect ${Math.round(ev.value)}`, color: 'text-lime-700' }
    case 'status_apply': {
      const statusType = ev.tags[0] ?? 'effect'
      const icon = EFFECT_ICONS[statusType] ?? '✦'
      return { text: `${icon} ${statusType} on ${targetName}`, color: 'text-violet-600' }
    }
    case 'status_tick': {
      const statusType = ev.tags[0] ?? 'dot'
      return {
        text: `${EFFECT_ICONS[statusType] ?? '•'} ${statusType} ${Math.round(ev.value)} to ${targetName}`,
        color: 'text-violet-500',
      }
    }
    case 'status_expire': {
      const statusType = ev.tags[0] ?? 'effect'
      return { text: `${statusType} fades from ${targetName}`, color: 'text-slate-400' }
    }
    case 'kill':
      return { text: `${targetName} defeated!`, color: 'text-orange-600 font-bold' }
    case 'hero_death':
      return { text: `Hero has fallen!`, color: 'text-rose-700 font-bold' }
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
      className="max-h-24 space-y-0.5 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/80 p-2"
    >
      {events.length === 0 && (
        <p className="text-center text-[10px] text-slate-400">Waiting for battle...</p>
      )}
      {events.map((ev, idx) => {
        const { text, color } = formatEventText(ev, enemies)
        return (
          <div key={idx} className={`text-[11px] leading-tight ${color}`}>
            <span className="mr-1 text-slate-300">{ev.timestamp.toFixed(1)}s</span>
            {text}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Result overlay
// ---------------------------------------------------------------------------

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
    <div className="mt-2 space-y-3 rounded-2xl border-2 border-slate-300 bg-white p-4 shadow-lg">
      <div
        className={`rounded-xl border-2 p-3 text-center ${
          isVictory ? 'border-emerald-400 bg-emerald-50' : 'border-rose-400 bg-rose-50'
        }`}
      >
        <p className={`text-lg font-bold ${isVictory ? 'text-emerald-800' : 'text-rose-800'}`}>
          {isVictory ? 'Victory' : 'Defeat'}
        </p>
        <p className="text-sm text-slate-600">{pending.encounterName}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-1.5 text-center">
        <div className="rounded-lg bg-slate-50 p-1.5">
          <p className="text-[9px] text-slate-400">HP Left</p>
          <p className="text-sm font-bold">{Math.round(battle.hpRemaining)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-1.5">
          <p className="text-[9px] text-slate-400">Dealt</p>
          <p className="text-sm font-bold text-emerald-600">{Math.round(battle.damageDealt)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-1.5">
          <p className="text-[9px] text-slate-400">Taken</p>
          <p className="text-sm font-bold text-rose-600">{Math.round(battle.damageTaken)}</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-1.5">
          <p className="text-[9px] text-slate-400">Time</p>
          <p className="text-sm font-bold">{(battle.durationMs / 1000).toFixed(1)}s</p>
        </div>
      </div>

      <div className="flex gap-3 text-xs text-slate-500">
        <span>Defeated: {killCount}</span>
        <span>Crits: {critCount}</span>
        {pending.xpGained > 0 && (
          <span className="font-medium text-indigo-600">+{pending.xpGained} XP</span>
        )}
      </div>

      {pending.loot.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-700">Loot</p>
          {pending.loot.map((item) => (
            <div
              key={item.instanceId}
              className={`rounded-lg border border-slate-200 p-2 text-sm ${rarityColor[String(item.rarity)] ?? ''}`}
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
        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
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
    <section className="space-y-2.5 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold leading-tight">{pending.encounterName}</h1>
          <p className="text-[10px] text-slate-500">
            {tierLabel} Encounter
            {isDevMode && (
              <span className="ml-1.5 rounded bg-indigo-100 px-1 py-0.5 text-indigo-700">DEV</span>
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

      {/* Battle timer */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-sky-500 transition-all duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-[10px] tabular-nums text-slate-400">
          {playbackState.time.toFixed(1)}s
        </span>
      </div>

      {/* Arena: hero vs enemies */}
      <div className="flex gap-2">
        {/* Hero side */}
        <div className="relative flex-1">
          <HeroPanel hero={playbackState.hero} playbackTime={playbackState.time} />
          <FloatingDamage numbers={floatingNumbers} targetId="hero" />
        </div>

        {/* Enemy side */}
        <div className="flex flex-1 flex-col gap-1.5">
          {playbackState.enemies.map((enemy) => (
            <div key={enemy.id} className="relative">
              <EnemyRow enemy={enemy} playbackTime={playbackState.time} />
              <FloatingDamage numbers={floatingNumbers} targetId={enemy.id} />
            </div>
          ))}
        </div>
      </div>

      {/* Item Board – autobattler centerpiece */}
      <div>
        <p className="mb-1.5 text-center text-[10px] font-bold tracking-widest text-slate-400">
          YOUR BUILD
        </p>
        <ItemBoard
          items={heroSnapshot.equippedItems}
          playbackTime={playbackState.time}
        />
      </div>

      {/* Battle feed */}
      <div>
        <p className="mb-1 text-[10px] font-medium text-slate-400">BATTLE LOG</p>
        <EventFeed events={playbackState.recentEvents} enemies={enemies} />
      </div>

      {/* Result overlay when battle ends */}
      {playbackState.finished && <ResultOverlay battle={battle} pending={pending} />}
    </section>
  )
}
