import { clamp, type Coefficients, type Shape } from './math';
import { canRecord, type Event } from './events';
export interface SkillRecord { id: string; owner: string; coefficient: number; element: string; shape: Shape; locked: boolean }
export function recordSkill(records: readonly SkillRecord[], record: SkillRecord, coefficients: Coefficients, command: string, event: Pick<Event, 'tags'>, capacity = 2) {
  if (command !== 'skill' || !canRecord(event) || coefficients.hp || coefficients.defense || coefficients.flat || !coefficients.attack) return [...records];
  if (records.some(r => r.id === record.id)) return [...records];
  if (records.length >= capacity && records.every(r => r.locked)) return [...records];
  const next = [...records];
  if (next.length >= capacity) next.splice(next.findIndex(r => !r.locked), 1);
  return [...next, { ...record, coefficient: coefficients.attack }];
}
export function consumeRecord(records: readonly SkillRecord[], id: string, efficiency = .65, cap = 3) {
  const record = records.find(r => r.id === id);
  if (!record) throw new Error('V2 missing replay record');
  return { records: records.filter(r => r.id !== id), packet: { ...record, coefficient: Math.min(cap, record.coefficient) * clamp(efficiency, 0, 1) } };
}
/** Store defense parameters, never a historical final damage multiplier. */
export interface DefenseRecord { target: string; defense: number; resistance: number; expires: number }
export const recallDefense = (record: DefenseRecord, target: string, av: number) => record.target === target && av < record.expires ? { defense: record.defense, resistance: record.resistance } : undefined;
export interface Dot { id: string; owner: string; target: string; element: string; kind: 'burn' | 'poison'; coefficients: Coefficients; weights: number[] }
export function applyDot(dots: readonly Dot[], dot: Dot) {
  return [...dots.filter(d => !(d.id === dot.id && d.owner === dot.owner && d.target === dot.target)), structuredClone(dot)];
}
export function tickDot(dot: Dot, efficiency = 1) {
  const weight = dot.weights[0] ?? 0;
  return { dot: { ...dot, weights: dot.weights.slice(1) }, multiplier: weight * clamp(efficiency, 0, 1), discarded: weight * (1 - clamp(efficiency, 0, 1)) };
}
/** Splitting moves half of one future tick; it cannot mint a second full DoT. */
export function spreadDot(dot: Dot, target: string, newId: string) {
  if (target === dot.target || !dot.weights.length) throw new Error('V2 invalid DoT spread');
  const half = dot.weights[0] / 2;
  return { original: { ...dot, weights: [half, ...dot.weights.slice(1)] }, moved: { ...dot, id: newId, target, weights: [half] } };
}
