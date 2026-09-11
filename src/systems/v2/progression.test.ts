import { expect, it } from 'vitest';
import { createInitialState, restoreGameState, saveGameState, STORAGE_KEY, gameReducer } from '../../state/gameState';
import { createSoul, upgradeSoul, soulBonuses } from './souls';
import { characterPanel } from './catalog';
import { weaponCatalog } from '../../data/catalog';
it('backs up before converting old souls, refunds exact spend, and migrates once', () => {
  const original = createInitialState(); original.battleRulesVersion = 1;
  original.companions[0] = { ...original.companions[0], ringLevels: [12, 4, 0, 0, 0, 0, 0, 0, 0] };
  const saved = JSON.stringify({ version: 10, state: original });
  const map = new Map([[STORAGE_KEY, saved]]);
  const storage = { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); } };
  const next = restoreGameState(storage);
  expect(storage.getItem(`${STORAGE_KEY}:before-battle-v2`)).toBe(saved);
  expect(next.gold).toBe(original.gold + 5700 + 1100);
  const identity = (weapons: typeof original.weapons) => weapons.map(({ id, level, refinement, ownerId }) => ({ id, level, refinement, ownerId }));
  expect(identity(next.weapons)).toEqual(identity(original.weapons));
  expect(next.companions[0].constellation).toBe(original.companions[0].constellation);
  saveGameState(storage, next);
  expect(restoreGameState(storage).gold).toBe(next.gold);
});
it('does not overwrite the source if backup storage fails', () => {
  const original = createInitialState(); original.battleRulesVersion = 1;
  const saved = JSON.stringify({ state: original });
  const writes: string[] = [];
  const storage = { getItem: (key: string) => key === STORAGE_KEY ? saved : null, setItem: (key: string) => { writes.push(key); throw new Error('full'); } };
  const next = restoreGameState(storage); saveGameState(storage, next);
  expect(next.gold).toBe(original.gold);
  expect(writes).toEqual([`${STORAGE_KEY}:before-battle-v2`]);
});
it('five starting substats plus five upgrades conserve ten shares and improve real stats', () => {
  const state = createInitialState(), c = { ...state.companions[0], level: 90 };
  let soul = createSoul(c.id, 0);
  soul.focus = soul.subs[0].key;
  for (let i = 0; i < 20; i++) soul = upgradeSoul(c.id, soul);
  expect(new Set(soul.subs.map(s => s.key)).size).toBe(5);
  expect(soul.subs.reduce((n, s) => n + s.rolls, 0)).toBe(10);
  expect(soul.subs[0].rolls).toBeGreaterThanOrEqual(2);
  const leveled = { ...c, v2Souls: [soul] };
  expect(soulBonuses(leveled).flatHp).toBeGreaterThan(soulBonuses(c).flatHp!);
  expect(characterPanel(leveled, []).stats.hp).toBeGreaterThan(characterPanel(c, []).stats.hp);
});
it('a weapon keeps its own stat budget on a different owner', () => {
  const s = createInitialState(), hero = s.companions[0];
  const weapon = { ...weaponCatalog.find(w => w.signatureFor === 'xuanzhao')!, ownerId: hero.id, level: 90, refinement: 1 };
  const plain = characterPanel(hero, []).stats, equipped = characterPanel(hero, [weapon]).stats;
  expect(equipped.attack).toBeGreaterThan(plain.attack);
  expect(equipped.defense).toBeGreaterThan(plain.defense + 200);
  expect(characterPanel({ ...hero, path: 'flame' }, [weapon]).stats).toEqual(equipped);
});
it('soul enhancement is spend-checked and survives saving', () => {
  let s = createInitialState(); const id = s.companions[0].id;
  s = gameReducer(s, { type: 'UPGRADE_V2_SOUL', id, slot: 0 });
  expect(s.companions[0].v2Souls?.[0].level).toBe(1);
  expect(gameReducer({ ...s, gold: 0 }, { type: 'UPGRADE_V2_SOUL', id, slot: 0 }).companions).toBe(s.companions);
});
