import { Rarity, type StatBlock } from './item'
import type { DropSourceType } from './encounter'

export const HERO_STARTER_STATS: Required<Pick<StatBlock, 'hp' | 'maxHp' | 'atk' | 'def' | 'critChance' | 'critMultiplier' | 'haste'>> = {
  hp: 120,
  maxHp: 120,
  atk: 12,
  def: 8,
  critChance: 0.05,
  critMultiplier: 1.5,
  haste: 0,
}

export const ENEMY_STAT_RANGES = {
  standard: {
    hp: { min: 40, max: 80 },
    atk: { min: 6, max: 12 },
    def: { min: 2, max: 6 },
    critChance: { min: 0, max: 0.05 },
  },
  elite: {
    hp: { min: 90, max: 140 },
    atk: { min: 12, max: 18 },
    def: { min: 6, max: 12 },
    critChance: { min: 0.03, max: 0.08 },
  },
} as const

export const RARITY_AFFIX_BUDGET = {
  [Rarity.Common]: { minAffixes: 0, maxAffixes: 1, totalBudget: 8 },
  [Rarity.Magic]: { minAffixes: 1, maxAffixes: 2, totalBudget: 18 },
  [Rarity.Rare]: { minAffixes: 2, maxAffixes: 3, totalBudget: 30 },
  [Rarity.Epic]: { minAffixes: 3, maxAffixes: 4, totalBudget: 45 },
  [Rarity.Legendary]: { minAffixes: 4, maxAffixes: 4, totalBudget: 60 },
} as const

export const DROP_RATE_TABLE: Record<DropSourceType, Record<Rarity, number>> = {
  standard_enemy: {
    [Rarity.Common]: 0.6,
    [Rarity.Magic]: 0.28,
    [Rarity.Rare]: 0.1,
    [Rarity.Epic]: 0.02,
    [Rarity.Legendary]: 0,
  },
  elite_enemy: {
    [Rarity.Common]: 0,
    [Rarity.Magic]: 0.3,
    [Rarity.Rare]: 0.42,
    [Rarity.Epic]: 0.22,
    [Rarity.Legendary]: 0.06,
  },
  common_chest: {
    [Rarity.Common]: 0,
    [Rarity.Magic]: 0.4,
    [Rarity.Rare]: 0.35,
    [Rarity.Epic]: 0.2,
    [Rarity.Legendary]: 0.05,
  },
  elite_chest: {
    [Rarity.Common]: 0,
    [Rarity.Magic]: 0,
    [Rarity.Rare]: 0.2,
    [Rarity.Epic]: 0.45,
    [Rarity.Legendary]: 0.3,
  },
}

export const calcDamageTaken = (rawDamage: number, defense: number): number =>
  rawDamage * (100 / (100 + defense * 4))

export const calcEffectiveCooldown = (baseCooldown: number, haste: number): number =>
  Math.max(baseCooldown * 0.4, baseCooldown / (1 + haste / 100))
