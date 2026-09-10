import { describe, expect, it } from "vitest";
import { companions, weapons } from "../data/catalog";
import { COMBAT_PATHS } from "../data/combat";
import {
  canCommand,
  createAstralBattle,
  formationLink,
  resolveAstralAction,
  signatureActive,
} from "./astralBattle";
const make = () => createAstralBattle(companions.slice(0, 5), weapons);
describe("playable astral encounter", () => {
  it('heals the caster and allies with per-unit feedback, without reviving or overhealing', () => {
    const b = make(); b.active = 1;
    b.units.forEach(u => { u.hp = u.maxHp * .8; });
    b.units[3].hp = 0;
    const r = resolveAstralAction(b, 'skill')!;
    expect(r.battle.units[1].hp).toBeGreaterThan(b.units[1].hp);
    expect(r.event.healingByUnit[1]).toBeGreaterThan(0);
    expect(r.event.healingByUnit[3]).toBe(0);
    expect(r.event.healingByUnit.reduce((a,v) => a+v,0)).toBeCloseTo(r.event.healing);
    expect(r.event.effect).toContain('含自身');
    expect(r.event.tone).toBe('heal');
    expect(r.battle.units.every(u => u.hp <= u.maxHp)).toBe(true);
  });
  it('specialist skills strengthen their own hit as well as the next carries', () => {
    const b = make(); b.active = 4;
    const normal = structuredClone(b);
    normal.units[4].supportPower = 0;
    const cast = resolveAstralAction(b, 'skill')!;
    const unbuffed = resolveAstralAction(normal, 'skill')!;
    expect(cast.event.damage).toBeGreaterThan(unbuffed.event.damage);
    expect(cast.event.buffed).toContain(4);
    expect(cast.battle.empowered).toBe(true);
    expect(cast.event.tone).toBe('support');
  });
  it("keeps five distinct duties and reads growth attributes", () => {
    const b = make();
    expect(b.units.map((u) => u.companion.id)).toEqual([
      "alden",
      "mira",
      "noctis",
      "selene",
      "lumi",
    ]);
    expect(formationLink(b)).toBeCloseTo(0.1284);
    const stronger = createAstralBattle(
      companions.slice(0, 5).map((c) => ({ ...c, level: 80 })),
      weapons,
    );
    expect(stronger.units[2].attack).toBeGreaterThan(b.units[2].attack);
  });
  it("rejects unavailable actions and does not mutate the input", () => {
    const b = make(),
      before = JSON.stringify(b);
    expect(resolveAstralAction(b, "ultimate")).toBeNull();
    const r = resolveAstralAction(b, "skill")!;
    expect(r.battle.points).toBe(2);
    expect(r.battle.guard).toBe(true);
    expect(JSON.stringify(b)).toBe(before);
    b.points = 0;
    expect(canCommand(b, "skill")).toBe(false);
    expect(resolveAstralAction(b, "skill")).toBeNull();
    b.points = 5;
    expect(resolveAstralAction(b)!.battle.points).toBe(5);
  });
  it("removes fallen providers from the formation, skips their turns and never revives them", () => {
    const b = make();
    b.units[1].hp = 0;
    b.units[4].hp = 0;
    expect(formationLink(b)).toBeCloseTo(0.0636);
    expect(signatureActive(b)).toBe(false);
    expect(resolveAstralAction(b)!.battle.active).toBe(2);
    b.active = 5;
    expect(resolveAstralAction(b)!.battle.units[1].hp).toBe(0);
  });
  it("heals once per round without overheal and resolves the enemy package", () => {
    const b = make();
    b.active = 5;
    const r = resolveAstralAction(b)!;
    expect(r.event.healing).toBe(0);
    expect(r.event.incoming.every((n) => n > 0)).toBe(true);
    expect(r.event.incoming[0]).toBeGreaterThan(r.event.incoming[2] * 4);
    expect(r.battle.round).toBe(2);
    expect(r.battle.lastHit).toBe(true);
    const guarded = make();
    guarded.active = 5;
    guarded.guard = true;
    expect(resolveAstralAction(guarded)!.event.incoming[0]).toBeLessThan(
      r.event.incoming[0],
    );
  });
  it("preserves specialist empowerment for the next pair of carries", () => {
    const b = make();
    b.active = 4;
    const cast = resolveAstralAction(b, "skill")!.battle;
    expect(cast.empowered).toBe(true);
    const next = resolveAstralAction(cast)!.battle;
    expect(next.empowered).toBe(true);
    next.active = 3;
    expect(resolveAstralAction(next)!.battle.empowered).toBe(false);
  });
  it("ends immediately on lethal damage and cannot act or award extra damage afterwards", () => {
    const b = make();
    b.bossHp = 1;
    const r = resolveAstralAction(b)!;
    expect(r.battle.outcome).toBe("win");
    expect(r.battle.totalDamage).toBe(1);
    expect(resolveAstralAction(r.battle)).toBeNull();
    const losing = make();
    losing.active = 5;
    losing.boss = { ...losing.boss, attack: 100000 };
    losing.units.forEach((u) => (u.hp = 1));
    const loss = resolveAstralAction(losing)!;
    expect(loss.battle.outcome).toBe("loss");
    expect(loss.event.reflected).toBe(0);
  });
  it("respects signature round, healing, hit and health thresholds", () => {
    const b = make();
    b.units.forEach(u => { u.affinity = 1; });
    b.units[4].kit = { ...b.units[4].kit, mechanicPath: "memory" };
    b.path = "memory";
    expect(signatureActive(b)).toBe(false);
    b.round = 3;
    expect(signatureActive(b)).toBe(true);
    b.units[2].hp = 0;
    expect(signatureActive(b)).toBe(false);
    b.units[4].kit.mechanicPath = "desire";
    b.path = "desire";
    expect(signatureActive(b)).toBe(false);
    b.lastHealing = true;
    expect(signatureActive(b)).toBe(true);
    b.units[4].kit.mechanicPath = "inverse";
    b.path = "inverse";
    expect(signatureActive(b)).toBe(false);
    b.lastHit = true;
    expect(signatureActive(b)).toBe(true);
    b.units[4].kit.mechanicPath = "end";
    b.path = "end";
    b.openingRatio = 0.5;
    expect(signatureActive(b)).toBe(true);
    b.units[4].kit.mechanicPath = "time";
    b.path = "time";
    b.round = 4;
    expect(signatureActive(b)).toBe(false);
  });
  it.each(COMBAT_PATHS.map((p) => p.id))(
    "completes %s without stuck turns, invalid HP or negative resources",
    (path) => {
      let b = createAstralBattle(companions.slice(0, 5), weapons, path);
      for (let i = 0; i < 366 && b.outcome === "playing"; i++) {
        const command =
          b.active < 5 && b.units[b.active].energy >= 100
            ? "ultimate"
            : b.points > 0 &&
                (b.active !== 1 ||
                  b.units.some((u) => u.hp > 0 && u.hp < u.maxHp * 0.85))
              ? "skill"
              : "basic";
        b = resolveAstralAction(b, command)!.battle;
        expect(b.points).toBeGreaterThanOrEqual(0);
        expect(b.points).toBeLessThanOrEqual(5);
        b.units.forEach((u) => {
          expect(u.hp).toBeGreaterThanOrEqual(0);
          expect(u.hp).toBeLessThanOrEqual(u.maxHp);
        });
      }
      expect(b.outcome).not.toBe("playing");
    },
  );
});
