import { describe, expect, it } from 'vitest'
import { towerRegions, towerFloors, companions, weapons } from '../data/catalog'
import { getEncounter } from '../data/encounters'
import { createAstralBattle, resolveAstralAction, setBattleTarget } from './astralBattle'
import { createInitialState, gameReducer } from '../state/gameState'

describe('Tower Refactor - 3 Regions & 8 Bosses Architecture', () => {
  it('defines exactly 3 regions and 18 floors (6 floors per region)', () => {
    expect(towerRegions).toHaveLength(3)
    expect(towerFloors).toHaveLength(18)

    const r1Floors = towerFloors.filter(f => f.regionId === 1)
    const r2Floors = towerFloors.filter(f => f.regionId === 2)
    const r3Floors = towerFloors.filter(f => f.regionId === 3)

    expect(r1Floors).toHaveLength(6)
    expect(r2Floors).toHaveLength(6)
    expect(r3Floors).toHaveLength(6)

    // Floor IDs
    expect(r1Floors.map(f => f.floor)).toEqual([1, 2, 3, 4, 5, 6])
    expect(r2Floors.map(f => f.floor)).toEqual([7, 8, 9, 10, 11, 12])
    expect(r3Floors.map(f => f.floor)).toEqual([13, 14, 15, 16, 17, 18])
  })

  it('has mob/elite enemies on floors 1-5 and boss on floor 6 of each region', () => {
    for (const region of towerRegions) {
      const floors = towerFloors.filter(f => f.regionId === region.id)
      for (let i = 0; i < 5; i++) {
        expect(['mob', 'elite']).toContain(floors[i].enemyType)
        expect(floors[i].mechanicTag).toBeDefined()
      }
      expect(['boss', 'boss_rush', 'dual_boss']).toContain(floors[5].enemyType)
    }
  })

  it('distributes exactly 8 bosses across the 3 regions (3, 3, 2)', () => {
    const enc6 = getEncounter({ kind: 'tower', id: '6' })
    const enc12 = getEncounter({ kind: 'tower', id: '12' })
    const enc18 = getEncounter({ kind: 'tower', id: '18' })

    // Region 1 (F6): 3 bosses in sequential wave rush
    expect(enc6.boss.bossWave).toBeDefined()
    expect(enc6.boss.bossWave).toHaveLength(3)
    const r1BossNames = enc6.boss.bossWave!.map(b => b.name)
    expect(r1BossNames).toHaveLength(3)

    // Region 2 (F12): 3 bosses in sequential wave rush
    expect(enc12.boss.bossWave).toBeDefined()
    expect(enc12.boss.bossWave).toHaveLength(3)
    const r2BossNames = enc12.boss.bossWave!.map(b => b.name)
    expect(r2BossNames).toHaveLength(3)

    // Region 3 (F18): 2 bosses appearing simultaneously (dual boss)
    expect(enc18.boss.dualBoss).toBeDefined()
    const r3BossNames = [enc18.boss.name, enc18.boss.dualBoss!.name]
    expect(r3BossNames).toHaveLength(2)

    // Verify total unique bosses count across all regions is 8
    const allBosses = [...r1BossNames, ...r2BossNames, ...r3BossNames]
    expect(allBosses).toHaveLength(8)
    const uniqueBosses = new Set(allBosses)
    expect(uniqueBosses.size).toBe(8)
  })

  it('simulates Floor 6 boss wave rush ("打死一个出一个")', () => {
    const enc6 = getEncounter({ kind: 'tower', id: '6' })
    const party = companions.slice(0, 5).map(c => ({ ...c, level: 80 }))
    let b = createAstralBattle(party, weapons, 'light', enc6.boss)

    expect(b.waveIndex).toBe(0)
    expect(b.maxWaves).toBe(3)
    expect(b.boss.name).toBe(enc6.boss.bossWave![0].name)

    // Defeating wave 1 boss summons wave 2 boss
    b.bossHp = 1
    const res1 = resolveAstralAction(b, 'basic')!
    b = res1.battle

    expect(b.waveIndex).toBe(1)
    expect(b.boss.name).toBe(enc6.boss.bossWave![1].name)
    expect(b.bossHp).toBe(enc6.boss.bossWave![1].hp)
    expect(b.outcome).toBe('playing')

    // Defeating wave 2 boss summons wave 3 boss
    b.bossHp = 1
    const res2 = resolveAstralAction(b, 'basic')!
    b = res2.battle

    expect(b.waveIndex).toBe(2)
    expect(b.boss.name).toBe(enc6.boss.bossWave![2].name)
    expect(b.bossHp).toBe(enc6.boss.bossWave![2].hp)
    expect(b.outcome).toBe('playing')

    // Defeating wave 3 boss achieves victory
    b.bossHp = 1
    const res3 = resolveAstralAction(b, 'basic')!
    b = res3.battle

    expect(b.outcome).toBe('win')
  })

  it('simulates Floor 18 dual boss simultaneous combat ("俩个boss层是一起出现")', () => {
    const enc18 = getEncounter({ kind: 'tower', id: '18' })
    const party = companions.slice(0, 5).map(c => ({ ...c, level: 90 }))
    let b = createAstralBattle(party, weapons, 'light', enc18.boss)

    expect(b.dualBoss).toBeDefined()
    expect(b.dualBoss?.hp).toBeGreaterThan(0)
    expect(b.dualBoss?.boss.name).toBe('覆天古主')
    expect(b.boss.name).toBe('无相天君')

    // Switching target to secondary boss
    b = setBattleTarget(b, 1)
    expect(b.targetBossIndex).toBe(1)

    // A normal attack hits only the selected boss
    const initialPrimaryHp = b.bossHp
    const initialDualHp = b.dualBoss!.hp
    const res1 = resolveAstralAction(b, 'basic')!
    b = res1.battle

    expect(b.dualBoss!.hp).toBeLessThan(initialDualHp)
    expect(b.bossHp).toBe(initialPrimaryHp) // no splash on single-target attacks

    // Defeating dual boss causes remaining boss to enrage
    b.dualBoss!.hp = 1
    const res2 = resolveAstralAction(b, 'basic')!
    b = res2.battle

    expect(b.dualBoss?.hp).toBe(0)
    expect(b.dualBoss?.isEnraged).toBe(true)
    expect(b.outcome).toBe('playing') // battle continues because primary boss is still alive

    // Defeating primary boss wins the battle
    b.bossHp = 1
    const res3 = resolveAstralAction(b, 'basic')!
    b = res3.battle

    expect(b.outcome).toBe('win')
  })

  it('correctly tracks region progression and floor unlocking in GameState', () => {
    let state = createInitialState()
    // Region entry floors (1, 7, 13) should be unlockable
    state = gameReducer(state, { type: 'PREPARE_ENCOUNTER', encounter: { kind: 'tower', id: '1' } })
    expect(state.encounter?.id).toBe('1')

    state = gameReducer(state, { type: 'PREPARE_ENCOUNTER', encounter: { kind: 'tower', id: '7' } })
    expect(state.encounter?.id).toBe('7')

    state = gameReducer(state, { type: 'PREPARE_ENCOUNTER', encounter: { kind: 'tower', id: '13' } })
    expect(state.encounter?.id).toBe('13')

    // Floor 2 is in clearedTowerFloors initially, so floor 3 is accessible
    state = gameReducer(state, { type: 'PREPARE_ENCOUNTER', encounter: { kind: 'tower', id: '3' } })
    expect(state.encounter?.id).toBe('3')

    // Clearing a floor marks it cleared and updates clearedTowerFloors
    state = gameReducer(state, { type: 'PREPARE_ENCOUNTER', encounter: { kind: 'tower', id: '7' } })
    state = { ...state, battleTicket: 'ticket-f7' }
    state = gameReducer(state, { type: 'CLEAR_TOWER_FLOOR', floor: 7, victory: true })
    expect(state.clearedTowerFloors).toContain(7)

    // Now floor 8 should be accessible
    state = gameReducer(state, { type: 'PREPARE_ENCOUNTER', encounter: { kind: 'tower', id: '8' } })
    expect(state.encounter?.id).toBe('8')
  })

  it('ensures Floor 6 boss rush and Floor 18 dual boss are numerically beatable within 60 rounds', () => {
    // Test Floor 6 with standard max level team
    const enc6 = getEncounter({ kind: 'tower', id: '6' })
    const party = companions.slice(0, 5).map(c => ({
      ...c,
      level: 90,
      constellation: 0,
      rings: ['exclusive-7', 'exclusive-8', 'exclusive-9'],
    }))
    let b6 = createAstralBattle(party, weapons, 'light', enc6.boss)
    while (b6.outcome === 'playing' && b6.actions < 360) {
      const u = b6.units[b6.active]
      const command = u?.energy >= 100 ? 'ultimate' : b6.points > 0 ? 'skill' : 'basic'
      b6 = resolveAstralAction(b6, command)!.battle
    }
    expect(b6.outcome).toBe('win')
    expect(b6.round).toBeLessThanOrEqual(60)

    // Test Floor 18 dual boss with standard team
    const enc18 = getEncounter({ kind: 'tower', id: '18' })
    let b18 = createAstralBattle(party, weapons, 'light', enc18.boss)
    while (b18.outcome === 'playing' && b18.actions < 360) {
      const u = b18.units[b18.active]
      const command = u?.energy >= 100 ? 'ultimate' : b18.points > 0 ? 'skill' : 'basic'
      b18 = resolveAstralAction(b18, command)!.battle
    }
    expect(b18.outcome).toBe('win')
    expect(b18.round).toBeLessThanOrEqual(60)
  })
})
