import type { EnemyGroup } from './enemy'

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
  type: EncounterType
  enemies: EnemyGroup
  rewardTable: {
    dropCount: number
    sourceType: DropSourceType
  }
  dangerRating?: 'Safe' | 'Risky' | 'Deadly'
  // retreatPenalty: unknown // MVP_LATER
}
