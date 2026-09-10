import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { towerFloors, companions, weapons } from "../data/catalog";
import { getEncounter, enemyArt } from "../data/encounters";
import { createAstralBattle, resolveAstralAction } from "./astralBattle";
import { createInitialState, gameReducer } from "../state/gameState";
const party = companions
  .slice(0, 5)
  .map((c) => ({ ...c, level: 90, constellation: 0 }));
const make = (floor: number) =>
  createAstralBattle(
    party,
    weapons,
    "mortal",
    getEncounter({ kind: "tower", id: String(floor) }).boss,
  );

describe("Abyss enemies, mechanics and independent progress", () => {
  it("ships a distinct image for every enemy identity, including summons", () => {
    const artByName = new Map<string, string>();
    for (const f of towerFloors) {
      const b = getEncounter({ kind: "tower", id: String(f.floor) }).boss;
      for (const enemy of b.bossWave ?? [
        b,
        ...(b.dualBoss ? [b.dualBoss] : []),
      ]) {
        artByName.set(enemy.name, enemyArt(enemy));
        for (const m of enemy.minions ?? []) artByName.set(m.name, m.art);
      }
    }
    expect(artByName.size).toBe(26);
    expect(new Set(artByName.values()).size).toBe(26);
    const hashes = [...artByName.values()].map((path) =>
      createHash("sha256")
        .update(readFileSync(resolve("public", path.slice(1))))
        .digest("hex"),
    );
    expect(new Set(hashes).size).toBe(26);
  });
  it("uses individual mob defenses and does not inherit boss penalties", () => {
    expect(make(1).boss.directResistance).toBe(0);
    expect(make(3).boss.healingSuppression).toBe(0);
    expect(make(15).boss.healingSuppression).toBe(0.5);
    expect(make(16).boss.critSuppression).toBe(0.3);
    expect(make(10).shield).toBe(5);
    expect(make(7).boss.defense).toBeGreaterThan(make(1).boss.defense);
  });
  it("area attacks clear summons and trigger thorn backlash without mutating the input", () => {
    const battle = make(3);
    battle.active = 3;
    battle.minions[0].hp = 1;
    const before = structuredClone(battle);
    const result = resolveAstralAction(battle, "skill")!.battle;
    expect(battle).toEqual(before);
    expect(result.minions[0].hp).toBe(0);
    expect(before.bossHp - result.bossHp).toBeGreaterThanOrEqual(
      before.bossMaxHp * 0.2,
    );
    result.active = 5;
    expect(resolveAstralAction(result)!.battle.minions[0].hp).toBe(
      result.minions[0].maxHp,
    );
  });
  it("mirror guards reduce damage until defeated", () => {
    const protectedBattle = make(4),
      exposed = structuredClone(protectedBattle);
    exposed.minions[0].hp = 0;
    expect(resolveAstralAction(protectedBattle)!.event.damage).toBeLessThan(
      resolveAstralAction(exposed)!.event.damage,
    );
  });
  it("main attacker interrupts the judgement charge on round three", () => {
    const b = make(8);
    b.round = 3;
    b.active = 2;
    const hit = resolveAstralAction(b, "skill")!.battle;
    expect(hit.chargeInterrupted).toBe(true);
    hit.active = 5;
    const plain = structuredClone(hit);
    plain.chargeInterrupted = false;
    expect(
      resolveAstralAction(hit)!.event.incoming.reduce((a, v) => a + v, 0),
    ).toBeLessThan(
      resolveAstralAction(plain)!.event.incoming.reduce((a, v) => a + v, 0),
    );
  });
  it("applies abyss corrosion and the heavy-shield damage window", () => {
    const b = make(13);
    b.active = 5;
    const plain = structuredClone(b);
    plain.boss.towerFloor = undefined;
    expect(
      resolveAstralAction(b)!.event.incoming.reduce((a, v) => a + v, 0),
    ).toBeGreaterThan(
      resolveAstralAction(plain)!.event.incoming.reduce((a, v) => a + v, 0),
    );
    const shielded = make(10),
      broken = structuredClone(shielded);
    broken.shield = 0;
    expect(resolveAstralAction(broken)!.event.damage).toBeCloseTo(
      resolveAstralAction(shielded)!.event.damage * 4,
    );
  });
  it("keeps dual boss snapshots immutable and uses surviving boss attack", () => {
    const b = make(18);
    const before = structuredClone(b);
    resolveAstralAction(b, "skill");
    expect(b).toEqual(before);
    b.bossHp = 0;
    b.active = 5;
    b.targetBossIndex = 1;
    b.dualBoss!.isEnraged = true;
    const stronger = structuredClone(b);
    stronger.dualBoss!.boss = { ...stronger.dualBoss!.boss, attack: 4000 };
    expect(resolveAstralAction(stronger)!.event.incoming[0]).toBeGreaterThan(
      resolveAstralAction(b)!.event.incoming[0],
    );
  });
  it("clears all 18 floors with a level-90 C0 five-role team within 60 rounds", () => {
    for (const f of towerFloors) {
      let b = make(f.floor);
      while (b.outcome === "playing" && b.actions < 360) {
        const actor = b.units[b.active];
        b = resolveAstralAction(
          b,
          actor?.energy >= 100 ? "ultimate" : b.points > 0 ? "skill" : "basic",
        )!.battle;
      }
      expect(b.outcome, `floor ${f.floor}, round ${b.round}`).toBe("win");
      expect(b.round).toBeLessThanOrEqual(60);
    }
  });
  it("a later region clear neither unlocks nor sweeps unvisited floors", () => {
    const original = {
      ...createInitialState(),
      highestTowerFloor: 13,
      clearedTowerFloors: [1, 2, 3, 4, 13],
      encounter: undefined,
    };
    expect(
      gameReducer(original, {
        type: "PREPARE_ENCOUNTER",
        encounter: { kind: "tower", id: "10" },
      }).encounter,
    ).toBeUndefined();
    expect(
      gameReducer(original, { type: "SWEEP_TOWER_FLOOR", floor: 10 }),
    ).toEqual(original);
    expect(
      gameReducer(original, {
        type: "PREPARE_ENCOUNTER",
        encounter: { kind: "tower", id: "14" },
      }).encounter?.id,
    ).toBe("14");
  });
});
