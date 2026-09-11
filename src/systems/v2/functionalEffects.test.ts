import { expect, it } from 'vitest';
import { companionCatalog } from '../../data/catalog';
import { createInitialState, gameReducer, restoreGameState, saveGameState } from '../../state/gameState';
import { act, advance, applyEnemyStatus, chooseV2Blessing, createV2Battle } from './battle';
import { bankLostEnergy, cleanse } from './blessings';
import { hasFunctionalSoul, hydrateFunctionalSouls } from './functionalSouls';
import type { Action, Battle } from './model';

const party = () => ['noctis', 'mira', 'astra', 'lumi', 'xuanzhao'].map(id => ({ ...companionCatalog.find(c => c.id === id)!, level: 90, constellation: 0, rings: ['common-7', 'common-8', 'common-9'] }));
function command(b: Battle, actor = b.units[0].id, kind: Action['command'] = 'basic') {
  b.active = actor;
  b.units.find(u => u.id === actor)!.resource.value = b.units.find(u => u.id === actor)!.resource.rule.capacity;
  return act(b, { actor, command: kind, enemy: b.enemies.find(e => e.hp > 0)!.id, ally: b.units[0].id });
}
function incoming(b: Battle, amount: number) {
  const e = b.enemies[0]; e.stats.attack = amount;
  b.scheduled.push({ id: 'test-hit', owner: e.id, target: b.units[0].id, at: b.av, kind: 'enemy', coefficients: { attack: 1 }, shape: 'single', heavy: true });
  b.active = 'test-hit';
  return advance(b);
}

it('validates functional soul choices and persists changes without changing currency', () => {
  let state = createInitialState(); state.companions[0] = { ...state.companions[0], level: 90, rings: ['common-7', 'common-8', 'common-9'] };
  const id = state.companions[0].id;
  state = gameReducer(state, { type: 'SET_V2_FUNCTIONAL_SOUL', id, slot: 7, choice: 'point' });
  const gold = state.gold;
  state = gameReducer(state, { type: 'SET_V2_FUNCTIONAL_SOUL', id, slot: 7, choice: 'reserve' });
  expect(state.gold).toBe(gold);
  expect(state.companions[0].v2FunctionalSouls).toEqual({ 7: 'reserve' });
  const data = new Map<string, string>();
  const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
  saveGameState(storage, state);
  expect(restoreGameState(storage).companions[0].v2FunctionalSouls).toEqual({ 7: 'reserve' });
  expect(hydrateFunctionalSouls({ 6: 'point', 7: 'point', 8: 'unknown', 9: 'opening' })).toEqual({ 7: 'point' });
  expect(hasFunctionalSoul({ ...state.companions[0], level: 1 }, 'reserve')).toBe(false);
});
it('grants only one shared opening point regardless of the number of carriers', () => {
  const units = party().map(c => ({ ...c, v2FunctionalSouls: { 7: 'point' as const } }));
  expect(createV2Battle(units, []).points.value).toBe(5);
  expect(createV2Battle(party(), []).points.value).toBe(4);
});
it('triggers the defensive shield after surviving damage, only once and never on death', () => {
  const units = party(); units[0] = { ...units[0], v2FunctionalSouls: { 6: 'rescue' } } as typeof units[0];
  const b = createV2Battle(units, []); const u = b.units[0]; u.stats.hp = 1000; u.stats.defense = 0; u.hp = 400;
  const survived = incoming(b, 200);
  expect(survived.units[0].hp).toBe(200);
  expect(survived.units[0].shields[0]?.remaining).toBe(80);
  expect(incoming(survived, 100).units[0].shields).toHaveLength(0);
  const dead = incoming(b, 500);
  expect(dead.units[0].hp).toBe(0);
  expect(dead.units[0].shields).toHaveLength(0);
});
it('uses opening resistance during the first 100AV and expires it at 100AV', () => {
  const b = createV2Battle(party(), []); const u = b.units[0]; u.companion.v2FunctionalSouls = { 6: 'resist' }; u.bonuses.resistance = 0;
  b.av = 0; b.serial = 0;
  const poison = { key: 'enemyPoison', owner: 'enemy', value: 1, uses: 2, duration: { kind: 'av' as const, expires: 200 } };
  applyEnemyStatus(b, u, poison); expect(u.statuses).toHaveLength(0);
  b.av = 100; applyEnemyStatus(b, u, poison); expect(u.statuses).toHaveLength(1);
});
it('keeps existing energy across waves without creating energy or repeating opening points', () => {
  const b = createV2Battle(party(), [], 'tower:6');
  b.units[0].companion.v2FunctionalSouls = { 7: 'reserve' };
  for (const u of b.units) { u.hp = u.stats.hp * .5; u.resource.value = u.resource.rule.capacity; }
  b.units[1].resource.value = 1;
  b.enemies.forEach(e => { e.hp = 0; }); b.active = 'none';
  const next = advance(b);
  expect(next.wave).toBe(1);
  expect(next.units[0].hp).toBeCloseTo(b.units[0].stats.hp * .65);
  expect(next.units[0].resource.value).toBeCloseTo(Math.min(b.units[0].resource.rule.capacity, b.units[0].resource.rule.capacity * .6 + b.units[0].resource.rule.cost * .1));
  expect(next.units[1].resource.value).toBe(1);
  expect(next.points.value).toBe(4);
  b.blessing = 'safety'; const plain = advance(b);
  expect(plain.units[0].hp).toBe(b.units[0].hp);
  expect(plain.units[1].resource.value).toBe(0);
});
it('adds opening break once per wave and includes the actual toughness affix', () => {
  const b = createV2Battle(party(), []); b.units[0].companion.v2FunctionalSouls = { 8: 'opening' }; b.units[0].bonuses.toughness = .3;
  b.enemies[0].weaknesses = []; const start = b.enemies[0].toughness.value;
  const one = command(b); expect(start - one.enemies[0].toughness.value).toBeCloseTo(23);
  const two = command(one); expect(one.enemies[0].toughness.value - two.enemies[0].toughness.value).toBeCloseTo(13);
});
it('arms the break soul for the next active main packet and consumes it once', () => {
  const b = createV2Battle(party(), []); b.units[0].companion.v2FunctionalSouls = { 8: 'break' }; b.enemies[0].toughness.value = 1;
  const broken = command(b); expect(broken.units[0].counters.soulBreakReady).toBe(1);
  const baseline = structuredClone(broken); baseline.units[0].counters.soulBreakReady = 0;
  const boosted = command(broken), plain = command(baseline);
  expect(boosted.enemies[0].hp).toBeLessThan(plain.enemies[0].hp);
  expect(boosted.units[0].counters.soulBreakReady).toBe(0);
});
it('requires three consecutive distinct completed actions for the cycle blessing, including support actions and ultimates', () => {
  const b = createV2Battle(party(), [], 'tower:3', 'cycle'); b.points.value = 0;
  let next = command(b); next = command(next); next = command(next, 'mira', 'ultimate');
  expect(next.counters['blessing:cycle:0']).toBeUndefined();
  next = command(next, 'lumi', 'skill');
  expect(next.log.some(e => e.detail.includes('三人依次行动'))).toBe(true);
  expect(next.points.bonusUsed).toBe(1);
});
it('locks blessing selection after the first action and does not advertise unsupported features as active', () => {
  const b = createV2Battle(party(), [], 'tower:1'); expect(b.blessing).toBe('safety');
  expect(chooseV2Blessing(b, 'feature')).toBe(b);
  const selected = chooseV2Blessing(b, 'cycle'); expect(selected.blessing).toBe('cycle');
  const played = command(selected); expect(chooseV2Blessing(played, 'safety')).toBe(played);
});
it('cleanses real enemy poison and converts at most its next tick into a shield on floor 13', () => {
  const b = createV2Battle(party(), [], 'tower:13'); const u = b.units[0]; u.stats.defense = 0;
  u.statuses.push({ key: 'enemyPoison', owner: 'enemy', value: 1000, uses: 2, duration: { kind: 'av', expires: 1000 } });
  const next = command(b, 'mira', 'ultimate');
  expect(next.units[0].statuses.some(s => s.key === 'enemyPoison')).toBe(false);
  expect(next.units[0].shields[0]?.remaining).toBe(200);
  cleanse(next, next.units[0], ['enemyPoison']); expect(next.units[0].shields[0]?.remaining).toBe(200);
});
it('banks only a capped fraction of genuinely lost energy and returns it after an ultimate', () => {
  const b = createV2Battle(party(), [], 'tower:17'); const u = b.units[0];
  bankLostEnergy(b, u, 0); expect(u.counters.blessingEnergy).toBeUndefined();
  bankLostEnergy(b, u, 1000); bankLostEnergy(b, u, 1000);
  expect(u.counters.blessingEnergy).toBe(u.resource.rule.cost * .05);
  const next = command(b, u.id, 'ultimate');
  expect(next.units[0].counters.blessingEnergy).toBe(0);
  expect(next.units[0].resource.value).toBeCloseTo(u.resource.rule.capacity - u.resource.rule.cost + u.resource.rule.cost * .05);
});
