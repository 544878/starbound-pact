import { ringBonuses } from "./ringAffixes";
import { FOUR_STAR_CHARACTERS } from "../data/fourStarCharacters";
import { LEGACY_NUMERIC_IDS } from "../data/expansion";
import { FGO_CHARACTERS_MAP } from "../data/fgoCollab";
import { WUWA_CHARACTERS_MAP } from "../data/wuwaCollab";
import { COMBAT_POINT_SCALE } from "../data/combatScale";
import { characterMember } from "./fourStarCharacters";
import { normalizeStats } from "./combatMath";
import type { Companion, Weapon } from "../domain/types";
import type { PathId } from "../domain/combat";

export function numericKit(c: Companion) {
  return (
    WUWA_CHARACTERS_MAP[c.id] ??
    FGO_CHARACTERS_MAP[c.id] ??
    FOUR_STAR_CHARACTERS.find(
      (k) => k.id === (c.numericId ?? LEGACY_NUMERIC_IDS[c.id]),
    ) ??
    FOUR_STAR_CHARACTERS[1]
  );
}
export function affinity(c: Companion, path: PathId) {
  const kit = numericKit(c);
  return kit.specialties.includes(path)
    ? 1
    : kit.compatible.includes(path)
      ? 0.65
      : 0;
}
export function constellationNodes(c: Companion) {
  return numericKit(c).constellations;
}
export function soulPrice(c: Companion) {
  return c.rarity === "5星" ? 1600 : 480;
}
export function combatMember(c: Companion, weapons: Weapon[], path: PathId) {
  const source = numericKit(c);
  const member = characterMember(source.id, path, c.constellation);
  const weapon = weapons.find((w) => w.ownerId === c.id);
  const level = Math.max(1, Math.min(90, c.level));
  const growth = 0.35 + (0.65 * (level - 1)) / 89;
  const s = { ...source.baseStats };
  const item = source.weapon;
  const power = weapon
    ? (0.5 + (0.5 * (weapon.level - 1)) / 89) *
      (0.9 + (0.1 * (weapon.refinement - 1)) / 4) *
      (weapon.signatureFor === c.id ? 1 : 0.85)
    : 0;
  s.attack += item.flat.attack * power;
  s.hp += item.flat.hp * power;
  s.defense += item.flat.defense * power;
  s[item.buff.stat] += item.buff.amount * power * affinity(c, path);
  const rings = ringBonuses(c);
  s.attack += source.baseStats.attack * rings.attack;
  s.hp += source.baseStats.hp * rings.hp;
  s.defense += source.baseStats.defense * rings.defense;
  s.crit += rings.crit;
  s.critDamage += rings.critDamage;
  if (source.exclusiveBuff.statBonus?.path === path)
    s[source.exclusiveBuff.statBonus.stat] +=
      source.exclusiveBuff.statBonus.amount;
  member.combatKit!.stats = normalizeStats({
    ...s,
    attack: (s.attack / COMBAT_POINT_SCALE) * growth,
    hp: (s.hp / COMBAT_POINT_SCALE) * growth,
    defense: s.defense * (0.65 + 0.35 * growth),
  });
  return member;
}
export function combatPanel(c: Companion, weapons: Weapon[]) {
  const s = combatMember(c, weapons, c.path ?? numericKit(c).mechanicPath)
    .combatKit!.stats;
  return {
    ...s,
    attack: Math.round(s.attack * COMBAT_POINT_SCALE),
    hp: Math.round(s.hp * COMBAT_POINT_SCALE),
    defense: Math.round(s.defense),
  };
}
