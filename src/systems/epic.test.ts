import { describe, it, expect } from "vitest";
import {
  companionCatalog,
  weaponCatalog,
  companions,
  weapons,
  initialStoryChapters,
} from "../data/catalog";
import { encounterBosses, getEncounter } from "../data/encounters";
import {
  createInitialState,
  gameReducer,
  hydrateGameState,
  refreshPeriods,
} from "../state/gameState";
import { activeRings, stats } from "./growth";
import { createAstralBattle, resolveAstralAction } from "./astralBattle";
import { COMBAT_PATHS } from "../data/combat";
const start = (kind: "story" | "tower", id: string) =>
  gameReducer(
    gameReducer(createInitialState(), {
      type: "PREPARE_ENCOUNTER",
      encounter: { kind, id },
    }),
    { type: "START_BATTLE" },
  );
describe("web edition campaign and progression", () => {
  it("has complete named heroes, signature weapons, soul identities and chapters", () => {
    expect(companionCatalog).toHaveLength(51);
    expect(new Set(companionCatalog.map((c) => c.id)).size).toBe(51);
    for (const c of companionCatalog) {
      expect(c.realm).toBeTruthy();
      expect(c.soulName).toBeTruthy();
      expect(weaponCatalog.filter((w) => w.signatureFor === c.id)).toHaveLength(
        1,
      );
    }
    expect(initialStoryChapters.flatMap((c) => c.stages)).toHaveLength(32);
    expect(new Set(encounterBosses.map((b) => b.id)).size).toBe(8);
  });
  it("does not advance or pay for reading, locked chapters, losing or stale settlement", () => {
    const s = createInitialState();
    expect(
      gameReducer(s, {
        type: "PREPARE_ENCOUNTER",
        encounter: { kind: "story", id: "8-4" },
      }),
    ).toEqual(s);
    expect(
      gameReducer(s, { type: "COMPLETE_STORY_STAGE", stageId: "1-3" }),
    ).toEqual(s);
    const active = start("story", "1-3");
    expect(active.completedStages).not.toContain("1-3");
    expect(active.stamina).toBe(s.stamina - 6);
    expect(
      gameReducer(active, {
        type: "FINISH_BATTLE",
        victory: false,
        ticket: active.battleTicket,
      }),
    ).toEqual(active);
    expect(
      gameReducer(active, {
        type: "FINISH_BATTLE",
        victory: true,
        ticket: 999,
      }),
    ).toEqual(active);
    const won = gameReducer(active, {
      type: "FINISH_BATTLE",
      victory: true,
      ticket: active.battleTicket,
    });
    expect(won.completedStages).toContain("1-3");
    expect(won.mainStoryStageId).toBe("1-4");
    expect(
      gameReducer(won, {
        type: "FINISH_BATTLE",
        victory: true,
        ticket: active.battleTicket,
      }),
    ).toEqual(won);
    expect(hydrateGameState(active).battleTicket).toBeUndefined();
    expect(hydrateGameState(active).screen).toBe("formation");
  });
  it("lets a newly recruited god forge, equip and retain all exclusive gear", () => {
    let s = gameReducer(createInitialState(), {
      type: "RECRUIT",
      id: "xuanzhao",
    });
    s = gameReducer(s, { type: "FORGE_WEAPON", id: "xuanzhao" });
    s = gameReducer(s, {
      type: "EQUIP_WEAPON",
      id: "xuanzhao",
      weaponId: "w-xuanzhao",
    });
    s = gameReducer(s, { type: "CRAFT_RING", id: "xuanzhao", slot: 1 });
    s = gameReducer(s, {
      type: "EQUIP_RING",
      id: "xuanzhao",
      slot: 1,
      exclusive: true,
    });
    const restored = hydrateGameState({ version: 6, state: s }),
      hero = restored.companions.find((c) => c.id === "xuanzhao")!;
    expect(hero.rings?.[1]).toBe("exclusive-8");
    expect(restored.weapons.find((w) => w.id === "w-xuanzhao")?.ownerId).toBe(
      "xuanzhao",
    );
    expect(stats(hero, restored.weapons).signature).toBe(true);
    expect(stats(hero, restored.weapons).soulBonus).toBeCloseTo(0.08);
    expect(activeRings(hero).some((r) => r.name.includes(hero.soulName!))).toBe(
      true,
    );
  });
  it("acquires a previously unowned summoned hero at zero constellation and preserves history", () => {
    const s = gameReducer(createInitialState(), {
      type: "APPLY_PULLS",
      kind: "companion",
      pool: "standard",
      count: 1,
      pity: 0,
      results: [
        { kind: "companion", id: "canglan", rarity: "5星", duplicate: false },
      ],
      time: "2026-09-10T00:00:00Z",
    });
    expect(s.companions.find((c) => c.id === "canglan")?.constellation).toBe(0);
    expect(hydrateGameState(s).pullHistory[0].id).toBe("canglan");
    expect(s.dailyTasks.find((t) => t.id === "dt-4")?.progress).toBe(1);
  });
  it("does not pay homestead harvest repeatedly and uses the displayed shop prices", () => {
    const s = gameReducer(createInitialState(), { type: "HARVEST_HOMESTEAD" });
    expect(gameReducer(s, { type: "HARVEST_HOMESTEAD" })).toEqual(s);
    const purchased = gameReducer(s, { type: "BUY_GOODS", id: "core" });
    expect(purchased.gold).toBe(s.gold - 2000);
    expect(purchased.materials["纯净星核"]).toBe(s.materials["纯净星核"] + 1);
    expect(
      gameReducer({ ...s, gold: 0 }, { type: "BUY_GOODS", id: "core" })
        .materials,
    ).toEqual(s.materials);
  });
  it("preserves claimed rewards and resets periods only at the next Beijing day", () => {
    const s = gameReducer(createInitialState(), {
      type: "CLAIM_TASK",
      taskType: "daily",
      taskId: "dt-1",
    });
    expect(hydrateGameState(s).dailyTasks[0].claimed).toBe(true);
    const old = {
      ...s,
      taskPeriods: { day: "2026-09-10", week: "2026-09-07", month: "2026-09" },
    };
    expect(refreshPeriods(old, new Date("2026-09-10T15:59:59Z"))).toBe(old);
    const next = refreshPeriods(old, new Date("2026-09-10T16:00:00Z"));
    expect(next.dailyTasks[0].claimed).toBe(false);
    expect(next.dailyTasks[1].progress).toBe(0);
    expect(next.claimedDailyChests).toEqual([]);
    expect(next.weeklyTasks).toEqual(old.weeklyTasks);
  });
});
describe("real boss and soul mechanics", () => {
  it("soul equipment changes outgoing damage and actual recovery", () => {
    const party = companions.slice(0, 5).map((c) => ({ ...c, level: 50 }));
    const b = createAstralBattle(party, weapons),
      a = createAstralBattle(
        party.map((c) => ({
          ...c,
          rings: ["exclusive-7", "exclusive-8", "exclusive-9"],
        })),
        weapons,
      );
    a.active = 2;
    b.active = 2;
    a.units[2].hp -= 500;
    b.units[2].hp -= 500;
    const ar = resolveAstralAction(a)!,
      br = resolveAstralAction(b)!;
    expect(ar.event.damage).toBeGreaterThan(br.event.damage);
    expect(ar.event.healing).toBeGreaterThan(br.event.healing);
  });
  it("boss healing suppression, shields, and phase transition affect combat", () => {
    const normal = createAstralBattle(
      companions.slice(0, 5),
      weapons,
      "mortal",
      encounterBosses[0],
    );
    const suppressed = createAstralBattle(
      companions.slice(0, 5),
      weapons,
      "mortal",
      encounterBosses[3],
    );
    for (const b of [normal, suppressed]) {
      b.active = 1;
      b.units.forEach((u) => (u.hp = Math.round(u.hp * 0.4)));
    }
    expect(
      resolveAstralAction(suppressed, "skill")!.event.healing,
    ).toBeLessThan(resolveAstralAction(normal, "skill")!.event.healing * 0.4);
    const broken = resolveAstralAction(normal, "skill")!.battle;
    expect(broken.shield).toBeLessThan(normal.shield);
    normal.bossHp = normal.bossMaxHp * 0.5 + 1;
    expect(resolveAstralAction(normal)!.battle.phase).toBe(2);
  });
  it("individual and team story choices have distinct effects", () => {
    const party = ["alden", "mira", "astra", "selene", "lumi"].map((id) =>
      companionCatalog.find((c) => c.id === id)!,
    );
    const base = createAstralBattle(party, weapons),
      solo = createAstralBattle(
        party,
        weapons,
        "mortal",
        getEncounter().boss,
        "self",
      ),
      team = createAstralBattle(
        party,
        weapons,
        "mortal",
        getEncounter().boss,
        "team",
      );
    base.active = 2;
    solo.active = 2;
    expect(resolveAstralAction(solo)!.event.damage).toBeGreaterThan(
      resolveAstralAction(base)!.event.damage,
    );
    base.active = 5;
    team.active = 5;
    expect(resolveAstralAction(team)!.event.incoming[0]).toBeLessThan(
      resolveAstralAction(base)!.event.incoming[0],
    );
  });
  for (const boss of encounterBosses)
    it(`${boss.name} can be completed with an equipped level-50 team`, () => {
      const party = ["alden", "mira", "astra", "selene", "lumi"].map((id) => ({
        ...companionCatalog.find((c) => c.id === id)!,
        level: 50,
        rings: ["exclusive-7", "exclusive-8", "exclusive-9"],
      }));
      const gear = weaponCatalog
        .filter((w) => party.some((c) => c.id === w.signatureFor))
        .map((w) => ({ ...w, ownerId: w.signatureFor, level: 30 }));
      let b = createAstralBattle(
        party,
        gear,
        COMBAT_PATHS.find((p) => p.id === boss.id)!.id,
        boss,
      );
      for (let i = 0; i < 240 && b.outcome === "playing"; i++) {
        const u = b.units[b.active],
          command =
            u?.energy >= 100
              ? "ultimate"
              : b.points > 0 &&
                  (b.active !== 1 ||
                    b.units.some((u) => u.hp > 0 && u.hp < u.maxHp * 0.85))
                ? "skill"
                : "basic";
        b = resolveAstralAction(b, command)!.battle;
      }
      expect(b.outcome).toBe("win");
      expect(
        b.units.every(
          (u) => Number.isFinite(u.hp) && u.hp >= 0 && u.hp <= u.maxHp,
        ),
      ).toBe(true);
    });
});

describe("signature and tower differentiation", () => {
  for (const path of COMBAT_PATHS)
    it(path.id + " signature equipment contributes within the numeric budget", () => {
      const hero = companionCatalog.find(c => c.path === path.id)!;
      const party = [hero, ...companions.filter(c => c.id !== hero.id).slice(0,4)];
      const gear = weaponCatalog.filter(w => w.signatureFor === hero.id).map(w => ({ ...w, ownerId: hero.id, level:90, refinement:5 }));
      const equipped = createAstralBattle(party, gear, path.id);
      const plain = createAstralBattle(party, [], path.id);
      const i = equipped.units.findIndex(u => u.companion.id === hero.id);
      expect(equipped.units[i].attack).toBeGreaterThan(plain.units[i].attack);
      equipped.active = plain.active = i;
      const a = resolveAstralAction(equipped)!, b = resolveAstralAction(plain)!;
      expect(a.event.damage + a.event.pursuit + a.event.dot).toBeGreaterThan(b.event.damage + b.event.pursuit + b.event.dot);
    });
  it("tower buffs provide defense, recovery and energy at their respective floors", () => {
    const make = (n: number) =>
      createAstralBattle(
        companions.slice(0, 5),
        weapons,
        "mortal",
        getEncounter({ kind: "tower", id: String(n) }).boss,
      );
    expect(make(14).units[0].defense).toBeGreaterThan(make(1).units[0].defense);
    const heal = make(13),
      plain = structuredClone(heal);
    plain.boss.towerFloor = undefined;
    for (const b of [heal, plain]) {
      b.active = 5;
      b.units.forEach((u) => (u.hp *= 0.5));
    }
    expect(resolveAstralAction(heal)!.event.healing).toBeGreaterThan(
      resolveAstralAction(plain)!.event.healing,
    );
    const energy = make(17),
      base = structuredClone(energy);
    base.boss.towerFloor = undefined;
    energy.active = base.active = 5;
    expect(resolveAstralAction(energy)!.battle.units[0].energy).toBeGreaterThan(
      resolveAstralAction(base)!.battle.units[0].energy,
    );
  });

  it("supports 9 lineup presets with formation path persistence and adapted systems", () => {
    let state = createInitialState();
    expect(companionCatalog.every((c) => c.path && c.adaptedPath)).toBe(true);

    // Save across all 9 slots (0 to 8)
    for (let slot = 0; slot < 9; slot++) {
      state = gameReducer(state, {
        type: "SET_PATH",
        path: COMBAT_PATHS[slot % 8].id,
      });
      state = gameReducer(state, { type: "SAVE_FORMATION", slot });
    }

    expect(state.formationPresets).toHaveLength(9);
    expect(state.formationPresetPaths).toHaveLength(9);
    expect(state.formationPresetPaths![8]).toBe(COMBAT_PATHS[0].id);

    // Out of bounds check: slot 9 should be rejected
    const invalidSlotState = gameReducer(state, { type: "SAVE_FORMATION", slot: 9 });
    expect(invalidSlotState).toEqual(state);

    // Test hydration preserves 9 presets
    const hydrated = hydrateGameState({ state });
    expect(hydrated.formationPresets).toHaveLength(9);
    expect(hydrated.formationPresetPaths).toHaveLength(9);
  });
});

