import { describe, expect, it } from "vitest";
import {
  createInitialState,
  gameReducer,
  hydrateGameState,
} from "../state/gameState";
import { COLLAB_IDS, STANDARD_FIVE_IDS, performCharacterPulls } from "./gacha";
import { wishPayment } from "./wishCurrency";

describe("wish resource routing", () => {
  it("prices both resources at 160 and preserves balances across saves", () => {
    let s = createInitialState();
    s = gameReducer(s, { type: "BUY_GOODS", id: "wish_water" });
    s = gameReducer(s, { type: "BUY_GOODS", id: "wish_lotus" });
    expect(s.crystals).toBe(createInitialState().crystals - 320);
    expect(hydrateGameState(s).materials["造化青莲"]).toBe(1);
    expect(s.materials["造化之水"]).toBe(1);
  });
  it("spends matching tickets first, tops up exact deficit and credits task progress", () => {
    const s = {
      ...createInitialState(),
      crystals: 160,
      materials: { 造化之水: 9, 造化青莲: 10 },
    };
    const outcome = performCharacterPulls(
      "standard",
      10,
      0,
      false,
      s.companions,
      () => 0.99,
    );
    const after = gameReducer(s, {
      type: "APPLY_PULLS",
      kind: "companion",
      pool: "standard",
      count: 10,
      ...outcome,
    });
    expect(after.crystals).toBe(0);
    expect(after.materials["造化之水"]).toBe(0);
    expect(after.materials["造化青莲"]).toBe(10);
    expect(after.pullHistory.length).toBe(10);
    const insufficient = { ...s, crystals: 159 };
    expect(
      gameReducer(insufficient, {
        type: "APPLY_PULLS",
        kind: "companion",
        pool: "standard",
        count: 10,
        ...outcome,
      }),
    ).toEqual(insufficient);
  });
  it("allows ticket-only collab wishes and maintains independent pity", () => {
    const s = {
      ...createInitialState(),
      crystals: 0,
      pityCharacter: 37,
      materials: { 造化青莲: 1, 造化之水: 4 },
    };
    const outcome = performCharacterPulls(
      "collab",
      1,
      79,
      false,
      s.companions,
      () => 0,
    );
    expect(COLLAB_IDS).toContain(outcome.results[0].id);
    const after = gameReducer(s, {
      type: "APPLY_PULLS",
      kind: "companion",
      pool: "collab",
      count: 1,
      ...outcome,
    });
    expect(after.materials["造化青莲"]).toBe(0);
    expect(after.materials["造化之水"]).toBe(4);
    expect(after.pityCharacter).toBe(37);
    expect(after.pityCollab).toBe(0);
    expect(after.pullHistory[0].pool).toBe("collab");
    expect(wishPayment(after, "standard", 1).affordable).toBe(true);
  });
  it("does not release limited five-stars and excludes collab five-stars from standard", () => {
    expect(COLLAB_IDS).toHaveLength(10);
    expect(STANDARD_FIVE_IDS).toContain("astra");
    expect(STANDARD_FIVE_IDS.some((id) => COLLAB_IDS.includes(id))).toBe(false);
    const s = createInitialState();
    expect(
      performCharacterPulls("limited", 1, 79, true, []).results,
    ).toHaveLength(0);
    expect(
      gameReducer(s, {
        type: "APPLY_PULLS",
        kind: "companion",
        pool: "limited",
        count: 1,
        results: [],
        pity: 0,
      }),
    ).toEqual(s);
    expect(
      performCharacterPulls("collab", 1, 0, false, [], () => 0.99).results[0]
        .rarity,
    ).toBe("4星");
  });
});
