import { describe, it, expect } from "vitest";
import { getBossOptimalRecommendation, BOSS_TACTIC_PROFILES } from "../data/bossRecommendation";
import { encounterBosses, getEncounter } from "../data/encounters";
import { companionCatalog } from "../data/catalog";

describe("Boss Optimal Character Recommendation", () => {
  it("provides comprehensive tactic profiles for all 8 bosses", () => {
    const bossIds = [
      "inverse",
      "memory",
      "flame",
      "desire",
      "dream",
      "end",
      "time",
      "mortal",
    ];
    for (const id of bossIds) {
      const profile = BOSS_TACTIC_PROFILES[id];
      expect(profile).toBeDefined();
      expect(profile.counterPath).toBeTruthy();
      expect(profile.weakness).toBeTruthy();
      expect(profile.strategyTitle).toBeTruthy();
      expect(profile.reason).toBeTruthy();
      expect(profile.signatureLineup).toHaveLength(5);
    }
  });

  it("recommends 5 optimal characters for inverse boss (weak fire, direct resistance)", () => {
    const boss = encounterBosses.find((b) => b.id === "inverse")!;
    const encounter = { boss, path: "inverse" as const };
    const rec = getBossOptimalRecommendation(encounter, companionCatalog);

    expect(rec.bossId).toBe("inverse");
    expect(rec.weakness).toBe("fire");
    expect(rec.counterPath).toBe("flame");
    expect(rec.optimalIds).toHaveLength(5);
    expect(rec.optimalCompanions).toHaveLength(5);
    // Should prioritize fire and flame characters
    const fireOrFlame = rec.optimalCompanions.filter(
      (c) => c.element === "fire" || c.path === "flame" || c.adaptedPath === "flame"
    );
    expect(fireOrFlame.length).toBeGreaterThanOrEqual(3);
  });

  it("recommends 5 optimal characters for flame boss (weak water, ramp attack)", () => {
    const boss = encounterBosses.find((b) => b.id === "flame")!;
    const encounter = { boss, path: "flame" as const };
    const rec = getBossOptimalRecommendation(encounter, companionCatalog);

    expect(rec.bossId).toBe("flame");
    expect(rec.weakness).toBe("water");
    expect(rec.counterPath).toBe("dream");
    expect(rec.optimalIds).toHaveLength(5);
    const waterOrDream = rec.optimalCompanions.filter(
      (c) => c.element === "water" || c.path === "dream" || c.adaptedPath === "dream"
    );
    expect(waterOrDream.length).toBeGreaterThanOrEqual(3);
  });

  it("recommends 5 optimal characters for desire boss (healing suppression, weak light)", () => {
    const boss = encounterBosses.find((b) => b.id === "desire")!;
    const encounter = { boss, path: "desire" as const };
    const rec = getBossOptimalRecommendation(encounter, companionCatalog);

    expect(rec.bossId).toBe("desire");
    expect(rec.weakness).toBe("light");
    expect(rec.counterPath).toBe("inverse");
    expect(rec.optimalIds).toHaveLength(5);
    const lightOrInverse = rec.optimalCompanions.filter(
      (c) => c.element === "light" || c.path === "inverse" || c.adaptedPath === "inverse"
    );
    expect(lightOrInverse.length).toBeGreaterThanOrEqual(3);
  });

  it("works with getEncounter helper for default/story/tower encounters", () => {
    const defaultEnc = getEncounter();
    const rec = getBossOptimalRecommendation(defaultEnc, companionCatalog);
    expect(rec.optimalIds).toHaveLength(5);
    expect(rec.counterPath).toBeTruthy();
  });
});
