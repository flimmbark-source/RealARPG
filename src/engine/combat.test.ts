import { describe, expect, it } from 'vitest'

import { ARCHETYPE_STARTERS, ENEMY_GROUPS, ENEMY_TEMPLATES } from '../data/combatFixtures'
import type { HeroState } from '../types'
import { simulateBattle } from './combat'

const getEnemy = (id: string) => {
  const enemy = ENEMY_TEMPLATES.find((entry) => entry.id === id)
  if (!enemy) {
    throw new Error(`missing enemy template ${id}`)
  }
  return enemy
}

const firstEnemyHit = (result: ReturnType<typeof simulateBattle>): number => {
  const event = result.events.find((entry) => entry.type === 'attack' && entry.source !== 'hero' && entry.target === 'hero')
  if (!event) {
    throw new Error('expected at least one enemy attack event')
  }
  return event.value
}

describe('simulateBattle', () => {
  it('is deterministic for identical input and seed', () => {
    const hero = ARCHETYPE_STARTERS.thorns_warden
    const enemies = [getEnemy('standard_scavenger')]

    const first = simulateBattle(hero, enemies, 101)
    const second = simulateBattle(hero, enemies, 101)

    expect(second).toEqual(first)
  })

  it('high defense hero takes less per-hit damage than low defense hero', () => {
    const enemy = [getEnemy('elite_iron_reaver')]

    const base: HeroState = {
      ...ARCHETYPE_STARTERS.thorns_warden,
      tags: ['test'],
      archetypeId: 'frost_mystic',
    }

    const highDef: HeroState = { ...base, id: 'high_def', def: 24, hp: 140, maxHp: 140, name: 'High Def' }
    const lowDef: HeroState = { ...base, id: 'low_def', def: 4, hp: 140, maxHp: 140, name: 'Low Def' }

    const highDefHit = firstEnemyHit(simulateBattle(highDef, enemy, 42))
    const lowDefHit = firstEnemyHit(simulateBattle(lowDef, enemy, 42))

    expect(highDefHit).toBeLessThan(lowDefHit)
  })

  it('high crit hero deals more average damage than low crit hero over many fights', () => {
    const enemy = [getEnemy('elite_frost_keeper')]

    const base: HeroState = {
      ...ARCHETYPE_STARTERS.crit_hunter,
      tags: ['test'],
      hp: 180,
      maxHp: 180,
      atk: 14,
      def: 12,
      haste: 8,
      name: 'Crit Baseline',
    }

    const highCrit: HeroState = {
      ...base,
      id: 'high_crit',
      critChance: 0.6,
      critMultiplier: 2.4,
    }

    const lowCrit: HeroState = {
      ...base,
      id: 'low_crit',
      critChance: 0,
      critMultiplier: 1.2,
    }

    let highCritDamage = 0
    let lowCritDamage = 0

    for (let i = 0; i < 120; i += 1) {
      highCritDamage += simulateBattle(highCrit, enemy, 1_000 + i).damageDealt
      lowCritDamage += simulateBattle(lowCrit, enemy, 1_000 + i).damageDealt
    }

    expect(highCritDamage / 120).toBeGreaterThan(lowCritDamage / 120)
  })

  it('applies poison ticks for poison rogue', () => {
    const result = simulateBattle(ARCHETYPE_STARTERS.poison_rogue, [getEnemy('elite_venom_matron')], 55)
    const poisonTicks = result.events.filter((entry) => entry.type === 'status_tick' && entry.tags.includes('poison'))
    expect(poisonTicks.length).toBeGreaterThan(0)
  })

  it('applies frost status for frost mystic in most runs', () => {
    let applied = 0
    const runs = 25

    for (let i = 0; i < runs; i += 1) {
      const result = simulateBattle(ARCHETYPE_STARTERS.frost_mystic, [getEnemy('standard_bone_archer')], 700 + i)
      if (result.events.some((entry) => entry.type === 'status_apply' && entry.tags.includes('frost'))) {
        applied += 1
      }
    }

    expect(applied / runs).toBeGreaterThan(0.8)
  })

  it('thorns warden reflects damage through thorns and barrier', () => {
    const result = simulateBattle(ARCHETYPE_STARTERS.thorns_warden, [getEnemy('elite_war_hydra')], 88)

    expect(result.events.some((entry) => entry.type === 'thorns_reflect')).toBe(true)
    expect(result.events.some((entry) => entry.type === 'barrier_absorb')).toBe(true)
  })

  it('crit hunter produces highest single hit among archetypes', () => {
    const enemy = [getEnemy('elite_frost_keeper')]
    const archetypes = Object.values(ARCHETYPE_STARTERS)

    const bestHitByArchetype = archetypes.map((hero, idx) => {
      let best = 0
      for (let i = 0; i < 12; i += 1) {
        const result = simulateBattle(hero, enemy, idx * 1_000 + i)
        for (const event of result.events) {
          if (event.type === 'attack') {
            best = Math.max(best, event.value)
          }
        }
      }
      return { id: hero.archetypeId, best }
    })

    const best = [...bestHitByArchetype].sort((a, b) => b.best - a.best)[0]
    expect(best.id).toBe('crit_hunter')
  })

  it('archetype differentiation smoke: 25 runs each under 200ms total', () => {
    const enemyPool = ENEMY_GROUPS.slice(0, 4)

    const start = performance.now()
    for (const hero of Object.values(ARCHETYPE_STARTERS)) {
      for (let i = 0; i < 25; i += 1) {
        const group = enemyPool[i % enemyPool.length]
        simulateBattle(hero, group.enemies, 9_000 + i)
      }
    }
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(200)
  })

  it('single standard fight completes in under 5ms', () => {
    const start = performance.now()
    simulateBattle(ARCHETYPE_STARTERS.frost_mystic, [getEnemy('standard_ice_imp')], 321)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(5)
  })
})
