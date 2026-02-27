import { useNavigate } from 'react-router-dom'

import { useGameState } from '../GameStateContext'

const iconByType: Record<string, string> = {
  standard_fight: '⚔️',
  elite_fight: '👑',
  common_chest: '📦',
  timed_chest: '⏱️',
  cursed_chest: '🕸️',
  shrine: '✨',
}

const nodeTone = (state: 'available' | 'cleared' | 'expired') => {
  if (state === 'cleared') return 'border-emerald-500 bg-emerald-50'
  if (state === 'expired') return 'border-slate-300 bg-slate-100 text-slate-400'
  return 'border-sky-500 bg-white'
}

export const MapScreen = () => {
  const {
    visibleMapNodes,
    playerMode,
    setPlayerMode,
    selectMapNode,
    selectedNode,
    regenerateMapNodes,
    devEncounterFilters,
    setDevEncounterFilter,
    devPlayerPosition,
    setDevPlayerPosition,
  } = useGameState()
  const navigate = useNavigate()

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Map</h1>
      <p className="text-sm text-slate-600">Tap a node to inspect risk and rewards.</p>

      <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-medium">Mode</p>
          <div className="flex gap-2">
            {(['active', 'passive', 'dev'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`rounded px-2 py-1 text-xs ${playerMode === mode ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                onClick={() => setPlayerMode(mode)}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {playerMode === 'dev' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-700">Dev Mode: bypass traversal and trigger node interactions directly.</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(devEncounterFilters).map(([type, enabled]) => (
                <button
                  key={type}
                  type="button"
                  className={`rounded border px-2 py-1 text-xs ${enabled ? 'border-sky-600 bg-sky-100' : 'border-slate-300 bg-white text-slate-500'}`}
                  onClick={() => setDevEncounterFilter(type as keyof typeof devEncounterFilters, !enabled)}
                >
                  {enabled ? '✓' : '✕'} {type}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs" htmlFor="dev-x">
                X
              </label>
              <input
                id="dev-x"
                type="range"
                min={0}
                max={100}
                value={devPlayerPosition.x}
                onChange={(event) => setDevPlayerPosition({ ...devPlayerPosition, x: Number(event.target.value) })}
              />
              <label className="text-xs" htmlFor="dev-y">
                Y
              </label>
              <input
                id="dev-y"
                type="range"
                min={0}
                max={100}
                value={devPlayerPosition.y}
                onChange={(event) => setDevPlayerPosition({ ...devPlayerPosition, y: Number(event.target.value) })}
              />
            </div>
            <button className="rounded bg-slate-900 px-2 py-1 text-xs text-white" type="button" onClick={regenerateMapNodes}>
              Regenerate local map nodes
            </button>
          </div>
        )}
      </div>

      <div className="relative h-[22rem] rounded border border-slate-300 bg-slate-50">
        {visibleMapNodes.map((node) => (
          <button
            key={node.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border p-2 text-xs ${nodeTone(node.state)}`}
            style={{ left: `${node.position.x}%`, top: `${node.position.y}%` }}
            type="button"
            onClick={() => {
              if (node.state !== 'available') return
              selectMapNode(node.id)
              if (playerMode === 'dev') {
                if (node.encounterId || node.type.includes('chest') || node.type === 'shrine') {
                  navigate('/encounter')
                }
                return
              }
              if (!node.encounterId) return
              navigate('/encounter')
            }}
            aria-label={node.id}
          >
            {iconByType[node.type] ?? '•'}
          </button>
        ))}

        {playerMode === 'dev' && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 text-sm"
            style={{ left: `${devPlayerPosition.x}%`, top: `${devPlayerPosition.y}%` }}
            aria-label="dev-player-position"
          >
            🧪
          </div>
        )}
      </div>

      {playerMode === 'dev' && selectedNode && (
        <p className="rounded border border-slate-300 bg-white p-2 text-xs">
          Selected: {selectedNode.id} ({selectedNode.type})
        </p>
      )}
    </section>
  )
}
