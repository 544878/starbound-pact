import { describe, expect, it } from 'vitest'
import { BOSSES, COMBAT_PATHS, NEUTRAL_BOSS } from '../data/combat'
import { damageChannels, defenseMultiplier, normalizeStats, resolveHit, simulateCombat } from './combatMath'

describe('eight-path numeric rules', () => {
  it('has eight unique paths and matching boss rules', () => {
    expect(new Set(COMBAT_PATHS.map(p => p.id)).size).toBe(8)
    expect(BOSSES.map(b => b.id)).toEqual(COMBAT_PATHS.map(p => p.id))
  })
  it('caps invalid inputs and uses diminishing defense returns', () => {
    const s = normalizeStats({ ...COMBAT_PATHS[0].stats, attack: NaN, crit: 2, reflect: Infinity, defense: -1 })
    expect(s.attack).toBe(0)
    expect(s.crit).toBe(.8)
    expect(s.reflect).toBe(0)
    expect(s.defense).toBe(0)
    expect(defenseMultiplier(1000)).toBe(.5)
    expect(resolveHit(10, 1000)).toEqual({ hp: 0, loss: 10 })
  })
  it('isolates critical damage from DoT and pursuit', () => {
    const p = COMBAT_PATHS[3]
    const original = damageChannels(p, NEUTRAL_BOSS, 3)
    const changed = damageChannels({ ...p, stats: { ...p.stats, crit: .8, critDamage: 2.5 } }, NEUTRAL_BOSS, 3)
    expect(changed.direct).toBeGreaterThan(original.direct)
    expect(changed.dot).toBe(original.dot)
    expect(changed.pursuit).toBe(original.pursuit)
  })
  it('caps stacking and applies execute and timed windows only to direct damage', () => {
    const flame = COMBAT_PATHS[3]
    expect(damageChannels(flame, NEUTRAL_BOSS, 3).dot).toBe(damageChannels(flame, NEUTRAL_BOSS, 100).dot)
    const end = COMBAT_PATHS[6]
    expect(damageChannels(end, NEUTRAL_BOSS, 3, .3).direct).toBeCloseTo(damageChannels(end, NEUTRAL_BOSS, 3, .31).direct * 1.25)
    const time = COMBAT_PATHS[7]
    expect(damageChannels(time, NEUTRAL_BOSS, 3).direct).toBeCloseTo(damageChannels(time, NEUTRAL_BOSS, 2).direct * 1.45)
  })
  it('does not retaliate after boss death or reflect a lethal hit', () => {
    const kill = simulateCombat(COMBAT_PATHS[0], { ...NEUTRAL_BOSS, hp: 1 })
    expect(kill.outcome).toBe('win')
    expect(kill.log[0].incoming).toBe(0)
    expect(kill.damage).toBe(1)
    const death = simulateCombat({ ...COMBAT_PATHS[0], stats: { ...COMBAT_PATHS[0].stats, hp: 1 } }, NEUTRAL_BOSS)
    expect(death.outcome).toBe('loss')
    expect(death.log[0].reflected).toBe(0)
  })
  it('maintains bounded resources in every matchup', () => {
    for (const path of COMBAT_PATHS) for (const boss of BOSSES) {
      const result = simulateCombat(path, boss, 100)
      for (const row of result.log) {
        expect(Number.isFinite(row.damage)).toBe(true)
        expect(row.hp).toBeGreaterThanOrEqual(0)
        expect(row.hp).toBeLessThanOrEqual(path.stats.hp)
        expect(row.bossHp).toBeGreaterThanOrEqual(0)
        expect(row.healed).toBeLessThanOrEqual(path.stats.hp * .08)
      }
    }
  })
  it('enforces healing suppression and does not allow DoT lifesteal', () => {
    const desire = COMBAT_PATHS[2]
    const normal = simulateCombat(desire, NEUTRAL_BOSS, 3)
    const suppressed = simulateCombat(desire, { ...NEUTRAL_BOSS, healingSuppression: 1 }, 3)
    expect(normal.log[1].healed).toBeGreaterThan(0)
    expect(suppressed.log.every(row => row.healed === 0)).toBe(true)
    const extraDot = simulateCombat({ ...desire, stats: { ...desire.stats, dot: .8 } }, NEUTRAL_BOSS, 3)
    expect(extraDot.log[1].healed).toBe(normal.log[1].healed)
  })
  it('changes damage leaders across bosses and penalizes specialist channels', () => {
    const leaders = BOSSES.map(b => COMBAT_PATHS.map(p => simulateCombat(p, b).damage).reduce((best, value, i, values) => value > values[best] ? i : best, 0))
    expect(new Set(leaders).size).toBeGreaterThanOrEqual(4)
    for (const index of [3, 4, 5]) {
      expect(simulateCombat(COMBAT_PATHS[index], BOSSES[index]).damage).toBeLessThan(simulateCombat(COMBAT_PATHS[index], NEUTRAL_BOSS).damage * .9)
    }
  })
  it('keeps 12-round neutral output within a 15% band and every path alive', () => {
    const results = COMBAT_PATHS.map(p => simulateCombat(p, NEUTRAL_BOSS))
    const outputs = results.map(r => r.damage)
    console.log('BALANCE', JSON.stringify(COMBAT_PATHS.map((p, i) => ({ name: p.name, damage: Math.round(outputs[i]), hp: Math.round(results[i].hp), burst3: Math.round(simulateCombat(p, NEUTRAL_BOSS, 3).damage), matchups: BOSSES.map(b => Math.round(simulateCombat(p, b).damage)) }))))
    expect(Math.max(...outputs) / Math.min(...outputs)).toBeLessThanOrEqual(1.15)
    expect(results.every(r => r.hp > 0)).toBe(true)
  })
})
