import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useGameState } from '../GameStateContext'

const colorByDanger = {
  Safe: 'text-emerald-700',
  Risky: 'text-amber-700',
  Deadly: 'text-rose-700',
}

export const EncounterScreen = () => {
  const { selectedEncounter, resolveSelectedEncounter } = useGameState()
  const [resultSummary, setResultSummary] = useState<string>('')

  if (!selectedEncounter) {
    return (
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">Encounter Preview</h1>
        <p className="text-sm">Select an available fight node from the map first.</p>
        <Link to="/map" className="inline-block rounded bg-slate-900 px-3 py-2 text-sm text-white">
          Open map
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Encounter Preview</h1>
      <div className="rounded border border-slate-300 p-3 text-sm">
        <p className="font-medium">{selectedEncounter.encounterName}</p>
        <p className={colorByDanger[selectedEncounter.danger.label]}>
          Danger: {selectedEncounter.danger.label}
        </p>
        <p>Win rate: {(selectedEncounter.danger.winRate * 100).toFixed(1)}%</p>
        <p>Avg HP remaining: {(selectedEncounter.danger.avgHpRemainingPercent * 100).toFixed(1)}%</p>
      </div>

      <ul className="space-y-1 text-sm">
        {selectedEncounter.enemies.map((enemy) => (
          <li key={enemy.id} className="rounded border border-slate-200 p-2">
            {enemy.name} — HP {enemy.hp} / ATK {enemy.atk} / DEF {enemy.def}
          </li>
        ))}
      </ul>

      <button
        className="rounded bg-slate-900 px-3 py-2 text-sm text-white"
        type="button"
        onClick={() => {
          const outcome = resolveSelectedEncounter()
          if (!outcome) return
          setResultSummary(
            `${outcome.result.winner === 'hero' ? 'Victory' : 'Defeat'} · HP ${Math.round(outcome.result.hpRemaining)} · Loot ${outcome.loot.length}`,
          )
        }}
      >
        Engage
      </button>

      {resultSummary && <p className="rounded border border-slate-200 p-2 text-sm">Result: {resultSummary}</p>}
    </section>
  )
}
