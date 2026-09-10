import { createAstralBattle, resolveAstralAction } from '../systems/astralBattle'
import { describe, expect, it } from 'vitest'
import { createInitialState, gameReducer, hydrateGameState } from './gameState'
import { levelCap, skillMultiplier, ELEMENT_MATERIAL } from '../systems/progression'
import { companionCatalog } from '../data/catalog'
import { RESOURCE_DUNGEONS, resourceDrops } from '../data/resourceDungeons'

describe('unified material progression', () => {
  it('stops bulk leveling at each ten-level gate, then consumes star cores exactly once', () => {
    const s = createInitialState(); s.gold = 100000; s.companions[0] = { ...s.companions[0], level: 9, ascension: 0 }; s.materials['纯净星核'] = 2
    const id = s.companions[0].id
    const capped = gameReducer(s, { type: 'LEVEL_UP_MAX', id }); expect(capped.companions[0].level).toBe(10); expect(capped.gold).toBe(99600)
    expect(gameReducer(capped, { type: 'LEVEL_UP', id }).gold).toBe(capped.gold)
    const ascended = gameReducer(capped, { type: 'ASCEND', kind: 'companion', id }); expect(levelCap(ascended.companions[0])).toBe(20); expect(ascended.materials['纯净星核']).toBe(0)
    expect(gameReducer(ascended, { type: 'ASCEND', kind: 'companion', id }).materials['纯净星核']).toBe(0)
    expect(gameReducer(ascended, { type: 'LEVEL_UP_MAX', id }).companions[0].level).toBe(20)
  })
  it('requires the same cores for weapons and consumes a prism per weapon level', () => {
    const s = createInitialState(); s.weapons[0] = { ...s.weapons[0], level: 10, ascension: 0 }; s.materials['纯净星核'] = 2; s.materials['折光棱晶'] = 1
    const id = s.weapons[0].id
    expect(gameReducer(s, { type: 'UPGRADE_WEAPON', id }).weapons[0].level).toBe(10)
    const a = gameReducer(s, { type: 'ASCEND', kind: 'weapon', id }); const b = gameReducer(a, { type: 'UPGRADE_WEAPON', id })
    expect(b.weapons[0].level).toBe(11); expect(b.materials['折光棱晶']).toBe(0); expect(b.materials['纯净星核']).toBe(0)
    expect(gameReducer(b, { type: 'UPGRADE_WEAPON', id }).weapons[0].level).toBe(11)
  })
  it('covers every roster element and upgrades only the selected active skill', () => {
    for (const c of companionCatalog) expect(ELEMENT_MATERIAL[c.element]).toBeTruthy()
    const s = createInitialState(), c = s.companions[0], mat = ELEMENT_MATERIAL[c.element]; s.materials[mat] = 1; s.materials['战术经验书'] = 2
    const a = gameReducer(s, { type: 'UPGRADE_SKILL', id: c.id, slot: 1 })
    expect(a.companions[0].skillLevels).toEqual([1, 2, 1]); expect(a.materials[mat]).toBe(0); expect(a.materials['战术经验书']).toBe(0); expect(s.gold - a.gold).toBe(500)
    expect(skillMultiplier(a.companions[0], 1)).toBe(1.08)
    expect(gameReducer(a, { type: 'UPGRADE_SKILL', id: c.id, slot: 1 }).gold).toBe(a.gold)
    expect(gameReducer(a, { type: 'UPGRADE_SKILL', id: c.id, slot: -1 }).gold).toBe(a.gold)
  })
  it('migrates legacy levels and preserves new stages and skills on reload', () => {
    const s = createInitialState(); s.companions[0] = { ...s.companions[0], level: 51, ascension: undefined }
    const restored = hydrateGameState(s); expect(levelCap(restored.companions[0])).toBe(60)
    restored.companions[0] = { ...restored.companions[0], level: 60, ascension: 6, skillLevels: [2, 4, 3] }
    const next = hydrateGameState(restored); expect(levelCap(next.companions[0])).toBe(70); expect(next.companions[0].skillLevels).toEqual([2, 4, 3])
  })
})
describe('resource dungeon settlement', () => {
  for (const d of RESOURCE_DUNGEONS) it(`${d.id}: charges stamina, awards configured drops, rejects duplicate claims`, () => {
    const s = createInitialState()
    const prepared = gameReducer(s, { type: 'PREPARE_ENCOUNTER', encounter: { kind: 'resource', id: d.id } })
    const battle = gameReducer(prepared, { type: 'START_BATTLE' }); expect(battle.stamina).toBe(s.stamina - 20)
    const action = { type: 'FINISH_BATTLE' as const, ticket: battle.battleTicket, victory: true }
    expect(gameReducer(battle, { ...action, victory: false }).gold).toBe(s.gold)
    const won = gameReducer(battle, action); expect(won.gold).toBe(s.gold + d.gold); expect(won.crystals).toBe(s.crystals); expect(won.screen).toBe('tasks'); expect(won.lastBattleDrops).toEqual(resourceDrops(d.id))
    expect(gameReducer(won, action).gold).toBe(won.gold)
  })
})

it('skill training increases real combat damage while leaving other skills unchanged', () => {
 const s = createInitialState(); const b = createAstralBattle(s.companions.slice(0, 5), s.weapons); b.active = 2; b.units[2].hits = 2;
 const upgraded = structuredClone(b); upgraded.units[2].companion.skillLevels = [1, 2, 1];
 expect(resolveAstralAction(upgraded, 'skill')!.event.damage).toBeGreaterThan(resolveAstralAction(b, 'skill')!.event.damage);
 expect(resolveAstralAction(upgraded, 'basic')!.event.damage).toBe(resolveAstralAction(b, 'basic')!.event.damage);
})
