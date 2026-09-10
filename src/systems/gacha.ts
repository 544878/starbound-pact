import type { Companion, PullResult, Rarity, Weapon } from "../domain/types";
import { companionCatalog, weaponCatalog } from "../data/catalog";
import { FGO_CHARACTERS_MAP } from "../data/fgoCollab";
import { WUWA_CHARACTERS_MAP } from "../data/wuwaCollab";
export const CHARACTER_RATES = { fiveStar: 0.016 };
export const WEAPON_RATES = { fiveStar: 0.02 };
export const FEATURED_ID = "astra";
export const COLLAB_IDS = [
  ...Object.keys(FGO_CHARACTERS_MAP),
  ...Object.keys(WUWA_CHARACTERS_MAP),
];
export const STANDARD_FIVE_IDS = companionCatalog
  .filter((c) => c.rarity === "5星" && !COLLAB_IDS.includes(c.id))
  .map((c) => c.id);
export function performCharacterPulls(
  banner: "standard" | "limited" | "collab",
  count: number,
  pity: number,
  guaranteed: boolean,
  characters: Companion[],
  random = Math.random,
): { results: PullResult[]; pity: number; guaranteed: boolean } {
  if (banner === "limited") return { results: [], pity, guaranteed };
  const pool = companionCatalog.filter(
    (c) =>
      c.rarity === "4星" ||
      (banner === "collab"
        ? COLLAB_IDS.includes(c.id)
        : !COLLAB_IDS.includes(c.id)),
  );
  const results: PullResult[] = [];
  for (let i = 0; i < count; i++) {
    const rarity = rollRarity("companion", pity, random);
    const candidates = pool.filter((c) => c.rarity === rarity);
    if (!candidates.length) throw new Error("角色卡池配置不完整");
    const item =
      candidates[
        Math.min(
          candidates.length - 1,
          Math.floor(random() * candidates.length),
        )
      ];
    results.push({
      kind: "companion",
      id: item.id,
      rarity,
      duplicate:
        characters.some((c) => c.id === item.id) ||
        results.some((r) => r.id === item.id),
    });
    pity = rarity === "5星" ? 0 : pity + 1;
  }
  return { results, pity, guaranteed };
}
export function rollRarity(
  kind: "companion" | "weapon",
  pity: number,
  random = Math.random,
): Rarity {
  return pity >= 79 ||
    random() < (kind === "companion" ? CHARACTER_RATES : WEAPON_RATES).fiveStar
    ? "5星"
    : "4星";
}
export function performPulls(
  kind: "companion" | "weapon",
  count: number,
  pity: number,
  companions: Companion[],
  weapons: Weapon[],
  random = Math.random,
): { results: PullResult[]; pity: number } {
  const source = kind === "companion" ? companionCatalog : weaponCatalog;
  const results: PullResult[] = [];
  for (let i = 0; i < count; i++) {
    const rarity = rollRarity(kind, pity, random);
    const pool = source.filter((c) => c.rarity === rarity);
    if (!pool.length) continue;
    const item =
      pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
    results.push({
      kind,
      id: item.id,
      rarity,
      duplicate:
        (kind === "companion" ? companions : weapons).some(
          (c) => c.id === item.id,
        ) || results.some((r) => r.id === item.id),
    });
    pity = rarity === "5星" ? 0 : pity + 1;
  }
  return { results, pity };
}
