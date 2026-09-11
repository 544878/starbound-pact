/** V2 uses displayed points and fractional rates throughout. No legacy /250 units. */
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, finite(n)));
export function finite(n: number) {
  if (!Number.isFinite(n)) throw new Error('V2 non-finite numeric input');
  return n;
}
export const positive = (n: number) => Math.max(0, finite(n));
export const growth = (level: number) => .4 + .6 * (clamp(level, 1, 90) - 1) / 89;
export const masteryMultiplier = (mastery: number) => 1 + 1.6 * positive(mastery) / (positive(mastery) + 400);
export const reactionBase = (level: number) => 1500 * growth(level) ** 2;
export interface Stats {
  attack: number; hp: number; defense: number; speed: number;
  crit: number; critDamage: number; energyEfficiency: number; mastery: number;
}
export interface Bonuses {
  attack?: number; hp?: number; defense?: number; speed?: number;
  flatAttack?: number; flatHp?: number; flatDefense?: number; flatSpeed?: number;
  crit?: number; critDamage?: number; energy?: number; mastery?: number;
  damage?: number; healing?: number; shield?: number; resistance?: number; toughness?: number;
}
export function panel(base: Pick<Stats, 'attack' | 'hp' | 'defense' | 'speed'>, level: number,
  weapon: Pick<Stats, 'attack' | 'hp' | 'defense'> = { attack: 0, hp: 0, defense: 0 }, weaponLevel = 90, b: Bonuses = {}): Stats {
  const g = growth(level), w = growth(weaponLevel);
  return {
    attack: positive((base.attack * g + weapon.attack * w) * (1 + (b.attack ?? 0)) + (b.flatAttack ?? 0)),
    hp: Math.max(1, (base.hp * g + weapon.hp * w) * (1 + (b.hp ?? 0)) + (b.flatHp ?? 0)),
    defense: positive((base.defense * g + weapon.defense * w) * (1 + (b.defense ?? 0)) + (b.flatDefense ?? 0)),
    speed: Math.max(1, (base.speed + (b.flatSpeed ?? 0)) * (1 + (b.speed ?? 0))),
    crit: clamp(.05 + (b.crit ?? 0), 0, 1), critDamage: positive(.5 + (b.critDamage ?? 0)),
    energyEfficiency: positive(1 + (b.energy ?? 0)), mastery: positive(b.mastery ?? 0),
  };
}
export interface Coefficients { attack?: number; defense?: number; hp?: number; flat?: number }
export interface Defense { defense: number; reduction?: number; resistance?: number; resistanceReduction?: number; vulnerability?: number; broken?: boolean; mitigation?: number }
export interface DamageOptions { damageBonus?: number; elementalBonus?: number; channelBonus?: number; channel?: 'direct' | 'followup' | 'dot' | 'reaction' | 'warehouse' | 'replay'; pvpMultiplier?: number }
export const baseAmount = (s: Stats, c: Coefficients) => positive(s.attack * (c.attack ?? 0) + s.defense * (c.defense ?? 0) + s.hp * (c.hp ?? 0) + (c.flat ?? 0));
export function damage(s: Stats, coefficients: Coefficients, target: Defense, o: DamageOptions = {}) {
  const channel = o.channel ?? 'direct';
  const warehouse = channel === 'warehouse';
  const critical = ['direct', 'followup', 'replay'].includes(channel) ? 1 + clamp(s.crit, 0, 1) * positive(s.critDamage) : 1;
  const mastery = channel === 'dot' || channel === 'reaction' ? masteryMultiplier(s.mastery) : 1;
  const defense = 1000 / (1000 + positive(target.defense) * (1 - clamp(target.reduction ?? 0, 0, .5)));
  const resistance = 1 - clamp((target.resistance ?? 0) - (target.resistanceReduction ?? 0), -.4, .7);
  const bonus = warehouse ? 1 : Math.max(0, 1 + (o.damageBonus ?? 0) + (o.elementalBonus ?? 0) + (o.channelBonus ?? 0));
  const vulnerability = warehouse ? 1 : 1 + clamp((target.vulnerability ?? 0) + (target.broken ? .2 : 0), 0, .3);
  return finite(baseAmount(s, coefficients) * critical * mastery * defense * resistance * bonus * vulnerability * (1 - clamp(target.mitigation ?? 0, 0, .65)) * positive(o.pvpMultiplier ?? 1));
}
export function heal(s: Stats, c: Coefficients, hp: number, maxHp: number, bonus = 0, suppression = 0) {
  const nominal = baseAmount(s, c) * Math.max(0, 1 + bonus) * (1 - clamp(suppression, 0, 1));
  const effective = hp > 0 ? Math.min(nominal, positive(maxHp - hp)) : 0;
  return { nominal, effective, overflow: nominal - effective, hp: hp + effective };
}
export type Shape = 'single' | 'blast' | 'all';
export function targets(shape: Shape, target: string, roster: ReadonlyArray<{ id: string; hp: number }>) {
  const i = roster.findIndex(t => t.id === target && t.hp > 0);
  if (i < 0) throw new Error('V2 invalid damage target');
  return roster.flatMap((t, j) => t.hp <= 0 ? [] : shape === 'all' || i === j ? [{ id: t.id, coefficient: 1 }] : shape === 'blast' && Math.abs(i - j) === 1 ? [{ id: t.id, coefficient: .5 }] : []);
}
