import { calcDamageTaken, calcEffectiveCooldown, type BattleEvent, type BattleResult, type Enemy, type HeroState } from '../types'

interface Rng {
  next: () => number
}

interface StatusEffectState {
  id: number
  type: 'poison' | 'bleed' | 'frost'
  source: 'hero' | string
  target: 'hero' | string
  value: number
  expiresAt: number
  nextTickAt: number
}

interface CombatantState {
  id: 'hero' | string
  name: string
  hp: number
  maxHp: number
  atk: number
  def: number
  critChance: number
  critMultiplier: number
  haste: number
  baseCooldown: number
  tags: string[]
  isHero: boolean
  nextActionAt: number
  alive: boolean
  barrier: number
  thorns: number
  openerBonus: number
}

const createRng = (seed: number): Rng => {
  let state = seed >>> 0
  return {
    next: () => {
      state = (1664525 * state + 1013904223) >>> 0
      return state / 0x100000000
    },
  }
}

const createHeroCombatant = (hero: HeroState): CombatantState => ({
  id: 'hero',
  name: hero.name,
  hp: hero.hp,
  maxHp: hero.maxHp,
  atk: hero.atk,
  def: hero.def,
  critChance: hero.critChance,
  critMultiplier: hero.critMultiplier,
  haste: hero.haste,
  baseCooldown: 2,
  tags: hero.tags,
  isHero: true,
  nextActionAt: 0,
  alive: true,
  barrier: hero.archetypeId === 'thorns_warden' ? 16 : 0,
  thorns: hero.archetypeId === 'thorns_warden' ? 0.22 : 0,
  openerBonus: hero.archetypeId === 'crit_hunter' ? 0.65 : 0,
})

const createEnemyCombatant = (enemy: Enemy, index: number): CombatantState => ({
  id: `${enemy.id}_${index}`,
  name: enemy.name,
  hp: enemy.hp,
  maxHp: enemy.hp,
  atk: enemy.atk,
  def: enemy.def,
  critChance: enemy.critChance,
  critMultiplier: enemy.critMultiplier,
  haste: enemy.haste,
  baseCooldown: enemy.cooldown,
  tags: enemy.tags,
  isHero: false,
  nextActionAt: 0,
  alive: true,
  barrier: 0,
  thorns: 0,
  openerBonus: 0,
})

const emit = (events: BattleEvent[], event: BattleEvent): void => {
  events.push(event)
}

const livingEnemies = (enemies: CombatantState[]): CombatantState[] => enemies.filter((enemy) => enemy.alive)

const chooseEnemyTarget = (enemies: CombatantState[], rng: Rng): CombatantState => {
  const alive = livingEnemies(enemies)
  const index = Math.floor(rng.next() * alive.length)
  return alive[index]
}

const chooseHeroTarget = (hero: CombatantState): CombatantState => hero

const applyIncomingDamage = (
  target: CombatantState,
  damage: number,
  timestamp: number,
  source: CombatantState,
  events: BattleEvent[],
): number => {
  let remaining = damage

  if (target.barrier > 0 && remaining > 0) {
    const absorbed = Math.min(target.barrier, remaining)
    target.barrier -= absorbed
    remaining -= absorbed
    emit(events, {
      timestamp,
      source: source.id,
      target: target.id,
      type: 'barrier_absorb',
      value: absorbed,
      tags: ['barrier'],
    })
  }

  if (remaining > 0) {
    target.hp = Math.max(0, target.hp - remaining)
  }

  return remaining
}

const applyHeroTriggers = (
  hero: CombatantState,
  target: CombatantState,
  statuses: StatusEffectState[],
  now: number,
  statusIdRef: { value: number },
  events: BattleEvent[],
): void => {
  if (hero.tags.includes('poison') || hero.id === 'hero') {
    // Archetype-specific trigger handling
  }

  if (hero.tags.includes('poison') || hero.name.includes('Rogue')) {
    const status: StatusEffectState = {
      id: statusIdRef.value++,
      type: 'poison',
      source: hero.id,
      target: target.id,
      value: 2.8,
      expiresAt: now + 6,
      nextTickAt: now + 1,
    }
    statuses.push(status)
    emit(events, {
      timestamp: now,
      source: hero.id,
      target: target.id,
      type: 'status_apply',
      value: status.value,
      tags: ['poison', 'on_hit'],
    })
  }

  if (hero.tags.includes('frost') || hero.name.includes('Mystic')) {
    const status: StatusEffectState = {
      id: statusIdRef.value++,
      type: 'frost',
      source: hero.id,
      target: target.id,
      value: 0.3,
      expiresAt: now + 4,
      nextTickAt: Number.POSITIVE_INFINITY,
    }
    statuses.push(status)
    emit(events, {
      timestamp: now,
      source: hero.id,
      target: target.id,
      type: 'status_apply',
      value: Math.round(status.value * 100),
      tags: ['frost', 'on_hit'],
    })
  }

  if (hero.name.includes('Hunter')) {
    const status: StatusEffectState = {
      id: statusIdRef.value++,
      type: 'bleed',
      source: hero.id,
      target: target.id,
      value: 1.8,
      expiresAt: now + 3,
      nextTickAt: now + 1,
    }
    statuses.push(status)
    emit(events, {
      timestamp: now,
      source: hero.id,
      target: target.id,
      type: 'status_apply',
      value: status.value,
      tags: ['bleed', 'on_crit'],
    })
  }
}

const getFrostMultiplier = (statuses: StatusEffectState[], targetId: string, now: number): number => {
  const hasFrost = statuses.some(
    (status) => status.type === 'frost' && status.target === targetId && status.expiresAt > now,
  )
  return hasFrost ? 1.3 : 1
}

const processStatusTicks = (
  now: number,
  statuses: StatusEffectState[],
  hero: CombatantState,
  enemies: CombatantState[],
  events: BattleEvent[],
): void => {
  const active = [...statuses]
  for (const status of active) {
    if (status.nextTickAt !== now || status.expiresAt <= now) {
      continue
    }

    const target = status.target === 'hero' ? hero : enemies.find((enemy) => enemy.id === status.target)
    if (!target || !target.alive) {
      status.expiresAt = now
      continue
    }

    const tickDamage = status.type === 'poison' ? status.value : status.value * 1.15
    applyIncomingDamage(target, tickDamage, now, hero, events)
    emit(events, {
      timestamp: now,
      source: status.source,
      target: status.target,
      type: 'status_tick',
      value: tickDamage,
      tags: [status.type],
    })

    status.nextTickAt += 1
    if (status.nextTickAt >= status.expiresAt) {
      status.expiresAt = now
      emit(events, {
        timestamp: now,
        source: status.source,
        target: status.target,
        type: 'status_expire',
        value: 0,
        tags: [status.type],
      })
    }

    if (target.hp <= 0 && target.alive) {
      target.alive = false
      emit(events, {
        timestamp: now,
        source: status.source,
        target: target.id,
        type: 'kill',
        value: 0,
        tags: [status.type],
      })
    }
  }

  for (let i = statuses.length - 1; i >= 0; i -= 1) {
    if (statuses[i].expiresAt <= now) {
      statuses.splice(i, 1)
    }
  }
}

export const simulateBattle = (heroInput: HeroState, enemiesInput: Enemy[], seed: number): BattleResult => {
  const rng = createRng(seed)
  const hero = createHeroCombatant(heroInput)
  const enemies = enemiesInput.map(createEnemyCombatant)
  const events: BattleEvent[] = []
  const statuses: StatusEffectState[] = []
  const statusIdRef = { value: 0 }

  let now = 0
  let damageDealt = 0
  let damageTaken = 0
  let loopCount = 0

  if (hero.openerBonus > 0) {
    emit(events, {
      timestamp: 0,
      source: hero.id,
      target: hero.id,
      type: 'status_apply',
      value: Math.round(hero.openerBonus * 100),
      tags: ['combat_start', 'opener'],
    })
  }

  while (hero.alive && livingEnemies(enemies).length > 0 && loopCount < 10_000) {
    loopCount += 1

    const nextAction = Math.min(hero.nextActionAt, ...livingEnemies(enemies).map((enemy) => enemy.nextActionAt))
    const nextTick = statuses.length > 0 ? Math.min(...statuses.map((status) => status.nextTickAt)) : Number.POSITIVE_INFINITY
    now = Math.min(nextAction, nextTick)

    processStatusTicks(now, statuses, hero, enemies, events)

    const actors = [hero, ...livingEnemies(enemies)]
      .filter((actor) => actor.nextActionAt === now)
      .sort((a, b) => Number(b.isHero) - Number(a.isHero))

    for (const actor of actors) {
      if (!actor.alive || !hero.alive || livingEnemies(enemies).length === 0) {
        continue
      }

      const target = actor.isHero ? chooseEnemyTarget(enemies, rng) : chooseHeroTarget(hero)
      const roll = rng.next()
      const isCrit = roll < actor.critChance
      const openerMultiplier = actor.isHero ? 1 + actor.openerBonus : 1
      const critMultiplier = isCrit ? actor.critMultiplier : 1
      const rawDamage = actor.atk * openerMultiplier * critMultiplier
      const resolvedDamage = calcDamageTaken(rawDamage, target.def)

      if (isCrit) {
        emit(events, {
          timestamp: now,
          source: actor.id,
          target: target.id,
          type: 'crit',
          value: rawDamage,
          tags: ['crit'],
        })
      }

      const hpDamage = applyIncomingDamage(target, resolvedDamage, now, actor, events)

      emit(events, {
        timestamp: now,
        source: actor.id,
        target: target.id,
        type: 'attack',
        value: hpDamage,
        tags: actor.isHero ? hero.tags : actor.tags,
      })

      if (actor.isHero) {
        damageDealt += hpDamage
        if (heroInput.archetypeId === 'poison_rogue' || heroInput.archetypeId === 'frost_mystic' || heroInput.archetypeId === 'crit_hunter') {
          applyHeroTriggers(hero, target, statuses, now, statusIdRef, events)
        }
        hero.openerBonus = 0
      } else {
        damageTaken += hpDamage
        if (hero.thorns > 0 && hpDamage > 0) {
          const reflectedRaw = actor.atk * hero.thorns
          const reflected = calcDamageTaken(reflectedRaw, actor.def)
          const reflectedDamage = applyIncomingDamage(actor, reflected, now, hero, events)
          damageDealt += reflectedDamage
          emit(events, {
            timestamp: now,
            source: hero.id,
            target: actor.id,
            type: 'thorns_reflect',
            value: reflectedDamage,
            tags: ['thorns', 'on_take_damage'],
          })
        }
      }

      if (target.hp <= 0 && target.alive) {
        target.alive = false
        emit(events, {
          timestamp: now,
          source: actor.id,
          target: target.id,
          type: target.isHero ? 'hero_death' : 'kill',
          value: 0,
          tags: ['lethal'],
        })

        if (actor.isHero && heroInput.archetypeId === 'poison_rogue') {
          hero.haste += 10
        }
      }

      const frostMultiplier = getFrostMultiplier(statuses, actor.id, now)
      const effectiveCooldown = calcEffectiveCooldown(actor.baseCooldown * frostMultiplier, actor.haste)
      actor.nextActionAt = Number((now + effectiveCooldown).toFixed(4))
    }
  }

  const winner = hero.alive && livingEnemies(enemies).length === 0 ? 'hero' : 'enemies'

  return {
    winner,
    durationMs: Math.round(now * 1000),
    events,
    hpRemaining: Math.max(hero.hp, 0),
    damageDealt,
    damageTaken,
    seed,
  }
}
