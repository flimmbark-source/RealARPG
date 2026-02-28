export enum Rarity {
  Common = 'Common',
  Magic = 'Magic',
  Rare = 'Rare',
  Epic = 'Epic',
  Legendary = 'Legendary',
}

export enum ItemSlot {
  Weapon = 'weapon',
  Offhand = 'offhand',
  Armor = 'armor',
  Boots = 'boots',
  Ring = 'ring',
  Amulet = 'amulet',
  Relic = 'relic',
}

export type StatKey =
  | 'hp'
  | 'maxHp'
  | 'atk'
  | 'def'
  | 'cooldown'
  | 'critChance'
  | 'critMultiplier'
  | 'haste'
  | 'summonPower' // MVP_LATER

export type StatBlock = Partial<Record<StatKey, number>>

export interface ItemBase {
  id: string
  name: string
  slot: ItemSlot
  baseStats: StatBlock
  tags: string[]
  allowedAffixTags: string[]
}

export interface Affix {
  id: string
  name: string
  stat: StatKey
  range: {
    min: number
    max: number
  }
  tags: string[]
  slotRestrictions: ItemSlot[] | null
  rarityWeighting: Partial<Record<Rarity, number>>
}

export interface Item {
  instanceId: string
  baseId: string
  name: string
  slot: ItemSlot
  rarity: Rarity
  affixes: Array<{
    affixId: string
    stat: StatKey
    value: number
  }>
  finalStats: StatBlock
  isLegendary: boolean
  setId?: string
  tags: string[]
  seed: number
}
