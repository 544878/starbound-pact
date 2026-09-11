import type { Companion, Weapon } from "../domain/types";
import { RINGS, RULES } from "../data/advancedRules";
import { ringBonuses } from "./ringAffixes";
import { HERO_LORE } from "../data/epic";
import { characterPanel } from './v2/catalog';
import { damage as resolveDamage } from './v2/math';
export type Ring = {
  id: string;
  name: string;
  stat: string;
  value: number;
  effect: string;
  description: string;
  age?: number;
  color?: string;
};
export const RING_AGES = [
  100, 500, 1000, 5000, 10000, 50000, 100000, 200000, 500000,
];
export function ringAt(c: Companion, slot: number): Ring | undefined {
  const base =
    slot < 6 ? RINGS[slot] : RINGS.find((r) => r.id === c.rings?.[slot - 6]);
  if (!base) return undefined;
  const exclusive = base.id.startsWith("exclusive");
  return {
    ...base,
    value: 0,
    effect: "affix",
    description: "一条主词条与两条副词条，强化后逐步解锁。",
    name: exclusive
      ? `${HERO_LORE[c.id]?.soulName ?? c.name}·${["真身", "命器", "本源"][slot - 6]}`
      : base.name,
    age: RING_AGES[slot],
    color:
      slot < 2
        ? "#b38a35"
        : slot < 4
          ? "#8f65b4"
          : slot < 6
            ? "#494258"
            : "#b65750",
  };
}
export function activeRings(c: Companion) {
  return Array.from({ length: 9 }, (_, i) => {
    if (i < 6 && c.level < RULES.growth.ringLevels[i]) return [];
    const ring = ringAt(c, i);
    if (
      i >= 6 &&
      ![`common-${i + 1}`, `exclusive-${i + 1}`].includes(ring?.id ?? "")
    )
      return [];
    return ring ? [ring] : [];
  }).flat();
}
export function stats(c: Companion, weapons: Weapon[] = []) {
  const rings = activeRings(c);
  const build = characterPanel(c, weapons);
  const w = weapons.find((w) => w.ownerId === c.id);
  const cons = Math.max(0, Math.min(6, c.constellation));
  const signature = !!w && w.signatureFor === c.id;

  return {
    ...build.stats,
    interval: 100 / build.stats.speed,
    effects: rings.map((r) => r.effect),
    healing: 1 + (build.bonuses.healing ?? 0),
    signaturePath: signature ? c.path : undefined,
    signature,
    soulBonus: 0,
  };
}
export type UnitStats = ReturnType<typeof stats>;
export function damage(
  a: UnitStats,
  d: UnitStats,
  hp: number,
  hits: number,
  multiplier = 1,
  modeMultiplier = 1,
) {
  return Math.round(resolveDamage(a, { attack: multiplier }, { defense: d.defense, reduction: a.effects.includes('pierce') ? .35 : 0, mitigation: d.effects.includes('guard') ? .08 : 0 }, { pvpMultiplier: modeMultiplier }));
}
