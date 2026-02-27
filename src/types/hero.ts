import type { Item, ItemSlot } from './item'

export type ArchetypeId =
  | 'thorns_warden'
  | 'poison_rogue'
  | 'frost_mystic'
  | 'crit_hunter'

export interface HeroState {
  id: string
  name: string
  archetypeId: ArchetypeId
  hp: number
  maxHp: number
  atk: number
  def: number
  critChance: number
  critMultiplier: number
  haste: number
  equippedItems: Partial<Record<ItemSlot, Item>>
  tags: string[]
  // abilitySlots: unknown // MVP_LATER
}
