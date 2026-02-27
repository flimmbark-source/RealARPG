import type { HeroState, MapNode, ProgressionState } from '../types'

export interface ProgressionBonuses {
  levelMaxHp: number
  levelAtk: number
  vitalityMaxHp: number
  focusCritChance: number
  explorationFindBonus: number
}

export const LEVEL_CAP = 10

export const STANDARD_ENCOUNTER_XP = 20
export const ELITE_ENCOUNTER_XP = 60

const clampSlider = (value: number): number => Math.max(0, Math.min(100, Math.round(value)))

export const createDefaultProgression = (): ProgressionState => ({
  level: 1,
  xp: 0,
  lifeStats: {
    vitality: 0,
    focus: 0,
    exploration: 0,
  },
})

export const xpToNextLevel = (level: number): number => 100 + Math.max(0, level - 1) * 10

export const gainXp = (progression: ProgressionState, amount: number): ProgressionState => {
  if (progression.level >= LEVEL_CAP || amount <= 0) return progression

  let level = progression.level
  let xp = progression.xp + amount

  while (level < LEVEL_CAP) {
    const threshold = xpToNextLevel(level)
    if (xp < threshold) break
    xp -= threshold
    level += 1
  }

  if (level >= LEVEL_CAP) {
    return { ...progression, level: LEVEL_CAP, xp: 0 }
  }

  return { ...progression, level, xp }
}

export const getEncounterXpReward = (nodeType: MapNode['type']): number => {
  if (nodeType === 'elite_fight') return ELITE_ENCOUNTER_XP
  if (nodeType === 'standard_fight') return STANDARD_ENCOUNTER_XP
  return 0
}

export const computeProgressionBonuses = (progression: ProgressionState): ProgressionBonuses => {
  const levelDelta = Math.max(0, progression.level - 1)
  const vitality = clampSlider(progression.lifeStats.vitality)
  const focus = clampSlider(progression.lifeStats.focus)
  const exploration = clampSlider(progression.lifeStats.exploration)

  return {
    levelMaxHp: levelDelta * 5,
    levelAtk: levelDelta,
    vitalityMaxHp: Math.round((vitality / 100) * 10),
    focusCritChance: Number(((focus / 100) * 0.02).toFixed(4)),
    explorationFindBonus: Number(((exploration / 100) * 0.04).toFixed(4)),
  }
}

export const applyProgressionToHero = (hero: HeroState, progression: ProgressionState): HeroState => {
  const bonuses = computeProgressionBonuses(progression)
  const bonusMaxHp = bonuses.levelMaxHp + bonuses.vitalityMaxHp
  const scaledHp = Math.min(hero.maxHp + bonusMaxHp, hero.hp + bonusMaxHp)

  return {
    ...hero,
    hp: scaledHp,
    maxHp: hero.maxHp + bonusMaxHp,
    atk: hero.atk + bonuses.levelAtk,
    critChance: Number((hero.critChance + bonuses.focusCritChance).toFixed(4)),
    findBonus: bonuses.explorationFindBonus,
  }
}

export const setLifeStat = (
  progression: ProgressionState,
  stat: keyof ProgressionState['lifeStats'],
  value: number,
): ProgressionState => ({
  ...progression,
  lifeStats: {
    ...progression.lifeStats,
    [stat]: clampSlider(value),
  },
})
