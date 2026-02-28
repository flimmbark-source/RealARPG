import { describe, expect, it } from 'vitest'

import { ARCHETYPE_STARTERS, ENEMY_TEMPLATES } from '../data/combatFixtures'
import { Rarity } from '../types'
import { simulateBattle } from './combat'
import { compareItems, equipItem, generateItem, getItemBases, rollDrop, unequipItem } from './loot'

describe('loot engine', () => {
  it('generates deterministic compatible items across rarities', () => {
    const bases = getItemBases().slice(0, 8)
    const rarities = [Rarity.Common, Rarity.Magic, Rarity.Rare, Rarity.Epic]

    for (let i = 0; i < 30; i += 1) {
      const base = bases[i % bases.length]
      const rarity = rarities[i % rarities.length]
      const first = generateItem(base.id, rarity, 1000 + i)
      const second = generateItem(base.id, rarity, 1000 + i)

      expect(first).toEqual(second)
      expect(first.affixes.length).toBeGreaterThanOrEqual(rarity === Rarity.Common ? 0 : 1)
      expect(first.finalStats.cooldown).toBeTypeOf('number')
      for (const affix of first.affixes) {
        expect(base.allowedAffixTags.some((tag) => first.tags.includes(tag) || tag)).toBeTruthy()
        expect(affix.value).toBeTypeOf('number')
      }
    }
  })

  it('rollDrop follows source distributions within tolerance', () => {
    const samples = 1000
    const cases = [
      { source: 'standard_enemy', expected: { Common: 0.6, Magic: 0.28, Rare: 0.1, Epic: 0.02, Legendary: 0 } },
      { source: 'elite_enemy', expected: { Common: 0, Magic: 0.3, Rare: 0.42, Epic: 0.22, Legendary: 0.06 } },
      { source: 'common_chest', expected: { Common: 0, Magic: 0.4, Rare: 0.35, Epic: 0.2, Legendary: 0.05 } },
      { source: 'elite_chest', expected: { Common: 0, Magic: 0, Rare: 0.2, Epic: 0.45, Legendary: 0.3 } },
    ] as const

    for (const testCase of cases) {
      const tally = { Common: 0, Magic: 0, Rare: 0, Epic: 0, Legendary: 0 }
      for (let i = 0; i < samples; i += 1) {
        const drop = rollDrop(testCase.source, 20_000 + i)
        tally[drop.rarity] += 1
      }

      for (const rarity of Object.keys(tally) as Array<keyof typeof tally>) {
        const actual = tally[rarity] / samples
        expect(actual).toBeGreaterThanOrEqual(Math.max(0, testCase.expected[rarity] - 0.05))
        expect(actual).toBeLessThanOrEqual(testCase.expected[rarity] + 0.05)
      }
    }
  })

  it('equip and unequip recalculates stats and changes combat outcomes', () => {
    const baseHero = ARCHETYPE_STARTERS.crit_hunter
    const weapon = generateItem('weapon_hunter_bow', Rarity.Rare, 77)
    const enemy = [ENEMY_TEMPLATES[0]]

    const unarmed = unequipItem(baseHero, weapon.slot)
    const armed = equipItem(unarmed, weapon)

    const unarmedResult = simulateBattle(unarmed, enemy, 301)
    const armedResult = simulateBattle(armed, enemy, 301)

    expect(armed.atk).toBeGreaterThan(unarmed.atk)
    expect(armedResult.damageDealt).toBeGreaterThan(unarmedResult.damageDealt)
  })

  it('compareItems returns per-stat deltas including empty-slot case', () => {
    const hero = ARCHETYPE_STARTERS.frost_mystic
    const current = hero.equippedItems.weapon
    const candidate = generateItem('weapon_glacier_staff', Rarity.Epic, 505)

    const withCurrent = compareItems(current, candidate, hero)
    const fromEmpty = compareItems(undefined, candidate, hero)

    expect(withCurrent.some((entry) => entry.stat === 'atk')).toBe(true)
    expect(fromEmpty.every((entry) => entry.delta >= 0)).toBe(true)
  })
})
