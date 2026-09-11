import { clamp, positive } from './math';
import { canGenerateResource, type Event } from './events';
export interface Energy { capacity: number; cost: number; initial: number; basic: number; skill: number }
export interface Resource {
  value: number; rule: Energy; naturalId: number; externalUsed: number;
  lastUltimateNaturalId: number; lastUltimateAv: number; locked: boolean;
}
export const createResource = (rule: Energy): Resource => ({ rule, value: clamp(rule.initial, 0, rule.capacity), naturalId: 0, externalUsed: 0, lastUltimateNaturalId: -1, lastUltimateAv: -Infinity, locked: false });
export const beginNatural = (r: Resource): Resource => ({ ...r, naturalId: r.naturalId + 1, externalUsed: 0 });
export function gainEnergy(r: Resource, amount: number, source: 'base' | 'external' | 'passive', efficiency = 1, event?: Pick<Event, 'tags'>) {
  if (source !== 'external' && event && !canGenerateResource(event)) return { resource: r, gained: 0, overflow: 0 };
  if (source === 'external' && r.locked) return { resource: r, gained: 0, overflow: 0 };
  const requested = positive(amount) * (source === 'base' ? positive(efficiency) : 1);
  const legal = source === 'external' ? Math.min(requested, positive(r.rule.cost * .15 - r.externalUsed)) : requested;
  const gained = Math.min(legal, positive(r.rule.capacity - r.value));
  return { resource: { ...r, value: r.value + gained, externalUsed: r.externalUsed + (source === 'external' ? legal : 0) }, gained, overflow: legal - gained };
}
export const canUltimate = (r: Resource, av: number) => !r.locked && r.value >= r.rule.cost && r.naturalId > r.lastUltimateNaturalId && av - r.lastUltimateAv >= 10;
export function payUltimate(r: Resource, av: number, cost = r.rule.cost): Resource {
  if (!canUltimate(r, av) || cost < r.rule.cost || cost > r.value) throw new Error('V2 illegal ultimate');
  return { ...r, value: r.value - cost, lastUltimateNaturalId: r.naturalId, lastUltimateAv: av };
}
export interface Points { value: number; window: number; bonusUsed: number }
export const createPoints = (): Points => ({ value: 4, window: 0, bonusUsed: 0 });
export function spendPoint(p: Points): Points {
  if (p.value < 1) throw new Error('V2 insufficient skill points');
  return { ...p, value: p.value - 1 };
}
export function gainPoints(p: Points, amount: number, av: number, bonus = false): Points {
  const window = Math.floor(av / 100), used = window === p.window ? p.bonusUsed : 0;
  const legal = bonus ? Math.min(positive(amount), 2 - used) : positive(amount);
  // A full bar consumes this opportunity; it never banks a refund implicitly.
  return { value: Math.min(7, p.value + legal), window, bonusUsed: used + (bonus ? legal : 0) };
}
/** One hop only. An ENERGY_TRANSFER event cannot be forwarded. */
export function transferEnergy(r: Resource, amount: number, event: Pick<Event, 'tags'>) {
  return event.tags.includes('ENERGY_TRANSFER') ? { resource: r, gained: 0, overflow: 0 } : gainEnergy(r, amount, 'external');
}
