import { skillMultiplier } from "./progression";
import type { Companion, Weapon } from "../domain/types";
import type { PathId } from "../domain/combat";
import { COMBAT_PATHS } from "../data/combat";
import { PATH_BUFFS } from "../data/formationMath";
import { FORMATION_SLOTS } from "../domain/formationMath";
import { damageChannels, defenseMultiplier } from "./combatMath";
import { stats } from "./growth";
import { getEncounter, type EncounterBoss } from "../data/encounters";
import type { UnitStats } from "./growth";
import { bossAttack } from "./combatMath";
import { affinity, combatMember, numericKit } from "./rosterCombat";
import type { EquippedCombatKit } from "../domain/fourStar";
import { skillNames } from "../data/skillNames";

export const ROLE_NAMES = ["抗伤", "治疗", "主攻", "协攻", "专辅"];
export const PATH_COLORS: Record<PathId, string> = {
  inverse: "#8bbfff",
  mortal: "#efd29a",
  desire: "#eb95b9",
  flame: "#ff9d5b",
  dream: "#cbb0ff",
  memory: "#8ce4e2",
  end: "#d0a4ff",
  time: "#a0ccff",
};
export type Command = "basic" | "skill" | "ultimate";
export interface Fighter {
  companion: Companion;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  energy: number;
  healing: number;
  growth: UnitStats;
  hits: number;
  kit: EquippedCombatKit;
  affinity: number;
  supportPower: number;
}
export interface DualBossState {
  boss: EncounterBoss;
  hp: number;
  maxHp: number;
  shield: number;
  phase: number;
  isEnraged: boolean;
}

export interface AstralBattle {
  boss: EncounterBoss;
  shield: number;
  phase: number;
  resolve: "self" | "team" | undefined;
  units: Fighter[];
  path: PathId;
  bossHp: number;
  bossMaxHp: number;
  round: number;
  active: number;
  points: number;
  guard: boolean;
  empowered: boolean;
  lastHealing: boolean;
  lastHit: boolean;
  roundHealing: number;
  openingRatio: number;
  actions: number;
  totalDamage: number;
  outcome: "playing" | "win" | "loss";
  log: string[];
  waveIndex: number;
  maxWaves: number;
  waveBosses: EncounterBoss[];
  dualBoss?: DualBossState;
  targetBossIndex: number;
  minions: Array<{
    id: string;
    name: string;
    art: string;
    hp: number;
    maxHp: number;
    attack: number;
  }>;
  chargeInterrupted: boolean;
}
export interface BattleEvent {
  targets?: Array<{ index: number; damage: number }>;
  area?: boolean;
  actor: number;
  kind: Command | "enemy";
  title: string;
  effect: string;
  tone: "basic" | "attack" | "heal" | "support" | "guard" | "enemy";
  healingByUnit: number[];
  buffed: number[];
  damage: number;
  pursuit: number;
  dot: number;
  healing: number;
  reflected: number;
  incoming: number[];
  linked: boolean;
}

/** This playable encounter uses existing growth and damage channels at encounter scale.
 * Five duties and signature conditions follow formationMath; it does not replace its balance simulator. */
export function createAstralBattle(
  companions: Companion[],
  weapons: Weapon[],
  path: PathId = "mortal",
  boss: EncounterBoss = getEncounter().boss,
  resolve?: "self" | "team",
): AstralBattle {
  const pool = companions.slice(0, 5);
  // Assign duties by existing roles, without changing the saved formation or character identities.
  const take = (test: (c: Companion) => boolean) => {
    const at = pool.findIndex(test);
    return pool.splice(Math.max(0, at), 1)[0];
  };
  const ordered = FORMATION_SLOTS.map((slot) =>
    take((c) => numericKit(c).slot === slot),
  ).filter(Boolean);
  const units = ordered.map((companion, i) => {
    const s = stats(companion, weapons);
    const member = combatMember(companion, weapons, path);
    const kit = member.combatKit!;
    const a = affinity(companion, path);
    // A misplaced character keeps their own kit; it does not gain another role's skills.
    const correctDuty = member.slot === FORMATION_SLOTS[i];
    return {
      companion,
      hp: kit.stats.hp,
      maxHp: kit.stats.hp,
      attack: kit.stats.attack * (0.65 + 0.35 * a),
      defense: kit.stats.defense * (boss.towerFloor === 14 ? 1.4 : 1),
      energy: 50,
      healing:
        (0.75 + 0.25 * a) * (1 + kit.supportBonuses[companion.constellation]),
      growth: s,
      hits: 0,
      kit,
      affinity: a,
      supportPower: correctDuty
        ? 1 + kit.supportBonuses[companion.constellation]
        : 0,
    };
  });
  const waveBosses =
    boss.bossWave && boss.bossWave.length > 0 ? boss.bossWave : [boss];
  const activeBoss = waveBosses[0];
  const dualBoss: DualBossState | undefined = boss.dualBoss
    ? {
        boss: boss.dualBoss,
        hp: boss.dualBoss.hp,
        maxHp: boss.dualBoss.hp,
        shield: boss.dualBoss.shield,
        phase: 1,
        isEnraged: false,
      }
    : undefined;
  const bossMaxHp = activeBoss.hp;
  return {
    boss: activeBoss,
    shield: activeBoss.shield,
    phase: 1,
    resolve,
    units,
    path,
    bossHp: bossMaxHp,
    bossMaxHp,
    round: 1,
    active: 0,
    points: 3,
    guard: false,
    empowered: false,
    lastHealing: false,
    lastHit: false,
    roundHealing: 0,
    openingRatio: 1,
    actions: 0,
    totalDamage: 0,
    outcome: units.length === 5 ? "playing" : "loss",
    log: [
      activeBoss.hint,
      waveBosses.length > 1
        ? `【三王连决】首领连战启动！第1/3席：${activeBoss.name} 降临！`
        : dualBoss
          ? `【双神同临】无相天君与覆天古主同台并肩作战！`
          : resolve === "self"
            ? "独行之志：星璃伤害 +12%"
            : resolve === "team"
              ? "同行之誓：全阵承伤 −8%"
              : "五人入阵 · 星契已连结",
    ],
    waveIndex: 0,
    maxWaves: waveBosses.length,
    waveBosses,
    dualBoss,
    targetBossIndex: 0,
    minions: (activeBoss.minions ?? []).map((m) => ({ ...m, maxHp: m.hp })),
    chargeInterrupted: false,
  };
}
/** Stable battlefield slots: primary 0, second boss 1, minions 2+. */
export function battleEnemies(b: AstralBattle) {
  return [
    {
      index: 0,
      name: b.boss.name,
      art: b.boss.art ?? `/assets/bosses/${b.boss.id}.png`,
      hp: b.bossHp,
      maxHp: b.bossMaxHp,
      shield: b.shield,
    },
    ...(b.dualBoss
      ? [
          {
            index: 1,
            name: b.dualBoss.boss.name,
            art:
              b.dualBoss.boss.art ?? `/assets/bosses/${b.dualBoss.boss.id}.png`,
            hp: b.dualBoss.hp,
            maxHp: b.dualBoss.maxHp,
            shield: b.dualBoss.shield,
          },
        ]
      : []),
    ...b.minions.map((m, i) => ({ ...m, index: i + 2, shield: 0 })),
  ];
}
export function setBattleTarget(b: AstralBattle, target: number): AstralBattle {
  if (
    b.outcome !== "playing" ||
    b.active === 5 ||
    !battleEnemies(b).some((e) => e.index === target && e.hp > 0)
  )
    return b;
  return { ...b, targetBossIndex: target };
}
/** Character kit, independent of the formation slot. Normal attacks stay single-target. */
export function isAreaAttack(u: Fighter, command: Command) {
  const slot = numericKit(u.companion).slot;
  return (
    command !== "basic" && (slot === "carry2" || u.companion.role === "mystic")
  );
}
export function formationLink(b: AstralBattle) {
  const a = (i: number) => (b.units[i]?.hp > 0 ? b.units[i].affinity : 0);
  return Math.min(
    0.45,
    0.06 * a(0) * b.units[0].supportPower +
      0.06 * a(1) * b.units[1].supportPower +
      0.1 * Math.min(a(2), a(3)) +
      0.2 * a(4) * b.units[4].supportPower,
  );
}
export function signatureActive(b: AstralBattle) {
  const alive = (i: number) => b.units[i]?.hp > 0 && b.units[i].affinity > 0;
  if (
    !alive(4) ||
    !b.units[4].supportPower ||
    b.units[4].kit.mechanicPath !== b.path
  )
    return false;
  switch (b.path) {
    case "inverse":
      return b.lastHit;
    case "mortal":
      return alive(0) && alive(1);
    case "desire":
      return b.lastHealing;
    case "flame":
      return b.round >= 3;
    case "dream":
      return b.units.some(
        (u, i) =>
          (i === 2 || i === 3) &&
          alive(i) &&
          u.kit.stats.crit - b.boss.critSuppression >= 0.4,
      );
    case "memory":
      return b.round >= 3 && alive(2) && alive(3);
    case "end":
      return b.openingRatio <= 0.5;
    case "time":
      return b.round % 3 === 0;
  }
}
export function canCommand(b: AstralBattle, command: Command) {
  return (
    b.outcome === "playing" &&
    b.active < 5 &&
    b.units[b.active]?.hp > 0 &&
    (command !== "skill" || b.points > 0) &&
    (command !== "ultimate" || b.units[b.active].energy >= 100)
  );
}
export function actionPresentation(
  u: Fighter,
  command: Command,
  boss?: EncounterBoss,
) {
  const enhanced = command !== "basic";
  const index = command === "basic" ? 0 : command === "skill" ? 1 : 2;
  let effect = `${isAreaAttack(u, command) ? "群攻 · 全体敌人" : "单攻 · 选中敌人"} · ${Math.round(u.kit.actionCoefficients[index] * 100)}%直接伤害`;
  let tone: BattleEvent["tone"] = enhanced ? "attack" : "basic";
  if (enhanced && u.supportPower > 0) {
    if (numericKit(u.companion).slot === "tank") {
      effect = "全队含自身减伤15% · 至敌方行动结束";
      tone = "guard";
    }
    if (numericKit(u.companion).slot === "healer") {
      const amount =
        (command === "ultimate" ? 12 : 6) *
        u.healing *
        (1 - (boss?.healingSuppression ?? 0));
      effect = `全队含自身回复${Number(amount.toFixed(1))}%最大生命`;
      tone = "heal";
    }
    if (numericKit(u.companion).slot === "specialist") {
      effect = "强化自身本次攻击 · 强化下一组双攻（适配折算）";
      tone = "support";
    }
  }
  return { name: skillNames(u.companion)[index], effect, tone };
}
export function resolveAstralAction(
  current: AstralBattle,
  command: Command = "basic",
): { battle: AstralBattle; event: BattleEvent } | null {
  const enemy = current.active === 5;
  if (
    current.outcome !== "playing" ||
    (!enemy && !canCommand(current, command))
  )
    return null;
  const b: AstralBattle = {
    ...current,
    units: current.units.map((u) => ({ ...u })),
    log: [...current.log],
    dualBoss: current.dualBoss ? { ...current.dualBoss } : undefined,
    minions: current.minions.map((m) => ({ ...m })),
    actions: current.actions + 1,
  };
  const e: BattleEvent = {
    actor: b.active,
    kind: enemy ? "enemy" : command,
    title: "",
    effect: "",
    tone: enemy ? "enemy" : "basic",
    healingByUnit: [0, 0, 0, 0, 0],
    buffed: [],
    damage: 0,
    pursuit: 0,
    dot: 0,
    healing: 0,
    reflected: 0,
    incoming: [0, 0, 0, 0, 0],
    linked: false,
  };
  const path = COMBAT_PATHS.find((p) => p.id === b.path)!;

  const signature = signatureActive(b);
  const floor = b.boss.towerFloor;
  const heal = (u: Fighter, amount: number) => {
    if (u.hp > 0) {
      const actual = Math.max(
        0,
        Math.min(
          u.maxHp - u.hp,
          amount *
            (floor === 13 ? 1.35 : 1) *
            (1 - (b.bossHp > 0 ? b.boss.healingSuppression : 0)),
        ),
      );
      u.hp += actual;
      e.healing += actual;
      e.healingByUnit[b.units.indexOf(u)] += actual;
      b.roundHealing += actual;
    }
  };
  // Capture target before damage: kills must not redirect later channels in this action.
  let targetIndex =
    battleEnemies(b).find((t) => t.index === b.targetBossIndex && t.hp > 0)
      ?.index ??
    battleEnemies(b).find((t) => t.hp > 0)?.index ??
    0;
  const hitBoss = (amount: number, target = targetIndex) => {
    const hp =
      target === 0
        ? b.bossHp
        : target === 1
          ? (b.dualBoss?.hp ?? 0)
          : (b.minions[target - 2]?.hp ?? 0);
    const actual = Math.min(hp, Math.max(0, amount));
    if (target === 0) b.bossHp -= actual;
    else if (target === 1 && b.dualBoss) b.dualBoss.hp -= actual;
    else if (b.minions[target - 2]) b.minions[target - 2].hp -= actual;
    const hit = e.targets?.find((t) => t.index === target);
    if (hit) hit.damage += actual;
    else if (actual > 0)
      (e.targets ??= []).push({ index: target, damage: actual });
    return actual;
  };
  const dealBossDamage = (amount: number) =>
    hitBoss(
      amount *
        (targetIndex === 0 && floor === 4
          ? 1 - Math.min(0.75, b.minions.filter((m) => m.hp > 0).length * 0.25)
          : 1),
    );

  if (enemy) {
    const isDualAlive = b.dualBoss && b.dualBoss.hp > 0 && b.bossHp > 0;
    e.title = isDualAlive
      ? `【双神共鸣】${b.boss.name} ＆ ${b.dualBoss!.boss.name}`
      : b.round % 3 === 0
        ? b.boss.phaseName
        : `${b.boss.name}·法则冲击`;
    e.effect = isDualAlive
      ? "双神协同打击 · 攻击全体全阵分担"
      : "攻击全体 · 抗伤位分担伤害";
    // Healer's passive resolves once per round, never revives fallen members.
    if (b.units[1].hp > 0 && b.units[1].supportPower > 0)
      b.units.forEach((u) => heal(u, u.maxHp * 0.03 * b.units[1].healing));
    const alive = b.units.filter((u) => u.hp > 0),
      tank = b.units[0].hp > 0 && b.units[0].supportPower > 0;
    b.units.forEach((u, i) => {
      if (u.hp <= 0) return;
      const share =
        tank && alive.length > 1
          ? i === 0
            ? 0.65
            : 0.35 / (alive.length - 1)
          : 1 / alive.length;
      let rawAttack =
        b.bossHp > 0
          ? bossAttack(b.boss, b.round) *
            (b.phase === 2 ? b.boss.phaseAttack : 1)
          : b.dualBoss
            ? bossAttack(b.dualBoss.boss, b.round) *
              (b.dualBoss.phase === 2 ? b.dualBoss.boss.phaseAttack : 1)
            : 0;
      rawAttack += b.minions
        .filter((m) => m.hp > 0)
        .reduce((n, m) => n + m.attack * (floor === 3 ? 5 : 1), 0);
      if (floor === 8 && b.chargeInterrupted && b.round % 3 === 0)
        rawAttack *= 0.5;
      if (isDualAlive && b.dualBoss) {
        rawAttack =
          rawAttack * 0.55 +
          bossAttack(b.dualBoss.boss, b.round) *
            (b.dualBoss.phase === 2 ? b.dualBoss.boss.phaseAttack : 1) *
            0.55;
      } else if (
        b.dualBoss?.isEnraged ||
        (b.dualBoss && b.dualBoss.hp <= 0 && b.phase === 2)
      ) {
        rawAttack *= 1.25;
      }
      const raw =
        rawAttack *
        (b.resolve === "team" ? 0.92 : 1) *
        share *
        defenseMultiplier(u.defense) *
        (tank
          ? 1 -
            0.08 * (0.75 + 0.25 * b.units[0].affinity) * b.units[0].supportPower
          : 1) *
        (b.guard ? (floor === 14 ? 0.79 : 0.85) : 1) *
        (floor === 16 ? 0.85 : 1) *
        (floor === 11 ? 1.15 : 1);
      const loss = Math.min(u.hp, raw + (floor === 13 ? u.hp * 0.05 : 0));
      u.hp -= loss;
      e.incoming[i] = loss;
      u.energy = Math.min(
        100,
        u.energy +
          12 * u.growth.energyEfficiency * (floor === 17 && i === 0 ? 1.5 : 1),
      );
      if (u.hp > 0)
        e.reflected += hitBoss(
          loss *
            u.kit.stats.reflect *
            (1 +
              (signature && b.path === "inverse"
                ? 0.4 *
                  b.units[4].affinity *
                  b.units[4].supportPower *
                  u.affinity
                : 0)) *
            (1 -
              (b.bossHp > 0
                ? b.boss.reflectResistance
                : (b.dualBoss?.boss.reflectResistance ?? 0))),
        );
    });
    if (floor === 3)
      b.minions.forEach((m) => {
        m.hp = 0;
      });
    if (b.bossHp > 0 && (floor === 3 || (floor === 5 && b.round % 3 === 0))) {
      b.minions.forEach((m) => {
        if (m.hp <= 0) {
          m.hp = m.maxHp;
          b.log.unshift(m.name + " 再次凝聚");
        }
      });
    }
    if ((floor === 14 || floor === 17) && b.guard)
      e.reflected += hitBoss(
        e.incoming.reduce((n, v) => n + v, 0) * (floor === 17 ? 1 : 0.4),
      );
    b.chargeInterrupted = false;
    b.lastHit = e.incoming.some((n) => n > 0);
    b.lastHealing = b.roundHealing > 0;
    b.roundHealing = 0;
    b.guard = false;
    b.round++;
    b.openingRatio = b.bossHp / b.bossMaxHp;
    b.active = 0;
  } else {
    const actor = b.units[b.active],
      enhanced = command !== "basic";
    actor.hits++;
    if (command === "basic") {
      b.points = Math.min(5, b.points + 1);
      actor.energy = Math.min(
        100,
        actor.energy + 25 * actor.growth.energyEfficiency,
      );
    }
    if (command === "skill") {
      b.points--;
      actor.energy = Math.min(
        100,
        actor.energy + 35 * actor.growth.energyEfficiency,
      );
    }
    if (command === "ultimate") actor.energy = 0;
    if (floor === 8 && enhanced && b.active === 2 && targetIndex === 0)
      b.chargeInterrupted = true;
    const targetBoss =
      targetIndex === 1 && b.dualBoss ? b.dualBoss.boss : b.boss;
    const presentation = actionPresentation(actor, command, targetBoss);
    e.title = presentation.name;
    e.effect = presentation.effect;
    e.tone = presentation.tone;
    if (enhanced && b.active === 0 && actor.supportPower > 0) {
      b.guard = true;
      e.buffed = b.units.flatMap((u, i) => (u.hp > 0 ? [i] : []));
    }
    if (enhanced && b.active === 1 && actor.supportPower > 0) {
      b.units.forEach((u) =>
        heal(
          u,
          u.maxHp * (command === "ultimate" ? 0.12 : 0.06) * actor.healing,
        ),
      );
    }
    if (enhanced && b.active === 4 && actor.supportPower > 0) {
      b.empowered = true;
      e.buffed = [2, 3, 4].filter((i) => b.units[i].hp > 0);
    }
    const carry = b.active === 2 || b.active === 3;
    const mechanic = actor.kit.mechanicPath;
    const opening =
      actor.companion.constellation === 6 && actor.kit.openingAtC6;
    const element = actor.companion.element;
    const areaAttack = isAreaAttack(actor, command);
    e.area = areaAttack;
    const targets = areaAttack
      ? battleEnemies(b)
          .filter((t) => t.hp > 0)
          .map((t) => t.index)
      : [targetIndex];
    for (const index of targets) {
      targetIndex = index;
      const targetBoss =
        index === 1 && b.dualBoss
          ? b.dualBoss.boss
          : index >= 2
            ? {
                ...b.boss,
                defense: b.boss.defense * 0.65,
                directResistance: 0,
                pursuitResistance: 0,
                dotResistance: 0,
                critSuppression: 0,
              }
            : b.boss;
      const elementBonus =
        floor === 5 && ["wind", "shadow"].includes(element)
          ? 0.35
          : floor === 13 && ["light", "water"].includes(element)
            ? 0.25
            : 0;
      const critBonus = floor === 5 || floor === 7 ? 0.15 : 0;
      const dualCritSuppression = targetBoss.critSuppression;
      const channels = damageChannels(
        {
          ...path,
          id: mechanic,
          stats: {
            ...actor.kit.stats,
            attack: actor.attack,
            crit: actor.kit.stats.crit + critBonus,
            critDamage:
              actor.kit.stats.critDamage +
              (floor === 11 && b.shield === 0 ? 0.5 : 0),
          },
        },
        {
          ...targetBoss,
          critSuppression: dualCritSuppression,
          defense: targetBoss.defense * (floor === 11 ? 0.8 : 1),
        },
        b.round,
        b.openingRatio,
      );
      if (floor === 1 && areaAttack) channels.direct *= 1.3;
      if (floor === 1) channels.pursuit *= 1.3;
      if (floor === 2) channels.pursuit *= 1.35;
      if (floor === 5 && b.shield === 0) channels.pursuit *= 1.4;
      if (floor === 7 && !areaAttack)
        channels.direct *= 1.3 * (b.shield === 0 ? 1.2 : 1);
      if (floor === 9 && !areaAttack)
        channels.direct *=
          1.35 * (b.round % 3 === 0 && b.active === 2 ? 1.5 : 1);
      if (floor === 16) channels.pursuit *= 1.45;
      if (opening && b.round < 3) {
        channels.dot /= Math.min(b.round / 3, 1);
        if (mechanic === "memory") channels.pursuit /= Math.min(b.round / 3, 1);
      }
      const ownPhase =
        mechanic === "time" && b.round % 3 === 0
          ? 0.45
          : mechanic === "end" && b.openingRatio <= 0.3
            ? 0.25
            : 0;
      const provision =
        b.units[4].hp > 0
          ? b.units[4].affinity * b.units[4].supportPower * actor.affinity
          : 0;
      const directBuff = signature
        ? b.path === "mortal"
          ? 0.08
          : b.path === "desire" ||
              (b.path === "dream" &&
                actor.kit.stats.crit - targetBoss.critSuppression >= 0.4)
            ? 0.12
            : b.path === "end"
              ? 0.2
              : 0
        : 0;
      const pursuitBuff = signature
        ? b.path === "mortal"
          ? 0.12
          : b.path === "memory"
            ? 0.3
            : b.path === "time"
              ? 0.45
              : 0
        : 0;
      const links = carry ? formationLink(b) * actor.affinity : 0;
      const selfSupport =
        enhanced && b.active === 4 ? 0.06 * actor.supportPower : 0;
      const common =
        selfSupport +
        elementBonus +
        links +
        actor.kit.personalBonuses[actor.companion.constellation] +
        (b.empowered && carry ? 0.06 * provision : 0);
      const actionIndex =
        opening && actor.hits === 1
          ? 2
          : command === "ultimate"
            ? 2
            : enhanced
              ? 1
              : 0;
      const multiplier = actor.kit.actionCoefficients[actionIndex] * skillMultiplier(actor.companion, actionIndex);
      const currentShield =
        targetIndex >= 2
          ? 0
          : targetIndex === 1 && b.dualBoss
            ? b.dualBoss.shield
            : b.shield;
      const breakBonus =
        floor === 10
          ? currentShield === 0
            ? 2
            : 0.5
          : currentShield === 0
            ? floor
              ? 1.2
              : 1.08
            : 1;
      e.damage += dealBossDamage(
        (channels.direct / (1 + ownPhase)) *
          multiplier *
          (1 +
            ownPhase +
            common +
            directBuff * provision +
            (b.resolve === "self" && actor.companion.id === "astra"
              ? 0.12
              : 0)) *
          breakBonus,
      );
      e.pursuit += dealBossDamage(
        channels.pursuit * (1 + common + pursuitBuff * provision) * breakBonus,
      );
      e.dot += dealBossDamage(
        channels.dot *
          (1 +
            common +
            (signature && b.path === "flame" ? 0.3 * provision : 0)) *
          breakBonus,
      );
      if (
        floor === 18 &&
        targetBoss.id === "mortal" &&
        currentShield > 0 &&
        actor.hp > 0
      ) {
        const reflected = Math.min(
          actor.hp,
          (e.targets?.find((t) => t.index === index)?.damage ?? 0) * 0.08,
        );
        actor.hp -= reflected;
        e.incoming[b.active] += reflected;
        b.log.unshift("覆天古主 · 坚盾反震");
      }
      if (enhanced) {
        if (
          targetIndex === 1 &&
          b.dualBoss &&
          b.dualBoss.hp > 0 &&
          b.dualBoss.shield > 0
        ) {
          b.dualBoss.shield = Math.max(
            0,
            b.dualBoss.shield -
              (actor.companion.element === b.dualBoss.boss.weakness ? 2 : 1),
          );
          if (b.dualBoss.shield === 0)
            b.log.unshift(
              `${b.dualBoss.boss.name} 法则护盾击破 · 伤害 +${floor ? 20 : 8}%`,
            );
        } else if (targetIndex === 0 && b.bossHp > 0 && b.shield > 0) {
          b.shield = Math.max(
            0,
            b.shield -
              (actor.companion.element === b.boss.weakness ? 2 : 1) *
                (floor === 6
                  ? 2
                  : floor === 12 && actor.companion.element === b.boss.weakness
                    ? 1.5
                    : 1),
          );
          if (b.shield === 0)
            b.log.unshift(`${b.boss.name} 法则护盾击破 · 伤害 +8%`);
        }
      }
    } // Each enemy resolves against its own defense and shield.
    for (let i = 0; i < b.minions.length; i++) {
      const m = b.minions[i];
      if (current.minions[i].hp > 0 && m.hp <= 0) {
        b.log.unshift(m.name + " 已击破");
        if (floor === 1) b.points = Math.min(5, b.points + 1);
        if (floor === 3 && areaAttack)
          e.pursuit += hitBoss(b.bossMaxHp * 0.2, 0);
      }
    }
    heal(
      actor,
      Math.min(
        actor.maxHp * 0.08,
        (e.damage + e.pursuit) * actor.kit.stats.lifesteal,
      ),
    );
    e.linked = carry && formationLink(b) * actor.affinity > 0;
    if (b.active === 3) b.empowered = false;
    b.active++;
  }
  b.totalDamage += e.damage + e.pursuit + e.dot + e.reflected;
  if (b.phase === 1 && b.bossHp > 0 && b.bossHp <= b.bossMaxHp / 2) {
    b.phase = 2;
    b.log.unshift(`${b.boss.phaseName} · 首领攻击 +25%`);
  }
  if (
    b.dualBoss &&
    b.dualBoss.phase === 1 &&
    b.dualBoss.hp > 0 &&
    b.dualBoss.hp <= b.dualBoss.maxHp / 2
  ) {
    b.dualBoss.phase = 2;
    b.log.unshift(`${b.dualBoss.boss.phaseName} · 首领攻击 +25%`);
  }

  // Dual boss enrage:
  if (
    b.dualBoss &&
    b.dualBoss.hp <= 0 &&
    b.bossHp > 0 &&
    !b.dualBoss.isEnraged
  ) {
    b.dualBoss.isEnraged = true;
    b.targetBossIndex = 0;
    b.log.unshift(
      `【孤注狂暴】覆天古主战败！无相天君陷入狂暴，攻击力提高25%！`,
    );
  } else if (
    b.bossHp <= 0 &&
    b.dualBoss &&
    b.dualBoss.hp > 0 &&
    !b.dualBoss.isEnraged
  ) {
    b.dualBoss.isEnraged = true;
    b.targetBossIndex = 1;
    b.log.unshift(
      `【孤注狂暴】无相天君战败！覆天古主进入狂暴，攻击力提高25%！`,
    );
  }

  // Wave Boss Rush progression (打死一个出一个):
  if (
    battleEnemies(b).every((t) => t.hp <= 0) &&
    b.waveIndex < b.maxWaves - 1
  ) {
    b.waveIndex++;
    const nextBoss = b.waveBosses[b.waveIndex];
    b.boss = nextBoss;
    b.bossHp = nextBoss.hp;
    b.bossMaxHp = nextBoss.hp;
    b.shield = nextBoss.shield;
    b.phase = 1;
    b.openingRatio = 1;
    b.minions = (nextBoss.minions ?? []).map((m) => ({ ...m, maxHp: m.hp }));
    b.units.forEach((u) => {
      if (u.hp > 0) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.2);
    });
    b.log.unshift(
      `【首领更替】${nextBoss.name} 携「${nextBoss.phaseName}」降临深塔！(第${b.waveIndex + 1}/${b.maxWaves}席)`,
    );
  }

  while (b.active < 5 && b.units[b.active]?.hp <= 0) b.active++;

  const wavesFinished = b.waveIndex >= b.maxWaves - 1;
  const primaryDead = b.bossHp <= 0;
  const dualDead = !b.dualBoss || b.dualBoss.hp <= 0;
  const won =
    wavesFinished &&
    primaryDead &&
    dualDead &&
    b.minions.every((m) => m.hp <= 0);
  if (!battleEnemies(b).some((t) => t.index === b.targetBossIndex && t.hp > 0))
    b.targetBossIndex = battleEnemies(b).find((t) => t.hp > 0)?.index ?? 0;

  b.outcome = won
    ? "win"
    : b.units.every((u) => u.hp <= 0) || b.round > 60
      ? "loss"
      : "playing";
  const detail = enemy
    ? `承伤 ${Math.round(e.incoming.reduce((n, v) => n + v, 0) * 250).toLocaleString()}${e.reflected ? ` · 反伤 ${Math.round(e.reflected * 250).toLocaleString()}` : ""}`
    : `伤害 ${Math.round((e.damage + e.pursuit + e.dot) * 250).toLocaleString()}${e.healing ? ` · 治疗 ${Math.round(e.healing * 250).toLocaleString()}` : ""}`;
  b.log = [`${e.title} · ${e.effect} · ${detail}`, ...b.log].slice(0, 8);
  return { battle: b, event: e };
}
export { PATH_BUFFS };
