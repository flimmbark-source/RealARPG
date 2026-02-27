import type { ChestType, ShrineType } from './encounter'

export type NodeType =
  | 'standard_fight'
  | 'elite_fight'
  | 'common_chest'
  | 'timed_chest'
  | 'cursed_chest'
  | 'shrine'

export type NodeState = 'available' | 'cleared' | 'expired'

export interface MapNode {
  id: string
  type: NodeType
  position: {
    x: number
    y: number
  }
  encounterId?: string
  reward?: string
  expiresAt?: number
  state: NodeState
  chestType?: ChestType
  shrineType?: ShrineType
}
