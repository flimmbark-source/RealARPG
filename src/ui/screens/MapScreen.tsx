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
  const { mapNodes, selectMapNode } = useGameState()
  const navigate = useNavigate()

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Map</h1>
      <p className="text-sm text-slate-600">Tap a node to inspect risk and rewards.</p>
      <div className="relative h-[22rem] rounded border border-slate-300 bg-slate-50">
        {mapNodes.map((node) => (
          <button
            key={node.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border p-2 text-xs ${nodeTone(node.state)}`}
            style={{ left: `${node.position.x}%`, top: `${node.position.y}%` }}
            type="button"
            onClick={() => {
              if (node.state !== 'available' || !node.encounterId) return
              selectMapNode(node.id)
              navigate('/encounter')
            }}
            aria-label={node.id}
          >
            {iconByType[node.type] ?? '•'}
          </button>
        ))}
      </div>
    </section>
  )
}
