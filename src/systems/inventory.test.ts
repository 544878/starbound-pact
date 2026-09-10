import { describe, expect, it } from "vitest";
import { inventoryMaterials } from "./inventory";
import { MATERIAL_ART_CELLS, materialArtPosition } from "../data/materialArt";
import { materialCatalog } from "../data/catalog";
import { SHOP_GOODS } from "../data/shop";
describe("inventory material presentation", () => {
  it("excludes internal claim and character progression bookkeeping from displayed inventory and totals", () => {
    const items = inventoryMaterials({
      造化之水: 0,
      战术经验书: 15,
      "shop_claimed_gold_free_2026-09-11": 1,
      "ring:lumi": 20,
      "soul:lumi": 4,
      无效素材: NaN,
      坏数据: -1,
    });
    expect(items.map((i) => i.name)).toEqual(["造化之水", "战术经验书"]);
    expect(items.reduce((n, i) => n + i.count, 0)).toBe(15);
  });
  it("maps every known material and purchasable supply to the shared art atlas", () => {
    for (const name of Object.keys(materialCatalog))
      expect(MATERIAL_ART_CELLS[name], name).toBeTypeOf("number");
    for (const good of SHOP_GOODS.filter((g) => g.material))
      expect(MATERIAL_ART_CELLS[good.material!]).toBeTypeOf("number");
    expect(new Set(Object.values(MATERIAL_ART_CELLS)).size).toBe(16);
    expect(materialArtPosition(0)).toBe("0% 0%");
    expect(materialArtPosition(15)).toBe("100% 100%");
  });
});
