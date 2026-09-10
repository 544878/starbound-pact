import { describe, expect, it } from 'vitest'
import { BOSSES, COMBAT_PATHS } from '../data/combat'
import { COMBAT_POINT_SCALE } from '../data/combatScale'
import { investmentFixture, PERSONAL_CONSTELLATION } from '../data/formationMath'
import { acquisitionCopies, affinity, simulateFormation, teamBoss, validateFormation } from './formationMath'

describe('five-slot formation economy', () => {
  it('scales original damage baselines to ten-million points without retuning', () => {
    const original = [
      [39309, 36619, 50158], [38951, 36095, 53102],
      [40677, 39528, 56043], [41158, 39963, 56635],
      [40868, 39626, 56376], [41269, 40108, 56622],
      [37528, 36598, 53989], [38923, 37890, 52854],
    ]
    expect(teamBoss().hp).toBe(16250000)
    expect(teamBoss().attack).toBe(1050000)
    for (const [index, path] of COMBAT_PATHS.entries()) {
      for (const [planIndex, plan] of (['complete', 'focused', 'maxed'] as const).entries()) {
        const result = simulateFormation(investmentFixture(path.id, plan))
        // Baselines were recorded rounded to the nearest original balance unit.
        expect(Math.abs(result.damage / COMBAT_POINT_SCALE - original[index][planIndex])).toBeLessThanOrEqual(.5)
        expect(result.logs.reduce((sum, row) => sum + row.damage, 0)).toBeCloseTo(result.damage, 6)
        expect(result.logs.at(-1)!.bossHp).toBeCloseTo(teamBoss().hp - result.damage, 6)
        if (plan === 'complete') expect(result.damage).toBeGreaterThan(9000000)
        if (plan === 'complete') expect(result.damage).toBeLessThan(11000000)
      }
    }
  })
  it('compares equal five-copy budgets and a 35-copy ceiling', () => {
    for (const p of COMBAT_PATHS) {
      expect(acquisitionCopies(investmentFixture(p.id, 'complete'))).toBe(5)
      expect(acquisitionCopies(investmentFixture(p.id, 'focused'))).toBe(5)
      expect(acquisitionCopies(investmentFixture(p.id, 'maxed'))).toBe(35)
    }
  })
  it('rejects invalid formations, tags and constellation budgets', () => {
    const team = investmentFixture('flame', 'complete')
    expect(() => validateFormation({ ...team, members: team.members.slice(1) })).toThrow()
    team.members[0].specialties = ['flame', 'dream', 'memory']
    expect(() => validateFormation(team)).toThrow()
    team.members[0].specialties = ['flame', 'dream']
    team.members[0].compatible = ['memory']
    expect(() => validateFormation(team)).not.toThrow()
    expect(affinity(team.members[0], 'memory')).toBe(.65)
    expect(affinity(team.members[0], 'end')).toBe(0)
    team.members[0].compatible.push('end')
    expect(() => validateFormation(team)).toThrow()
    const duplicate = investmentFixture('flame', 'complete')
    duplicate.members[1].slot = 'tank'
    expect(() => validateFormation(duplicate)).toThrow()
    duplicate.members[1].slot = 'healer'
    duplicate.members[1].constellation = NaN
    expect(() => validateFormation(duplicate)).toThrow()
  })
  it('keeps equal-budget damage within 10% across all eight bosses', () => {
    const ratios: number[] = []
    for (const p of COMBAT_PATHS) for (const b of BOSSES) {
      const complete = simulateFormation(investmentFixture(p.id, 'complete'), teamBoss(b))
      const focused = simulateFormation(investmentFixture(p.id, 'focused'), teamBoss(b))
      expect(focused.damage / complete.damage).toBeGreaterThanOrEqual(.9)
      expect(focused.damage / complete.damage).toBeLessThanOrEqual(1.1)
      expect(complete.survivors).toBe(5)
      expect(focused.survivors).toBe(5)
      ratios.push(focused.damage / complete.damage)
    }
    console.log('BOSS_BUDGET_RANGE', Math.min(...ratios), Math.max(...ratios))
  })
  it('bounds whale damage while preserving a meaningful advantage', () => {
    for (const p of COMBAT_PATHS) {
      const full = simulateFormation(investmentFixture(p.id, 'complete'))
      const focused = simulateFormation(investmentFixture(p.id, 'focused'))
      const max = simulateFormation(investmentFixture(p.id, 'maxed'))
      console.log('FORMATION', p.name, JSON.stringify({ complete: Math.round(full.damage), focused: Math.round(focused.damage), maxed: Math.round(max.damage), hp: [full, focused, max].map(r => Math.round(r.hpRatio * 100)), survivors: [full, focused, max].map(r => r.survivors) }))
      expect(max.damage / full.damage).toBeGreaterThan(1.25)
      expect(max.damage / full.damage).toBeLessThan(1.65)
    }
  })
  it('checks same-copy alternatives from carry C2 through C6', () => {
    const ratios: number[] = []
    for (const rank of [2, 3, 4, 5, 6]) for (const p of COMBAT_PATHS) for (const b of BOSSES) {
      const concentrated = investmentFixture(p.id, 'focused')
      concentrated.members[2].constellation = rank
      const broad = investmentFixture(p.id, 'complete')
      broad.members[2].constellation = Math.ceil((rank - 2) / 2)
      broad.members[3].constellation = Math.floor((rank - 2) / 2)
      expect(acquisitionCopies(concentrated)).toBe(acquisitionCopies(broad))
      const ratio = simulateFormation(concentrated, teamBoss(b)).damage / simulateFormation(broad, teamBoss(b)).damage
      ratios.push(ratio)
    }
    console.log('C2_C6_BUDGET_RANGE', Math.min(...ratios), Math.max(...ratios))
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(.9)
    expect(Math.max(...ratios)).toBeLessThanOrEqual(1.1)
  })
  it('makes a matched specialist worth more than ordinary carry nodes', () => {
    for (const p of COMBAT_PATHS) {
      const off = investmentFixture(p.id, 'complete')
      off.members[4].specialties = [p.id === 'flame' ? 'dream' : 'flame']
      const c1 = structuredClone(off)
      c1.members[2].constellation = 1
      expect(simulateFormation(investmentFixture(p.id, 'complete')).damage).toBeGreaterThan(simulateFormation(c1).damage)
    }
    expect(PERSONAL_CONSTELLATION[2] - PERSONAL_CONSTELLATION[1]).toBeGreaterThan(.15)
    expect(PERSONAL_CONSTELLATION[6] - PERSONAL_CONSTELLATION[5]).toBeGreaterThan(.18)
  })
  it('allows the key node to outweigh a single small link, without universal carry access', () => {
    for (const p of COMBAT_PATHS) {
      const linked = investmentFixture(p.id, 'complete')
      linked.members[2].constellation = 1
      const key = structuredClone(linked)
      key.members[0].specialties = [p.id === 'flame' ? 'dream' : 'flame']
      key.members[2].constellation = 2
      // A key node may replace a minor link, but not a core tank/reflection or dual-support mechanic.
      if (p.id === 'flame') expect(simulateFormation(key).damage).toBeGreaterThan(simulateFormation(linked).damage)
      const maxed = investmentFixture(p.id, 'maxed')
      const foreign = structuredClone(maxed)
      foreign.members[2].specialties = [p.id === 'flame' ? 'dream' : 'flame']
      expect(simulateFormation(foreign).damage).toBeLessThan(simulateFormation(maxed).damage * .85)
    }
  })
  it('keeps normal investment routes viable over a complete neutral fight', () => {
    for (const p of COMBAT_PATHS) {
      const full = simulateFormation(investmentFixture(p.id, 'complete'), teamBoss(), 100)
      const focused = simulateFormation(investmentFixture(p.id, 'focused'), teamBoss(), 100)
      const maxed = simulateFormation(investmentFixture(p.id, 'maxed'), teamBoss(), 100)
      console.log('CLEAR_ROUNDS', p.name, full.rounds, focused.rounds, maxed.rounds)
      expect(full.outcome).toBe('win')
      expect(focused.outcome).toBe('win')
      expect(maxed.outcome).toBe('win')
      expect(Math.abs(full.rounds - focused.rounds)).toBeLessThanOrEqual(2)
    }
  })
  it('never revives or overheals, and terminates on death or victory', () => {
    const team = investmentFixture('inverse', 'complete')
    const kill = simulateFormation(team, { ...teamBoss(), hp: 1 })
    expect(kill.damage).toBe(1)
    expect(kill.logs[0].incoming).toBe(0)
    expect(kill.outcome).toBe('win')
    const wipe = simulateFormation(team, { ...teamBoss(), attack: 1e8 }, 100)
    expect(wipe.outcome).toBe('loss')
    expect(wipe.rounds).toBe(1)
    for (const p of COMBAT_PATHS) for (const b of BOSSES) {
      const result = simulateFormation(investmentFixture(p.id, 'focused'), teamBoss(b), 100)
      expect(result.hpRatio).toBeGreaterThanOrEqual(0)
      expect(result.hpRatio).toBeLessThanOrEqual(1)
      for (let n = 1; n < result.logs.length; n++) result.logs[n - 1].hp.forEach((hp, i) => {
        if (hp === 0) expect(result.logs[n].hp[i]).toBe(0)
      })
    }
  })
})
