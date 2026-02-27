import { computeProgressionBonuses, xpToNextLevel } from '../../engine/progression'
import { useGameState } from '../GameStateContext'

const milestones = ['Lv2: +5 HP +1 ATK', 'Lv4: +15 HP +3 ATK', 'Lv7: +30 HP +6 ATK', 'Lv10: Mastery cap']

export const ProgressionScreen = () => {
  const { state, setLifeSlider } = useGameState()
  const { progression } = state
  const targetXp = xpToNextLevel(progression.level)
  const progressPct = Math.min(100, Math.round((progression.xp / targetXp) * 100))
  const bonuses = computeProgressionBonuses(progression)

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Progression</h1>

      <div className="rounded border border-slate-200 p-3 text-sm">
        <p className="font-medium">Level {progression.level}</p>
        <p>
          XP {progression.xp} / {targetXp}
        </p>
        <div className="mt-2 h-2 w-full rounded bg-slate-200" role="progressbar" aria-valuenow={progressPct}>
          <div className="h-2 rounded bg-sky-600" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="rounded border border-slate-200 p-3 text-sm">
        <p className="font-medium">Level bonuses</p>
        <p>+{bonuses.levelMaxHp} Max HP</p>
        <p>+{bonuses.levelAtk} ATK</p>
      </div>

      <div className="rounded border border-slate-200 p-3 text-sm">
        <p className="mb-2 font-medium">Life stats (mock inputs)</p>
        {([
          { key: 'vitality', label: 'Vitality', detail: `+${bonuses.vitalityMaxHp} HP` },
          { key: 'focus', label: 'Focus', detail: `+${(bonuses.focusCritChance * 100).toFixed(1)}% Crit` },
          { key: 'exploration', label: 'Exploration', detail: `+${(bonuses.explorationFindBonus * 100).toFixed(1)}% Find` },
        ] as const).map(({ key, label, detail }) => (
          <label key={key} className="mb-2 block">
            <div className="flex justify-between">
              <span>{label}</span>
              <span className="text-slate-600">{detail}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={progression.lifeStats[key]}
              onChange={(event) => setLifeSlider(key, Number(event.target.value))}
              aria-label={label}
              className="w-full"
            />
          </label>
        ))}
      </div>

      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
        <p className="font-medium">Unlock milestones</p>
        <ul className="list-inside list-disc">
          {milestones.map((milestone) => (
            <li key={milestone}>{milestone}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
