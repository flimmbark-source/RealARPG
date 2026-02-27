export type BattleEventType =
  | 'attack'
  | 'crit'
  | 'status_apply'
  | 'status_tick'
  | 'status_expire'
  | 'barrier_absorb'
  | 'thorns_reflect'
  | 'kill'
  | 'hero_death'

export interface BattleEvent {
  timestamp: number
  source: string
  target: string
  type: BattleEventType
  value: number
  tags: string[]
}

export interface BattleResult {
  winner: 'hero' | 'enemies'
  durationMs: number
  events: BattleEvent[]
  hpRemaining: number
  damageDealt: number
  damageTaken: number
  seed: number
}
