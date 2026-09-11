import { clamp, positive } from './math';
export interface Shield { id: string; owner: string; source: string; remaining: number; expires: number; priority?: number }
export const liveShields = (shields: readonly Shield[], av: number) => shields.filter(s => s.expires > av && s.remaining > 0);
export function addShield(shields: readonly Shield[], incoming: Shield, maxHp: number, av: number) {
  const live = liveShields(shields, av).map(s => ({ ...s }));
  const same = live.find(s => s.owner === incoming.owner && s.source === incoming.source);
  const other = live.filter(s => s !== same).reduce((sum, s) => sum + s.remaining, 0);
  const remaining = Math.min(Math.max(same?.remaining ?? 0, positive(incoming.remaining)), positive(maxHp * .5 - other));
  return [...live.filter(s => s !== same), { ...incoming, remaining }].filter(s => s.remaining > 0);
}
export function absorb(shields: readonly Shield[], incoming: number, hp: number, av: number) {
  const next = liveShields(shields, av).map(s => ({ ...s })).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || a.expires - b.expires || a.id.localeCompare(b.id));
  let rest = positive(incoming);
  const ledger: Array<{ id: string; owner: string; absorbed: number; broken: boolean }> = [];
  for (const shield of next) {
    const absorbed = Math.min(rest, shield.remaining);
    shield.remaining -= absorbed; rest -= absorbed;
    if (absorbed > 0) ledger.push({ id: shield.id, owner: shield.owner, absorbed, broken: shield.remaining === 0 });
  }
  const loss = Math.min(positive(hp), rest);
  return { shields: next.filter(s => s.remaining > 0), hp: hp - loss, loss, overkill: rest - loss, ledger };
}
export const warehouseGain = (stored: number, absorbedByOwner: number, ownerHp: number) => Math.min(ownerHp * .12, positive(stored) + positive(absorbedByOwner) * .35);
export interface HpCost { id: string; owner: string; paid: number; remaining: number }
export function payHp(ledger: readonly HpCost[], id: string, owner: string, hp: number, requested: number) {
  if (ledger.some(x => x.id === id)) throw new Error('V2 duplicate HP cost');
  const paid = Math.min(positive(requested), positive(hp - 1));
  return { hp: hp - paid, paid, ledger: [...ledger, { id, owner, paid, remaining: paid }] };
}
export function repayHp(ledger: readonly HpCost[], owner: string, effectiveHealing: number) {
  let available = positive(effectiveHealing), repaid = 0;
  const next = ledger.map(entry => {
    if (entry.owner !== owner) return { ...entry };
    const amount = Math.min(entry.remaining, available);
    available -= amount; repaid += amount;
    return { ...entry, remaining: entry.remaining - amount };
  });
  return { ledger: next, repaid };
}
export interface Deferred { id: string; owner: string; target: string; remaining: number; due: number }
/** A debt is already mitigated damage. Settling it must bypass defense and shields. */
export function deferDamage(debts: readonly Deferred[], debt: Deferred, incoming: number, ratio: number, cap: number, alreadyDeferred = false) {
  if (alreadyDeferred) return { debts: [...debts], immediate: incoming, deferred: 0 };
  if (debts.some(d => d.id === debt.id)) throw new Error('V2 duplicate deferred debt');
  const existing = debts.filter(d => d.target === debt.target).reduce((sum, d) => sum + d.remaining, 0);
  const deferred = Math.min(positive(incoming) * clamp(ratio, 0, 1), positive(cap - existing));
  return { debts: [...debts, { ...debt, remaining: deferred }].filter(d => d.remaining > 0), immediate: incoming - deferred, deferred };
}
export function repayDeferred(debts: readonly Deferred[], target: string, payment: number) {
  let rest = positive(payment);
  const next = [...debts].sort((a, b) => a.due - b.due || a.id.localeCompare(b.id)).map(d => {
    const paid = d.target === target ? Math.min(rest, d.remaining) : 0;
    rest -= paid;
    return { ...d, remaining: d.remaining - paid };
  });
  return { debts: next.filter(d => d.remaining > 0), paid: positive(payment) - rest };
}
export function settleDeferred(debts: readonly Deferred[], target: string, hp: number, av: number) {
  const due = debts.filter(d => d.target === target && d.due <= av);
  const loss = Math.min(positive(hp), due.reduce((sum, d) => sum + d.remaining, 0));
  return { hp: hp - loss, loss, settled: due, debts: debts.filter(d => !due.includes(d) && (hp - loss > 0 || d.target !== target)) };
}
export interface Toughness { value: number; max: number; brokenUntil: number; lastDelayWindow: number }
export function breakToughness(t: Toughness, amount: number, av: number) {
  if (t.brokenUntil > av) return { toughness: t, delay: 0, interrupted: false };
  const restored = t.value === 0 ? t.max * .75 : t.value;
  const value = Math.max(0, restored - positive(amount));
  const broken = value === 0, window = Math.floor(av / 100);
  return { toughness: { ...t, value, brokenUntil: broken ? av + 40 : t.brokenUntil, lastDelayWindow: broken ? window : t.lastDelayWindow }, delay: broken && window !== t.lastDelayWindow ? 10 : 0, interrupted: broken };
}
