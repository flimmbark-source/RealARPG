import { useMemo, useState } from 'react'

import { simulateBattle } from '../../engine/combat'
import { useCombatSandbox, useGameState } from '../GameStateContext'
import type { BattleResult, HeroState } from '../../types'

const formatResult = (result: BattleResult): string => {
  const header = [
    `winner: ${result.winner}`,
    `durationMs: ${result.durationMs}`,
    `hpRemaining: ${result.hpRemaining.toFixed(2)}`,
    `damageDealt: ${result.damageDealt.toFixed(2)}`,
    `damageTaken: ${result.damageTaken.toFixed(2)}`,
  ]
  return [...header, 'events:', ...result.events.slice(0, 20).map((event) => `${event.type} ${event.tags.join(',')}`)].join('\n')
}

export const CombatTestScreen = () => {
  const { archetypes, enemies } = useCombatSandbox()
  const { state } = useGameState()
  const [archetypeId, setArchetypeId] = useState<HeroState['archetypeId']>('thorns_warden')
  const [enemyGroupId, setEnemyGroupId] = useState<string>(enemies[0]?.id ?? '')
  const [output, setOutput] = useState<string>('Run a fight to inspect battle logs.')

  const selectedHero = useMemo(() => archetypes[archetypeId], [archetypeId, archetypes])
  const selectedGroup = useMemo(() => enemies.find((group) => group.id === enemyGroupId) ?? enemies[0], [enemies, enemyGroupId])

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Combat Test</h1>
      <p className="text-sm">Current equipped hero snapshot: ATK {Math.round(state.hero.atk)} DEF {Math.round(state.hero.def)}</p>

      <label className="flex flex-col gap-1 text-sm">
        Archetype
        <select className="rounded border border-slate-300 p-2" value={archetypeId} onChange={(event) => setArchetypeId(event.target.value as HeroState['archetypeId'])}>
          {Object.values(archetypes).map((hero) => (
            <option key={hero.archetypeId} value={hero.archetypeId}>{hero.name}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Enemy Group
        <select className="rounded border border-slate-300 p-2" value={enemyGroupId} onChange={(event) => setEnemyGroupId(event.target.value)}>
          {enemies.map((group) => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="rounded bg-slate-900 px-3 py-2 text-sm text-white"
        onClick={() => setOutput(formatResult(simulateBattle(selectedHero, selectedGroup.enemies, 101)))}
      >
        Fight
      </button>

      <pre className="max-h-64 overflow-auto rounded border border-slate-300 bg-slate-50 p-2 text-xs">{output}</pre>
    </section>
  )
}
