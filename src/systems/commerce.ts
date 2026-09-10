import type { GameState } from "../domain/types";
import type {
  CommerceState,
  PaymentMethod,
  ProductRef,
  Reward,
  SkinDefinition,
  WardrobeState,
} from "../domain/commerce";
import { RECHARGE_TIERS } from "../data/shop";
import { MONTHLY_CARD, SHOP_BUNDLES } from "../data/shopOffers";
import { SKIN_CATALOG } from "../data/skins";

export type CommerceAction =
  | {
      type: "CREATE_SHOP_ORDER";
      id: string;
      product: ProductRef;
      method: PaymentMethod;
    }
  | {
      type: "SETTLE_SHOP_ORDER";
      id: string;
      result: "paid" | "cancelled" | "failed";
    }
  | { type: "CLAIM_MONTHLY" }
  | { type: "EQUIP_SKIN"; characterId: string; skinId: string | null }
  | { type: "SET_SKIN_MOTION"; enabled: boolean };
export const emptyCommerce = (): CommerceState => ({
  orders: [],
  purchases: {},
});
export const emptyWardrobe = (): WardrobeState => ({
  owned: [],
  equipped: {},
  motion: true,
});
// All membership days reset at midnight Asia/Shanghai, independent of browser locale.
export const shopDay = (now = Date.now()) =>
  Math.floor((now + 8 * 3600000) / 86400000);
export function rewardText(reward: Reward) {
  return [
    reward.crystals && `${reward.crystals.toLocaleString()} 星晶`,
    reward.gold && `${reward.gold.toLocaleString()} 金币`,
    ...Object.entries(reward.materials ?? {}).map(
      ([name, count]) => `${name} ×${count}`,
    ),
  ]
    .filter(Boolean)
    .join(" · ");
}
export function quoteProduct(
  state: GameState,
  product: ProductRef,
  now = Date.now(),
  catalog = SKIN_CATALOG,
):
  { name: string; price: number; reward: Reward; skinId?: string } | undefined {
  if (product.kind === "recharge") {
    const tier = RECHARGE_TIERS.find((t) => t.id === product.id);
    if (tier)
      return {
        name: tier.name,
        price: tier.price,
        reward: {
          crystals:
            tier.crystals +
            (state.rechargedTiers?.[tier.id]
              ? tier.bonusCrystals
              : tier.firstBonusCrystals),
        },
      };
  }
  if (product.kind === "bundle") {
    const bundle = SHOP_BUNDLES.find((b) => b.id === product.id);
    if (bundle && (state.commerce?.purchases[bundle.id] ?? 0) < bundle.limit)
      return { name: bundle.name, price: bundle.price, reward: bundle.reward };
  }
  if (
    product.kind === "monthly" &&
    product.id === MONTHLY_CARD.id &&
    (state.commerce?.monthly?.endDay ?? 0) <= shopDay(now)
  ) {
    return {
      name: MONTHLY_CARD.name,
      price: MONTHLY_CARD.price,
      reward: { crystals: MONTHLY_CARD.instant },
    };
  }
  if (product.kind === "skin") {
    const skin = catalog.find(
      (s) => s.id === product.id && s.status === "listed",
    );
    if (
      skin &&
      !state.wardrobe?.owned.includes(skin.id) &&
      state.companions.some((c) => c.id === skin.characterId)
    )
      return {
        name: skin.name,
        price: skin.price,
        reward: {},
        skinId: skin.id,
      };
  }
}
export function equippedSkin(
  state: GameState,
  characterId: string,
  catalog = SKIN_CATALOG,
) {
  const id = state.wardrobe?.equipped[characterId];
  return catalog.find(
    (s) =>
      s.id === id &&
      s.characterId === characterId &&
      s.status !== "draft" &&
      state.wardrobe?.owned.includes(s.id),
  );
}
function grantReward(state: GameState, reward: Reward): GameState {
  const materials = { ...state.materials };
  for (const [name, count] of Object.entries(reward.materials ?? {}))
    materials[name] = (materials[name] ?? 0) + count;
  return {
    ...state,
    crystals: state.crystals + (reward.crystals ?? 0),
    gold: state.gold + (reward.gold ?? 0),
    materials,
  };
}
export function reduceCommerce(
  state: GameState,
  action: CommerceAction,
  now = Date.now(),
  catalog: readonly SkinDefinition[] = SKIN_CATALOG,
): GameState {
  const commerce = state.commerce ?? emptyCommerce(),
    wardrobe = state.wardrobe ?? emptyWardrobe();
  if (action.type === "CREATE_SHOP_ORDER") {
    if (
      !action.id ||
      commerce.orders.some((o) => o.id === action.id) ||
      commerce.orders.some((o) => o.status === "pending") ||
      !["wechat", "alipay"].includes(action.method)
    )
      return state;
    const quote = quoteProduct(state, action.product, now, catalog);
    if (!quote) return state;
    return {
      ...state,
      commerce: {
        ...commerce,
        orders: [
          {
            id: action.id,
            product: action.product,
            method: action.method,
            createdAt: now,
            status: "pending",
            ...quote,
          },
          ...commerce.orders,
        ],
      },
    };
  }
  if (action.type === "SETTLE_SHOP_ORDER") {
    const order = commerce.orders.find((o) => o.id === action.id);
    if (
      !order ||
      order.status !== "pending" ||
      !["paid", "cancelled", "failed"].includes(action.result)
    )
      return state;
    const quote = quoteProduct(state, order.product, now, catalog);
    const expired = now - order.createdAt >= 15 * 60000;
    const valid =
      quote &&
      !expired &&
      quote.price === order.price &&
      JSON.stringify(quote.reward) === JSON.stringify(order.reward);
    const status =
      action.result === "paid" && !valid ? "failed" : action.result;
    let next: GameState = {
      ...state,
      commerce: {
        ...commerce,
        orders: commerce.orders.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status,
                settledAt: now,
                error:
                  status === "failed"
                    ? expired
                      ? "订单已过期，请重新下单"
                      : "支付未完成或商品状态已改变，请重试"
                    : undefined,
              }
            : o,
        ),
      },
    };
    if (status !== "paid" || !quote) return next;
    next = grantReward(next, quote.reward);
    next.totalRechargedRmb = (state.totalRechargedRmb ?? 0) + order.price;
    if (order.product.kind === "recharge")
      next.rechargedTiers = {
        ...state.rechargedTiers,
        [order.product.id]: true,
      };
    if (order.product.kind === "bundle")
      next.commerce = {
        ...next.commerce!,
        purchases: {
          ...commerce.purchases,
          [order.product.id]: (commerce.purchases[order.product.id] ?? 0) + 1,
        },
      };
    if (order.product.kind === "monthly")
      next.commerce = {
        ...next.commerce!,
        monthly: { endDay: shopDay(now) + MONTHLY_CARD.days },
      };
    if (quote.skinId)
      next.wardrobe = { ...wardrobe, owned: [...wardrobe.owned, quote.skinId] };
    return next;
  }
  if (action.type === "CLAIM_MONTHLY") {
    const membership = commerce.monthly,
      day = shopDay(now);
    if (
      !membership ||
      membership.endDay <= day ||
      (membership.lastClaimDay ?? -1) >= day
    )
      return state;
    return {
      ...state,
      crystals: state.crystals + MONTHLY_CARD.daily,
      commerce: { ...commerce, monthly: { ...membership, lastClaimDay: day } },
    };
  }
  if (action.type === "SET_SKIN_MOTION")
    return { ...state, wardrobe: { ...wardrobe, motion: action.enabled } };
  if (action.type === "EQUIP_SKIN") {
    if (!state.companions.some((c) => c.id === action.characterId))
      return state;
    const equipped = { ...wardrobe.equipped };
    if (action.skinId === null) delete equipped[action.characterId];
    else {
      const skin = catalog.find(
        (s) =>
          s.id === action.skinId &&
          s.characterId === action.characterId &&
          s.status !== "draft",
      );
      if (!skin || !wardrobe.owned.includes(skin.id)) return state;
      equipped[action.characterId] = skin.id;
    }
    return { ...state, wardrobe: { ...wardrobe, equipped } };
  }
  return state;
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const nat = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
export function hydrateCommerce(value: unknown): CommerceState {
  if (!record(value)) return emptyCommerce();
  const orders: CommerceState["orders"] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(value.orders) ? value.orders : []) {
    if (
      !record(item) ||
      typeof item.id !== "string" ||
      seen.has(item.id) ||
      !record(item.product) ||
      typeof item.product.id !== "string" ||
      !["recharge", "bundle", "monthly", "skin"].includes(
        String(item.product.kind),
      ) ||
      !["paid", "pending", "cancelled", "failed"].includes(
        String(item.status),
      ) ||
      !["wechat", "alipay"].includes(String(item.method)) ||
      !nat(item.price) ||
      !nat(item.createdAt) ||
      typeof item.name !== "string" ||
      !record(item.reward)
    )
      continue;
    // An interrupted mock checkout must be explicitly retried; never auto-grant on restore.
    const reward: Reward = {
      ...(nat(item.reward.crystals)
        ? { crystals: item.reward.crystals as number }
        : {}),
      ...(nat(item.reward.gold) ? { gold: item.reward.gold as number } : {}),
      ...(record(item.reward.materials)
        ? {
            materials: Object.fromEntries(
              Object.entries(item.reward.materials).filter(([, count]) =>
                nat(count),
              ),
            ) as Record<string, number>,
          }
        : {}),
    };
    orders.push({
      id: item.id,
      name: item.name,
      price: item.price as number,
      product: {
        id: item.product.id,
        kind: item.product.kind as ProductRef["kind"],
      },
      method: item.method as PaymentMethod,
      createdAt: item.createdAt as number,
      status:
        item.status === "pending"
          ? "cancelled"
          : (item.status as CommerceState["orders"][number]["status"]),
      reward,
      ...(typeof item.skinId === "string" ? { skinId: item.skinId } : {}),
      ...(nat(item.settledAt) ? { settledAt: item.settledAt as number } : {}),
      ...(typeof item.error === "string" ? { error: item.error } : {}),
    });
    seen.add(item.id);
  }
  const purchases = Object.fromEntries(
    Object.entries(record(value.purchases) ? value.purchases : {}).filter(
      ([, n]) => nat(n),
    ),
  ) as Record<string, number>;
  const monthly =
    record(value.monthly) && nat(value.monthly.endDay)
      ? {
          endDay: value.monthly.endDay as number,
          lastClaimDay: nat(value.monthly.lastClaimDay)
            ? (value.monthly.lastClaimDay as number)
            : undefined,
        }
      : undefined;
  return { orders, purchases, monthly };
}
export function hydrateWardrobe(value: unknown): WardrobeState {
  if (!record(value)) return emptyWardrobe();
  // Preserve unknown IDs so temporarily removed patch packs do not erase ownership.
  return {
    owned: Array.isArray(value.owned)
      ? [
          ...new Set(
            value.owned.filter((id): id is string => typeof id === "string"),
          ),
        ]
      : [],
    equipped: Object.fromEntries(
      Object.entries(record(value.equipped) ? value.equipped : {}).filter(
        ([, id]) => typeof id === "string",
      ),
    ) as Record<string, string>,
    motion: value.motion !== false,
  };
}
