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

  describe("Batch Purchasing (批量购买)", () => {
    it("handles batch purchase of materials with correct costs and quantities", () => {
      const initial = { ...createInitialState(), gold: 20000 };
      const prismCountBefore = initial.materials["折光棱晶"] ?? 0;
      const count = 5;

      const updated = gameReducer(initial, {
        type: "BUY_GOODS",
        id: "prism",
        count,
      });

      // prism costs 900 gold per purchase, gives 3 units
      expect(updated.gold).toBe(initial.gold - 900 * count);
      expect(updated.materials["折光棱晶"]).toBe(prismCountBefore + 3 * count);
    });

    it("handles batch purchase of wish currency (造化之水)", () => {
      const initial = { ...createInitialState(), crystals: 5000 };
      const waterBefore = initial.materials["造化之水"] ?? 0;
      const count = 10;

      const updated = gameReducer(initial, {
        type: "BUY_GOODS",
        id: "wish_water",
        count,
      });

      // wish_water costs 160 crystals each, gives 1 unit
      expect(updated.crystals).toBe(initial.crystals - 160 * count);
      expect(updated.materials["造化之水"]).toBe(waterBefore + count);
    });

    it("handles batch purchase of gold goods using crystals", () => {
      const initial = { ...createInitialState(), crystals: 3000, gold: 1000 };
      const count = 3;

      // gold_xlarge costs 600 crystals each, gives 48,000 gold
      const updated = gameReducer(initial, {
        type: "BUY_GOODS",
        id: "gold_xlarge",
        count,
      });

      expect(updated.crystals).toBe(initial.crystals - 600 * count);
      expect(updated.gold).toBe(initial.gold + 48000 * count);
    });

    it("rejects batch purchase if crystals or gold are insufficient for total cost", () => {
      const poorState = { ...createInitialState(), crystals: 200 };
      // 2 units of wish_water would cost 320 crystals
      const attempted = gameReducer(poorState, {
        type: "BUY_GOODS",
        id: "wish_water",
        count: 2,
      });

      expect(attempted.crystals).toBe(poorState.crystals);
      expect(attempted.materials["造化之水"]).toBe(poorState.materials["造化之水"]);
    });

    it("prevents batch purchasing stamina exceeding the 240 cap", () => {
      const state = { ...createInitialState(), stamina: 150, crystals: 1000 };
      // 2 bottles would give 120 stamina, 150 + 120 = 270 > 240
      const attempted = gameReducer(state, {
        type: "BUY_GOODS",
        id: "stamina",
        count: 2,
      });

      expect(attempted.stamina).toBe(150);
      expect(attempted.crystals).toBe(1000);

      // 1 bottle gives 60 stamina, 150 + 60 = 210 <= 240, should succeed
      const successful = gameReducer(state, {
        type: "BUY_GOODS",
        id: "stamina",
        count: 1,
      });
      expect(successful.stamina).toBe(210);
      expect(successful.crystals).toBe(1000 - 80);
    });
  });
});
