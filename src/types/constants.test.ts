import { describe, expect, it } from 'vitest'

import { calcDamageTaken, calcEffectiveCooldown } from './constants'

describe('core formula constants', () => {
  it('calculates damage taken from defense formula', () => {
    const expected = 50 * (100 / (100 + 8 * 4))
    expect(calcDamageTaken(50, 8)).toBeCloseTo(expected, 8)
  })

  it('calculates effective cooldown with haste floor', () => {
    expect(calcEffectiveCooldown(5, 0)).toBeCloseTo(5, 8)
    expect(calcEffectiveCooldown(5, 50)).toBeCloseTo(5 / 1.5, 8)
    expect(calcEffectiveCooldown(5, 900)).toBeCloseTo(2, 8)
  })
})
