import type { Companion, Weapon } from "../domain/types";
import { RINGS, RULES } from "../data/advancedRules";
import { ringBonuses } from "./ringAffixes";
import { HERO_LORE } from "../data/epic";
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
  const bonus = ringBonuses(c);
  const w = weapons.find((w) => w.ownerId === c.id);
  const cons = Math.max(0, Math.min(6, c.constellation));
  const signature = !!w && w.signatureFor === c.id;

  return {
    hp: Math.round(
      (600 + c.level * 12 + (c.role === "guardian" ? 350 : 0)) * (1 + bonus.hp),
    ),
    attack: Math.round(
      (55 +
        c.level * 2 +
        cons * 7 +
        (55 + c.level * 2) * bonus.attack +
        (w ? w.level + w.refinement * 5 : 0)) *
        (signature ? 1.18 : 1),
    ),
    defense: (18 + (c.role === "guardian" ? 25 : 0)) * (1 + bonus.defense),
    interval: 1 / (1 + bonus.speed),
    energyEfficiency: 1 + bonus.energy,
    crit: bonus.crit,
    critDamage: bonus.critDamage,
    effects: rings.map((r) => r.effect),
    healing:
      (rings.some((r) => r.effect === "healing") ? 1.2 : 1) *
      (signature && c.path === "desire" ? 1.1 : 1),
    signaturePath: signature ? c.path : undefined,
    signature,
    soulBonus: signature ? 0.08 : 0,
  };
}
export type UnitStats = ReturnType<typeof stats>;
export function damage(
  a: UnitStats,
  d: UnitStats,
  hp: number,
  hits: number,
  multiplier = 1,
) {
  let amount =
    a.attack * multiplier * (1 + a.soulBonus) -
    d.defense * (a.effects.includes("pierce") ? 0.65 : 1);
  if (a.effects.includes("execute") && hp < d.hp / 2) amount *= 1.15;
  if (a.effects.includes("echo") && hits % 3 === 0) amount *= 1.25;
  if (d.effects.includes("guard")) amount *= 0.92;
  return Math.max(1, Math.round(amount));
}
