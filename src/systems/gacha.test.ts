import { describe, expect, it } from 'vitest'
import { companionCatalog, companions, weaponCatalog, weapons } from '../data/catalog'
import { performCharacterPulls, performPulls, performWeaponPulls, rollRarity } from './gacha'

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

  it('pulls targeted 5星 signature weapon with 100% guarantee on 5星 drop', () => {
    const targetCompanion = companionCatalog.find((c) => c.id === 'yanhuang')!
    const expectedWeapon = weaponCatalog.find((w) => w.signatureFor === 'yanhuang')!
    const res = performWeaponPulls(1, 79, targetCompanion.id, weapons, () => 0)
    expect(res.pity).toBe(0)
    expect(res.results[0].id).toBe(expectedWeapon.id)
    expect(res.results[0].rarity).toBe('5星')
  })

  it('pulls targeted collab 5星 weapon (Saber)', () => {
    const expectedWeapon = weaponCatalog.find((w) => w.signatureFor === 'saber')!
    const res = performWeaponPulls(1, 79, 'saber', weapons, () => 0)
    expect(res.pity).toBe(0)
    expect(res.results[0].id).toBe(expectedWeapon.id)
  })

  it('pulls targeted 4星 signature weapon when rolling 4星', () => {
    const targetCompanion = companionCatalog.find((c) => c.id === 'alden')!
    const expectedWeapon = weaponCatalog.find((w) => w.signatureFor === 'alden')!
    const res = performWeaponPulls(1, 0, targetCompanion.id, weapons, () => 0.99)
    expect(res.results[0].id).toBe(expectedWeapon.id)
    expect(res.results[0].rarity).toBe('4星')
  })

  it('pulls limited UP characters (Robin / Aventurine) on limited banner', () => {
    // Guaranteed 5-star on limited banner gives either Robin or Aventurine
    const res = performCharacterPulls('limited', 1, 79, true, [], () => 0)
    expect(res.results[0].rarity).toBe('5星')
    expect(['robin_lovesong', 'aventurine_waves']).toContain(res.results[0].id)
    expect(res.pity).toBe(0)
    expect(res.guaranteed).toBe(false)
  })

  it('triggers 50/50 guarantee if non-UP 5-star is pulled on limited banner', () => {
    // random() = 0.9 => loses 50/50, standard 5-star pulled, guaranteed becomes true
    const res = performCharacterPulls('limited', 1, 79, false, [], () => 0.9)
    expect(res.results[0].rarity).toBe('5星')
    expect(['robin_lovesong', 'aventurine_waves']).not.toContain(res.results[0].id)
    expect(res.guaranteed).toBe(true)
    expect(res.pity).toBe(0)

    // Next 5-star with guaranteed=true MUST be limited UP
    const nextRes = performCharacterPulls('limited', 1, 79, true, [], () => 0.9)
    expect(nextRes.results[0].rarity).toBe('5星')
    expect(['robin_lovesong', 'aventurine_waves']).toContain(nextRes.results[0].id)
    expect(nextRes.guaranteed).toBe(false)
  })
})
