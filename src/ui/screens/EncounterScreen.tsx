import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useGameState, type NodeInteractionResult } from '../GameStateContext'

const colorByDanger = {
  Safe: 'text-emerald-700 bg-emerald-50 border-emerald-300',
  Risky: 'text-amber-700 bg-amber-50 border-amber-300',
  Deadly: 'text-rose-700 bg-rose-50 border-rose-300',
}

const dangerBadge = {
  Safe: 'bg-emerald-100 text-emerald-800',
  Risky: 'bg-amber-100 text-amber-800',
  Deadly: 'bg-rose-100 text-rose-800',
}

const rarityColor: Record<string, string> = {
  '0': 'text-slate-600',
  '1': 'text-blue-600',
  '2': 'text-yellow-600',
  '3': 'text-purple-600',
  '4': 'text-orange-500',
}

// --- Combat Result View ---
const CombatResultView = ({ result }: { result: Extract<NodeInteractionResult, { kind: 'combat' }> }) => {
  const isVictory = result.battle.winner === 'hero'
  const killCount = result.battle.events.filter((e) => e.type === 'kill').length
  const critCount = result.battle.events.filter((e) => e.type === 'crit' && e.source === 'hero').length

  return (
    <div className="space-y-3">
      <div className={`rounded-lg border-2 p-4 text-center ${isVictory ? 'border-emerald-400 bg-emerald-50' : 'border-rose-400 bg-rose-50'}`}>
        <p className={`text-lg font-bold ${isVictory ? 'text-emerald-800' : 'text-rose-800'}`}>
          {isVictory ? 'Victory' : 'Defeat'}
        </p>
        <p className="text-sm text-slate-600">{result.encounterName}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded border border-slate-200 p-2">
          <p className="text-xs text-slate-500">HP Remaining</p>
          <p className="font-medium">{Math.round(result.battle.hpRemaining)}</p>
        </div>
        <div className="rounded border border-slate-200 p-2">
          <p className="text-xs text-slate-500">Damage Dealt</p>
          <p className="font-medium">{Math.round(result.battle.damageDealt)}</p>
        </div>
        <div className="rounded border border-slate-200 p-2">
          <p className="text-xs text-slate-500">Damage Taken</p>
          <p className="font-medium">{Math.round(result.battle.damageTaken)}</p>
        </div>
        <div className="rounded border border-slate-200 p-2">
          <p className="text-xs text-slate-500">Duration</p>
          <p className="font-medium">{(result.battle.durationMs / 1000).toFixed(1)}s</p>
        </div>
      </div>

      <div className="flex gap-3 text-xs text-slate-600">
        <span>Enemies defeated: {killCount}</span>
        <span>Crits landed: {critCount}</span>
        {result.xpGained > 0 && <span className="text-indigo-600">+{result.xpGained} XP</span>}
      </div>

      {result.loot.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Loot</p>
          {result.loot.map((item) => (
            <div key={item.instanceId} className={`rounded border border-slate-200 p-2 text-sm ${rarityColor[String(item.rarity)] ?? ''}`}>
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
      {isVictory && result.loot.length === 0 && (
        <p className="text-sm text-slate-500">No loot dropped this time.</p>
      )}

      {/* Battle log summary */}
      <details className="text-xs">
        <summary className="cursor-pointer text-slate-500">Battle Log ({result.battle.events.length} events)</summary>
        <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto rounded bg-slate-50 p-2">
          {result.battle.events.slice(0, 50).map((event, idx) => (
            <li key={idx} className="text-slate-600">
              <span className="text-slate-400">[{(event.timestamp * 1000).toFixed(0)}ms]</span>{' '}
              {event.source} → {event.target}: {event.type}{' '}
              {event.value > 0 && <span className="font-medium">({Math.round(event.value)})</span>}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

// --- Chest Result View ---
const ChestResultView = ({ result }: { result: Extract<NodeInteractionResult, { kind: 'chest' }> }) => (
  <div className="space-y-3">
    <div className="rounded-lg border-2 border-yellow-400 bg-yellow-50 p-4 text-center">
      <p className="text-lg font-bold text-yellow-800">Chest Opened</p>
      <p className="text-sm text-slate-600">{result.chestName}</p>
    </div>

    {result.loot.length > 0 ? (
      <div className="space-y-1">
        <p className="text-sm font-medium">Contents</p>
        {result.loot.map((item) => (
          <div key={item.instanceId} className={`rounded border border-slate-200 p-2 text-sm ${rarityColor[String(item.rarity)] ?? ''}`}>
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
    ) : (
      <p className="text-sm text-slate-500">Inventory full — nothing could be taken.</p>
    )}
  </div>
)

// --- Shrine Result View ---
const ShrineResultView = ({ result }: { result: Extract<NodeInteractionResult, { kind: 'shrine' }> }) => (
  <div className="space-y-3">
    <div className="rounded-lg border-2 border-violet-400 bg-violet-50 p-4 text-center">
      <p className="text-lg font-bold text-violet-800">Shrine Activated</p>
      <p className="text-sm text-slate-600">{result.shrineName}</p>
    </div>
    <div className="rounded border border-violet-200 bg-violet-50 p-3 text-sm">
      <p className="font-medium text-violet-800">
        +{result.shrineDef.buff.value} {result.shrineDef.buff.stat.toUpperCase()}
      </p>
      <p className="text-xs text-violet-600">
        Lasts for {result.shrineDef.durationEncounters} encounters
      </p>
    </div>
  </div>
)

// --- Encounter Preview (pre-engagement combat view) ---
const CombatPreview = ({ isDevMode, onEngage }: { isDevMode: boolean; onEngage: () => void }) => {
  const { selectedEncounter } = useGameState()
  if (!selectedEncounter) return null

  const { danger } = selectedEncounter
  const tierLabel = selectedEncounter.encounterType === 'elite' ? 'Elite' : 'Standard'

  return (
    <div className="space-y-3">
      <div className={`rounded-lg border p-3 ${colorByDanger[danger.label]}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">{selectedEncounter.encounterName}</p>
            <p className="text-xs">{tierLabel} Encounter — {selectedEncounter.encounterContext}</p>
          </div>
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${dangerBadge[danger.label]}`}>
            {danger.label}
          </span>
        </div>
        <div className="mt-2 flex gap-4 text-xs">
          <span>Win rate: {(danger.winRate * 100).toFixed(0)}%</span>
          <span>Avg HP left: {(danger.avgHpRemainingPercent * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-700">Enemies</p>
        {selectedEncounter.enemies.map((enemy, idx) => (
          <div key={`${enemy.id}_${idx}`} className="flex items-center justify-between rounded border border-slate-200 p-2 text-sm">
            <div>
              <span className="font-medium">{enemy.name}</span>
              <span className="ml-2 text-xs text-slate-500">{enemy.tier === 'elite' ? '(Elite)' : ''}</span>
            </div>
            <div className="flex gap-3 text-xs text-slate-500">
              <span>HP {enemy.hp}</span>
              <span>ATK {enemy.atk}</span>
              <span>DEF {enemy.def}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
        type="button"
        onClick={onEngage}
      >
        {isDevMode ? 'Force Engage' : 'Engage'}
      </button>
    </div>
  )
}

// --- Shrine Preview (pre-activation view) ---
const ShrinePreview = ({ node, onActivate }: { node: { reward?: string; shrineType?: string }; onActivate: () => void }) => {
  const { getShrinePreview } = useShrinePreview(node.shrineType)

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-violet-300 bg-violet-50 p-4">
        <p className="text-lg font-bold text-violet-800">{getShrinePreview.name}</p>
        <p className="mt-1 text-sm text-violet-600">
          Grants <span className="font-semibold">+{getShrinePreview.buff.value} {getShrinePreview.buff.stat.toUpperCase()}</span> for {getShrinePreview.durationEncounters} encounters
        </p>
      </div>

      <button
        className="w-full rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-medium text-white"
        type="button"
        onClick={onActivate}
      >
        Activate Shrine
      </button>
    </div>
  )
}

// --- Chest Preview (pre-open view) ---
const ChestPreview = ({ node, onOpen }: { node: { reward?: string; type: string; chestType?: string }; onOpen: () => void }) => {
  const chestLabel = node.type === 'timed_chest' ? 'Timed Chest' : node.type === 'cursed_chest' ? 'Cursed Chest' : 'Chest'
  const borderColor = node.type === 'cursed_chest' ? 'border-purple-300 bg-purple-50' : 'border-yellow-300 bg-yellow-50'

  return (
    <div className="space-y-3">
      <div className={`rounded-lg border p-4 ${borderColor}`}>
        <p className="text-lg font-bold text-yellow-800">{node.reward ?? chestLabel}</p>
        <p className="mt-1 text-sm text-slate-600">{chestLabel} — contains equipment and supplies</p>
      </div>

      <button
        className="w-full rounded-lg bg-yellow-600 px-4 py-2.5 text-sm font-medium text-white"
        type="button"
        onClick={onOpen}
      >
        Open Chest
      </button>
    </div>
  )
}

// Small hook to get shrine preview data
function useShrinePreview(shrineType?: string) {
  const shrineDefaults = {
    attack: { name: 'Shrine of Ruin', buff: { stat: 'atk', value: 6 }, durationEncounters: 3 },
    defense: { name: 'Shrine of Bulwark', buff: { stat: 'def', value: 6 }, durationEncounters: 3 },
    haste: { name: 'Shrine of Velocity', buff: { stat: 'haste', value: 12 }, durationEncounters: 3 },
  }
  const key = (shrineType ?? 'attack') as keyof typeof shrineDefaults
  return { getShrinePreview: shrineDefaults[key] ?? shrineDefaults.attack }
}

// --- Main Screen ---
export const EncounterScreen = () => {
  const { playerMode, selectedNode, selectedEncounter, resolveSelectedNode } = useGameState()
  const [result, setResult] = useState<NodeInteractionResult | null>(null)
  const isDevMode = playerMode === 'dev'

  // No node selected and no result to show
  if (!selectedNode && !result) {
    return (
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">No Node Selected</h1>
        <p className="text-sm text-slate-600">Select a node from the map to begin.</p>
        <Link to="/map" className="inline-block rounded bg-slate-900 px-3 py-2 text-sm text-white">
          Open Map
        </Link>
      </section>
    )
  }

  // Node already cleared or expired (but no result showing — navigated back to a stale node)
  if (!result && selectedNode && selectedNode.state !== 'available') {
    return (
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">Node {selectedNode.state === 'cleared' ? 'Cleared' : 'Expired'}</h1>
        <p className="text-sm text-slate-600">
          This node has already been {selectedNode.state === 'cleared' ? 'completed' : 'expired'}.
        </p>
        <Link to="/map" className="inline-block rounded bg-slate-900 px-3 py-2 text-sm text-white">
          Back to Map
        </Link>
      </section>
    )
  }

  const handleResolve = () => {
    const outcome = resolveSelectedNode()
    if (outcome) setResult(outcome)
  }

  // Determine node category
  const isCombatNode = selectedNode.type === 'standard_fight' || selectedNode.type === 'elite_fight'
  const isShrineNode = selectedNode.type === 'shrine'
  const isChestNode = selectedNode.type.includes('chest')

  // Screen title
  const screenTitle = isCombatNode
    ? (selectedEncounter?.encounterType === 'elite' ? 'Elite Encounter' : 'Encounter')
    : isShrineNode
      ? 'Shrine'
      : isChestNode
        ? 'Chest'
        : 'Interaction'

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{screenTitle}</h1>
        {isDevMode && (
          <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">DEV</span>
        )}
      </div>

      {/* Result view (after interaction) */}
      {result ? (
        <div className="space-y-3">
          {result.kind === 'combat' && <CombatResultView result={result} />}
          {result.kind === 'chest' && <ChestResultView result={result} />}
          {result.kind === 'shrine' && <ShrineResultView result={result} />}

          <Link
            to="/map"
            className="inline-block w-full rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white"
          >
            Back to Map
          </Link>
        </div>
      ) : (
        /* Preview view (before interaction) */
        <div>
          {isCombatNode && selectedEncounter && (
            <CombatPreview isDevMode={isDevMode} onEngage={handleResolve} />
          )}
          {isShrineNode && (
            <ShrinePreview node={selectedNode} onActivate={handleResolve} />
          )}
          {isChestNode && (
            <ChestPreview node={selectedNode} onOpen={handleResolve} />
          )}

          {/* Fallback for unexpected node types */}
          {!isCombatNode && !isShrineNode && !isChestNode && (
            <div className="rounded border border-slate-300 p-3 text-sm">
              <p>Unknown node type: {selectedNode.type}</p>
              <p className="text-xs text-slate-500">This interaction is not yet implemented.</p>
            </div>
          )}

          <div className="mt-3">
            <Link to="/map" className="text-sm text-slate-500 underline">
              Back to Map
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
