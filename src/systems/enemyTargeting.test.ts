import { describe, expect, it } from "vitest";
import { companions, weapons } from "../data/catalog";
import { getEncounter } from "../data/encounters";
import {
  battleEnemies,
  createAstralBattle,
  isAreaAttack,
  resolveAstralAction,
  setBattleTarget,
} from "./astralBattle";
const make = (floor = 1) =>
  createAstralBattle(
    companions.slice(0, 5),
    weapons,
    "mortal",
    getEncounter({ kind: "tower", id: String(floor) }).boss,
  );
describe("enemy formation and targeting", () => {
  it("gives mob encounters multiple independently selectable slots", () => {
    const b = make();
    expect(battleEnemies(b)).toHaveLength(4);
    expect(setBattleTarget(b, 3).targetBossIndex).toBe(3);
    expect(setBattleTarget(b, 999)).toBe(b);
    b.minions[1].hp = 0;
    expect(setBattleTarget(b, 3)).toBe(b);
  });
  it("single target damage never splashes or breaks another enemy shield", () => {
    const b = setBattleTarget(make(), 3);
    b.active = 2;
    const before = structuredClone(b);
    const r = resolveAstralAction(b, "skill")!;
    expect(b).toEqual(before);
    expect(r.battle.bossHp).toBe(b.bossHp);
    expect(r.battle.shield).toBe(b.shield);
    expect(r.battle.minions[0].hp).toBe(b.minions[0].hp);
    expect(r.battle.minions[1].hp).toBeLessThan(b.minions[1].hp);
    expect(r.event.targets?.map((t) => t.index)).toEqual([3]);
  });
  it("keeps all damage channels on the selected enemy even after a lethal hit", () => {
    const b = setBattleTarget(make(), 2);
    b.minions[0].hp = 1;
    const r = resolveAstralAction(b)!;
    expect(r.battle.bossHp).toBe(b.bossHp);
    expect(r.event.damage + r.event.pursuit + r.event.dot).toBeCloseTo(1);
    expect(r.battle.targetBossIndex).toBe(0);
  });
  it("area skills hit each living enemy exactly once per channel with matching feedback totals", () => {
    const b = make();
    b.active = 3;
    b.minions[1].hp = 0;
    const r = resolveAstralAction(b, "skill")!;
    expect(r.event.area).toBe(true);
    expect(r.event.targets?.map((t) => t.index)).toEqual([0, 2, 4]);
    expect(r.event.targets?.reduce((n, t) => n + t.damage, 0)).toBeCloseTo(
      r.event.damage + r.event.pursuit + r.event.dot,
    );
    expect(r.battle.minions[1].hp).toBe(0);
    expect(r.battle.shield).toBe(0);
  });
  it("area damage uses each dual boss defense, breaks both shields and hits survivors after a kill", () => {
    const b = make(18);
    b.active = 3;
    b.bossHp = 1;
    const r = resolveAstralAction(b, "skill")!;
    expect(r.event.targets?.map((t) => t.index)).toEqual([0, 1]);
    expect(r.battle.dualBoss!.hp).toBeLessThan(b.dualBoss!.hp);
    expect(r.battle.dualBoss!.shield).toBeLessThan(b.dualBoss!.shield);
    expect(r.battle.targetBossIndex).toBe(1);
  });
  it("does not award victory until all enemies are defeated", () => {
    const b = make();
    b.bossHp = 1;
    const r = resolveAstralAction(b)!;
    expect(r.battle.outcome).toBe("playing");
    expect(r.battle.targetBossIndex).toBe(2);
    r.battle.minions.forEach((m) => (m.hp = 1));
    r.battle.active = 3;
    expect(resolveAstralAction(r.battle, "skill")!.battle.outcome).toBe("win");
  });
  it("defines area attacks by character identity, never by moved formation slot or basic attack", () => {
    const b = make();
    expect(isAreaAttack(b.units[3], "skill")).toBe(true);
    expect(isAreaAttack(b.units[2], "skill")).toBe(false);
    expect(b.units.every((u) => !isAreaAttack(u, "basic"))).toBe(true);
    b.active = 5;
    expect(setBattleTarget(b, 2)).toBe(b);
  });
});
