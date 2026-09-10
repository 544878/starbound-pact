import { describe, expect, it } from 'vitest'
import { BOSSES, COMBAT_PATHS } from '../data/combat'
import { FOUR_STAR_CHARACTERS, FOUR_STAR_TEAMS } from '../data/fourStarCharacters'
import { characterFormation, characterMember, equippedStats, fourStarFixture } from './fourStarCharacters'
import { simulateFormation, teamBoss, validateFormation } from './formationMath'

describe('30 four-star numeric characters', () => {
  it('provides complete C0 equipment, skills and six constellation definitions', () => {
    expect(FOUR_STAR_CHARACTERS).toHaveLength(30)
    const ids: string[] = []
    for (const c of FOUR_STAR_CHARACTERS) {
      expect(c.rarity).toBe(4)
      expect(c.progression).toBeNull()
      expect(c.skills).toHaveLength(4)
      expect(c.constellations.map(n => n.rank)).toEqual([1, 2, 3, 4, 5, 6])
      expect(c.rings).toHaveLength(3)
      expect(c.specialties.length).toBeGreaterThanOrEqual(1)
      expect(c.specialties.length).toBeLessThanOrEqual(2)
      expect(c.specialties.length + c.compatible.length).toBeLessThanOrEqual(3)
      expect(c.skills.slice(0, 3).reduce((sum, s) => sum + s.directCoefficient, 0)).toBeCloseTo(3)
      for (const r of c.rings) { expect(r.age).toBe(100000); expect(r.color).toBe('red'); expect(r.maxed).toBe(true) }
      ids.push(c.id, c.weapon.id, ...c.rings.map(r => r.id), ...c.skills.map(s => s.id), c.exclusiveBuff.id)
      for (let rank = 0; rank <= 6; rank++) expect(characterMember(c.id, c.specialties[0], rank).constellation).toBe(rank)
    }
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('keeps equipment within caps and does not count it twice', () => {
    for (const c of FOUR_STAR_CHARACTERS) {
      const s = equippedStats(c, c.specialties[0])
      expect(s.attack).toBeCloseTo(c.baseStats.attack + c.weapon.flat.attack + c.rings.reduce((n, r) => n + r.flat.attack, 0))
      expect(s.hp).toBeCloseTo(c.baseStats.hp + c.rings.reduce((n, r) => n + r.flat.hp, 0))
      expect(Object.values(s).every(v => Number.isFinite(v) && v >= 0)).toBe(true)
      expect(s.crit).toBeLessThanOrEqual(.8)
      expect(s.critDamage).toBeLessThanOrEqual(2.5)
      expect(s.pursuit).toBeLessThanOrEqual(.8)
      expect(s.dot).toBeLessThanOrEqual(.8)
      expect(s.reflect).toBeLessThanOrEqual(.5)
      expect(s.vulnerability).toBeLessThanOrEqual(.5)
      expect(s.lifesteal).toBeLessThanOrEqual(.25)
      const foreign = COMBAT_PATHS.find(p => !c.specialties.includes(p.id) && !c.compatible.includes(p.id))!.id
      expect(equippedStats(c, foreign)[c.weapon.buff.stat]).toBeLessThan(s[c.weapon.buff.stat])
      expect(characterMember(c.id, foreign).combatKit!.mechanicPath).toBe(c.mechanicPath)
    }
  })
  it('covers eight five-role formations with no duplicate character in a team', () => {
    for (const p of COMBAT_PATHS) {
      expect(() => validateFormation(characterFormation(p.id, FOUR_STAR_TEAMS[p.id]))).not.toThrow()
    }
    expect(() => characterFormation('flame', Array(5).fill('R4-004'))).toThrow()
    expect(() => characterMember('R4-999', 'flame')).toThrow()
    expect(() => characterMember('R4-001', 'flame', 7)).toThrow()
  })
  it('retains ten-million output and both investment routes', () => {
    const ratios: number[] = []
    for (const p of COMBAT_PATHS) {
      const results = (['complete', 'focused', 'maxed'] as const).map(plan => simulateFormation(fourStarFixture(p.id, plan)))
      console.log('R4_BALANCE', p.name, JSON.stringify(results.map(r => ({ damage: Math.round(r.damage), hp: Math.round(r.hpRatio * 100), alive: r.survivors }))))
      expect.soft(results[0].damage).toBeGreaterThan(9000000)
      expect.soft(results[0].damage).toBeLessThan(11500000)
      expect.soft(results[2].damage / results[0].damage).toBeGreaterThan(1.2)
      expect.soft(results[2].damage / results[0].damage).toBeLessThan(1.65)
      for (const b of BOSSES) {
        const complete = simulateFormation(fourStarFixture(p.id, 'complete'), teamBoss(b))
        const focused = simulateFormation(fourStarFixture(p.id, 'focused'), teamBoss(b))
        ratios.push(focused.damage / complete.damage)
      }
      const clears = (['complete', 'focused', 'maxed'] as const).map(plan => simulateFormation(fourStarFixture(p.id, plan), teamBoss(), 100))
      console.log('R4_CLEAR', p.name, clears.map(r => [r.outcome, r.rounds, r.survivors]))
      expect(clears.every(r => r.outcome === 'win')).toBe(true)
      expect.soft(Math.abs(clears[0].rounds - clears[1].rounds)).toBeLessThanOrEqual(2)
    }
    console.log('R4_BUDGET_RANGE', Math.min(...ratios), Math.max(...ratios))
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(.9)
    expect(Math.max(...ratios)).toBeLessThanOrEqual(1.1)
  })
  it('applies the C6 opening without resetting the shared turn clock', () => {
    const team = fourStarFixture('memory', 'complete')
    team.members[2].constellation = 6
    const opening = simulateFormation(team, teamBoss(), 1)
    const noOpening = structuredClone(team)
    noOpening.members[2].combatKit!.openingAtC6 = false
    expect(opening.damage).toBeGreaterThan(simulateFormation(noOpening, teamBoss(), 1).damage)
    expect(opening.rounds).toBe(1)
  })
  it('retains same-budget balance from C2 through C6 with actual equipment and skills', () => {
    const ratios: number[] = []
    for (const rank of [2, 3, 4, 5, 6]) for (const path of COMBAT_PATHS) for (const boss of BOSSES) {
      const broad = fourStarFixture(path.id, 'complete')
      broad.members[2].constellation = Math.ceil((rank - 2) / 2)
      broad.members[3].constellation = Math.floor((rank - 2) / 2)
      const focused = fourStarFixture(path.id, 'focused')
      focused.members[2].constellation = rank
      ratios.push(simulateFormation(focused, teamBoss(boss)).damage / simulateFormation(broad, teamBoss(boss)).damage)
    }
    console.log('R4_C2_C6_RANGE', Math.min(...ratios), Math.max(...ratios))
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(.9)
    expect(Math.max(...ratios)).toBeLessThanOrEqual(1.1)
  })
})
