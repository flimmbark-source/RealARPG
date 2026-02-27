import affixesData from '../data/affixes.json'
import itemsData from '../data/items.json'
import archetypesData from '../data/archetypes.json'
import { DROP_RATE_TABLE, HERO_STARTER_STATS, RARITY_AFFIX_BUDGET, type ArchetypeId, type Affix, type DropSourceType, type HeroState, type Item, type ItemBase, ItemSlot, Rarity, type StatBlock, type StatKey } from '../types'

interface LegendaryTemplate {
  id: string
  baseId: string
  name: string
  slot: ItemSlot
  tags: string[]
  finalStats: StatBlock
}

interface SetTemplate {
  id: string
  name: string
  pieces: string[]
  bonuses: Array<{ pieces: number; stats: StatBlock }>
}

interface ArchetypeTemplate {
  id: ArchetypeId
  name: string
  tags: string[]
  equippedBaseIds: Record<ItemSlot, string>
}

const itemTable = itemsData as { bases: ItemBase[]; legendaries: LegendaryTemplate[]; sets: SetTemplate[] }
const affixTable = affixesData as Affix[]
const archetypeTable = archetypesData as ArchetypeTemplate[]

const slotOrder: ItemSlot[] = [ItemSlot.Weapon, ItemSlot.Offhand, ItemSlot.Armor, ItemSlot.Boots, ItemSlot.Ring, ItemSlot.Amulet, ItemSlot.Relic]

const createRng = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

const choose = <T>(entries: T[], rng: () => number): T => entries[Math.floor(rng() * entries.length)]

const isAffixCompatible = (base: ItemBase, affix: Affix): boolean => {
  const slotOk = affix.slotRestrictions === null || affix.slotRestrictions.includes(base.slot)
  const tagsOk = affix.tags.some((tag) => base.allowedAffixTags.includes(tag) || base.tags.includes(tag))
  const poisonOrFrostConflict = affix.tags.includes('poison')
    ? !base.allowedAffixTags.includes('frost')
    : affix.tags.includes('frost')
      ? !base.allowedAffixTags.includes('poison')
      : true

  return slotOk && tagsOk && poisonOrFrostConflict
}

const rollStatValue = (affix: Affix, rng: () => number): number => {
  const raw = affix.range.min + (affix.range.max - affix.range.min) * rng()
  return affix.stat === 'critChance' || affix.stat === 'critMultiplier' ? Number(raw.toFixed(3)) : Math.round(raw)
}

const addStat = (block: StatBlock, stat: StatKey, value: number): StatBlock => ({
  ...block,
  [stat]: Number(((block[stat] ?? 0) + value).toFixed(3)),
})

const rarityAffixCount = (rarity: Rarity, rng: () => number): number => {
  const budget = RARITY_AFFIX_BUDGET[rarity]
  return budget.minAffixes + Math.floor(rng() * (budget.maxAffixes - budget.minAffixes + 1))
}

const buildFinalStats = (base: ItemBase, rolls: Item['affixes']): StatBlock => {
  let stats: StatBlock = { ...base.baseStats }
  for (const roll of rolls) {
    stats = addStat(stats, roll.stat, roll.value)
  }
  return stats
}

const createBaseItem = (base: ItemBase, rarity: Rarity, seed: number): Item => ({
  instanceId: `${base.id}_${rarity}_${seed}`,
  baseId: base.id,
  name: base.name,
  slot: base.slot,
  rarity,
  affixes: [],
  finalStats: { ...base.baseStats },
  isLegendary: false,
  tags: [...base.tags],
  seed,
})

export const getItemBases = (): ItemBase[] => itemTable.bases
export const getLegendaryTemplates = (): LegendaryTemplate[] => itemTable.legendaries
export const getSetTemplates = (): SetTemplate[] => itemTable.sets

export const generateItem = (baseId: string, rarity: Rarity, seed: number): Item => {
  const base = itemTable.bases.find((entry) => entry.id === baseId)
  if (!base) {
    throw new Error(`Unknown base item ${baseId}`)
  }

  const rng = createRng(seed)
  const count = rarity === Rarity.Legendary ? RARITY_AFFIX_BUDGET[Rarity.Legendary].maxAffixes : rarityAffixCount(rarity, rng)

  const compatiblePool = affixTable.filter((affix) => isAffixCompatible(base, affix) && (affix.rarityWeighting[rarity] ?? 0) > 0)
  const picks: Item['affixes'] = []
  const used = new Set<string>()

  while (picks.length < count && compatiblePool.length > 0) {
    const available = compatiblePool.filter((entry) => !used.has(entry.id))
    if (available.length === 0) break
    const affix = choose(available, rng)
    used.add(affix.id)
    picks.push({
      affixId: affix.id,
      stat: affix.stat,
      value: rollStatValue(affix, rng),
    })
  }

  return {
    ...createBaseItem(base, rarity, seed),
    affixes: picks,
    finalStats: buildFinalStats(base, picks),
  }
}

export const createLegendaryItem = (legendaryId: string, seed: number): Item => {
  const legendary = itemTable.legendaries.find((entry) => entry.id === legendaryId)
  if (!legendary) throw new Error(`Unknown legendary ${legendaryId}`)

  return {
    instanceId: `${legendary.id}_${seed}`,
    baseId: legendary.baseId,
    name: legendary.name,
    slot: legendary.slot,
    rarity: Rarity.Legendary,
    affixes: [],
    finalStats: { ...legendary.finalStats },
    isLegendary: true,
    tags: [...legendary.tags],
    seed,
  }
}

export const rollDrop = (sourceType: DropSourceType, seed: number, findBonus = 0): { rarity: Rarity; baseId: string } => {
  const rng = createRng(seed)
  const rates = DROP_RATE_TABLE[sourceType]
  const roll = rng()
  let cursor = 0
  let selected: Rarity = Rarity.Common
  const rarityOrder = [Rarity.Common, Rarity.Magic, Rarity.Rare, Rarity.Epic, Rarity.Legendary]
  for (const rarity of rarityOrder) {
    const rate = (rates as Record<string, number>)[rarity] ?? 0
    cursor += rate
    if (roll <= cursor) {
      selected = rarity
      break
    }
  }

  const clampedFindBonus = Math.max(0, Math.min(0.04, findBonus))
  if (clampedFindBonus > 0 && rng() < clampedFindBonus) {
    const currentIndex = rarityOrder.indexOf(selected)
    selected = rarityOrder[Math.min(rarityOrder.length - 1, currentIndex + 1)]
  }

  return {
    rarity: selected,
    baseId: choose(itemTable.bases, rng).id,
  }
}

const statKeys: StatKey[] = ['hp', 'maxHp', 'atk', 'def', 'critChance', 'critMultiplier', 'haste', 'summonPower']

export const recalculateHeroStats = (hero: HeroState): HeroState => {
  const next: HeroState = {
    ...hero,
    hp: HERO_STARTER_STATS.hp,
    maxHp: HERO_STARTER_STATS.maxHp,
    atk: HERO_STARTER_STATS.atk,
    def: HERO_STARTER_STATS.def,
    critChance: HERO_STARTER_STATS.critChance,
    critMultiplier: HERO_STARTER_STATS.critMultiplier,
    haste: HERO_STARTER_STATS.haste,
  }

  for (const slot of slotOrder) {
    const item = hero.equippedItems[slot]
    if (!item) continue
    for (const key of statKeys) {
      const value = item.finalStats[key]
      if (!value) continue
      if (key === 'hp' || key === 'maxHp') {
        next.maxHp += value
      } else {
        ;(next as unknown as Record<string, number>)[key] += value
      }
    }
  }
  next.hp = next.maxHp
  return next
}

export const equipItem = (hero: HeroState, item: Item): HeroState => {
  const equippedItems = { ...hero.equippedItems, [item.slot]: item }
  return recalculateHeroStats({ ...hero, equippedItems })
}

export const unequipItem = (hero: HeroState, slot: ItemSlot): HeroState => {
  const equippedItems = { ...hero.equippedItems }
  delete equippedItems[slot]
  return recalculateHeroStats({ ...hero, equippedItems })
}

export interface StatDiff {
  stat: StatKey
  delta: number
}

export const compareItems = (current: Item | undefined, candidate: Item, _hero: HeroState): StatDiff[] => {
  const keys = new Set<StatKey>([
    ...(Object.keys(current?.finalStats ?? {}) as StatKey[]),
    ...(Object.keys(candidate.finalStats) as StatKey[]),
  ])

  return [...keys].map((stat) => ({
    stat,
    delta: Number(((candidate.finalStats[stat] ?? 0) - (current?.finalStats[stat] ?? 0)).toFixed(3)),
  }))
}

export const buildArchetypeStarter = (archetypeId: ArchetypeId): HeroState => {
  const template = archetypeTable.find((entry) => entry.id === archetypeId)
  if (!template) throw new Error(`Unknown archetype ${archetypeId}`)

  let hero: HeroState = {
    id: `hero_${template.id}`,
    name: template.name,
    archetypeId: template.id,
    hp: HERO_STARTER_STATS.hp,
    maxHp: HERO_STARTER_STATS.maxHp,
    atk: HERO_STARTER_STATS.atk,
    def: HERO_STARTER_STATS.def,
    critChance: HERO_STARTER_STATS.critChance,
    critMultiplier: HERO_STARTER_STATS.critMultiplier,
    haste: HERO_STARTER_STATS.haste,
    equippedItems: {},
    tags: [...template.tags],
  }

  for (const slot of slotOrder) {
    const baseId = template.equippedBaseIds[slot]
    hero = equipItem(hero, generateItem(baseId, Rarity.Common, `${template.id}${slot}`.length * 13))
  }

  return hero
}
