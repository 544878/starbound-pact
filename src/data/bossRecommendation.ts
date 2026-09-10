import type { PathId } from "../domain/combat";
import type { Companion } from "../domain/types";
import {
  FORMATION_THEMES,
  getCompanionPrimaryPath,
  getCompanionAdaptedPath,
} from "./formationTheme";
import type { EncounterBoss } from "./encounters";

export interface BossTacticProfile {
  bossId: PathId | string;
  name: string;
  counterPath: PathId;
  weakness: string;
  strategyTitle: string;
  tacticKey: string;
  reason: string;
  signatureLineup: string[]; // 推荐核心代表阵容ID
}

export const BOSS_TACTIC_PROFILES: Record<string, BossTacticProfile> = {
  inverse: {
    bossId: "inverse",
    name: "苍穹暴风领主",
    counterPath: "flame",
    weakness: "fire",
    strategyTitle: "持续灼烧 · 烈焰融甲",
    tacticKey: "破盾融甲",
    reason:
      "领主拥有30%直伤抗性，但持续伤害抗性降低15%且弱火！极炎持续灼烧能直接穿透直伤抗性，火系角色破盾双倍提速。",
    signatureLineup: ["R5-004", "R4-012", "R4-020", "R4-026", "kael"],
  },
  memory: {
    bossId: "memory",
    name: "断响海皇",
    counterPath: "mortal",
    weakness: "flora",
    strategyTitle: "众生同心 · 森木破潮",
    tacticKey: "均衡克制",
    reason:
      "海皇追击抗性高达50%，但持续抗性降低15%且弱森！红尘同心阵拥有均衡生命续航，森系角色破盾迅速。",
    signatureLineup: ["R5-002", "R4-010", "R4-018", "R4-025", "mira"],
  },
  flame: {
    bossId: "flame",
    name: "焚界龙骸",
    counterPath: "dream",
    weakness: "water",
    strategyTitle: "水月幻镜 · 极速爆杀",
    tacticKey: "极境暴击",
    reason:
      "龙骸持续抗性高达50%且攻击逐轮暴涨，必须速战速决！梦境极境直伤暴击配合弱水克制，迅速破盾截杀。",
    signatureLineup: ["R5-005", "R4-013", "R4-021", "R4-027", "selene"],
  },
  desire: {
    bossId: "desire",
    name: "枯荣司祭",
    counterPath: "inverse",
    weakness: "light",
    strategyTitle: "逆鳞天誓 · 金辉反震",
    tacticKey: "反伤护盾",
    reason:
      "司祭施加70%重度禁疗，直接治疗几乎失效！逆道阵法凭借坚固护盾与巨额反伤，配合光属性弱点克制稳操胜券。",
    signatureLineup: ["R5-001", "R4-009", "R4-017", "R4-025", "alden"],
  },
  dream: {
    bossId: "dream",
    name: "无相天君",
    counterPath: "memory",
    weakness: "shadow",
    strategyTitle: "暗夜回响 · 连携破相",
    tacticKey: "多段追击",
    reason:
      "天君大幅压制40%暴击率，但追击抗性降低20%且弱暗！记忆连携回响无视暴击压制，暗系多段追击瞬破敌势。",
    signatureLineup: ["R5-006", "R4-014", "R4-022", "R4-027", "noctis"],
  },
  end: {
    bossId: "end",
    name: "残照刑天",
    counterPath: "end",
    weakness: "wind",
    strategyTitle: "乘风决绝 · 残血终裁",
    tacticKey: "死线斩杀",
    reason:
      "刑天直接抗性为负(-12%)且弱风，残血存在斩杀窗口！终末阵法高额爆发在敌方血量低于30%时触发决绝斩杀。",
    signatureLineup: ["yuno", "shorekeeper", "phrolova", "cantarella", "lumi"],
  },
  time: {
    bossId: "time",
    name: "迟滞命轮",
    counterPath: "time",
    weakness: "fire",
    strategyTitle: "时轮重构 · 烈火破阵",
    tacticKey: "周期爆发",
    reason:
      "命轮反伤抗性为负(-40%)且弱火，同时具备高追击抗性！时序阵法周期增伤配合火系技能双倍削减护盾。",
    signatureLineup: ["R5-008", "R4-016", "R4-030", "R4-012", "kael"],
  },
  mortal: {
    bossId: "mortal",
    name: "覆天古主",
    counterPath: "desire",
    weakness: "light",
    strategyTitle: "易伤侵蚀 · 圣光贯顶",
    tacticKey: "易伤吸血",
    reason:
      "古主防御极高但易伤抗性降低50%(-50%)且弱光！色欲花庭施加巨额易伤与吸血续航，光系爆发轻松破阵。",
    signatureLineup: ["R5-003", "R4-011", "R4-019", "R4-028", "astra"],
  },
};

export interface BossOptimalRecommendation {
  bossId: string;
  bossName: string;
  weakness: string;
  counterPath: PathId;
  strategyTitle: string;
  tacticKey: string;
  reason: string;
  optimalCompanions: Companion[];
  optimalIds: string[];
}

/**
 * 针对指定首领及玩家当前已拥有的同行者，计算并推荐最优的5人出战阵容与克制阵法
 */
export function getBossOptimalRecommendation(
  encounter: { boss: EncounterBoss; path?: PathId },
  ownedCompanions: Companion[]
): BossOptimalRecommendation {
  const boss = encounter.boss;
  const profile: BossTacticProfile = boss.towerFloor && boss.art
    ? {
        bossId: `tower-${boss.towerFloor}`, name: boss.name,
        counterPath: boss.towerFloor <= 5 ? 'memory' : boss.towerFloor <= 11 ? 'end' : boss.towerFloor === 13 ? 'mortal' : 'inverse',
        weakness: boss.weakness, strategyTitle: boss.towerFloor <= 5 ? '范围清场 · 连携破阵' : boss.towerFloor <= 11 ? '弱点破盾 · 单核爆发' : '守护分担 · 稳定续航',
        tacticKey: '深境应对', reason: boss.hint, signatureLineup: [],
      }
    : BOSS_TACTIC_PROFILES[boss.id] ?? BOSS_TACTIC_PROFILES.mortal;

  const counterPath = profile.counterPath;
  const weakness = boss.weakness || profile.weakness;

  // 为玩家当前已拥有的角色打分
  const scored = ownedCompanions.map((comp) => {
    let score = 0;
    const primary = getCompanionPrimaryPath(comp);
    const adapted = getCompanionAdaptedPath(comp);

    // 1. 弱点属性克制破盾加成（破盾翻倍）
    if (comp.element === weakness) {
      score += 65;
    }

    // 2. 阵法契合度加成（专精 > 适配）
    if (primary === counterPath) {
      score += 55;
    } else if (adapted === counterPath) {
      score += 35;
    }

    // 3. 官方代表签名克制推荐成员
    if (profile.signatureLineup.includes(comp.id)) {
      score += 45;
    }

    // 4. 战力与等级基准
    score += (comp.power || 0) / 100;
    score += (comp.level || 1) * 0.5;

    // 5. 稀有度微量权重
    if (comp.rarity === "5星") score += 5;

    return { comp, score };
  });

  // 按得分从高到低排序
  scored.sort((a, b) => b.score - a.score);

  // 选取得分最高的5位角色
  const chosenCompanions = scored.slice(0, 5).map((item) => item.comp);
  const optimalIds = chosenCompanions.map((comp) => comp.id);

  return {
    bossId: boss.id,
    bossName: boss.name,
    weakness,
    counterPath,
    strategyTitle: profile.strategyTitle,
    tacticKey: profile.tacticKey,
    reason: profile.reason,
    optimalCompanions: chosenCompanions,
    optimalIds,
  };
}
