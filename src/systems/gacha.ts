import type { Companion, PullResult, Rarity, Weapon } from "../domain/types";
import { companionCatalog, weaponCatalog } from "../data/catalog";
import { FGO_CHARACTERS_MAP } from "../data/fgoCollab";
import { WUWA_CHARACTERS_MAP } from "../data/wuwaCollab";
export const CHARACTER_RATES = { fiveStar: 0.016 };
export const WEAPON_RATES = { fiveStar: 0.02 };
export const FEATURED_ID = "astra";
export const LIMITED_POOL_1_IDS = [
  "robin_lovesong",
  "aventurine_waves",
] as const;
export const LIMITED_FIVE_IDS = [...LIMITED_POOL_1_IDS];
export const COLLAB_IDS = [
  ...Object.keys(FGO_CHARACTERS_MAP),
  ...Object.keys(WUWA_CHARACTERS_MAP),
];
export const STANDARD_FIVE_IDS = companionCatalog
  .filter(
    (c) =>
      c.rarity === "5星" &&
      !COLLAB_IDS.includes(c.id) &&
      !LIMITED_FIVE_IDS.includes(c.id),
  )
  .map((c) => c.id);
export function performCharacterPulls(
  banner: "standard" | "limited" | "collab",
  count: number,
  pity: number,
  guaranteed: boolean,
  characters: Companion[],
  random = Math.random,
): { results: PullResult[]; pity: number; guaranteed: boolean } {
  const fourStars = companionCatalog.filter((c) => c.rarity === "4星");
  const standardFives = companionCatalog.filter((c) =>
    STANDARD_FIVE_IDS.includes(c.id),
  );
  const collabFives = companionCatalog.filter((c) =>
    COLLAB_IDS.includes(c.id),
  );
  const limitedFives = companionCatalog.filter((c) =>
    LIMITED_FIVE_IDS.includes(c.id),
  );

  const results: PullResult[] = [];
  for (let i = 0; i < count; i++) {
    const rarity = rollRarity("companion", pity, random);
    let item: Companion;

    if (rarity === "5星") {
      if (banner === "limited") {
        const isUp = guaranteed || random() < 0.5;
        if (isUp) {
          item = limitedFives[Math.floor(random() * limitedFives.length)];
          guaranteed = false;
        } else {
          item = standardFives[Math.floor(random() * standardFives.length)];
          guaranteed = true;
        }
      } else if (banner === "collab") {
        item = collabFives[Math.floor(random() * collabFives.length)];
      } else {
        item = standardFives[Math.floor(random() * standardFives.length)];
      }
      pity = 0;
    } else {
      item = fourStars[Math.floor(random() * fourStars.length)];
      pity = pity + 1;
    }

    results.push({
      kind: "companion",
      id: item.id,
      rarity,
      duplicate:
        characters.some((c) => c.id === item.id) ||
        results.some((r) => r.id === item.id),
    });
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
export function performWeaponPulls(
  count: number,
  pity: number,
  targetCompanionOrWeaponId: string | undefined,
  weapons: Weapon[],
  random = Math.random,
): { results: PullResult[]; pity: number } {
  const targetWeapon = targetCompanionOrWeaponId
    ? weaponCatalog.find(
        (w) =>
          w.id === targetCompanionOrWeaponId ||
          w.signatureFor === targetCompanionOrWeaponId,
      )
    : undefined;

  const results: PullResult[] = [];
  for (let i = 0; i < count; i++) {
    const rarity = rollRarity("weapon", pity, random);
    let item: Weapon | undefined;

    if (targetWeapon && targetWeapon.rarity === rarity) {
      item = targetWeapon;
    } else {
      const candidates = weaponCatalog.filter((w) => w.rarity === rarity);
      if (!candidates.length) throw new Error("武器卡池配置不完整");
      item =
        candidates[
          Math.min(
            candidates.length - 1,
            Math.floor(random() * candidates.length),
          )
        ];
    }

    results.push({
      kind: "weapon",
      id: item.id,
      rarity,
      duplicate:
        weapons.some((w) => w.id === item.id) ||
        results.some((r) => r.id === item.id),
    });
    pity = rarity === "5星" ? 0 : pity + 1;
  }
  return { results, pity };
}

export function performPulls(
  kind: "companion" | "weapon",
  count: number,
  pity: number,
  companions: Companion[],
  weapons: Weapon[],
  random = Math.random,
  targetId?: string,
): { results: PullResult[]; pity: number } {
  if (kind === "weapon") {
    return performWeaponPulls(count, pity, targetId, weapons, random);
  }
  const source = companionCatalog;
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
        companions.some((c) => c.id === item.id) ||
        results.some((r) => r.id === item.id),
    });
    pity = rarity === "5星" ? 0 : pity + 1;
  }
  return { results, pity };
}
