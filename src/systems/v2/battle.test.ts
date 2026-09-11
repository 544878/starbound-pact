import { describe, expect, it } from 'vitest';
import { companionCatalog } from '../../data/catalog';
import { CHARACTERS, V2_ENCOUNTERS } from './catalog';
import { act, actionError, advance, autoAction, createV2Battle } from './battle';
import { damage } from './math';
import { addShield, absorb, payHp, repayHp } from './defense';
import { canUltimate } from './resources';

const make = (id: string) => {
  const companion = companionCatalog.find(c => c.id === id);
  if (!companion) throw new Error(`Catalog ID missing: ${id}`);
  return { ...companion, level: 90, constellation: 0 };
};
const party = (id: string) => [id, ...['xuanzhao', 'mira', 'astra', 'lumi', 'noctis'].filter(x => x !== id)].slice(0, 5).map(make);
describe('V2 playable integration', () => {
  it.each(CHARACTERS.map(c => [c.id]))('%s executes its own three commands in the runtime', id => {
    for (const command of ['basic', 'skill', 'ultimate'] as const) {
      const b = createV2Battle(party(id), []);
      b.active = id; b.av = 100;
      const u = b.units.find(u => u.id === id)!; u.resource.value = u.resource.rule.capacity;
      const a = { actor: id, command, enemy: b.enemies[0].id, ally: b.units[1].id, secondAlly: b.units[2].id };
      expect(actionError(b, a)).toBeUndefined();
      const next = act(b, a);
      expect(next).not.toBe(b);
      expect(next.log.length).toBeGreaterThan(0);
      expect(next.units.every(u => Number.isFinite(u.hp) && u.hp >= 0 && u.hp <= u.stats.hp)).toBe(true);
      expect(b.log).toHaveLength(0);
    }
  });
  it.each(V2_ENCOUNTERS.map(e => [e.id]))('%s can advance through real ally/enemy/timed events', id => {
    let b = createV2Battle(party('noctis'), [], id);
    for (let i = 0; i < 150 && b.outcome === 'playing'; i++) {
      const a = autoAction(b), next = a ? act(b, a) : advance(b);
      expect(next).not.toBe(b);
      expect(next.av).toBeGreaterThanOrEqual(b.av);
      expect(next.points.value).toBeGreaterThanOrEqual(0);
      expect(next.points.value).toBeLessThanOrEqual(7);
      b = next;
    }
  });
  it('ultimate keeps the existing natural action and cannot immediately repeat', () => {
    const b = createV2Battle(party('gilgamesh'), []); const u = b.units[0];
    b.active = u.id; b.av = 100; u.resource.value = 6;
    const next = act(b, { actor: u.id, command: 'ultimate', enemy: b.enemies[0].id, ally: u.id, option: '2' });
    expect(next.units[0].clock).toEqual(u.clock);
    expect(next.units[0].resource.value).toBe(4);
    expect(canUltimate(next.units[0].resource, 111)).toBe(false);
    expect(next.points.value).toBe(4);
    expect(next.active).toBe(u.id);
  });
  it('reproduces the published naked static calculation with reference panel', () => {
    const noctis = CHARACTERS.find(c => c.id === 'noctis')!;
    expect(damage(noctis.reference, { attack: 2 }, { defense: 700, resistance: .1 }, { damageBonus: .22 })).toBeCloseTo(5038.06, 1);
  });
  it('same-source shields refresh and credits only the actual provider', () => {
    const s = { id: 'a', owner: 'xuanzhao', source: 'skill', remaining: 5000, expires: 200 };
    const shields = addShield(addShield([], s, 40000, 0), { ...s, remaining: 4000 }, 40000, 0);
    expect(shields).toHaveLength(1);
    const hit = absorb(shields, 4000, 40000, 100);
    expect(hit.hp).toBe(40000);
    expect(hit.ledger).toEqual([{ id: 'a', owner: 'xuanzhao', absorbed: 4000, broken: false }]);
  });
  it('HP cost repayments cannot double count', () => {
    const paid = payHp([], 'cost', 'actor', 1000, 100);
    const first = repayHp(paid.ledger, 'actor', 80);
    const second = repayHp(first.ledger, 'actor', 80);
    expect(first.repaid + second.repaid).toBe(100);
  });
});
