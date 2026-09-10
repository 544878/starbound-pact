import { describe, expect, it } from 'vitest'
import { attackEnemy, createBattle, generateBattleDrops, type BattleSnapshot } from './battle'

describe('manual battle turns', () => {
  it('combines repeated material rolls into one award entry', () => {
    const drops = generateBattleDrops(13)
    expect(new Set(drops.map(d => d.id)).size).toBe(drops.length)
    expect(drops.find(d => d.id === 'drop-4')?.count).toBe(6)
  })
  it('lets all five allies act before starting the next round', () => {
    let state = createBattle()
    for (let ally = 0; ally < 4; ally += 1) state = attackEnemy(state, ally, `精灵 ${ally + 1}`)

    expect(state.round).toBe(1)
    expect(state.activeAllyIndex).toBe(4)

    state = attackEnemy(state, 4, '精灵 5')
    expect(state.round).toBe(2)
    expect(state.activeAllyIndex).toBe(0)
  })

  it('only damages the enemy selected by the player', () => {
    const state = attackEnemy(createBattle(), 3, '露弥')

    expect(state.enemyHp).toEqual([100, 100, 100, 60, 100])
    expect(state.lastTargetIndex).toBe(3)
    expect(state.log[0]).toContain('露弥')
  })

  it('has no round limit', () => {
    const lateBattle: BattleSnapshot = {
      ...createBattle(),
      round: 999,
      activeAllyIndex: 4,
    }

    const state = attackEnemy(lateBattle, 0)
    expect(state.round).toBe(1000)
    expect(state.finished).toBe(false)
  })

  it('ignores targets that are already defeated', () => {
    const battle = createBattle()
    const defeatedTarget = { ...battle, enemyHp: [0, 100, 100, 100, 100] }

    expect(attackEnemy(defeatedTarget, 0)).toBe(defeatedTarget)
  })
})
