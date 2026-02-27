import { describe, expect, it, beforeEach } from 'vitest'

import { clearSavedGame, loadGame, saveGame } from './save'
import { ARCHETYPE_STARTERS } from '../data/combatFixtures'
import type { SaveData } from '../types'

const sampleState = (): SaveData => ({
  hero: ARCHETYPE_STARTERS.thorns_warden,
  inventory: [],
  equippedItems: ARCHETYPE_STARTERS.thorns_warden.equippedItems,
  mapState: [],
  feedEntries: [],
  lastSaveTimestamp: 100,
  xp: 10,
  level: 2,
})

describe('save persistence', () => {
  beforeEach(() => {
    clearSavedGame()
  })

  it('round-trips save data', () => {
    const state = sampleState()
    saveGame(state)

    expect(loadGame()).toEqual(state)
  })

  it('returns null for corrupt payload', () => {
    localStorage.setItem('realarpg_save_v1', '{broken')

    expect(loadGame()).toBeNull()
  })
})
