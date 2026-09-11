import { describe, expect, it } from 'vitest'
import { companions } from '../data/catalog'
import {
  LEGACY_STORAGE_KEY,
  SAVE_VERSION,
  STORAGE_KEY,
  createInitialState,
  gameReducer,
  restoreGameState,
  saveGameState,
} from './gameState'

function clearTower(initial: ReturnType<typeof createInitialState>) {
 const active=gameReducer(gameReducer(initial,{type:'PREPARE_ENCOUNTER',encounter:{kind:'tower',id:'5'}}),{type:'START_BATTLE'})
 return gameReducer(active,{type:'FINISH_BATTLE',victory:true,ticket:active.battleTicket})
}

function createMemoryStorage(seed: Record<string, string> = {}) {
  const entries = new Map(Object.entries(seed))
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value) },
    entries,
  }
}

describe('battle settlement and material drops', () => {
  it('rewards currency and stores dropped materials into inventory', () => {
    const initial = gameReducer(createInitialState(), {type:'START_BATTLE'})
    const customDrops = [
      { id: 'drop-1', name: '风灵花蜜', count: 3, rarity: '4星' as const, icon: '❀' },
      { id: 'drop-2', name: '纯净星核', count: 1, rarity: '5星' as const, icon: '◈' },
    ]
    const next = gameReducer(initial, { type: 'FINISH_BATTLE', drops: customDrops, victory:true, ticket:initial.battleTicket })

    expect(next.gold).toBe(initial.gold + 1800)
    expect(next.crystals).toBe(initial.crystals + 40)
    expect(next.materials['风灵花蜜']).toBe(initial.materials['风灵花蜜'] + 3)
    expect(next.materials['纯净星核']).toBe(initial.materials['纯净星核'] + 1)
    expect(next.lastBattleDrops).toEqual(customDrops)
  })

  it('generates procedural drops when drops are not explicitly provided', () => {
    const initial = createInitialState()
    const active = gameReducer(initial,{type:'START_BATTLE'})
    const next = gameReducer(active, { type: 'FINISH_BATTLE', victory:true, ticket:active.battleTicket })

    expect(next.lastBattleDrops).toBeDefined()
    expect(next.lastBattleDrops!.length).toBeGreaterThanOrEqual(2)
  })
})

describe('task and activity system', () => {
  it('claims completed daily task and increments activity points', () => {
    const initial = createInitialState()
    // dt-1 is "星界每日签到", progress 1, target 1
    const next = gameReducer(initial, { type: 'CLAIM_TASK', taskType: 'daily', taskId: 'dt-1' })
    const task = next.dailyTasks.find((t) => t.id === 'dt-1')

    expect(task?.claimed).toBe(true)
    expect(next.dailyActivity).toBe(initial.dailyActivity + 20)
    expect(next.crystals).toBe(initial.crystals + 30)
  })

  it('claims all eligible tasks in batch', () => {
    const initial = createInitialState()
    const next = gameReducer(initial, { type: 'CLAIM_ALL_TASKS', taskType: 'daily' })
    const completedEligible = next.dailyTasks.filter((t) => t.progress >= t.target)

    expect(completedEligible.every((t) => t.claimed)).toBe(true)
  })

  it('unlocks activity milestone chests', () => {
    const initial = createInitialState()
    // 60 points milestone
    const next = gameReducer(initial, { type: 'CLAIM_ACTIVITY_CHEST', taskType: 'daily', points: 60 })

    expect(next.claimedDailyChests).toContain(60)
    expect(next.crystals).toBeGreaterThan(initial.crystals)
  })
})

describe('story and tower systems', () => {
  it('progresses main story stage and rewards first clear bonuses', () => {
    const initial = createInitialState()
    const active=gameReducer(gameReducer(initial,{type:'PREPARE_ENCOUNTER',encounter:{kind:'story',id:'1-3'}}),{type:'START_BATTLE'})
    const next = gameReducer(active, { type: 'FINISH_BATTLE',victory:true,ticket:active.battleTicket })

    expect(next.completedStages).toContain('1-3')
    expect(next.crystals).toBeGreaterThan(initial.crystals)
    expect(next.playerExp).toBe(initial.playerExp + 200)
  })

  it('clears tower floor and elevates highest reached floor', () => {
    const initial = createInitialState()
    const next = clearTower(initial)

    expect(next.highestTowerFloor).toBe(5)
    expect(next.towerFloor).toBe(6)
    expect(next.crystals).toBe(initial.crystals + 160)
  })

  it('sweeps previously cleared tower floor for materials', () => {
    const initial = createInitialState()
    const next = gameReducer(initial, { type: 'SWEEP_TOWER_FLOOR', floor: 2 })

    expect(next.gold).toBeGreaterThan(initial.gold)
    expect(next.materials['曜金碎屑']).toBeGreaterThan(initial.materials['曜金碎屑'])
  })
})

describe('persistence and characters', () => {
  it('persists and restores versioned game state', () => {
    const storage = createMemoryStorage()
    const initial = createInitialState()
    const state = clearTower(initial)

    saveGameState(storage, state)
    const payload = JSON.parse(storage.entries.get(STORAGE_KEY) ?? '{}')
    const restored = restoreGameState(storage)

    expect(payload.version).toBe(SAVE_VERSION)
    expect(restored.highestTowerFloor).toBe(5)
  })

  it('maintains the original mixed-gender protagonist roster', () => {
    expect(companions.filter(c => c.gender === 'female')).toHaveLength(5)
      expect(companions.filter(c => c.gender === 'male')).toHaveLength(2)
    expect(companions.every((companion) => companion.quotes && companion.quotes.length > 0)).toBe(true)
  })
})

describe('permanent activities and minigames', () => {
  it('toggles companion stationing and updates comfort rating', () => {
    const initial = createInitialState()
    const targetId = 'mira'
    // Default initial has stationed ['lumi', 'mira']
    const hasMiraInitially = initial.homestead.stationedCompanionIds.includes(targetId)

    const next = gameReducer(initial, { type: 'TOGGLE_STATION_COMPANION', companionId: targetId })
    if (hasMiraInitially) {
      expect(next.homestead.stationedCompanionIds).not.toContain(targetId)
    } else {
      expect(next.homestead.stationedCompanionIds).toContain(targetId)
    }
    expect(next.homestead.comfort).toBe(300 + next.homestead.stationedCompanionIds.length * 110)
  })

  it('harvests homestead resources and refreshes timestamp', () => {
    const initial = createInitialState()
    // artificially set an older timestamp
    const olderState = {
      ...initial,
      homestead: {
        ...initial.homestead,
        lastHarvestTimestamp: Date.now() - 3600 * 1000,
      },
    }
    const next = gameReducer(olderState, { type: 'HARVEST_HOMESTEAD' })
    expect(next.stamina).toBeGreaterThan(olderState.stamina)
    expect(next.gold).toBeGreaterThan(olderState.gold)
    expect(next.homestead.lastHarvestTimestamp).toBeGreaterThan(olderState.homestead.lastHarvestTimestamp)
  })

  it('updates currency wars high score and awards profit crystals', () => {
    const initial = createInitialState()
    const newScore = 250000
    const next = gameReducer(initial, { type: 'UPDATE_CURRENCY_WARS_SCORE', score: newScore })
    expect(next.currencyWarsHighScore).toBe(newScore)
    expect(next.crystals).toBeGreaterThan(initial.crystals)
  })

  it('updates defense high score and records pvp wins', () => {
    const initial = createInitialState()
    const nextDefense = gameReducer(initial, { type: 'UPDATE_DEFENSE_SCORE', score: 1800 })
    expect(nextDefense.defenseHighScore).toBe(1800)
    expect(nextDefense.crystals).toBeGreaterThan(initial.crystals)

    const nextPvp = gameReducer(initial, { type: 'RECORD_PVP_WIN' })
    expect(nextPvp.pvpWins).toBe(initial.pvpWins + 1)
    expect(nextPvp.gold).toBe(initial.gold + 500)
  })

  it('hydrates minigame state fields correctly from storage', () => {
    const storage = createMemoryStorage()
    const initial = createInitialState()
    const modified = {
      ...initial,
      screen: 'activities' as const,
      currencyWarsHighScore: 320000,
      defenseHighScore: 2400,
      pvpWins: 5,
      homestead: {
        comfort: 630,
        accumulatedStamina: 0,
        accumulatedGold: 0,
        lastHarvestTimestamp: 12345678,
        stationedCompanionIds: ['lumi', 'selene', 'alden'],
      },
    }
    saveGameState(storage, modified)
    const restored = restoreGameState(storage)

    expect(restored.screen).toBe('activities')
    expect(restored.currencyWarsHighScore).toBe(320000)
    expect(restored.defenseHighScore).toBe(2400)
    expect(restored.pvpWins).toBe(5)
    expect(restored.homestead.comfort).toBe(630)
    expect(restored.homestead.stationedCompanionIds).toEqual(['lumi', 'selene', 'alden'])
  })
})

describe('companion one-click level up (LEVEL_UP_MAX)', () => {
  it('upgrades companion by multiple affordable levels and consumes exact gold', () => {
    const initial = createInitialState()
    const companion = initial.companions[0]
    const stateWithGold = {
      ...initial,
      gold: 2000, // 5 levels worth at 400 each
      companions: initial.companions.map(c => ({ ...c, ascension: 8 })),
    }
    const next = gameReducer(stateWithGold, {
      type: 'LEVEL_UP_MAX',
      id: companion.id,
    })
    const updated = next.companions.find((c) => c.id === companion.id)!
    expect(updated.level).toBe(companion.level + 5)
    expect(next.gold).toBe(0)
  })

  it('caps at max level (90) even if player has surplus gold', () => {
    const initial = createInitialState()
    const companionId = initial.companions[0].id
    const stateNearMax = {
      ...initial,
      gold: 50000,
      companions: initial.companions.map((c) =>
        c.id === companionId ? { ...c, level: 85 } : c,
      ),
    }
    const next = gameReducer(stateNearMax, {
      type: 'LEVEL_UP_MAX',
      id: companionId,
    })
    const updated = next.companions.find((c) => c.id === companionId)!
    expect(updated.level).toBe(90)
    // 5 levels * 400 = 2000 gold
    expect(next.gold).toBe(48000)
  })

  it('does nothing if companion is already at max level or gold is insufficient', () => {
    const initial = createInitialState()
    const companionId = initial.companions[0].id
    const stateMaxed = {
      ...initial,
      gold: 10000,
      companions: initial.companions.map((c) =>
        c.id === companionId ? { ...c, level: 90 } : c,
      ),
    }
    const nextMaxed = gameReducer(stateMaxed, {
      type: 'LEVEL_UP_MAX',
      id: companionId,
    })
    expect(nextMaxed).toBe(stateMaxed)

    const statePoor = {
      ...initial,
      gold: 399,
    }
    const nextPoor = gameReducer(statePoor, {
      type: 'LEVEL_UP_MAX',
      id: companionId,
    })
    expect(nextPoor).toBe(statePoor)
  })

  it('respects optional targetLevel parameter', () => {
    const initial = createInitialState()
    const companionId = initial.companions[0].id
    const stateWithRichGold = {
      ...initial,
      gold: 20000,
      companions: initial.companions.map((c) =>
        c.id === companionId ? { ...c, level: 10, ascension: 2 } : c,
      ),
    }
    const next = gameReducer(stateWithRichGold, {
      type: 'LEVEL_UP_MAX',
      id: companionId,
      targetLevel: 25,
    })
    const updated = next.companions.find((c) => c.id === companionId)!
    expect(updated.level).toBe(25)
    // 15 levels * 400 = 6000 gold
    expect(next.gold).toBe(14000)
  })

  it('increments daily upgrade task progress', () => {
    const initial = createInitialState()
    const companionId = initial.companions[0].id
    const resetDailyTasks = initial.dailyTasks.map((t) =>
      t.id === 'dt-5' ? { ...t, progress: 0 } : t,
    )
    const stateWithGold = {
      ...initial,
      gold: 800,
      companions: initial.companions.map(c => ({ ...c, ascension: 8 })),
      dailyTasks: resetDailyTasks,
    }
    const next = gameReducer(stateWithGold, {
      type: 'LEVEL_UP_MAX',
      id: companionId,
    })
    const dt5 = next.dailyTasks.find((t) => t.id === 'dt-5')!
    expect(dt5.progress).toBe(1)
  })
})


describe('weapon banner targeted selection (SET_WEAPON_TARGET)', () => {
  it('updates weaponTargetCompanionId when valid companion id is provided', () => {
    const initial = createInitialState()
    expect(initial.weaponTargetCompanionId).toBe('yanhuang')
    const next = gameReducer(initial, { type: 'SET_WEAPON_TARGET', id: 'saber' })
    expect(next.weaponTargetCompanionId).toBe('saber')
  })

  it('ignores invalid companion ids', () => {
    const initial = createInitialState()
    const next = gameReducer(initial, { type: 'SET_WEAPON_TARGET', id: 'invalid-hero' })
    expect(next.weaponTargetCompanionId).toBe('yanhuang')
  })

  it('preserves weaponTargetCompanionId on state restoration', () => {
    const storage = createMemoryStorage()
    const initial = createInitialState()
    const modified = { ...initial, weaponTargetCompanionId: 'shorekeeper' }
    saveGameState(storage, modified)
    const restored = restoreGameState(storage)
    expect(restored.weaponTargetCompanionId).toBe('shorekeeper')
  })
})
