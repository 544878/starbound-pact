import type { SkinDefinition } from "../domain/commerce";

// Patch entry point: add an imported skin pack here. Stable IDs must never be reused.
// The empty catalogue is intentional: no unreleased skin is purchasable.
export const SKIN_CATALOG: readonly SkinDefinition[] = [];

export function validateSkinCatalog(catalog: readonly SkinDefinition[]) {
  const ids = new Set<string>();
  for (const skin of catalog) {
    if (
      !skin.id ||
      ids.has(skin.id) ||
      !skin.characterId ||
      !skin.name ||
      !Number.isSafeInteger(skin.price) ||
      skin.price < 0 ||
      !Number.isSafeInteger(skin.version) ||
      skin.version < 1 ||
      !["draft", "listed", "retired"].includes(skin.status) ||
      !skin.assets?.illustration?.src ||
      (skin.assets.dynamic &&
        (!skin.assets.dynamic.poster ||
          !skin.assets.dynamic.src ||
          !["video", "image"].includes(skin.assets.dynamic.type)))
    ) {
      throw new Error(`Invalid skin definition: ${skin.id}`);
    }
    ids.add(skin.id);
  }
  return catalog;
}
validateSkinCatalog(SKIN_CATALOG);
