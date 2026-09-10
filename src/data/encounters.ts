import { resourceDungeon } from "./resourceDungeons";
import { BOSSES, NEUTRAL_BOSS } from "./combat";
import { initialStoryChapters, towerFloors } from "./catalog";
import { CHRONICLES } from "./chronicles";
import type { BossRule, PathId } from "../domain/combat";
import type { GameState } from "../domain/types";
export interface EncounterBoss extends BossRule {
  art?: string;
  minions?: EncounterMinion[];
  towerFloor?: number;
  towerBlessing?: string;
  subtitle: string;
  phaseName: string;
  hint: string;
  artIndex: number;
  shield: number;
  phaseAttack: number;
  weakness: string;
  bossWave?: EncounterBoss[];
  dualBoss?: EncounterBoss;
}
export interface EncounterMinion {
  id: string;
  name: string;
  art: string;
  hp: number;
  attack: number;
}
export const enemyArt = (boss: EncounterBoss) =>
  boss.art ?? `/assets/bosses/${boss.id}.png`;
const details: Array<[PathId, string, string, string, string]> = [
  [
    "inverse",
    "苍穹暴风领主",
    "折锋天翼",
    "直接抗性30%，持续抗性−15%；第三轮强攻，提前使用守护战技。",
    "fire",
  ],
  [
    "memory",
    "断响海皇",
    "深海葬歌",
    "追击抗性50%，持续抗性−15%；半血换相后伤害提高。",
    "flora",
  ],
  [
    "flame",
    "焚界龙骸",
    "帝火重燃",
    "持续抗性50%，直接抗性−10%；攻击逐轮增长，速攻更有利。",
    "water",
  ],
  [
    "desire",
    "枯荣司祭",
    "春尽秋杀",
    "治疗压制70%；护盾与反伤能缓解治疗不足。",
    "light",
  ],
  [
    "dream",
    "无相天君",
    "镜界千身",
    "暴击率降低40个百分点，追击抗性−20%；连携攻击更有效。",
    "shadow",
  ],
  [
    "end",
    "残照刑天",
    "无冕裁决",
    "直接抗性−12%；每第三轮强攻，残血时抓住斩杀窗口。",
    "wind",
  ],
  [
    "time",
    "迟滞命轮",
    "因果逆转",
    "追击抗性25%，易伤抗性50%；用反伤和时序爆发破阵。",
    "fire",
  ],
  [
    "mortal",
    "覆天古主",
    "万界崩落",
    "高防御、易伤效果增强；打空护盾后集中输出，半血后攻击提高25%。",
    "light",
  ],
];
export const encounterBosses: EncounterBoss[] = details.map(
  ([id, name, phaseName, hint, weakness], i) => ({
    ...BOSSES.find((b) => b.id === id)!,
    name,
    subtitle: `第${i + 1}天 · 法则执掌者`,
    phaseName,
    hint,
    artIndex: i,
    shield: 3,
    phaseAttack: 1.25,
    weakness,
    hp: 16000 + i * 3000,
    attack: 1000 + i * 140,
  }),
);
const towerMinions: Record<number, EncounterMinion> = {
  1: {
    id: "tide",
    name: "聚散魔裔先锋",
    art: "/assets/abyss/floor-2.png",
    hp: 4200,
    attack: 160,
  },
  2: {
    id: "butterfly",
    name: "巡游幻蝶侍卒",
    art: "/assets/abyss/floor-1.png",
    hp: 4800,
    attack: 180,
  },
  3: {
    id: "thorn",
    name: "自爆藤灵",
    art: "/assets/abyss/thorn.png",
    hp: 2200,
    attack: 220,
  },
  4: {
    id: "mirror",
    name: "镜影幻卒",
    art: "/assets/abyss/mirror.png",
    hp: 6400,
    attack: 240,
  },
  5: {
    id: "phantom",
    name: "风灵幻影",
    art: "/assets/abyss/phantom.png",
    hp: 3600,
    attack: 260,
  },
};
export function getEncounter(encounter?: GameState["encounter"]): {
  title: string;
  cost: number;
  boss: EncounterBoss;
  path: PathId;
} {
  if (encounter?.kind === "resource") {
    const d = resourceDungeon(encounter.id);
    if (d) { const base = encounterBosses[d.boss]; return { title: `${d.title} · ${d.name}`, cost: d.cost, path: base.id, boss: { ...base, name: `${d.name}·守卫`, subtitle: d.title, hp: 12000, attack: 650, shield: 2, hint: `胜利获得${d.reward}。失败不发放奖励。` } }; }
  }
  if (encounter?.kind === "story") {
    const chapter = initialStoryChapters.find((c) =>
      c.stages.some((s) => s.id === encounter.id),
    );
    const stage = chapter?.stages.find((s) => s.id === encounter.id);
    if (stage && chapter) {
      const boss = encounterBosses[chapter.id - 1];
      const finale = stage.id.endsWith("-4");
      return {
        title: stage.title,
        cost: stage.staminaCost,
        boss: {
          ...boss,
          hp: Math.round(boss.hp * (finale ? 1 : 0.65)),
          name: finale ? boss.name : `${boss.name}·投影`,
          shield: finale ? 3 : 1,
        },
        path: CHRONICLES[chapter.id - 1].path,
      };
    }
  }
  if (encounter?.kind === "tower") {
    const floor = towerFloors.find((f) => String(f.floor) === encounter.id);
    if (floor) {
      // Floor 6: Region 1 Boss Rush (3 Bosses)
      if (floor.floor === 6) {
        const b1: EncounterBoss = {
          ...encounterBosses[0], // 苍穹暴风领主
          name: "苍穹暴风领主",
          subtitle: "连战第1席 · 苍穹暴风",
          towerFloor: 6,
          towerBlessing: floor.modifierDesc,
          hp: 15000,
          attack: 1350,
          shield: 2,
          weakness: "fire",
          hint: "首领连战第1席：暴风压迫，火属性战技破盾并在斩杀后迎击次席。",
        };
        const b2: EncounterBoss = {
          ...encounterBosses[1], // 断响海皇
          name: "断响海皇",
          subtitle: "连战第2席 · 断响海皇",
          towerFloor: 6,
          towerBlessing: floor.modifierDesc,
          hp: 16000,
          attack: 1450,
          shield: 2,
          weakness: "flora",
          hint: "首领连战第2席：海皇断响，利用木属性削弱追击。",
        };
        const b3: EncounterBoss = {
          ...encounterBosses[3], // 枯荣司祭
          name: "枯荣司祭",
          subtitle: "连战第3席 · 枯荣司祭",
          towerFloor: 6,
          towerBlessing: floor.modifierDesc,
          hp: 17000,
          attack: 1550,
          shield: 2,
          weakness: "light",
          hint: "首领连战第3席：枯荣禁疗，利用护盾与反伤抗压，光属性终结爆发！",
        };
        return {
          title: `幻生裂隙 6层 · ${floor.title}`,
          cost: 8,
          boss: {
            ...b1,
            bossWave: [b1, b2, b3],
          },
          path: b1.id,
        };
      }

      // Floor 12: Region 2 Boss Rush (3 Bosses)
      if (floor.floor === 12) {
        const b1: EncounterBoss = {
          ...encounterBosses[2], // 焚界龙骸
          name: "焚界龙骸",
          subtitle: "连战第1席 · 焚界龙骸",
          towerFloor: 12,
          towerBlessing: floor.modifierDesc,
          hp: 16000,
          attack: 1450,
          shield: 2,
          weakness: "water",
          hint: "首领连战第1席：持续极炎伤害，水属性快速破除帝火重燃。",
        };
        const b2: EncounterBoss = {
          ...encounterBosses[5], // 残照刑天
          name: "残照刑天",
          subtitle: "连战第2席 · 残照刑天",
          towerFloor: 12,
          towerBlessing: floor.modifierDesc,
          hp: 16500,
          attack: 1550,
          shield: 2,
          weakness: "wind",
          hint: "首领连战第2席：直接抗性偏弱，风属性爆发斩杀！",
        };
        const b3: EncounterBoss = {
          ...encounterBosses[6], // 迟滞命轮
          name: "迟滞命轮",
          subtitle: "连战第3席 · 迟滞命轮",
          towerFloor: 12,
          towerBlessing: floor.modifierDesc,
          hp: 17500,
          attack: 1650,
          shield: 2,
          weakness: "fire",
          hint: "首领连战第3席：时序轮转，利用火属性单体与时序周期集中爆发！",
        };
        return {
          title: `极绝神殿 6层 · ${floor.title}`,
          cost: 8,
          boss: {
            ...b1,
            bossWave: [b1, b2, b3],
          },
          path: b1.id,
        };
      }

      // Floor 18: Region 3 Dual Boss (无相天君 + 覆天古主)
      if (floor.floor === 18) {
        const b1: EncounterBoss = {
          ...encounterBosses[4], // 无相天君
          name: "无相天君",
          subtitle: "双神同临 · 镜界千身",
          towerFloor: 18,
          towerBlessing: floor.modifierDesc,
          hp: 24000,
          attack: 1200,
          shield: 2,
          weakness: "shadow",
          hint: "双神同临：无相天君压制暴击，覆天古主坚盾反震；范围伤害同时波及双神，一方战败另一方狂暴！",
        };
        const b2: EncounterBoss = {
          ...encounterBosses[7], // 覆天古主
          name: "覆天古主",
          subtitle: "双神同临 · 万界崩落",
          towerFloor: 18,
          towerBlessing: floor.modifierDesc,
          hp: 25000,
          attack: 1150,
          shield: 2,
          weakness: "light",
          hint: "双神同临：覆天古主极具威胁，破盾后全队伤害提升。",
        };
        return {
          title: `混沌渊薮 6层 · ${floor.title}`,
          cost: 8,
          boss: {
            ...b1,
            dualBoss: b2,
          },
          path: b1.id,
        };
      }

      // Floors 1-5, 7-11, 13-17: Mobs and Elites
      const mobProfiles: Record<
        number,
        {
          path: PathId;
          weakness: string;
          hp: number;
          attack: number;
          shield: number;
          hint: string;
        }
      > = {
        1: {
          path: "inverse",
          weakness: "wind",
          hp: 28000,
          attack: 550,
          shield: 1,
          hint: "群聚幻蝶，身板较脆；利用群体与范围攻击快速扫荡全场。",
        },
        2: {
          path: "memory",
          weakness: "water",
          hp: 30000,
          attack: 650,
          shield: 1,
          hint: "生命共振魔裔，受到的直接伤害会扩散；保持连携与追击攻击。",
        },
        3: {
          path: "desire",
          weakness: "flora",
          hp: 32000,
          attack: 750,
          shield: 2,
          hint: "伪神执事召唤自爆藤灵；利用群体技能击破自爆藤灵对主将产生真实反噬。",
        },
        4: {
          path: "memory",
          weakness: "light",
          hp: 34000,
          attack: 850,
          shield: 2,
          hint: "人型侍从携群怪提供免伤；先消灭群怪剥除主将免伤，随后集中火力击破。",
        },
        5: {
          path: "inverse",
          weakness: "shadow",
          hp: 36000,
          attack: 1000,
          shield: 2,
          hint: "魔尊半神化身，周期性分裂风灵幻影；使用风与暗属性输出迅速破阵。",
        },
        7: {
          path: "flame",
          weakness: "fire",
          hp: 35000,
          attack: 600,
          shield: 2,
          hint: "重甲侍卫，单体抗性较高；集中单体主攻火力迅速剥落护甲。",
        },
        8: {
          path: "end",
          weakness: "light",
          hp: 38000,
          attack: 750,
          shield: 2,
          hint: "伪神神官点名单体轰击；主攻位单体技能击中目标可大幅减缓其蓄力。",
        },
        9: {
          path: "time",
          weakness: "fire",
          hp: 38000,
          attack: 900,
          shield: 2,
          hint: "虚影魔尊施加单体时空锁；在每3轮主攻爆发加成时施展终结技爆发秒杀。",
        },
        10: {
          path: "flame",
          weakness: "fire",
          hp: 40000,
          attack: 1050,
          shield: 5,
          hint: "伪神主教持有5层极炎护盾，免伤50%；利用火系与主攻快速破盾后伤害翻倍。",
        },
        11: {
          path: "end",
          weakness: "wind",
          hp: 42000,
          attack: 1200,
          shield: 2,
          hint: "单体高额斩杀穿透，防御较低；抗伤位稳固守护，单体主攻全力破盾暴击。",
        },
        13: {
          path: "dream",
          weakness: "light",
          hp: 36000,
          attack: 650,
          shield: 1,
          hint: "暗蚀幽魂造成持续掉血；保持治疗位回复与光属性克制打击。",
        },
        14: {
          path: "mortal",
          weakness: "flora",
          hp: 39000,
          attack: 800,
          shield: 2,
          hint: "重力石偶释放全场震荡；抗伤位守护与防御增益能大幅减轻承伤。",
        },
        15: {
          path: "desire",
          weakness: "shadow",
          hp: 42000,
          attack: 1000,
          shield: 2,
          hint: "咒毒压制50%治疗，但受反伤加成；抗伤位守护与逆道反伤能有效破敌。",
        },
        16: {
          path: "dream",
          weakness: "shadow",
          hp: 44000,
          attack: 1200,
          shield: 2,
          hint: "无相伪神压制暴击；依靠追击与连携阵法联动稳健输出，降低全队承伤。",
        },
        17: {
          path: "mortal",
          weakness: "light",
          hp: 46000,
          attack: 1350,
          shield: 3,
          hint: "攻击随回合递增的终焉魔尊；抗伤位全减伤与阵法反震是破局核心。",
        },
      };

      const profile = mobProfiles[floor.floor] ?? {
        path: "mortal",
        weakness: floor.bossElement,
        hp: 15000 + floor.floor * 1000,
        attack: 600 + floor.floor * 50,
        shield: 2,
        hint: floor.modifierDesc,
      };

      const baseBoss =
        encounterBosses.find((b) => b.id === profile.path) ??
        encounterBosses[0];
      return {
        title: `深塔 ${floor.floor}层 · ${floor.title}`,
        cost: 8,
        boss: {
          ...baseBoss,
          ...NEUTRAL_BOSS,
          id: profile.path,
          art: floor.bossArt,
          defense:
            [180, 220, 280, 320, 340][floor.stageInRegion - 1] +
            (floor.regionId === 2 ? 180 : 0),
          healingSuppression: floor.floor === 15 ? 0.5 : 0,
          critSuppression: floor.floor === 16 ? 0.3 : 0,
          reflectResistance: floor.floor === 15 ? -0.8 : 0,
          pattern:
            floor.floor === 17
              ? "ramp"
              : floor.floor === 8
                ? "burst"
                : "steady",
          minions:
            floor.regionId === 1
              ? Array.from({ length: floor.floor <= 2 ? 3 : 2 }, (_, i) => ({
                  ...towerMinions[floor.floor],
                  id: `${towerMinions[floor.floor].id}-${i}`,
                  name: towerMinions[floor.floor].name,
                  hp: Math.round(
                    towerMinions[floor.floor].hp / (floor.floor <= 2 ? 3 : 2),
                  ),
                  attack:
                    towerMinions[floor.floor].attack /
                    (floor.floor <= 2 ? 3 : 2),
                }))
              : undefined,
          name: floor.bossName,
          subtitle: floor.subtitle ?? `${floor.mechanicTag} · 驻守投影`,
          phaseName: floor.enemyType === "mob" ? "狂暴涌动" : "法则解放",
          towerFloor: floor.floor,
          towerBlessing: floor.modifierDesc,
          hp: profile.hp,
          attack: profile.attack,
          shield: profile.shield,
          weakness: profile.weakness,
          hint: profile.hint,
        },
        path: profile.path,
      };
    }
  }
  return {
    title: "星契演武 · 自由试炼",
    cost: 6,
    boss: {
      ...NEUTRAL_BOSS,
      name: "星骸·守阵者",
      hp: 18000,
      attack: 820,
      subtitle: "五人阵法试炼",
      phaseName: "核心裂变",
      hint: "护盾破碎后全通道伤害提高8%，半血后攻击提高25%。",
      artIndex: 0,
      shield: 3,
      phaseAttack: 1.25,
      weakness: "fire",
    } as EncounterBoss,
    path: "mortal" as PathId,
  };
}
export function stageUnlocked(completed: string[], id: string) {
  const all = initialStoryChapters.flatMap((c) => c.stages);
  const index = all.findIndex((s) => s.id === id);
  return index >= 0 && (index === 0 || completed.includes(all[index - 1].id));
}
