import { describe, expect, it } from 'vitest'

import {
  type Affix,
  type BattleEvent,
  type BattleResult,
  ChestType,
  type Encounter,
  type Enemy,
  type EnemyGroup,
  type FeedEntry,
  HERO_STARTER_STATS,
  type HeroState,
  type Item,
  type ItemBase,
  ItemSlot,
  type MapNode,
  Rarity,
  ShrineType,
  type SaveData,
} from './index'

describe('phase 0 type instantiation', () => {
  it('instantiates all required schemas with valid mock data', () => {
    const itemBase: ItemBase = {
      id: 'base_sword_01',
      name: 'Iron Sword',
      slot: ItemSlot.Weapon,
      baseStats: { atk: 4, cooldown: 0 },
      tags: ['melee', 'physical'],
      allowedAffixTags: ['crit', 'bleed'],
    }

    const affix: Affix = {
      id: 'affix_sharp',
      name: 'Sharp',
      stat: 'atk',
      range: { min: 1, max: 3 },
      tags: ['physical'],
      slotRestrictions: [ItemSlot.Weapon],
      rarityWeighting: {
        [Rarity.Common]: 0.2,
        [Rarity.Magic]: 0.4,
      },
    }

    const item: Item = {
      instanceId: 'item_1',
      baseId: itemBase.id,
      name: itemBase.name,
      slot: itemBase.slot,
      rarity: Rarity.Magic,
      affixes: [{ affixId: affix.id, stat: affix.stat, value: 2 }],
      finalStats: { atk: 6, cooldown: 0 },
      isLegendary: false,
      tags: ['melee', 'physical'],
      seed: 42,
    }

    const hero: HeroState = {
      id: 'hero_1',
      name: 'Starter Hero',
      archetypeId: 'thorns_warden',
      hp: HERO_STARTER_STATS.hp,
      maxHp: HERO_STARTER_STATS.maxHp,
      atk: HERO_STARTER_STATS.atk,
      def: HERO_STARTER_STATS.def,
      critChance: HERO_STARTER_STATS.critChance,
      critMultiplier: HERO_STARTER_STATS.critMultiplier,
      haste: HERO_STARTER_STATS.haste,
      equippedItems: { [ItemSlot.Weapon]: item },
      tags: ['warden'],
    }

    const enemy: Enemy = {
      id: 'enemy_1',
      name: 'Goblin',
      hp: 50,
      atk: 8,
      def: 3,
      critChance: 0.02,
      critMultiplier: 1.5,
      haste: 0,
      cooldown: 2,
      tags: ['melee'],
      tier: 'standard',
    }

    const enemyGroup: EnemyGroup = {
      enemies: [enemy],
      context: 'forest_edge',
    }

    const encounter: Encounter = {
      id: 'enc_1',
      type: 'standard',
      enemies: enemyGroup,
      rewardTable: { dropCount: 1, sourceType: 'standard_enemy' },
      dangerRating: 'Safe',
    }

    const node: MapNode = {
      id: 'node_1',
      type: 'standard_fight',
      position: { x: 100, y: 200 },
      encounterId: encounter.id,
      state: 'available',
      chestType: ChestType.Common,
      shrineType: ShrineType.Attack,
    }

    const event: BattleEvent = {
      timestamp: 100,
      source: hero.id,
      target: enemy.id,
      type: 'attack',
      value: 12,
      tags: ['physical'],
    }

    const result: BattleResult = {
      winner: 'hero',
      durationMs: 2_000,
      events: [event],
      hpRemaining: 100,
      damageDealt: 40,
      damageTaken: 20,
      seed: 99,
    }

    const feedEntry: FeedEntry = {
      id: 'feed_1',
      timestamp: Date.now(),
      type: 'fight_won',
      summary: 'You defeated a goblin.',
      details: 'Clean win with minor damage.',
      loot: [item],
    }

    const saveData: SaveData = {
      hero,
      inventory: [item],
      equippedItems: { [ItemSlot.Weapon]: item },
      mapState: [node],
      feedEntries: [feedEntry],
      lastSaveTimestamp: Date.now(),
      progression: {
        level: 1,
        xp: 0,
        lifeStats: { vitality: 0, focus: 0, exploration: 0 },
      },
    }

    expect(result.winner).toBe('hero')
    expect(saveData.inventory).toHaveLength(1)
    expect(saveData.mapState[0].state).toBe('available')
  })
})
