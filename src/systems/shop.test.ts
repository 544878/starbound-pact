import { describe, expect, it } from "vitest";
import { createInitialState, gameReducer, hydrateGameState } from "../state/gameState";
import { RECHARGE_TIERS, GOLD_GOODS, SUPPLY_GOODS, SHOP_GOODS } from "../data/shop";

describe("Shop and Economy System", () => {
  it("defines all required recharge tiers: 6, 30, 68, 98, 198, 398, 648, 1028", () => {
    const prices = RECHARGE_TIERS.map((t) => t.price);
    expect(prices).toEqual([6, 30, 68, 98, 198, 398, 648, 1028]);
  });

  it("handles first recharge double bonus and subsequent regular bonus", () => {
    const initial = createInitialState();
    const tier648 = RECHARGE_TIERS.find((t) => t.price === 648)!;
    expect(tier648).toBeDefined();

    // 第一次充值：享首充双倍 (6480 + 6480 = 12960)
    const afterFirst = gameReducer(initial, {
      type: "RECHARGE",
      tierId: tier648.id,
    });
    expect(afterFirst.crystals).toBe(initial.crystals + 12960);
    expect(afterFirst.rechargedTiers?.[tier648.id]).toBe(true);
    expect(afterFirst.totalRechargedRmb).toBe(648);

    // 第二次充值：享常驻加赠 (6480 + 1280 = 7760)
    const afterSecond = gameReducer(afterFirst, {
      type: "RECHARGE",
      tierId: tier648.id,
    });
    expect(afterSecond.crystals).toBe(afterFirst.crystals + 7760);
    expect(afterSecond.totalRechargedRmb).toBe(1296);
  });

  it("handles recharge across all tiers correctly", () => {
    for (const tier of RECHARGE_TIERS) {
      const state = createInitialState();
      const recharged = gameReducer(state, {
        type: "RECHARGE",
        tierId: tier.id,
      });
      const expectedFirstGain = tier.crystals + tier.firstBonusCrystals;
      expect(recharged.crystals).toBe(state.crystals + expectedFirstGain);
      expect(recharged.rechargedTiers?.[tier.id]).toBe(true);
      expect(recharged.totalRechargedRmb).toBe(tier.price);
    }
  });

  it("handles multi-tier gold purchases using crystals", () => {
    let state = { ...createInitialState(), crystals: 10000, gold: 1000 };

    // 购买零碎钱袋 (40晶 -> 2500金币)
    state = gameReducer(state, { type: "BUY_GOODS", id: "gold_small" });
    expect(state.crystals).toBe(9960);
    expect(state.gold).toBe(3500);

    // 购买万界金库 (600晶 -> 48000金币)
    state = gameReducer(state, { type: "BUY_GOODS", id: "gold_xlarge" });
    expect(state.crystals).toBe(9360);
    expect(state.gold).toBe(51500);

    // 晶石不足时拒绝购买
    const poorState = { ...state, crystals: 10 };
    const rejected = gameReducer(poorState, {
      type: "BUY_GOODS",
      id: "gold_small",
    });
    expect(rejected.crystals).toBe(10);
    expect(rejected.gold).toBe(51500);
  });

  it("handles daily free gold gift and enforces daily limit", () => {
    let state = createInitialState();
    const beforeGold = state.gold;

    // 首次领取商会每日赠礼
    state = gameReducer(state, { type: "BUY_GOODS", id: "gold_free" });
    expect(state.gold).toBe(beforeGold + 3000);

    // 当日再次尝试领取应被拦截
    const repeated = gameReducer(state, { type: "BUY_GOODS", id: "gold_free" });
    expect(repeated.gold).toBe(state.gold);
  });

  it("retains regular supplies (core, stamina, prism, exp_books)", () => {
    const s = createInitialState();
    const coreItem = SHOP_GOODS.find((g) => g.id === "core");
    expect(coreItem).toBeDefined();

    const boughtCore = gameReducer(s, { type: "BUY_GOODS", id: "core" });
    expect(boughtCore.gold).toBe(s.gold - 2000);
    expect(boughtCore.materials["纯净星核"]).toBe(s.materials["纯净星核"] + 1);

    const boughtPrism = gameReducer(s, { type: "BUY_GOODS", id: "prism" });
    expect(boughtPrism.gold).toBe(s.gold - 900);
    expect(boughtPrism.materials["折光棱晶"]).toBe(s.materials["折光棱晶"] + 3);
  });

  it("preserves recharge status and total RMB across hydration", () => {
    let state = createInitialState();
    state = gameReducer(state, { type: "RECHARGE", tierId: "recharge_30" });
    state = gameReducer(state, { type: "RECHARGE", tierId: "recharge_68" });

    const hydrated = hydrateGameState({ version: 7, state });
    expect(hydrated.rechargedTiers?.["recharge_30"]).toBe(true);
    expect(hydrated.rechargedTiers?.["recharge_68"]).toBe(true);
    expect(hydrated.rechargedTiers?.["recharge_648"]).toBeUndefined();
    expect(hydrated.totalRechargedRmb).toBe(98);
  });
});
