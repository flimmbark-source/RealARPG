import type { Item } from './item'

export type FeedEntryType =
  | 'fight_won'
  | 'fight_lost'
  | 'loot_found'
  | 'chest_opened'
  | 'shrine_activated'
  | 'elite_spotted'
  | 'shrine_spotted'
  | 'opportunity_missed'
  | 'passive_summary'

export interface FeedEntry {
  id: string
  timestamp: number
  type: FeedEntryType
  summary: string
  details?: string
  loot?: Item[]
}
