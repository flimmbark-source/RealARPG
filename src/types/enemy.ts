export type EnemyTier = 'standard' | 'elite'

export interface Enemy {
  id: string
  name: string
  hp: number
  atk: number
  def: number
  critChance: number
  critMultiplier: number
  haste: number
  cooldown: number
  tags: string[]
  tier: EnemyTier
}

export interface EnemyGroup {
  enemies: Enemy[]
  context: string
}
