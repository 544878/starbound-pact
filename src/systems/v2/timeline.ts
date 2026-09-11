import { clamp, positive } from './math';
export interface Clock { id: string; due: number; interval: number; advanced: number; delayed: number; naturalId: number }
export const clock = (id: string, speed: number, av = 0): Clock => {
  const interval = 10000 / Math.max(1, positive(speed));
  return { id, due: av + interval, interval, advanced: 0, delayed: 0, naturalId: 0 };
};
export const nextClock = (clocks: readonly Clock[]) => [...clocks].sort((a, b) => a.due - b.due || a.id.localeCompare(b.id))[0];
export function shiftAction(c: Clock, av: number, fraction: number, direction: 'advance' | 'delay'): Clock {
  const remaining = positive(c.due - av);
  const used = direction === 'advance' ? c.advanced : c.delayed;
  const amount = Math.min(remaining * clamp(fraction, 0, 1), positive(c.interval * .3 - used), direction === 'advance' ? positive(remaining - 1) : Infinity);
  return direction === 'advance' ? { ...c, due: c.due - amount, advanced: used + amount } : { ...c, due: c.due + amount, delayed: used + amount };
}
export const completeNatural = (c: Clock, av: number, speed = 10000 / c.interval): Clock => ({ ...clock(c.id, speed, av), naturalId: c.naturalId + 1 });
export type Duration = { kind: 'av'; expires: number } | { kind: 'caster' | 'target'; actor: string; expires: number };
export const expired = (d: Duration, av: number, turns: Readonly<Record<string, number>>) => d.kind === 'av' ? av >= d.expires : (turns[d.actor] ?? 0) >= d.expires;
export interface Appointment { id: string; owner: string; due: number; payload: string }
/** Appointments remain independent of any natural-action shift. */
export const dueAppointments = (events: readonly Appointment[], av: number) => events.filter(e => e.due <= av).sort((a, b) => a.due - b.due || a.id.localeCompare(b.id));
