import { describe, expect, it } from "vitest";
import { companionCatalog } from "../data/catalog";
import { AFFIXES, ringAffixes, ringBonuses } from "./ringAffixes";
import {
  createInitialState,
  gameReducer,
  hydrateGameState,
} from "../state/gameState";
import { combatPanel } from "./rosterCombat";
import { stats } from "./growth";

describe("restrained nine-ring growth", () => {
  it("generates distinct, stable three-stat rings; all seven stats can appear", () => {
    const seen = new Set<string>();
    for (const c of companionCatalog)
      for (let i = 0; i < 9; i++) {
        const affixes = ringAffixes(c, i);
        expect(affixes).toHaveLength(3);
        expect(new Set(affixes.map((a) => a.key)).size).toBe(3);
        expect(affixes.filter((a) => a.main)).toHaveLength(1);
        expect(affixes).toEqual(ringAffixes({ ...c }, i));
        if (i < 6) seen.add(affixes[0].key);
      }
    expect(seen.size).toBe(7);
    expect(AFFIXES.reduce((n, a) => n + a.weight, 0)).toBe(100);
  });
  it("unlocks substats at +4 and +8 and keeps max nine-ring bonuses bounded", () => {
    for (const c of companionCatalog) {
      const hero = {
        ...c,
        level: 90,
        rings: ["exclusive-7", "exclusive-8", "exclusive-9"],
      };
      for (const [level, count] of [
        [0, 1],
        [4, 2],
        [8, 3],
        [12, 3],
      ]) {
        const upgraded = { ...hero, ringLevels: Array(9).fill(level) };
        for (let i = 0; i < 9; i++)
          expect(ringAffixes(upgraded, i).filter((a) => a.active)).toHaveLength(
            count,
          );
        for (const value of Object.values(ringBonuses(upgraded)))
          expect(value).toBeLessThan(0.3);
      }
    }
  });
  it("keeps acquired slot identities fixed and replacement inherits levels", () => {
    const c = {
      ...companionCatalog[0],
      level: 90,
      ringLevels: Array(9).fill(8),
      rings: ["exclusive-7", "exclusive-8", "exclusive-9"],
    };
    expect(ringAffixes(c, 6).map((a) => a.key)).toEqual([
      "hp",
      "defense",
      "energy",
    ]);
    expect(ringAffixes(c, 7).map((a) => a.key)).toEqual([
      "attack",
      "crit",
      "critDamage",
    ]);
    expect(ringAffixes(c, 8).map((a) => a.key)).toEqual([
      "critDamage",
      "speed",
      "attack",
    ]);
    expect(ringAffixes({ ...c, rings: ["common-7"] }, 6)[0].value).toBeCloseTo(
      ringAffixes(c, 6)[0].value * 0.75,
    );
  });
  it("charges upgrades once, persists them, rejects locked slots and stops at max", () => {
    let s = { ...createInitialState(), gold: 100000 };
    const id = s.companions[0].id;
    expect(gameReducer(s, { type: "UPGRADE_RING", id, slot: 8 })).toEqual(s);
    for (let i = 0; i < 12; i++)
      s = gameReducer(s, { type: "UPGRADE_RING", id, slot: 0 });
    expect(s.gold).toBe(94300);
    expect(hydrateGameState(s).companions[0].ringLevels?.[0]).toBe(12);
    expect(gameReducer(s, { type: "UPGRADE_RING", id, slot: 0 })).toEqual(s);
    const malformed = {
      ...s,
      companions: s.companions.map((c) => ({
        ...c,
        ringLevels: [-8, 400, 3.5, NaN],
      })),
    };
    expect(hydrateGameState(malformed).companions[0].ringLevels).toEqual([
      0, 12, 3, 0, 0, 0, 0, 0, 0,
    ]);
  });
  it("applies affixes to combat panels, energy and tower-defense intervals without old multipliers", () => {
    const c = {
      ...companionCatalog[0],
      level: 90,
      rings: ["exclusive-7", "exclusive-8", "exclusive-9"],
      ringLevels: Array(9).fill(12),
    };
    const without = { ...c, rings: [], ringLevels: [] },
      p = combatPanel(c, []),
      base = combatPanel(without, []);
    expect(p.attack).toBeGreaterThan(base.attack);
    expect(p.hp).toBeGreaterThan(base.hp);
    expect(stats(c).energyEfficiency).toBeGreaterThan(1);
    expect(stats(c).interval).toBeLessThan(1);
    expect(stats(c).soulBonus).toBe(0);
    expect(stats(c).effects).not.toContain("echo");
  });
});
