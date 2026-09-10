import { describe, expect, it } from 'vitest'
import { companions, weapons } from '../data/catalog'
import { performPulls, rollRarity } from './gacha'

describe('gacha system', () => {
  it('guarantees 5星 on the 80th pull', () => {
    expect(rollRarity('companion', 79, () => 0.99)).toBe('5星')
  })

  it('guarantees at least 4星 every ten pulls', () => {
    expect(rollRarity('weapon', 9, () => 0.99)).toBe('4星')
  })

  it('resets pity after an 5星', () => {
    const result = performPulls('companion', 1, 79, companions, weapons, () => 0)
    expect(result.pity).toBe(0)
    expect(result.results[0].rarity).toBe('5星')
  })

  it('returns a real four-star character for a non-five-star pull', () => {
    const result = performPulls('companion', 1, 0, companions, weapons, () => 0.99)
    expect(result.results[0]).toMatchObject({ id: 'R4-030', rarity: '4星' })
  })
})
