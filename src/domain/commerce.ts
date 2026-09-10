export type PaymentMethod = "wechat" | "alipay";
export type ProductRef = {
  kind: "recharge" | "bundle" | "monthly" | "skin";
  id: string;
};
export interface Reward {
  crystals?: number;
  gold?: number;
  materials?: Record<string, number>;
}
export interface ShopOrder {
  id: string;
  product: ProductRef;
  name: string;
  price: number;
  method: PaymentMethod;
  status: "pending" | "paid" | "cancelled" | "failed";
  createdAt: number;
  settledAt?: number;
  reward: Reward;
  skinId?: string;
  error?: string;
}
export interface CommerceState {
  orders: ShopOrder[];
  purchases: Record<string, number>;
  monthly?: { endDay: number; lastClaimDay?: number };
}
export interface SkinAsset {
  src: string;
  objectPosition?: string;
}
export interface SkinDefinition {
  id: string;
  characterId: string;
  name: string;
  description: string;
  version: number;
  status: "draft" | "listed" | "retired";
  price: number;
  assets: {
    illustration: SkinAsset;
    portrait?: SkinAsset;
    chibi?: SkinAsset;
    dynamic?: { src: string; type: "video" | "image"; poster: string };
  };
}
export interface WardrobeState {
  owned: string[];
  equipped: Record<string, string>;
  motion: boolean;
}
