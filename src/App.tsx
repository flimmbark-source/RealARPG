import { useMemo, useState } from 'react'

import { ARCHETYPE_STARTERS, ENEMY_GROUPS } from './data/combatFixtures'
import { simulateBattle } from './engine/combat'
import type { BattleResult, HeroState } from './types'

const archetypeOptions = Object.values(ARCHETYPE_STARTERS)

const formatResult = (result: BattleResult): string => {
  const header = [
    `winner: ${result.winner}`,
    `durationMs: ${result.durationMs}`,
    `hpRemaining: ${result.hpRemaining.toFixed(2)}`,
    `damageDealt: ${result.damageDealt.toFixed(2)}`,
    `damageTaken: ${result.damageTaken.toFixed(2)}`,
    `seed: ${result.seed}`,
  ]

  const events = result.events.map(
    (event) =>
      `[${event.timestamp.toFixed(3)}] ${event.type} ${event.source} -> ${event.target} value=${event.value.toFixed(2)} tags=${event.tags.join(',')}`,
  )

  return [...header, 'events:', ...events].join('\n')
}

function App() {
  const [archetypeId, setArchetypeId] = useState<HeroState['archetypeId']>('thorns_warden')
  const [enemyGroupId, setEnemyGroupId] = useState<string>(ENEMY_GROUPS[0]?.id ?? '')
  const [seedInput, setSeedInput] = useState<string>('101')
  const [output, setOutput] = useState<string>('Select an archetype and enemy group, then run Fight.')

  const currentHero = useMemo(() => ARCHETYPE_STARTERS[archetypeId], [archetypeId])
  const currentGroup = useMemo(() => ENEMY_GROUPS.find((entry) => entry.id === enemyGroupId) ?? ENEMY_GROUPS[0], [enemyGroupId])

  const runFight = (): void => {
    const seed = Number.parseInt(seedInput, 10)
    const normalizedSeed = Number.isNaN(seed) ? 1 : seed
    const result = simulateBattle(currentHero, currentGroup.enemies, normalizedSeed)
    setOutput(formatResult(result))
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 p-6 text-sm">
      <h1 className="text-lg font-semibold">Combat Test Debug Harness</h1>

      <label className="flex flex-col gap-1">
        Archetype
        <select
          value={archetypeId}
          onChange={(event) => setArchetypeId(event.target.value as HeroState['archetypeId'])}
          className="rounded border border-slate-400 p-2"
        >
          {archetypeOptions.map((entry) => (
            <option key={entry.archetypeId} value={entry.archetypeId}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        Enemy Group
        <select
          value={enemyGroupId}
          onChange={(event) => setEnemyGroupId(event.target.value)}
          className="rounded border border-slate-400 p-2"
        >
          {ENEMY_GROUPS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        Seed
        <input
          value={seedInput}
          onChange={(event) => setSeedInput(event.target.value)}
          className="rounded border border-slate-400 p-2"
        />
      </label>

      <button type="button" onClick={runFight} className="w-32 rounded bg-slate-800 px-3 py-2 text-white">
        Fight
      </button>

      <pre className="max-h-[28rem] overflow-auto rounded border border-slate-300 bg-slate-50 p-3">{output}</pre>
    </main>
  )
}

export default App
