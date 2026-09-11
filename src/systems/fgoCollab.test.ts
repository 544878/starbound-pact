import { describe, expect, it } from "vitest";
import {
  fgoCompanions,
  FGO_HERO_LORE,
  FGO_TIME_FORMATION,
  FGO_SWAPPED_TIME_FORMATION,
  FGO_CONSTELLATIONS,
  FGO_COMBAT_KITS,
  FGO_FOUR_STAR_CHARACTERS,
  FGO_CHARACTERS_MAP,
} from "../data/fgoCollab";
import { companionCatalog, weaponCatalog, getCompanionById } from "../data/catalog";
import { simulateFormation, teamBoss, validateFormation } from "./formationMath";
import { BOSSES, NEUTRAL_BOSS } from "../data/combat";
import { numericKit, constellationNodes, combatPanel } from "./rosterCombat";
import { characterMember, characterFormation } from "./fourStarCharacters";

describe("FGO Collaboration - Time Path Integration", () => {
  it("registers all five FGO companions with correct attributes and Time Path", () => {
    expect(fgoCompanions).toHaveLength(5);
    const ids = ["saber", "sakura", "rin", "archer", "gilgamesh"];
    for (const id of ids) {
      const c = getCompanionById(id);
      expect(c).toBeDefined();
      expect(c!.path).toBe("time");
      expect(c!.realm).toBeDefined();
      expect(c!.soulName).toBeDefined();
      expect(c!.quotes?.length).toBeGreaterThan(0);
      expect(FGO_HERO_LORE[id]).toBeDefined();
    }

    // Role checks
    expect(getCompanionById("saber")?.role).toBe("guardian");
    expect(getCompanionById("sakura")?.role).toBe("support");
    expect(getCompanionById("rin")?.role).toBe("mystic");
    expect(getCompanionById("archer")?.role).toBe("striker");
    expect(getCompanionById("gilgamesh")?.role).toBe("striker");
  });

  it("registers five signature weapons with correct passives", () => {
    const weaponIds = ["w-saber", "w-sakura", "w-rin", "w-archer", "w-gilgamesh"];
    for (const wid of weaponIds) {
      const w = weaponCatalog.find((item) => item.id === wid);
      expect(w).toBeDefined();
      expect(w?.rarity).toBe("5星");
      expect(w?.signatureFor).toBeDefined();
      expect(w?.passive).toContain("攻击+18%、伤害系数+8%");
      expect(w?.passive).toContain("每次行动额外恢复5能量");
    }

    expect(weaponCatalog.find((w) => w.id === "w-saber")?.name).toBe("誓约胜利之剑·理想乡");
    expect(weaponCatalog.find((w) => w.id === "w-gilgamesh")?.name).toBe("天地乖离·乖离剑Ea");
    expect(weaponCatalog.find((w) => w.id === "w-archer")?.name).toBe("干将·莫邪·投影");
    expect(weaponCatalog.find((w) => w.id === "w-rin")?.name).toBe("泽尔里奇宝石剑");
    expect(weaponCatalog.find((w) => w.id === "w-sakura")?.name).toBe("圣杯回溯·虚数之绫");
  });

  it("validates the standard FGO Time Formation", () => {
    expect(() => validateFormation(FGO_TIME_FORMATION)).not.toThrow();
    expect(FGO_TIME_FORMATION.path).toBe("time");
    expect(FGO_TIME_FORMATION.members).toHaveLength(5);

    const slots = FGO_TIME_FORMATION.members.map((m) => m.slot);
    expect(slots).toEqual(["tank", "healer", "carry1", "carry2", "specialist"]);

    for (const m of FGO_TIME_FORMATION.members) {
      expect(m.specialties).toContain("time");
    }
  });

  it("simulates 12 rounds on neutral boss within the canonical Time Path balance range", () => {
    const sim = simulateFormation(FGO_TIME_FORMATION, teamBoss(NEUTRAL_BOSS), 12);
    expect(sim.survivors).toBe(5);
    expect(sim.rounds).toBe(12);

    // Target range for C0 12-round damage in 250x scale is ~9.5M - ~10.5M
    expect(sim.damage).toBeGreaterThan(9_000_000);
    expect(sim.damage).toBeLessThan(10_500_000);
  });

  it("handles constellation progression from C0 to C2 to C6 monotonically", () => {
    // C0 simulation
    const simC0 = simulateFormation(FGO_TIME_FORMATION, teamBoss(NEUTRAL_BOSS), 12);

    // Focused C2 main carry simulation
    const teamC2 = {
      path: "time" as const,
      members: FGO_TIME_FORMATION.members.map((m) => ({
        ...m,
        constellation: m.slot === "carry1" ? 2 : 0,
      })),
    };
    const simC2 = simulateFormation(teamC2, teamBoss(NEUTRAL_BOSS), 12);

    // Maxed C6 full team simulation
    const teamC6 = {
      path: "time" as const,
      members: FGO_TIME_FORMATION.members.map((m) => ({
        ...m,
        constellation: 6,
      })),
    };
    const simC6 = simulateFormation(teamC6, teamBoss(NEUTRAL_BOSS), 12);

    expect(simC2.damage).toBeGreaterThan(simC0.damage);
    expect(simC6.damage).toBeGreaterThan(simC2.damage);

    // C6 total damage is ~125% - ~160% of C0 (within budget limit, no runaway inflation)
    const ratio = simC6.damage / simC0.damage;
    expect(ratio).toBeGreaterThan(1.25);
    expect(ratio).toBeLessThan(1.65);
  });

  it("survives and performs across all eight boss rules", () => {
    for (const boss of BOSSES) {
      const sim = simulateFormation(FGO_TIME_FORMATION, teamBoss(boss), 12);
      expect(sim.survivors).toBeGreaterThanOrEqual(4);
      expect(sim.damage).toBeGreaterThan(8_000_000);
    }
  });

  it("validates and simulates the alternative swapped formation (Saber Carry1, Archer Tank)", () => {
    expect(() => validateFormation(FGO_SWAPPED_TIME_FORMATION)).not.toThrow();
    const sim = simulateFormation(FGO_SWAPPED_TIME_FORMATION, teamBoss(NEUTRAL_BOSS), 12);
    expect(sim.survivors).toBe(5);
    expect(sim.damage).toBeGreaterThan(9_000_000);
  });

  it("integrates with rosterCombat and displays customized FGO kits and constellations", () => {
    const gil = getCompanionById("gilgamesh")!;
    const kit = numericKit(gil);
    expect(kit).toBeDefined();
    expect(kit.id).toBe("gilgamesh");

    const nodes = constellationNodes(gil);
    expect(nodes).toHaveLength(6);
    expect(nodes[0].effect).toContain("黄金律");
    expect(nodes[1].effect).toContain("王之财宝");
    expect(nodes[5].effect).toContain("原初创世");

    const panel = combatPanel(gil, []);
    expect(panel.attack).toBeGreaterThan(300);
    expect(panel.attack).toBeLessThan(2000);
    expect(panel.hp).toBeGreaterThan(3000);
    expect(panel.hp).toBeLessThan(50000);

    // Max level 90 with maxed weapon and rings reaches ~200k attack
    const maxedGil = { ...gil, level: 90, rings: ["exclusive-7", "exclusive-8", "exclusive-9"] };
    const maxedWeapon = {
      ...weaponCatalog.find((w) => w.signatureFor === "gilgamesh")!,
      level: 90,
      refinement: 5,
      ownerId: "gilgamesh",
    };
    const maxedPanel = combatPanel(maxedGil, [maxedWeapon]);
    expect(maxedPanel.attack).toBeGreaterThan(panel.attack);
    expect(maxedPanel.attack / combatPanel({...maxedGil, rings:[]}, [maxedWeapon]).attack).toBeLessThan(1.1);
    expect(maxedPanel.hp).toBeGreaterThan(panel.hp);

    const saber = getCompanionById("saber")!;
    const saberNodes = constellationNodes(saber);
    expect(saberNodes[1].effect).toContain("遥远的理想乡");
    const saberPanel = combatPanel(saber, []);
    expect(saberPanel.defense).toBeGreaterThanOrEqual(400);
    expect(saberPanel.hp).toBeGreaterThanOrEqual(6000);
    expect(saberPanel.hp).toBeLessThan(50000);

    const maxedSaber = { ...saber, level: 90, rings: ["exclusive-7", "exclusive-8", "exclusive-9"] };
    const maxedSaberWeapon = {
      ...weaponCatalog.find((w) => w.signatureFor === "saber")!,
      level: 90,
      refinement: 5,
      ownerId: "saber",
    };
    const maxedSaberPanel = combatPanel(maxedSaber, [maxedSaberWeapon]);
    expect(maxedSaberPanel.defense).toBeGreaterThan(saberPanel.defense);
    expect(maxedSaberPanel.hp).toBeGreaterThan(saberPanel.hp);
  });

  it("enables characterMember and characterFormation to resolve FGO heroes directly", () => {
    const member = characterMember("gilgamesh", "time", 2);
    expect(member.slot).toBe("carry1");
    expect(member.constellation).toBe(2);
    expect(member.specialties).toContain("time");

    const fgoTeam = characterFormation(
      "time",
      ["saber", "sakura", "gilgamesh", "archer", "rin"],
      [0, 0, 0, 0, 0]
    );
    expect(fgoTeam.members).toHaveLength(5);
    const sim = simulateFormation(fgoTeam, teamBoss(NEUTRAL_BOSS), 12);
    expect(sim.damage).toBeGreaterThan(9_000_000);
  });
});
