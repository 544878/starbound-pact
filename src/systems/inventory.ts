import { materialCatalog } from "../data/catalog";
export function inventoryMaterials(materials: Record<string, number>) {
  return Object.entries(materials)
    .filter(
      ([name, count]) =>
        !name.startsWith("ring:") &&
        !name.startsWith("soul:") &&
        !name.startsWith("shop_claimed_") &&
        !name.startsWith("V2魂转换券:") &&
        !name.includes(":") &&
        Number.isFinite(count) &&
        count >= 0,
    )
    .map(([name, count]) => ({
      ...(materialCatalog[name] ?? {
        name,
        icon: "◈",
        rarity: "4星" as const,
        desc: "远征途中收集的珍贵物资。",
      }),
      count,
    }));
}
