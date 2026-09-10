import { describe, expect, it } from "vitest";
import {
  wuwaCompanions,
  WUWA_HERO_LORE,
  WUWA_END_FORMATION,
  WUWA_SWAPPED_END_FORMATION,
  WUWA_CONSTELLATIONS,
  WUWA_COMBAT_KITS,
  WUWA_FOUR_STAR_CHARACTERS,
  WUWA_CHARACTERS_MAP,
} from "../data/wuwaCollab";
import { companionCatalog, weaponCatalog, getCompanionById } from "../data/catalog";
import { simulateFormation, teamBoss, validateFormation } from "./formationMath";
import { BOSSES, NEUTRAL_BOSS } from "../data/combat";
import { numericKit, constellationNodes, combatPanel } from "./rosterCombat";
import { characterMember, characterFormation } from "./fourStarCharacters";

describe("Wuthering Waves Collaboration - End Path Integration", () => {
  it("registers all five Wuthering Waves companions with correct attributes and End Path", () => {
    expect(wuwaCompanions).toHaveLength(5);
    const ids = ["yuno", "shorekeeper", "phrolova", "cantarella", "xinyuehu"];
    for (const id of ids) {
      const c = getCompanionById(id);
      expect(c).toBeDefined();
      expect(c!.path).toBe("end");
      expect(c!.realm).toBeDefined();
      expect(c!.soulName).toBeDefined();
      expect(c!.quotes?.length).toBeGreaterThan(0);
      expect(WUWA_HERO_LORE[id]).toBeDefined();
    }

    // Role and slot checks
    expect(getCompanionById("yuno")?.role).toBe("guardian");
    expect(getCompanionById("shorekeeper")?.role).toBe("support");
    expect(getCompanionById("phrolova")?.role).toBe("striker");
    expect(getCompanionById("cantarella")?.role).toBe("striker");
    expect(getCompanionById("xinyuehu")?.role).toBe("mystic");
  });

  it("registers five signature weapons with correct passives based on original weapons", () => {
    const weaponIds = ["w-yuno", "w-shorekeeper", "w-phrolova", "w-cantarella", "w-xinyuehu"];
    for (const wid of weaponIds) {
      const w = weaponCatalog.find((item) => item.id === wid);
      expect(w).toBeDefined();
      expect(w?.rarity).toBe("5星");
      expect(w?.signatureFor).toBeDefined();
      expect(w?.passive).toContain("攻击+18%、伤害系数+8%");
      expect(w?.passive).toContain("敌方生命低于30%时，本命持有者直接伤害再提高10%");
    }

    expect(weaponCatalog.find((w) => w.id === "w-phrolova")?.name).toBe("幽冥的忘忧章");
    expect(weaponCatalog.find((w) => w.id === "w-cantarella")?.name).toBe("海的呢喃");
    expect(weaponCatalog.find((w) => w.id === "w-shorekeeper")?.name).toBe("星序协响");
    expect(weaponCatalog.find((w) => w.id === "w-yuno")?.name).toBe("万物持存的注释");
    expect(weaponCatalog.find((w) => w.id === "w-xinyuehu")?.name).toBe("桂月弦");
  });

  it("validates the standard Wuthering Waves End Formation", () => {
    expect(() => validateFormation(WUWA_END_FORMATION)).not.toThrow();
    expect(WUWA_END_FORMATION.path).toBe("end");
    expect(WUWA_END_FORMATION.members).toHaveLength(5);

    const slots = WUWA_END_FORMATION.members.map((m) => m.slot);
    expect(slots).toEqual(["tank", "healer", "carry1", "carry2", "specialist"]);

    for (const m of WUWA_END_FORMATION.members) {
      expect(m.specialties).toContain("end");
    }
  });

  it("simulates 12 rounds on neutral boss within canonical End Path balance range", () => {
    const sim = simulateFormation(WUWA_END_FORMATION, teamBoss(NEUTRAL_BOSS), 12);
    expect(sim.survivors).toBe(5);
    expect(sim.rounds).toBe(12);

    // Target range for C0 12-round damage in 250x scale is ~9.0M - ~11.0M (canonical end ~9.5M)
    expect(sim.damage).toBeGreaterThan(9_000_000);
    expect(sim.damage).toBeLessThan(11_000_000);
  });

  it("handles constellation progression from C0 to C2 to C6 monotonically and stably", () => {
    // C0 simulation
    const simC0 = simulateFormation(WUWA_END_FORMATION, teamBoss(NEUTRAL_BOSS), 12);

    // Focused C2 main carry simulation
    const teamC2 = {
      path: "end" as const,
      members: WUWA_END_FORMATION.members.map((m) => ({
        ...m,
        constellation: m.slot === "carry1" ? 2 : 0,
      })),
    };
    const simC2 = simulateFormation(teamC2, teamBoss(NEUTRAL_BOSS), 12);

    // Maxed C6 full team simulation
    const teamC6 = {
      path: "end" as const,
      members: WUWA_END_FORMATION.members.map((m) => ({
        ...m,
        constellation: 6,
      })),
    };
    const simC6 = simulateFormation(teamC6, teamBoss(NEUTRAL_BOSS), 12);

    expect(simC2.damage).toBeGreaterThan(simC0.damage);
    expect(simC6.damage).toBeGreaterThan(simC2.damage);

    // C6 total damage is ~125% - ~165% of C0 (stable budget progression)
    const ratio = simC6.damage / simC0.damage;
    expect(ratio).toBeGreaterThan(1.25);
    expect(ratio).toBeLessThan(1.65);
  });

  it("survives and performs across all eight boss rules, achieving victory", () => {
    for (const boss of BOSSES) {
      const sim = simulateFormation(WUWA_END_FORMATION, teamBoss(boss), 12);
      expect(sim.survivors).toBeGreaterThanOrEqual(4);
      expect(sim.damage).toBeGreaterThan(7_000_000);

      const clear = simulateFormation(WUWA_END_FORMATION, teamBoss(boss), 100);
      expect(clear.outcome).toBe("win");
      expect(clear.survivors).toBeGreaterThanOrEqual(4);
    }
  });

  it("validates and simulates the alternative swapped formation (Cantarella Carry1, Phrolova Carry2)", () => {
    expect(() => validateFormation(WUWA_SWAPPED_END_FORMATION)).not.toThrow();
    const sim = simulateFormation(WUWA_SWAPPED_END_FORMATION, teamBoss(NEUTRAL_BOSS), 12);
    expect(sim.survivors).toBe(5);
    expect(sim.damage).toBeGreaterThan(9_000_000);
  });

  it("integrates with rosterCombat and displays customized WuWa kits and constellations", () => {
    const phrolova = getCompanionById("phrolova")!;
    const kit = numericKit(phrolova);
    expect(kit).toBeDefined();
    expect(kit.id).toBe("phrolova");

    const nodes = constellationNodes(phrolova);
    expect(nodes).toHaveLength(6);
    expect(nodes[0].effect).toContain("遗落的节拍");
    expect(nodes[1].effect).toContain("失序的回响");
    expect(nodes[5].effect).toContain("永恒的乐章");

    const panel = combatPanel(phrolova, []);
    expect(panel.attack).toBeGreaterThan(50_000);
    expect(panel.hp).toBeGreaterThan(800_000);

    const maxedPhrolova = {
      ...phrolova,
      level: 90,
      rings: ["exclusive-7", "exclusive-8", "exclusive-9"],
    };
    const maxedWeapon = {
      ...weaponCatalog.find((w) => w.signatureFor === "phrolova")!,
      level: 90,
      refinement: 5,
      ownerId: "phrolova",
    };
    const maxedPanel = combatPanel(maxedPhrolova, [maxedWeapon]);
    expect(maxedPanel.attack).toBeGreaterThan(panel.attack);
    expect(maxedPanel.attack / combatPanel({...maxedPhrolova, rings:[]}, [maxedWeapon]).attack).toBeLessThan(1.1);
    expect(maxedPanel.hp).toBeGreaterThan(panel.hp);

    const yuno = getCompanionById("yuno")!;
    const yunoNodes = constellationNodes(yuno);
    expect(yunoNodes[1].effect).toContain("弦月生辉");
    const yunoPanel = combatPanel(yuno, []);
    expect(yunoPanel.defense).toBeGreaterThanOrEqual(400);
    expect(yunoPanel.hp).toBeGreaterThanOrEqual(2_000_000);

    const maxedYuno = {
      ...yuno,
      level: 90,
      rings: ["exclusive-7", "exclusive-8", "exclusive-9"],
    };
    const maxedYunoWeapon = {
      ...weaponCatalog.find((w) => w.signatureFor === "yuno")!,
      level: 90,
      refinement: 5,
      ownerId: "yuno",
    };
    const maxedYunoPanel = combatPanel(maxedYuno, [maxedYunoWeapon]);
    expect(maxedYunoPanel.defense).toBeGreaterThan(yunoPanel.defense);
    expect(maxedYunoPanel.hp).toBeGreaterThan(yunoPanel.hp);
  });

  it("enables characterMember and characterFormation to resolve WuWa heroes directly", () => {
    const member = characterMember("phrolova", "end", 2);
    expect(member.slot).toBe("carry1");
    expect(member.constellation).toBe(2);
    expect(member.specialties).toContain("end");

    const wuwaTeam = characterFormation(
      "end",
      ["yuno", "shorekeeper", "phrolova", "cantarella", "xinyuehu"],
      [0, 0, 0, 0, 0]
    );
    expect(wuwaTeam.members).toHaveLength(5);
    const sim = simulateFormation(wuwaTeam, teamBoss(NEUTRAL_BOSS), 12);
    expect(sim.damage).toBeGreaterThan(9_000_000);
  });
});
