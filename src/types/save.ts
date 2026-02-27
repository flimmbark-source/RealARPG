import type { FeedEntry } from './feed'
import type { HeroState } from './hero'
import type { Item, ItemSlot } from './item'
import type { MapNode } from './map'

export interface InventoryState {
  items: Item[] // max 24 slots
  equipped: Partial<Record<ItemSlot, Item>>
}

export interface SaveData {
  hero: HeroState
  inventory: Item[] // max 24
  equippedItems: Partial<Record<ItemSlot, Item>>
  mapState: MapNode[]
  feedEntries: FeedEntry[]
  lastSaveTimestamp: number
  xp: number
  level: number
}
