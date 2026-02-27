import { Link } from 'react-router-dom'

import { useGameState } from '../GameStateContext'

const countByType = (nodes: ReturnType<typeof useGameState>['mapNodes']) => ({
  fights: nodes.filter((node) => node.type.includes('fight') && node.state === 'available').length,
  chests: nodes.filter((node) => node.type.includes('chest') && node.state === 'available').length,
  shrines: nodes.filter((node) => node.type === 'shrine' && node.state === 'available').length,
})

export const HomeScreen = () => {
  const { state, mapNodes } = useGameState()
  const available = countByType(mapNodes)

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Home</h1>
        <p className="text-sm text-slate-600">{state.hero.name} • Level {state.level}</p>
      </header>

      <div className="grid grid-cols-2 gap-2 rounded border border-slate-200 p-3 text-sm">
        <p>ATK: {Math.round(state.hero.atk)}</p>
        <p>DEF: {Math.round(state.hero.def)}</p>
        <p>Crit: {(state.hero.critChance * 100).toFixed(1)}%</p>
        <p>Haste: {Math.round(state.hero.haste)}</p>
      </div>

      <div className="rounded border border-slate-200 p-3 text-sm">
        <h2 className="font-medium">Nearby opportunities</h2>
        <p>Fights: {available.fights}</p>
        <p>Chests: {available.chests}</p>
        <p>Shrines: {available.shrines}</p>
      </div>

      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
        <h2 className="font-medium">Passive results</h2>
        <p>Passive mode summary appears here after offline resolution (Phase 5).</p>
      </div>

      <Link className="inline-block rounded bg-slate-900 px-3 py-2 text-sm text-white" to="/map">
        Check map
      </Link>
    </section>
  )
}
