import { describe, expect, it } from 'vitest'

import { ARCHETYPE_STARTERS } from '../data/combatFixtures'
import {
  applyProgressionToHero,
  computeProgressionBonuses,
  createDefaultProgression,
  ELITE_ENCOUNTER_XP,
  gainXp,
  getEncounterXpReward,
  LEVEL_CAP,
  setLifeStat,
  STANDARD_ENCOUNTER_XP,
  xpToNextLevel,
} from './progression'

describe('progression engine', () => {
  it('awards encounter XP by node type', () => {
    expect(getEncounterXpReward('standard_fight')).toBe(STANDARD_ENCOUNTER_XP)
    expect(getEncounterXpReward('elite_fight')).toBe(ELITE_ENCOUNTER_XP)
    expect(getEncounterXpReward('shrine')).toBe(0)
  })

  it('levels up with mild XP scaling and respects level cap', () => {
    let progression = createDefaultProgression()

    progression = gainXp(progression, 100)
    expect(progression.level).toBe(2)
    expect(progression.xp).toBe(0)

    progression = gainXp(progression, 110 + 120 + 130 + 140 + 150 + 160 + 170 + 180)
    expect(progression.level).toBe(LEVEL_CAP)
    expect(progression.xp).toBe(0)
  })

  it('applies level and life-stat bonuses in small ranges', () => {
    let progression = createDefaultProgression()
    progression = gainXp(progression, xpToNextLevel(1) + 50)
    progression = setLifeStat(progression, 'vitality', 100)
    progression = setLifeStat(progression, 'focus', 100)
    progression = setLifeStat(progression, 'exploration', 100)

    const bonuses = computeProgressionBonuses(progression)
    expect(bonuses.levelMaxHp).toBe(5)
    expect(bonuses.levelAtk).toBe(1)
    expect(bonuses.vitalityMaxHp).toBe(10)
    expect(bonuses.focusCritChance).toBe(0.02)
    expect(bonuses.explorationFindBonus).toBe(0.04)

    const adjusted = applyProgressionToHero(ARCHETYPE_STARTERS.thorns_warden, progression)
    expect(adjusted.maxHp).toBeGreaterThan(ARCHETYPE_STARTERS.thorns_warden.maxHp)
    expect(adjusted.critChance).toBeGreaterThan(ARCHETYPE_STARTERS.thorns_warden.critChance)
    expect(adjusted.findBonus).toBe(0.04)
  })
})
