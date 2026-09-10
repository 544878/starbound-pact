export const MATERIAL_ART_ATLAS =
  "/assets/materials/material-collection-v2.png";
// Cell indices are stable and shared by inventory, shop, rewards and checkout.
export const MATERIAL_ART_CELLS: Readonly<Record<string, number>> = {
  造化之水: 0,
  造化青莲: 1,
  风灵花蜜: 2,
  曜金碎屑: 3,
  潮汐结晶: 4,
  森语种子: 5,
  影蚀粉尘: 6,
  赤焰芯核: 7,
  纯净星核: 8,
  折光棱晶: 9,
  战术经验书: 10,
  灵泉甘露: 11,
  金币: 12,
  星晶: 13,
  商会礼盒: 14,
  金币宝箱: 15,
};
export const materialArtPosition = (index: number) =>
  `${((index % 4) * 100) / 3}% ${(Math.floor(index / 4) * 100) / 3}%`;
