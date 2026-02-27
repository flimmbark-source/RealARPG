import type { EnemyGroup } from './enemy'
import type { StatKey } from './item'

export type EncounterType = 'standard' | 'elite'
export type DropSourceType =
  | 'standard_enemy'
  | 'elite_enemy'
  | 'common_chest'
  | 'elite_chest'

export enum ChestType {
  Common = 'common',
  Timed = 'timed',
  Cursed = 'cursed',
}

export enum ShrineType {
  Attack = 'attack',
  Defense = 'defense',
  Haste = 'haste',
}

export interface Encounter {
  id: string
  name?: string
  type: EncounterType
  enemies: EnemyGroup
  rewardTable: {
    dropCount: number
    sourceType: DropSourceType
  }
  dangerRating?: 'Safe' | 'Risky' | 'Deadly'
  // retreatPenalty: unknown // MVP_LATER
}

// Phase 3 schema extension: encounter/chest/shrine runtime and authored contracts.
export interface EncounterTemplate {
  id: string
  name: string
  type: EncounterType
  context: string
  enemyIds: string[]
  rewardTable: {
    dropCount: number
    sourceType: DropSourceType
  }
}

export interface ChestDefinition {
  type: ChestType
  dropSourceType: DropSourceType
  triggersEncounter: boolean
  encounterId: string | null
  dropCount: number
}

export interface ShrineDefinition {
  type: ShrineType
  name: string
  buff: {
    stat: Extract<StatKey, 'atk' | 'def' | 'haste'>
    value: number
  }
  durationEncounters: number
}

export type DangerLabel = 'Safe' | 'Risky' | 'Deadly'

export interface DangerResult {
  winRate: number
  avgDurationMs: number
  avgHpRemainingPercent: number
  label: DangerLabel
}
