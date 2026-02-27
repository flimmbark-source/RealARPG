import { describe, expect, it } from 'vitest'

import { ARCHETYPE_STARTERS } from '../data/combatFixtures'
import { ChestType, Rarity, ShrineType, type EncounterType } from '../types'
import {
  applyShrineBuff,
  calcDangerRating,
  getChestDefinitions,
  getEncounterTemplates,
  getShrineDefinitions,
  resolveEncounterReward,
  resolveEncounterTemplate,
} from './encounters'
import { simulateBattle } from './combat'

describe('phase 3 encounter data (P3-1, P3-2)', () => {
  it('defines 8 encounter templates with 4 standard and 4 elite', () => {
    const templates = getEncounterTemplates()
    const counts: Record<EncounterType, number> = { standard: 0, elite: 0 }

    expect(templates).toHaveLength(8)
    for (const entry of templates) {
      counts[entry.type] += 1
      expect(entry.enemyIds.length).toBeGreaterThan(0)
      expect(entry.rewardTable.dropCount).toBeGreaterThanOrEqual(1)
      expect(entry.rewardTable.dropCount).toBeLessThanOrEqual(3)
    }

    expect(counts.standard).toBe(4)
    expect(counts.elite).toBe(4)
  })

  it('defines chest and shrine behavior contracts', () => {
    const chests = getChestDefinitions()
    const shrines = getShrineDefinitions()

    expect(chests).toHaveLength(3)
    expect(shrines).toHaveLength(3)

    const chestByType = new Map<ChestType, (typeof chests)[number]>(
      chests.map((entry) => [entry.type, entry]),
    )
    expect(chestByType.get(ChestType.Common)?.dropSourceType).toBe('common_chest')
    expect(chestByType.get(ChestType.Timed)?.dropSourceType).toBe('common_chest')
    expect(chestByType.get(ChestType.Cursed)?.dropSourceType).toBe('elite_chest')
    expect(chestByType.get(ChestType.Cursed)?.triggersEncounter).toBe(true)

    const shrineByType = new Map<ShrineType, (typeof shrines)[number]>(
      shrines.map((entry) => [entry.type, entry]),
    )
    expect(shrineByType.get(ShrineType.Attack)?.buff.stat).toBe('atk')
    expect(shrineByType.get(ShrineType.Defense)?.buff.stat).toBe('def')
    expect(shrineByType.get(ShrineType.Haste)?.buff.stat).toBe('haste')
    expect(shrines.every((entry) => entry.durationEncounters === 3)).toBe(true)
  })
})

describe('phase 3 danger + rewards (P3-3, P3-4)', () => {
  it('rates strong vs weak as Safe and starter vs elite as Risky/Deadly', () => {
    const strongHero = {
      ...ARCHETYPE_STARTERS.crit_hunter,
      id: 'strong_hero',
      name: 'Strong Hero',
      atk: ARCHETYPE_STARTERS.crit_hunter.atk + 20,
      def: ARCHETYPE_STARTERS.crit_hunter.def + 15,
      hp: ARCHETYPE_STARTERS.crit_hunter.maxHp + 80,
      maxHp: ARCHETYPE_STARTERS.crit_hunter.maxHp + 80,
      critChance: 0.5,
      critMultiplier: 2.5,
    }

    const standardEncounter = resolveEncounterTemplate('enc_standard_scrap_lane')
    const eliteEncounter = resolveEncounterTemplate('enc_elite_hydra_warren')

    const safe = calcDangerRating(strongHero, standardEncounter, 10)
    const weakHero = {
      ...ARCHETYPE_STARTERS.thorns_warden,
      hp: 80,
      maxHp: 80,
      atk: 8,
      def: 4,
      critChance: 0.02,
      critMultiplier: 1.3,
    }
    const hard = calcDangerRating(weakHero, eliteEncounter, 100)

    expect(safe.label).toBe('Safe')
    expect(['Risky', 'Deadly']).toContain(hard.label)
    expect(safe.winRate).toBeGreaterThanOrEqual(0.85)
  })

  it('resolves rewards with encounter source and blocks legendary in 100 standard resolves', () => {
    const encounter = resolveEncounterTemplate('enc_standard_bone_crossfire')

    let totalItems = 0
    for (let i = 0; i < 100; i += 1) {
      const rewards = resolveEncounterReward(encounter, ARCHETYPE_STARTERS.frost_mystic, 2_000 + i)
      totalItems += rewards.length
      for (const item of rewards) {
        expect(item.rarity).not.toBe(Rarity.Legendary)
      }
    }

    expect(totalItems).toBeGreaterThanOrEqual(100)
    expect(totalItems).toBeLessThanOrEqual(300)
  })
})

describe('phase 3 integration flow (P3-5)', () => {
  it('runs encounter preview -> combat -> reward and shrine buff affects danger', () => {
    const hero = ARCHETYPE_STARTERS.poison_rogue
    const encounter = resolveEncounterTemplate('enc_elite_venom_host')

    const before = calcDangerRating(hero, encounter, 9_000)
    const battle = simulateBattle(hero, encounter.enemies.enemies, 9_777)
    const rewards = resolveEncounterReward(encounter, hero, 9_888)

    expect(['Safe', 'Risky', 'Deadly']).toContain(before.label)
    expect(['hero', 'enemies']).toContain(battle.winner)
    expect(rewards.length).toBeGreaterThanOrEqual(1)
    expect(rewards.length).toBeLessThanOrEqual(3)

    const attackShrine = getShrineDefinitions().find((entry) => entry.type === ShrineType.Attack)
    if (!attackShrine) throw new Error('missing attack shrine')

    const buffedHero = applyShrineBuff(hero, attackShrine)
    const after = calcDangerRating(buffedHero, encounter, 9_000)

    expect(after.winRate).toBeGreaterThanOrEqual(before.winRate)
  })
})
