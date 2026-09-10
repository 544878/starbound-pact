import { describe, it, expect } from 'vitest'
import { companionCatalog, weaponCatalog } from '../data/catalog'
import { expansionCompanions, PLAYABLE_TEAMS, SELECTED_FOUR_STAR_IDS } from '../data/expansion'
import { COMBAT_PATHS, NEUTRAL_BOSS } from '../data/combat'
import { FORMATION_SLOTS } from '../domain/formationMath'
import { createInitialState, gameReducer, hydrateGameState } from '../state/gameState'
import { combatMember, numericKit, soulPrice } from './rosterCombat'
import { equippedStats } from './fourStarCharacters'
import { createAstralBattle, resolveAstralAction, formationLink } from './astralBattle'
import { getEncounter, encounterBosses } from '../data/encounters'
import type { PathId } from '../domain/combat'
import { simulateFormation, teamBoss } from './formationMath'

function fixture(path: PathId, rank = 0, level = 90) {
  const party = PLAYABLE_TEAMS[path].map(id => ({ ...companionCatalog.find(c => c.id === id)!, constellation: rank, level, rings:['exclusive-7','exclusive-8','exclusive-9'] }))
  const gear = party.map(c => ({ ...weaponCatalog.find(w => w.signatureFor === c.id)!, ownerId:c.id, level:90, refinement:5 }))
  return {party,gear}
}
function play(path: PathId, boss = getEncounter().boss, rank = 0, level = 90) {
  const {party,gear} = fixture(path,rank,level)
  let b = createAstralBattle(party,gear,path,boss)
  while (b.outcome === 'playing' && b.actions < 366) {
    const u = b.units[b.active]
    const command = u?.energy >= 100 ? 'ultimate' : b.points > 0 && (b.active !== 1 || b.units.some(u => u.hp > 0 && u.hp < u.maxHp * .85)) ? 'skill' : 'basic'
    b = resolveAstralAction(b,command)!.battle
    expect(b.units.every(u => Number.isFinite(u.hp) && u.hp >= 0 && u.hp <= u.maxHp)).toBe(true)
  }
  return b
}
describe('28-character expansion and original budget integration', () => {
  it('selects exactly twenty original four stars and adds eight five stars', () => {
    expect(new Set(SELECTED_FOUR_STAR_IDS).size).toBe(20)
    expect(expansionCompanions.filter(c => c.rarity === '4星')).toHaveLength(20)
    expect(expansionCompanions.filter(c => c.rarity === '5星')).toHaveLength(8)
    expect(new Set(expansionCompanions.filter(c => c.rarity === '5星').map(c => c.path)).size).toBe(8)
  })
  it.each(COMBAT_PATHS)('$name has five distinct original duties and reduced ring budgets without changing duties', ({id}) => {
    const {party,gear} = fixture(id)
    expect(party.map(c => numericKit(c).slot)).toEqual([...FORMATION_SLOTS])
    expect(new Set(party.map(c => c.id)).size).toBe(5)
    for (const c of party) {
      const s = combatMember(c,gear,id).combatKit!.stats, original = equippedStats(numericKit(c),id)
      expect(s.attack * 250).toBeLessThan(original.attack)
      expect(s.hp * 250).toBeLessThan(original.hp)
      expect(s.defense).toBeLessThan(original.defense)
      const base = combatMember({...c,rings:[]},gear,id).combatKit!.stats
      expect(s.attack).toBeGreaterThan(base.attack)
      expect(s.attack / base.attack).toBeLessThan(1.1)
      expect(s.hp / base.hp).toBeLessThan(1.1)
      expect(numericKit(c).specialties.length + numericKit(c).compatible.length).toBeLessThanOrEqual(3)
    }
    expect(formationLink(createAstralBattle(party,gear,id))).toBeLessThanOrEqual(.45)
  })
  it('purchases, persists and consumes targeted souls, rejects overspending and C6 overflow', () => {
    let s = {...createInitialState(),crystals:20000}
    const c = s.companions[0], before = s.crystals
    s = gameReducer(s,{type:'BUY_SOUL',id:c.id})
    expect(s.crystals).toBe(before-soulPrice(c))
    s = hydrateGameState({version:7,state:s})
    expect(s.materials[`soul:${c.id}`]).toBe(1)
    s = gameReducer(s,{type:'ACTIVATE_CONSTELLATION',id:c.id})
    expect(s.companions[0].constellation).toBe(c.constellation+1)
    expect(s.materials[`soul:${c.id}`]).toBe(0)
    expect(gameReducer({...s,crystals:0},{type:'BUY_SOUL',id:c.id}).crystals).toBe(0)
    s = {...s,companions:s.companions.map(u => ({...u,constellation:6}))}
    expect(gameReducer(s,{type:'BUY_SOUL',id:c.id}).crystals).toBe(s.crystals)
    expect(gameReducer(s,{type:'ACTIVATE_CONSTELLATION',id:c.id}).companions[0].constellation).toBe(6)
  })
  it('ring pity is isolated, deterministic at 30, and stops charging after acquisition', () => {
    let s = {...createInitialState(),crystals:10000}
    const id = s.companions[0].id
    for(let i=0;i<30;i++) s = gameReducer(s,{type:'PULL_RING',id,slot:0,roll:.9})
    expect(s.materials[`ring:${id}:0`]).toBe(1)
    expect(s.materials[`ring:${id}:0:pity`]).toBe(0)
    expect(s.materials[`ring:${id}:1`]).toBeUndefined()
    expect(s.crystals).toBe(5200)
    expect(gameReducer(s,{type:'PULL_RING',id,slot:0,roll:.9}).crystals).toBe(5200)
    for(const roll of [-1,1,Infinity,NaN]) expect(gameReducer(s,{type:'PULL_RING',id,slot:1,roll}).crystals).toBe(5200)
  })
  it('retains comparable neutral damage and original C6 budget on all eight teams', () => {
    const damage: number[] = []
    for (const {id} of COMBAT_PATHS) {
      const {party,gear} = fixture(id)
      const simulate = (rank: number) => simulateFormation({path:id,members:party.map(c => combatMember({...c,constellation:rank},gear,id))},teamBoss(NEUTRAL_BOSS),12)
      const base = simulate(0), max = simulate(6)
      damage.push(base.damage)
      expect(base.survivors).toBe(5)
      expect(max.damage/base.damage).toBeGreaterThan(1.2)
      expect(max.damage/base.damage).toBeLessThan(1.65)
    }
    expect(Math.max(...damage)/Math.min(...damage)).toBeLessThan(1.2)
  })
  it('C6 improves actual high-difficulty clears without requiring it at C0', () => {
    for (const {id} of COMBAT_PATHS) {
      const boss = getEncounter({kind:'tower',id:'8'}).boss
      const zero = play(id,boss,0), six = play(id,boss,6)
      expect(six.outcome).toBe('win')
      expect(six.round).toBeLessThan(zero.round)
      expect(zero.round/six.round).toBeLessThan(1.8)
    }
  })
  it('runs 64 real high-difficulty matches; every boss has a C0 clear and every path has viable encounters', () => {
    const rows = COMBAT_PATHS.map(({id}) => encounterBosses.map(boss => play(id,boss)))
    console.log('C0 tower rounds',rows.map((row,i) => ({path:COMBAT_PATHS[i].id,results:row.map(b => b.round)})))
    for(const row of rows) expect(row.some(b => b.outcome === 'win')).toBe(true)
    for(let i=0;i<8;i++) expect(rows.some(row => row[i].outcome === 'win')).toBe(true)
    for(const row of rows) for(const b of row) { expect(b.outcome).toBe('win'); expect(b.round).toBeLessThanOrEqual(24); expect(b.round).toBeGreaterThanOrEqual(5) }
  })
})
