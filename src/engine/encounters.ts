import enemiesData from '../data/enemies.json'
import encountersData from '../data/encounters.json'
import { simulateBattle } from './combat'
import { generateItem, rollDrop } from './loot'
import {
  type ChestDefinition,
  type DangerLabel,
  type DangerResult,
  type Encounter,
  type EncounterTemplate,
  type Enemy,
  type HeroState,
  type ShrineDefinition,
} from '../types'

interface EnemyTemplateFile {
  templates: Array<Enemy & { actions: Array<{ id: string; name: string; damageScale: number }> }>
}

interface EncounterDataFile {
  encounters: EncounterTemplate[]
  chests: ChestDefinition[]
  shrines: ShrineDefinition[]
}

const enemyTable = enemiesData as EnemyTemplateFile
const encounterTable = encountersData as EncounterDataFile

const enemyById = new Map<string, Enemy>(
  enemyTable.templates.map(({ actions: _actions, ...enemy }) => [enemy.id, enemy]),
)

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

const roundTo = (value: number, places: number): number => {
  const p = 10 ** places
  return Math.round(value * p) / p
}

export const getEncounterTemplates = (): EncounterTemplate[] => encounterTable.encounters

export const getChestDefinitions = (): ChestDefinition[] => encounterTable.chests

export const getShrineDefinitions = (): ShrineDefinition[] => encounterTable.shrines

export const resolveEncounterTemplate = (templateId: string): Encounter => {
  const template = encounterTable.encounters.find((entry) => entry.id === templateId)
  if (!template) {
    throw new Error(`Unknown encounter template ${templateId}`)
  }

  const enemies = template.enemyIds.map((enemyId) => {
    const enemy = enemyById.get(enemyId)
    if (!enemy) {
      throw new Error(`Unknown enemy ${enemyId} in encounter ${template.id}`)
    }
    return { ...enemy }
  })

  return {
    id: template.id,
    name: template.name,
    type: template.type,
    enemies: {
      enemies,
      context: template.context,
    },
    rewardTable: {
      dropCount: template.rewardTable.dropCount,
      sourceType: template.rewardTable.sourceType,
    },
  }
}

const labelDanger = (winRate: number, avgHpRemainingPercent: number): DangerLabel => {
  if (winRate < 0.6 || avgHpRemainingPercent < 0.15) return 'Deadly'
  if (
    (winRate >= 0.6 && winRate <= 0.84) ||
    (avgHpRemainingPercent >= 0.15 && avgHpRemainingPercent <= 0.39)
  ) {
    return 'Risky'
  }
  if (winRate >= 0.85 && avgHpRemainingPercent >= 0.4) return 'Safe'
  return 'Risky'
}

export const calcDangerRating = (hero: HeroState, encounter: Encounter, baseSeed = 0): DangerResult => {
  const runs = 20
  let wins = 0
  let durationTotal = 0
  let hpTotal = 0

  for (let i = 0; i < runs; i += 1) {
    const result = simulateBattle(hero, encounter.enemies.enemies, baseSeed + i + 1)
    if (result.winner === 'hero') {
      wins += 1
    }
    durationTotal += result.durationMs
    hpTotal += result.hpRemaining / Math.max(1, hero.maxHp)
  }

  const winRate = roundTo(wins / runs, 3)
  const avgDurationMs = roundTo(durationTotal / runs, 2)
  const avgHpRemainingPercent = roundTo(clamp01(hpTotal / runs), 3)

  return {
    winRate,
    avgDurationMs,
    avgHpRemainingPercent,
    label: labelDanger(winRate, avgHpRemainingPercent),
  }
}

export const resolveEncounterReward = (encounter: Encounter, _hero: HeroState, seed: number) => {
  const rewards = []
  for (let i = 0; i < encounter.rewardTable.dropCount; i += 1) {
    const drop = rollDrop(encounter.rewardTable.sourceType, seed + i * 7919)
    rewards.push(generateItem(drop.baseId, drop.rarity, seed + i * 104729))
  }
  return rewards
}

export const applyShrineBuff = (hero: HeroState, shrine: ShrineDefinition): HeroState => {
  if (shrine.buff.stat === 'atk') {
    return { ...hero, atk: hero.atk + shrine.buff.value }
  }
  if (shrine.buff.stat === 'def') {
    return { ...hero, def: hero.def + shrine.buff.value }
  }
  return { ...hero, haste: hero.haste + shrine.buff.value }
}
