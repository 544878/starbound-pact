import type { Reward } from "../domain/commerce";
export const MONTHLY_CARD = {
  id: "monthly_small",
  name: "星月同行 · 小月卡",
  price: 18,
  days: 30,
  instant: 180,
  daily: 60,
};
export interface Bundle {
  id: string;
  name: string;
  description: string;
  price: number;
  limit: number;
  reward: Reward;
}
export const SHOP_BUNDLES: readonly Bundle[] = [
  {
    id: "departure_v1",
    name: "启程礼盒",
    description: "一份心意，陪你踏上新的旅途。",
    price: 6,
    limit: 1,
    reward: { crystals: 120, gold: 6000, materials: { 战术经验书: 10 } },
  },
  {
    id: "growth_v1",
    name: "星途养成礼包",
    description: "积蓄力量，让每一次成长更从容。",
    price: 30,
    limit: 3,
    reward: {
      crystals: 300,
      gold: 30000,
      materials: { 战术经验书: 30, 折光棱晶: 12 },
    },
  },
  {
    id: "wish_v1",
    name: "祈星邀约礼包",
    description: "将期待写入星海，与新的伙伴相逢。",
    price: 68,
    limit: 1,
    reward: { crystals: 680, materials: { 造化之水: 10, 纯净星核: 5 } },
  },
];
