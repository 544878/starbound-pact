import type { Companion } from '../../domain/types';
import type { Bonuses } from './math';
export const SUBSTATS = { attack: .03, hp: .03, defense: .038, crit: .018, critDamage: .036, flatSpeed: 1.5, energy: .024, mastery: 10, healing: .018, shield: .018, toughness: .03, resistance: .03 } as const;
export type SoulStat = keyof typeof SUBSTATS | 'flatHp' | 'flatAttack' | 'flatDefense' | 'damage';
export interface Soul { slot: number; level: number; main: SoulStat; subs: Array<{ key: keyof typeof SUBSTATS; rolls: number }>; focus?: keyof typeof SUBSTATS; misses: number; upgrades: number }
export const SOUL_MAINS: SoulStat[][] = [['flatHp'], ['flatAttack'], ['flatDefense'], ['attack', 'hp', 'defense', 'crit', 'critDamage', 'healing', 'shield'], ['damage', 'hp', 'defense', 'mastery'], ['attack', 'hp', 'defense', 'flatSpeed', 'energy', 'mastery']];
export const SOUL_LABELS: Record<SoulStat, string> = { flatHp: '固定生命', flatAttack: '固定攻击', flatDefense: '固定防御', attack: '攻击', hp: '生命', defense: '防御', crit: '暴击率', critDamage: '额外暴伤', healing: '治疗', shield: '护盾', damage: '伤害加成', mastery: '专精', flatSpeed: '速度', energy: '充能', toughness: '削韧', resistance: '效果抵抗' };
const mainValues: Record<SoulStat, number> = { flatHp: 1800, flatAttack: 240, flatDefense: 180, attack: .28, hp: .28, defense: .35, crit: .18, critDamage: .36, healing: .18, shield: .18, damage: .22, mastery: 96, flatSpeed: 16, energy: .24, toughness: 0, resistance: 0 };
function random(id: string, salt: number) { let hash = 2166136261 ^ salt; for (const c of id) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619); return (hash >>> 0) / 4294967296; }
export function createSoul(id: string, slot: number, main = SOUL_MAINS[slot][0]): Soul {
  if (!SOUL_MAINS[slot]?.includes(main)) throw new Error('Invalid soul main');
  const pool = (Object.keys(SUBSTATS) as Array<keyof typeof SUBSTATS>).filter(key => key !== main);
  const subs: Soul['subs'] = [];
  for (let i = 0; i < 5; i++) { const index = Math.floor(random(id, slot * 131 + i * 719) * pool.length); subs.push({ key: pool.splice(index, 1)[0], rolls: 1 }); }
  return { slot, main, level: 0, subs, misses: 0, upgrades: 0 };
}
export const soulFor = (c: Companion, slot: number) => c.v2Souls?.find(s => s.slot === slot) ?? createSoul(c.id, slot);
export function upgradeSoul(id: string, soul: Soul): Soul {
  if (soul.level >= 20) return soul;
  const next = structuredClone(soul); next.level++;
  if (next.level % 4 === 0) {
    const focusIndex = next.subs.findIndex(s => s.key === next.focus);
    const pick = focusIndex >= 0 && next.misses >= 2 ? focusIndex : Math.floor(random(id, next.slot * 7919 + next.level * 104729) * 5);
    next.subs[pick].rolls++; next.upgrades++;
    next.misses = focusIndex < 0 || pick === focusIndex ? 0 : next.misses + 1;
  }
  return next;
}
export function soulBonuses(c: Companion): Bonuses & { toughness: number } {
  const totals: Bonuses & { toughness: number } = { toughness: 0 };
  const levels = [1, 10, 20, 30, 40, 50];
  for (let slot = 0; slot < 6; slot++) {
    if (c.level < levels[slot]) continue;
    const soul = soulFor(c, slot);
    totals[soul.main] = (totals[soul.main] ?? 0) + mainValues[soul.main] * (.2 + .04 * soul.level);
    for (const sub of soul.subs) totals[sub.key] = (totals[sub.key] ?? 0) + SUBSTATS[sub.key] * sub.rolls;
  }
  totals.resistance = Math.min(.6, totals.resistance ?? 0);
  return totals;
}
export const soulAffixValue = (key: SoulStat, value: number) => ['flatHp', 'flatAttack', 'flatDefense', 'flatSpeed', 'mastery'].includes(key) ? `+${Number(value.toFixed(1))}` : `+${Number((value * 100).toFixed(1))}%`;
export const soulMainValue = (s: Soul) => mainValues[s.main] * (.2 + .04 * s.level);
export function hydrateSouls(input: unknown): Soul[] | undefined {
  if (!Array.isArray(input)) return undefined;
  return input.filter((s): s is Soul => !!s && typeof s === 'object' && Number.isInteger(s.slot) && s.slot >= 0 && s.slot < 6 && SOUL_MAINS[s.slot].includes(s.main) && Number.isInteger(s.level) && s.level >= 0 && s.level <= 20 && Array.isArray(s.subs) && s.subs.length === 5 && new Set(s.subs.map((x: { key: string }) => x.key)).size === 5 && s.subs.every((x: { key: string; rolls: number }) => x.key in SUBSTATS && x.key !== s.main && Number.isInteger(x.rolls) && x.rolls >= 1 && x.rolls <= 6) && s.subs.reduce((sum: number, x: { rolls: number }) => sum + x.rolls, 0) === 5 + Math.floor(s.level / 4)).filter((s, i, all) => all.findIndex(x => x.slot === s.slot) === i).map(s => ({ ...s, misses: Math.max(0, Math.min(2, s.misses || 0)), upgrades: Math.floor(s.level / 4) }));
}
