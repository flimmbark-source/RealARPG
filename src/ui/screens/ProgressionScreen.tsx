import { useGameState } from '../GameStateContext'

export const ProgressionScreen = () => {
  const { state } = useGameState()

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Progression</h1>
      <div className="rounded border border-slate-200 p-3 text-sm">
        <p>Level: {state.level}</p>
        <p>XP: {state.xp}</p>
        <p className="text-slate-500">Detailed progression trees unlock in a later phase.</p>
      </div>
    </section>
  )
}
