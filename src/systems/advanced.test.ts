import { describe, it, expect } from 'vitest'
import { companions } from '../data/catalog'
import {
  createInitialState,
  gameReducer,
  hydrateGameState,
} from '../state/gameState'
import { activeRings, stats, damage } from './growth'
import { createDuel, duelAction } from './duel'
import { createWar, buy, position, fightWar, nextWar } from './currencyWar'
import {
  createDefense,
  deploy,
  retreat,
  activateSkill,
  startWave,
  tickDefense,
} from './defense'
describe('advanced growth and save migration', () => {
  it('unlocks six level rings, then equips only the three matching slots', () => {
    const c = {
      ...companions[0],
      level: 50,
      rings: ['common-7', 'exclusive-8', 'common-9'],
    }
    expect(activeRings(c)).toHaveLength(9)
    expect(activeRings({ ...c, level: 1 })).toHaveLength(4)
    expect(activeRings({ ...c, rings: ['exclusive-9'] })).toHaveLength(6)
  })
  it('adds restrained ring stats without legacy echo multipliers', () => {
    const a = stats({
        ...companions[0],
        level: 1,
        rings: ['common-7', 'exclusive-8', 'common-9'],
      }),
      b = stats({ ...companions[1], level: 1 })
    expect(a.hp).toBeGreaterThan(stats({ ...companions[0], level: 1 }).hp)
    expect(damage(a, b, b.hp, 3)).toBe(damage(a, b, b.hp, 2))
    expect(a.effects).not.toContain("echo")
  })
  it('retains old levels, caps constellations and migrates old rarity without old stock score', () => {
    const s = hydrateGameState({
      version: 3,
      state: {
        companions: [
          { id: 'lumi', level: 35, constellation: 99, rarity: 'SSR' },
        ],
        currencyWarsHighScore: 90000,
      },
    })
    expect(s.companions[0]).toMatchObject({
      level: 35,
      constellation: 6,
      rarity: '5星',
    })
    expect(s.currencyWarsHighScore).toBe(0)
  })
  it('exclusive rings have target-specific hard pity, cannot equip unowned, persist through reload', () => {
    let s = createInitialState()
    expect(
      gameReducer(s, {
        type: 'EQUIP_RING',
        id: 'lumi',
        slot: 0,
        exclusive: true,
      }),
    ).toBe(s)
    s = { ...s, crystals: 5000 }
    for (let i = 0; i < 30; i++)
      s = gameReducer(s, { type: 'PULL_RING', id: 'lumi', slot: 0, roll: 0.99 })
    expect(s.materials['ring:lumi:0']).toBe(1)
    expect(s.crystals).toBe(200)
    s = gameReducer(s, {
      type: 'EQUIP_RING',
      id: 'lumi',
      slot: 0,
      exclusive: true,
    })
    expect(
      hydrateGameState({ version: 4, state: s }).companions[0].rings?.[0],
    ).toBe('exclusive-7')
    expect(
      gameReducer(s, { type: 'PULL_RING', id: 'lumi', slot: 0, roll: 0 }),
    ).toBe(s)
  })
  it('enforces one weapon per character and transfers ownership', () => {
    let s = createInitialState()
    s = gameReducer(s, {
      type: 'EQUIP_WEAPON',
      id: 'lumi',
      weaponId: 'w-light',
    })
    expect(s.weapons.filter((w) => w.ownerId === 'lumi')).toHaveLength(1)
    expect(s.weapons.find((w) => w.id === 'w-light')?.ownerId).toBe('lumi')
  })
})
describe('five versus five local duel', () => {
  it('rejects incomplete or duplicate teams', () => {
    expect(() =>
      createDuel(companions.slice(0, 4), companions.slice(0, 5)),
    ).toThrow()
    expect(() =>
      createDuel(Array(5).fill(companions[0]), companions.slice(0, 5)),
    ).toThrow()
  })
  it('alternates players, rejects repeated actions and reaches a terminal winner', () => {
    let s = createDuel(companions.slice(0, 5), companions.slice(1, 6))
    const actor = s.fighters[0].id
    s = duelAction(s, actor, s.fighters[5].id)
    expect(s.team).toBe(1)
    expect(duelAction(s, actor, s.fighters[5].id)).toBe(s)
    for (let i = 0; i < 1000 && s.winner === null; i++) {
      const a = s.fighters.find(
          (f) => f.team === s.team && f.hp > 0 && !s.used.includes(f.id),
        )!,
        t = s.fighters.find((f) => f.team !== s.team && f.hp > 0)!
      expect(a).toBeDefined()
      s = duelAction(s, a.id, t.id)
    }
    expect(s.winner).not.toBeNull()
    expect(duelAction(s, s.fighters[0].id, s.fighters[5].id)).toBe(s)
  })
})
describe('currency war economy', () => {
  it('merges three recruits, charges accurately and prevents buying a sold slot', () => {
    let s = createWar(() => 0)
    s = buy(s, 0)
    expect(buy(s, 0)).toBe(s)
    s = buy(buy(s, 1), 2)
    expect(s.roster).toHaveLength(1)
    expect(s.roster[0].rank).toBe(2)
    expect(s.gold).toBe(7)
  })
  it('requires frontline, respects limits, locks offers and settles once', () => {
    let s = createWar(() => 0.25)
    expect(fightWar(s, companions)).toBe(s)
    s = position(buy(s, 0), 1, 'front')
    s = { ...s, gold: 50, locked: true }
    const n = fightWar(s, companions)
    expect(n.gold).toBeGreaterThanOrEqual(62)
    expect(fightWar(n, companions)).toBe(n)
    expect(nextWar(n, () => 0.99).shop).toEqual(n.shop)
  })
})
describe('path defense', () => {
  it('enforces terrain, cost, occupancy and retreat cooldown', () => {
    const s = createDefense()
    expect(deploy(s, companions[1], 3, 3, 0)).toBe(s)
    const n = deploy(s, companions[1], 2, 2, 2)
    expect(n.operators).toHaveLength(1)
    expect(n.dp).toBe(19)
    expect(deploy(n, companions[1], 1, 2, 0)).toBe(n)
    const r = retreat(n, companions[1].id)
    expect(r.dp).toBe(27)
    expect(deploy(r, companions[1], 2, 2, 0)).toBe(r)
  })
  it('cannot activate skills before battle and resolves leaks into defeat', () => {
    let s = deploy(createDefense(), companions[1], 1, 2, 2)
    expect(activateSkill(s, companions[1].id)).toBe(s)
    s = startWave(createDefense())
    for (let i = 0; i < 2000 && s.phase !== 'lost'; i++) {
      if (s.phase === 'between') s = startWave(s)
      s = tickDefense(s, 0.2)
    }
    expect(s.phase).toBe('lost')
    expect(s.health).toBe(0)
    expect(tickDefense(s, 1)).toBe(s)
  })
  it('blocks enemies, skills enter cooldown, pauses do not mutate snapshots', () => {
    let s = deploy(createDefense(), companions[1], 1, 2, 2)
    s = activateSkill(startWave(s), companions[1].id)
    expect(s.operators[0].cooldown).toBe(20)
    const before = JSON.stringify(s)
    const n = tickDefense(s, 0.1)
    expect(JSON.stringify(s)).toBe(before)
    expect(n.enemies).toHaveLength(1)
  })
})
