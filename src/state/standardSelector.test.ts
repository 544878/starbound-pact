import { describe, expect, it } from "vitest";
import {
  createInitialState,
  gameReducer,
  restoreGameState,
  saveGameState,
  STORAGE_KEY,
} from "./gameState";
import {
  COLLAB_IDS,
  performCharacterPulls,
  STANDARD_FIVE_IDS,
} from "../systems/gacha";
const id = STANDARD_FIVE_IDS[0];
function funded(total = 0) {
  return {
    ...createInitialState(),
    crystals: 100000,
    standardPullTotal: total,
  };
}
function draw(
  state: ReturnType<typeof funded>,
  count: 1 | 10,
  pool: "standard" | "collab" | "weapon" = "standard",
) {
  const result = performCharacterPulls(
    pool === "collab" ? "collab" : "standard",
    count,
    state.pityCharacter,
    false,
    state.companions,
    () => 0.99,
  );
  return gameReducer(state, {
    type: "APPLY_PULLS",
    kind: pool === "weapon" ? "weapon" : "companion",
    pool,
    count,
    ...result,
  });
}
describe("standard 200-pull gift", () => {
  it("unlocks at 200 and keeps total after a five-star resets pity", () => {
    const next = draw({ ...funded(199), pityCharacter: 79 }, 1);
    expect(next.standardPullTotal).toBe(200);
    expect(next.pityCharacter).toBe(0);
    const claimed = gameReducer(next, { type: "CLAIM_STANDARD_SELECTOR", id });
    expect(claimed.standardSelectorClaimed).toBe(true);
    expect(claimed.crystals).toBe(next.crystals);
    expect(claimed.pityCharacter).toBe(next.pityCharacter);
    expect(claimed.pullHistory).toEqual(next.pullHistory);
    expect(gameReducer(claimed, { type: "CLAIM_STANDARD_SELECTOR", id })).toBe(
      claimed,
    );
  });
  it("counts all ten pulls across the threshold without capping lifetime total", () => {
    expect(draw(funded(195), 10).standardPullTotal).toBe(205);
  });
  it("does not count weapon, collab, rejected or unaffordable pulls", () => {
    expect(draw(funded(100), 10, "weapon").standardPullTotal).toBe(100);
    expect(draw(funded(100), 10, "collab").standardPullTotal).toBe(100);
    expect(
      draw({ ...funded(100), crystals: 0, materials: {} }, 10)
        .standardPullTotal,
    ).toBe(100);
  });
  it("rejects early claims, four-stars and collab choices", () => {
    for (const [total, choice] of [
      [199, id],
      [200, "R4-001"],
      [200, COLLAB_IDS[0]],
      [200, "invalid"],
    ] as const) {
      const state = funded(total);
      expect(
        gameReducer(state, { type: "CLAIM_STANDARD_SELECTOR", id: choice }),
      ).toBe(state);
    }
  });
  it("adds new characters and upgrades duplicates without exceeding six", () => {
    const initial = {
      ...funded(200),
      companions: funded().companions.filter((c) => c.id !== id),
    };
    const added = gameReducer(initial, { type: "CLAIM_STANDARD_SELECTOR", id });
    expect(added.companions.find((c) => c.id === id)?.constellation).toBe(0);
    for (const level of [2, 6]) {
      const state = {
        ...funded(200),
        companions: added.companions.map((c) =>
          c.id === id ? { ...c, constellation: level } : c,
        ),
      };
      expect(
        gameReducer(state, {
          type: "CLAIM_STANDARD_SELECTOR",
          id,
        }).companions.find((c) => c.id === id)?.constellation,
      ).toBe(Math.min(6, level + 1));
    }
  });
  it("persists total and claimed state through reload", () => {
    const entries = new Map<string, string>();
    const storage = {
      getItem: (k: string) => entries.get(k) ?? null,
      setItem: (k: string, v: string) => {
        entries.set(k, v);
      },
    };
    saveGameState(
      storage,
      gameReducer(funded(205), { type: "CLAIM_STANDARD_SELECTOR", id }),
    );
    const restored = restoreGameState(storage);
    expect(restored.standardPullTotal).toBe(205);
    expect(restored.standardSelectorClaimed).toBe(true);
  });
  it("migrates old saves from retained standard history", () => {
    const old = draw(funded(), 10) as Partial<ReturnType<typeof funded>>;
    delete old.standardPullTotal;
    delete old.standardSelectorClaimed;
    const storage = {
      getItem: (key: string) =>
        key === STORAGE_KEY ? JSON.stringify({ version: 7, state: old }) : null,
    };
    expect(restoreGameState(storage).standardPullTotal).toBe(10);
    expect(restoreGameState(storage).standardSelectorClaimed).toBe(false);
  });
});
