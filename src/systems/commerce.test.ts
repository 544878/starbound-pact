import { describe, expect, it } from "vitest";
import {
  createInitialState,
  hydrateGameState,
  gameReducer,
  SAVE_VERSION,
} from "../state/gameState";
import {
  reduceCommerce,
  shopDay,
  quoteProduct,
  equippedSkin,
  hydrateCommerce,
  hydrateWardrobe,
} from "./commerce";
import { SKIN_CATALOG, validateSkinCatalog } from "../data/skins";
import { MONTHLY_CARD } from "../data/shopOffers";
import type { ProductRef, SkinDefinition } from "../domain/commerce";
import type { GameState } from "../domain/types";
const now = Date.parse("2026-09-11T04:00:00Z");
const mockSkin: SkinDefinition = {
  id: "test-selene-moon",
  characterId: "selene",
  name: "月影",
  description: "test only",
  version: 1,
  status: "listed",
  price: 30,
  assets: {
    illustration: { src: "/test.png" },
    dynamic: { type: "video", src: "/test.webm", poster: "/test.png" },
  },
};
const catalog = [mockSkin];
function purchase(
  state: GameState,
  product: ProductRef,
  id = "test",
  time = now,
) {
  const pending = reduceCommerce(
    state,
    { type: "CREATE_SHOP_ORDER", id, product, method: "wechat" },
    time,
    catalog,
  );
  return reduceCommerce(
    pending,
    { type: "SETTLE_SHOP_ORDER", id, result: "paid" },
    time,
    catalog,
  );
}
describe("shop checkout and persistent entitlement lifecycle", () => {
  it("defers rewards to settlement, makes repeated callbacks idempotent and preserves first top-up rules", () => {
    const s = createInitialState();
    const pending = reduceCommerce(
      s,
      {
        type: "CREATE_SHOP_ORDER",
        id: "a",
        product: { kind: "recharge", id: "recharge_30" },
        method: "alipay",
      },
      now,
    );
    expect(pending.crystals).toBe(s.crystals);
    const paid = reduceCommerce(
      pending,
      { type: "SETTLE_SHOP_ORDER", id: "a", result: "paid" },
      now,
    );
    expect(paid.crystals - s.crystals).toBe(600);
    expect(paid.commerce?.orders[0].method).toBe("alipay");
    expect(
      reduceCommerce(
        paid,
        { type: "SETTLE_SHOP_ORDER", id: "a", result: "paid" },
        now,
      ),
    ).toBe(paid);
    expect(
      purchase(paid, { kind: "recharge", id: "recharge_30" }, "b").crystals -
        paid.crystals,
    ).toBe(330);
    expect(
      reduceCommerce(
        paid,
        {
          type: "CREATE_SHOP_ORDER",
          id: "a",
          product: { kind: "recharge", id: "recharge_30" },
          method: "wechat",
        },
        now,
      ),
    ).toBe(paid);
  });
  it.each(["failed", "cancelled"] as const)(
    "%s orders cannot grant rewards or later become paid",
    (result) => {
      const s = createInitialState();
      const pending = reduceCommerce(
        s,
        {
          type: "CREATE_SHOP_ORDER",
          id: "a",
          product: { kind: "bundle", id: "departure_v1" },
          method: "wechat",
        },
        now,
      );
      const stopped = reduceCommerce(
        pending,
        { type: "SETTLE_SHOP_ORDER", id: "a", result },
        now,
      );
      expect(stopped.crystals).toBe(s.crystals);
      expect(stopped.totalRechargedRmb).toBe(0);
      expect(
        reduceCommerce(
          stopped,
          { type: "SETTLE_SHOP_ORDER", id: "a", result: "paid" },
          now,
        ),
      ).toBe(stopped);
    },
  );
  it("rejects unknown products, expired orders and concurrent checkout", () => {
    const s = createInitialState();
    expect(purchase(s, { kind: "recharge", id: "unknown" })).toBe(s);
    const pending = reduceCommerce(
      s,
      {
        type: "CREATE_SHOP_ORDER",
        id: "a",
        product: { kind: "recharge", id: "recharge_6" },
        method: "wechat",
      },
      now,
    );
    expect(
      reduceCommerce(
        pending,
        {
          type: "CREATE_SHOP_ORDER",
          id: "b",
          product: { kind: "recharge", id: "recharge_30" },
          method: "alipay",
        },
        now,
      ),
    ).toBe(pending);
    const expired = reduceCommerce(
      pending,
      { type: "SETTLE_SHOP_ORDER", id: "a", result: "paid" },
      now + 15 * 60000,
    );
    expect(expired.commerce?.orders[0].status).toBe("failed");
    expect(expired.crystals).toBe(s.crystals);
  });
  it("grants a bundle atomically and enforces permanent purchase limits", () => {
    const s = createInitialState(),
      paid = purchase(s, { kind: "bundle", id: "departure_v1" });
    expect(paid.crystals - s.crystals).toBe(120);
    expect(paid.gold - s.gold).toBe(6000);
    expect(paid.materials["战术经验书"] - s.materials["战术经验书"]).toBe(10);
    expect(paid.commerce?.purchases.departure_v1).toBe(1);
    expect(
      purchase(paid, { kind: "bundle", id: "departure_v1" }, "again"),
    ).toBe(paid);
  });
  it("handles 30 daily claims, midnight boundaries, expiration and renewal without overlapping membership", () => {
    const s = createInitialState();
    let paid = purchase(s, { kind: "monthly", id: MONTHLY_CARD.id });
    expect(paid.crystals - s.crystals).toBe(180);
    expect(
      purchase(paid, { kind: "monthly", id: MONTHLY_CARD.id }, "overlap"),
    ).toBe(paid);
    for (let d = 0; d < 30; d++) {
      const claimed = reduceCommerce(
        paid,
        { type: "CLAIM_MONTHLY" },
        now + d * 86400000,
      );
      expect(claimed.crystals - paid.crystals).toBe(60);
      expect(
        reduceCommerce(claimed, { type: "CLAIM_MONTHLY" }, now + d * 86400000),
      ).toBe(claimed);
      paid = claimed;
    }
    expect(paid.crystals - s.crystals).toBe(1980);
    expect(
      reduceCommerce(paid, { type: "CLAIM_MONTHLY" }, now + 30 * 86400000),
    ).toBe(paid);
    expect(
      purchase(
        paid,
        { kind: "monthly", id: MONTHLY_CARD.id },
        "renew",
        now + 30 * 86400000,
      ).commerce?.monthly?.endDay,
    ).toBe(shopDay(now) + 60);
    expect(
      shopDay(Date.parse("2026-09-11T16:00:00Z")) -
        shopDay(Date.parse("2026-09-11T15:59:59Z")),
    ).toBe(1);
  });
  it("does not compensate missed days or grant future daily claims twice after clock rollback", () => {
    const s = purchase(createInitialState(), {
      kind: "monthly",
      id: MONTHLY_CARD.id,
    });
    const later = reduceCommerce(
      s,
      { type: "CLAIM_MONTHLY" },
      now + 4 * 86400000,
    );
    expect(later.crystals - s.crystals).toBe(60);
    expect(reduceCommerce(later, { type: "CLAIM_MONTHLY" }, now)).toBe(later);
  });
  it("keeps current catalogue empty but supports future skin purchase, equip, mismatch checks and retired ownership", () => {
    expect(SKIN_CATALOG).toHaveLength(2);
    const s = createInitialState();
    expect(
      reduceCommerce(
        s,
        { type: "EQUIP_SKIN", characterId: "selene", skinId: mockSkin.id },
        now,
        catalog,
      ),
    ).toBe(s);
    const paid = purchase(s, { kind: "skin", id: mockSkin.id });
    expect(paid.wardrobe?.owned).toContain(mockSkin.id);
    const equipped = reduceCommerce(
      paid,
      { type: "EQUIP_SKIN", characterId: "selene", skinId: mockSkin.id },
      now,
      catalog,
    );
    expect(equippedSkin(equipped, "selene", catalog)?.id).toBe(mockSkin.id);
    expect(
      reduceCommerce(
        equipped,
        { type: "EQUIP_SKIN", characterId: "lumi", skinId: mockSkin.id },
        now,
        catalog,
      ),
    ).toBe(equipped);
    expect(
      quoteProduct(equipped, { kind: "skin", id: mockSkin.id }, now, catalog),
    ).toBeUndefined();
    expect(
      equippedSkin(equipped, "selene", [{ ...mockSkin, status: "retired" }])
        ?.id,
    ).toBe(mockSkin.id);
    expect(equippedSkin(equipped, "selene", [])).toBeUndefined();
    expect(
      reduceCommerce(
        equipped,
        { type: "EQUIP_SKIN", characterId: "selene", skinId: null },
        now,
        catalog,
      ).wardrobe?.equipped.selene,
    ).toBeUndefined();
  });
  it("rejects draft, retired and unowned-character skin purchases and validates patch data", () => {
    const s = createInitialState();
    for (const status of ["draft", "retired"] as const)
      expect(
        quoteProduct(s, { kind: "skin", id: mockSkin.id }, now, [
          { ...mockSkin, status },
        ]),
      ).toBeUndefined();
    expect(
      quoteProduct(
        { ...s, companions: [] },
        { kind: "skin", id: mockSkin.id },
        now,
        catalog,
      ),
    ).toBeUndefined();
    expect(() => validateSkinCatalog([mockSkin, mockSkin])).toThrow();
    expect(() => validateSkinCatalog([{ ...mockSkin, price: -1 }])).toThrow();
  });
  it("migrates old saves, persists new rights, sanitizes malformed values and cancels interrupted checkout", () => {
    const old = hydrateGameState({ version: 9, state: createInitialState() });
    expect(old.commerce?.orders).toEqual([]);
    let s = purchase(createInitialState(), {
      kind: "monthly",
      id: MONTHLY_CARD.id,
    });
    s = purchase(s, { kind: "bundle", id: "departure_v1" }, "b");
    s = purchase(s, { kind: "skin", id: mockSkin.id }, "c");
    const round = hydrateGameState({ version: SAVE_VERSION, state: s });
    expect(round.commerce).toEqual(s.commerce);
    expect(round.wardrobe).toEqual(s.wardrobe);
    const pending = reduceCommerce(
      s,
      {
        type: "CREATE_SHOP_ORDER",
        id: "pending",
        product: { kind: "recharge", id: "recharge_6" },
        method: "wechat",
      },
      now,
    );
    const restored = hydrateGameState({
      version: SAVE_VERSION,
      state: pending,
    });
    expect(restored.commerce?.orders[0].status).toBe("cancelled");
    expect(restored.crystals).toBe(pending.crystals);
    expect(
      hydrateCommerce({
        orders: [null, {}],
        purchases: { a: -1, b: "oops", c: 1 },
        monthly: { endDay: NaN },
      }),
    ).toEqual({ orders: [], purchases: { c: 1 }, monthly: undefined });
    expect(
      hydrateWardrobe({
        owned: ["future", "future", 2],
        equipped: { selene: "future" },
        motion: false,
      }),
    ).toEqual({
      owned: ["future"],
      equipped: { selene: "future" },
      motion: false,
    });
  });
  it("integrates skin actions through the public game reducer", () => {
    expect(
      gameReducer(createInitialState(), {
        type: "SET_SKIN_MOTION",
        enabled: false,
      }).wardrobe?.motion,
    ).toBe(false);
  });
});
