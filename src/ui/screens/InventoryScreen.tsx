import { ItemSlot } from '../../types'
import { useGameState } from '../GameStateContext'

const slots = Object.values(ItemSlot)

const formatValue = (value: number) => (Math.abs(value) < 1 ? value.toFixed(3) : value.toFixed(1))

export const InventoryScreen = () => {
  const { state, equipItem, unequipItem, getItemComparison, canAddInventoryItem } = useGameState()

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Inventory / Loadout</h1>
      <p className="text-sm text-slate-600">Capacity: {state.inventory.length}/24</p>

      <div className="space-y-2 rounded border border-slate-300 p-3">
        <h2 className="font-medium">Equipped</h2>
        {slots.map((slot) => {
          const item = state.equippedItems[slot]
          return (
            <div key={slot} className="flex items-center justify-between text-sm">
              <span className="capitalize">{slot}: {item?.name ?? 'Empty'}</span>
              {item && (
                <button type="button" className="rounded border px-2 py-1" onClick={() => unequipItem(slot)}>
                  Unequip
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 24 }).map((_, index) => {
          const item = state.inventory[index]
          if (!item) return <div key={`empty_${index}`} className="h-24 rounded border border-dashed border-slate-300" />

          const diffs = getItemComparison(item).filter((entry) => entry.delta !== 0)
          return (
            <div key={item.instanceId} className="space-y-1 rounded border border-slate-300 p-2 text-xs">
              <p className="font-medium">{item.name}</p>
              <p className="capitalize text-slate-500">{item.slot} · {item.rarity}</p>
              <div>
                {diffs.slice(0, 2).map((entry) => (
                  <p key={`${item.instanceId}_${entry.stat}`} className={entry.delta > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {entry.stat}: {entry.delta > 0 ? '+' : ''}{formatValue(entry.delta)}
                  </p>
                ))}
              </div>
              <button type="button" onClick={() => equipItem(item.instanceId)} className="rounded border px-2 py-1">
                Equip
              </button>
            </div>
          )
        })}
      </div>

      {!canAddInventoryItem && <p className="rounded bg-rose-50 p-2 text-sm text-rose-700">Inventory full. Cannot pick up more items.</p>}
    </section>
  )
}
