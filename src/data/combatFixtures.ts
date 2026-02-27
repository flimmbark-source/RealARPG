import enemiesData from './enemies.json'
import { HERO_STARTER_STATS, ItemSlot, type Enemy, type HeroState } from '../types'

interface EnemyTemplateFile {
  templates: Array<Enemy & { actions: Array<{ id: string; name: string; damageScale: number }> }>
}

const typedEnemies = enemiesData as EnemyTemplateFile

export const ENEMY_TEMPLATES: Enemy[] = typedEnemies.templates.map(({ actions: _actions, ...enemy }) => enemy)

export const ENEMY_GROUPS: Array<{ id: string; name: string; enemies: Enemy[] }> = ENEMY_TEMPLATES.map((enemy) => ({
  id: `${enemy.id}_group`,
  name: enemy.name,
  enemies: [enemy],
}))

const noItems = {
  [ItemSlot.Weapon]: undefined,
  [ItemSlot.Offhand]: undefined,
  [ItemSlot.Armor]: undefined,
  [ItemSlot.Boots]: undefined,
  [ItemSlot.Ring]: undefined,
  [ItemSlot.Amulet]: undefined,
  [ItemSlot.Relic]: undefined,
}

export const ARCHETYPE_STARTERS: Record<HeroState['archetypeId'], HeroState> = {
  thorns_warden: {
    id: 'hero_thorns_warden',
    name: 'Thorns Warden',
    archetypeId: 'thorns_warden',
    hp: 156,
    maxHp: 156,
    atk: 10,
    def: 20,
    critChance: 0.05,
    critMultiplier: 1.5,
    haste: 4,
    equippedItems: noItems,
    tags: ['warden', 'thorns', 'barrier', 'physical'],
  },
  poison_rogue: {
    id: 'hero_poison_rogue',
    name: 'Poison Rogue',
    archetypeId: 'poison_rogue',
    hp: 112,
    maxHp: 112,
    atk: 13,
    def: 8,
    critChance: 0.22,
    critMultiplier: 1.75,
    haste: 18,
    equippedItems: noItems,
    tags: ['rogue', 'poison', 'dagger', 'physical'],
  },
  frost_mystic: {
    id: 'hero_frost_mystic',
    name: 'Frost Mystic',
    archetypeId: 'frost_mystic',
    hp: 124,
    maxHp: 124,
    atk: 12,
    def: 10,
    critChance: 0.12,
    critMultiplier: 1.6,
    haste: 8,
    equippedItems: noItems,
    tags: ['mystic', 'frost', 'control', 'splash'],
  },
  crit_hunter: {
    id: 'hero_crit_hunter',
    name: 'Crit Hunter',
    archetypeId: 'crit_hunter',
    hp: HERO_STARTER_STATS.hp,
    maxHp: HERO_STARTER_STATS.maxHp,
    atk: 15,
    def: HERO_STARTER_STATS.def,
    critChance: 0.3,
    critMultiplier: 2.1,
    haste: 10,
    equippedItems: noItems,
    tags: ['hunter', 'crit', 'bow', 'single_target'],
  },
}
