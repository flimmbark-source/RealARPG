import enemiesData from './enemies.json'
import { type Enemy, type HeroState } from '../types'
import { buildArchetypeStarter } from '../engine/loot'

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

export const ARCHETYPE_STARTERS: Record<HeroState['archetypeId'], HeroState> = {
  thorns_warden: buildArchetypeStarter('thorns_warden'),
  poison_rogue: buildArchetypeStarter('poison_rogue'),
  frost_mystic: buildArchetypeStarter('frost_mystic'),
  crit_hunter: buildArchetypeStarter('crit_hunter'),
}
