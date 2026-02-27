import { useGameState } from '../GameStateContext'

export const FeedScreen = () => {
  const { feedEntries } = useGameState()

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Feed</h1>
      <p className="text-sm text-slate-600">Recent events</p>
      <ul className="space-y-2">
        {feedEntries.slice(0, 12).map((entry) => (
          <li key={entry.id} className="rounded border border-slate-200 p-2 text-sm">
            <p className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</p>
            <p>{entry.summary}</p>
            {entry.loot && entry.loot.length > 0 && <p className="text-xs text-slate-500">Loot: {entry.loot.map((item) => item.name).join(', ')}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
