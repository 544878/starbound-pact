import type { Companion } from "../domain/types";
import { RULES } from "../data/advancedRules";

// Fractions, never percentages. Each ring has one main and two distinct substats.
export const AFFIXES = [
  { key: "attack", label: "攻击", weight: 20, main: 0.02, sub: 0.005 },
  { key: "hp", label: "生命", weight: 20, main: 0.02, sub: 0.005 },
  { key: "defense", label: "防御", weight: 15, main: 0.025, sub: 0.006 },
  { key: "crit", label: "暴击率", weight: 10, main: 0.01, sub: 0.003 },
  { key: "critDamage", label: "暴击伤害", weight: 10, main: 0.02, sub: 0.006 },
  { key: "energy", label: "能量回复效率", weight: 15, main: 0.015, sub: 0.004 },
  { key: "speed", label: "速度", weight: 10, main: 0.01, sub: 0.003 },
] as const;
export type AffixKey = (typeof AFFIXES)[number]["key"];
export const RING_NAMES = [
  "生息",
  "锋芒",
  "磐石",
  "回响",
  "春潮",
  "疾风",
  "真身",
  "命器",
  "本源",
];
export const RING_MAX_LEVEL = 12;
export const ringLevel = (c: Companion, slot: number) =>
  Math.max(0, Math.min(RING_MAX_LEVEL, Math.floor(c.ringLevels?.[slot] ?? 0)));
export function ringUnlocked(c: Companion, slot: number) {
  return slot < 6
    ? c.level >= RULES.growth.ringLevels[slot]
    : [`common-${slot + 1}`, `exclusive-${slot + 1}`].includes(
        c.rings?.[slot - 6] ?? "",
      );
}
function randomFor(c: Companion, slot: number) {
  let seed = 2166136261;
  for (const ch of `${c.id}:ring-v2:${slot}`)
    seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619);
  return () => {
    seed += 0x6d2b79f5;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function ringAffixes(c: Companion, slot: number) {
  const random = randomFor(c, slot);
  const fixed: AffixKey[][] = [
    ["hp", "defense", "energy"],
    ["attack", "crit", "critDamage"],
    ["critDamage", "speed", "attack"],
  ];
  const chosen: AffixKey[] = [];
  for (let i = 0; i < 3; i++) {
    const available = AFFIXES.filter((a) => !chosen.includes(a.key));
    let roll = random() * available.reduce((n, a) => n + a.weight, 0);
    const picked =
      available.find((a) => (roll -= a.weight) < 0) ??
      available[available.length - 1];
    chosen.push(slot >= 6 ? fixed[slot - 6][i] : picked.key);
  }
  const level = ringLevel(c, slot);
  const factor =
    slot >= 6 && !c.rings?.[slot - 6]?.startsWith("exclusive") ? 0.75 : 1;
  return chosen.map((key, i) => {
    const a = AFFIXES.find((a) => a.key === key)!;
    return {
      key,
      label: a.label,
      main: i === 0,
      unlock: i * 4,
      active: ringUnlocked(c, slot) && level >= i * 4,
      value:
        (i === 0
          ? a.main * (1 + level / 24)
          : a.sub * (level >= 12 ? 1.5 : 1)) * factor,
    };
  });
}
export function ringBonuses(c: Companion): Record<AffixKey, number> {
  const totals: Record<AffixKey, number> = {
    attack: 0,
    hp: 0,
    defense: 0,
    crit: 0,
    critDamage: 0,
    energy: 0,
    speed: 0,
  };
  for (let slot = 0; slot < 9; slot++)
    for (const a of ringAffixes(c, slot))
      if (a.active) totals[a.key] += a.value;
  return totals;
}
export const affixValue = (value: number) =>
  `+${Number((value * 100).toFixed(2))}%`;
