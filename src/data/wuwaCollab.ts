import type { Companion, Realm, Weapon } from "../domain/types";
import type { CombatStats, PathId } from "../domain/combat";
import type {
  EquippedCombatKit,
  FourStarCharacter,
  NumericEquipment,
  NumericSkill,
  NumericConstellation,
} from "../domain/fourStar";
import type { NumericFormation, RoleTemplate, FormationSlot } from "../domain/formationMath";
import { COMBAT_PATHS } from "./combat";
import { COMBAT_POINT_SCALE } from "./combatScale";

const WUWA_PERSONAL_BONUSES: [number, number, number, number, number, number, number] = [
  0, 0.04, 0.22, 0.26, 0.3, 0.39, 0.54,
];
const WUWA_SUPPORT_BONUSES: [number, number, number, number, number, number, number] = [
  0, 0.02, 0.06, 0.08, 0.1, 0.12, 0.18,
];

export interface WuwaConstellationInfo {
  rank: number;
  name: string;
  effect: string;
  personalBonus: number;
  supportBonus: number;
}

export const WUWA_HERO_LORE: Record<
  string,
  {
    realm: Realm;
    path: PathId;
    adaptedPath: PathId;
    faction: string;
    soulName: string;
    weapon: string;
    vow: string;
    weaponModelDesc: string;
    weaponPassiveDesc: string;
  }
> = {
  yuno: {
    realm: "大尊",
    path: "end",
    adaptedPath: "mortal",
    faction: "七丘圣域·月神神谕",
    soulName: "满月永存",
    weapon: "万物持存的注释",
    vow: "在注记翻至终页前，无尽月相皆为你而战。",
    weaponModelDesc:
      "神圣厚重的青金古籍与月环臂铠相映，周身流转月相光华，悬浮满月结界护盾符印。",
    weaponPassiveDesc:
      "存续之注：承伤降低8%；受击时吸收3%伤害并为全队附加坚固结界。",
  },
  shorekeeper: {
    realm: "神使",
    path: "end",
    adaptedPath: "time",
    faction: "黑海岸·繁星指引",
    soulName: "耀星守望",
    weapon: "星序协响",
    vow: "无论旅途有多漫长，黑海岸的灯塔永远指引你的归途。",
    weaponModelDesc:
      "多面纯净星体音感仪，表面环绕着纯白与浅金的解限星轨，中心浮现耀星之蝶的明澈辉光。",
    weaponPassiveDesc:
      "恒实星律：治疗效能提升12%；展开解限星域提供8%暴击率；每轮为生命最低队友额外恢复5%已损生命。",
  },
  phrolova: {
    realm: "帝",
    path: "end",
    adaptedPath: "desire",
    faction: "残星会·幽冥挽歌",
    soulName: "幽冥音符",
    weapon: "幽冥的忘忧章",
    vow: "在这片残破的世界上，唯有终末的乐章永不褪色。",
    weaponModelDesc:
      "深黑与幽紫音律共鸣的悬浮音感仪，环绕失序音符与赫卡忒幽冥暗纹，弥漫毁灭与重生的挽歌回响。",
    weaponPassiveDesc:
      "忘忧挽歌：自身直接伤害与爆发提升18%；攻击时无视目标8%防御；斩杀阶段爆发额外强化。",
  },
  cantarella: {
    realm: "半神",
    path: "end",
    adaptedPath: "memory",
    faction: "深海幻境·织梦呢喃",
    soulName: "蜃境迷梦",
    weapon: "海的呢喃",
    vow: "沉入幻梦吧……那里有大海最深沉的秘密。",
    weaponModelDesc:
      "深海碧蓝与暗紫渐变的晶莹水母音感仪，悬浮在轻盈海沫中，周期性泛起致幻蜃境涟漪。",
    weaponPassiveDesc:
      "深海迷梦：协同追击伤害提升15%；施放技能削减目标5%抗性；双C联动额外提升6%。",
  },
  xinyuehu: {
    realm: "神",
    path: "end",
    adaptedPath: "flame",
    faction: "瑝珑岁主·万相天权",
    soulName: "灵狐万相",
    weapon: "桂月弦",
    vow: "万相归一，狐火焚虚。以岁主之名，为你勘破终局！",
    weaponModelDesc:
      "千年神木与玄机机关铸就的月相鸣琴音感仪，弦动如雷鸣狐火，尾部泛起九尾白狐虚影。",
    weaponPassiveDesc:
      "万相机变：专辅增益效果提升10%；自身施法附加破防共振；全员存活时双C爆伤提高12%。",
  },
};

export const wuwaCompanions: Companion[] = [
  {
    id: "yuno",
    numericId: "WUWA-001",
    name: "优诺",
    title: "七丘谕女 · 满月守护",
    element: "wind",
    role: "guardian",
    rarity: "5星",
    level: 20,
    power: 4250,
    constellation: 0,
    accent: "#60a5fa",
    artPosition: "0% 0%",
    gender: "female",
    persona: "庄严沉静 · 谕世神使",
    biography:
      "七丘的谕女，掌管满月流转与万物持存之理。以坚毅不拔的月相结界化作无懈可击的盾垒，横亘于终末阵线最前排，庇佑所有同行同伴。",
    skills: ["弦月断空", "至臻完满·满月庇护"],
    quotes: [
      "“在注记翻至终页前，无尽月相皆为你而战。”",
      "“月相流转，终会迎来圆满。”",
      "“站在我身后，风暴与终末都无法触及你半分。”",
      "“以此残卷之名，铭刻我们并肩的誓约。”",
    ],
    ...WUWA_HERO_LORE.yuno,
  },
  {
    id: "shorekeeper",
    numericId: "WUWA-002",
    name: "守岸人",
    title: "黑海岸之引 · 繁星神谕",
    element: "light",
    role: "support",
    rarity: "5星",
    level: 20,
    power: 4180,
    constellation: 0,
    accent: "#38bdf8",
    artPosition: "0% 0%",
    gender: "female",
    persona: "清冷博爱 · 星海指引",
    biography:
      "黑海岸的守望者与核心智枢。在无边数据星海中推演一切生机，以解限星域抚平团队创痛，将世界的混乱重构为宁静的繁星秩序。",
    skills: ["实论衍射", "解限星域·繁星归途"],
    quotes: [
      "“无论旅途有多漫长，黑海岸的灯塔永远指引你的归途。”",
      "“星域已解限，请放心前行。”",
      "“数据在流淌，生命的脉动依然如此清澈。”",
      "“黑海岸的微风，会守护你所有的梦境。”",
    ],
    ...WUWA_HERO_LORE.shorekeeper,
  },
  {
    id: "phrolova",
    numericId: "WUWA-003",
    name: "弗洛洛",
    title: "残星音律 · 幽冥挽歌",
    element: "shadow",
    role: "striker",
    rarity: "5星",
    level: 20,
    power: 4380,
    constellation: 0,
    accent: "#a855f7",
    artPosition: "0% 0%",
    gender: "female",
    persona: "优雅狂狷 · 终焉首席",
    biography:
      "残星会的掌舵者之一，操纵赫卡忒降临的湮灭音律大师。将战场的破败谱写为摄人心魄的幽冥挽歌，以无视防御的终极爆发斩断一切顽敌。",
    skills: ["律动轰鸣", "赫卡忒降临·终焉交响"],
    quotes: [
      "“在这片残破的世界上，唯有终末的乐章永不褪色。”",
      "“听到了吗？这是为终结而奏响的挽歌。”",
      "“赫卡忒，让安宁降临在他们身上吧。”",
      "“真正的绝望，是在音符落下的那一刹那。”",
    ],
    ...WUWA_HERO_LORE.phrolova,
  },
  {
    id: "cantarella",
    numericId: "WUWA-004",
    name: "坎特雷拉",
    title: "蜃境惑音 · 织梦水母",
    element: "water",
    role: "striker",
    rarity: "5星",
    level: 20,
    power: 4220,
    constellation: 0,
    accent: "#818cf8",
    artPosition: "0% 0%",
    gender: "female",
    persona: "神秘慵懒 · 惑世迷梦",
    biography:
      "游弋于深海迷雾中的水母歌者。在虚实难辨的蜃境中编织迷离之网，召唤织梦水母穿梭战场协同攻敌，令猎物在惊醒之刻迎来终焉。",
    skills: ["斑驳幻梦", "陷溺·织梦水母"],
    quotes: [
      "“沉入幻梦吧……那里有大海最深沉的秘密。”",
      "“水母在跳舞呢，你也想来一支吗？”",
      "“蜃境深处，一切执念都会化为泡沫。”",
      "“不要挣扎，迷离的潮汐马上就会漫上来。”",
    ],
    ...WUWA_HERO_LORE.cantarella,
  },
  {
    id: "xinyuehu",
    numericId: "WUWA-005",
    name: "心月狐",
    title: "万相岁主 · 机关灵狐",
    element: "light",
    role: "mystic",
    rarity: "5星",
    level: 20,
    power: 4320,
    constellation: 0,
    accent: "#f43f5e",
    artPosition: "0% 0%",
    gender: "female",
    persona: "狡黠威仪 · 天工岁主",
    biography:
      "瑝珑的至高岁主之一，通晓天工机关与万相分形之术。白发红瞳的灵狐化身，操纵狐火印记与月弦破防，为全队点燃终末裁决的制胜之光。",
    skills: ["狐火分形", "岁主天权·九尾裂穹"],
    quotes: [
      "“万相归一，狐火焚虚。以岁主之名，为你勘破终局！”",
      "“机关算尽，皆在妾身掌中运转。”",
      "“灵狐踏月，终末亦是新生的序曲。”",
      "“小家伙，可别小瞧了岁主千百年的智慧。”",
    ],
    ...WUWA_HERO_LORE.xinyuehu,
  },
];

export const WUWA_CONSTELLATIONS: Record<string, WuwaConstellationInfo[]> = {
  phrolova: [
    {
      rank: 1,
      name: "遗落的节拍",
      effect: "优化攻击后摇与循环手感，自身直接与追击加算池累计+4%。",
      personalBonus: 0.04,
      supportBonus: 0,
    },
    {
      rank: 2,
      name: "失序的回响",
      effect:
        "【关键节点】自身加算池累计+22%（较上命提升18%）；强化音符爆击倍率。",
      personalBonus: 0.22,
      supportBonus: 0,
    },
    {
      rank: 3,
      name: "无尽的赋格",
      effect: "共鸣技能与声骸效能飞跃，自身加算池累计+26%。",
      personalBonus: 0.26,
      supportBonus: 0,
    },
    {
      rank: 4,
      name: "幽冥的锁链",
      effect: "自身加算池累计+30%；攻击附加高额无视防御与穿透效果。",
      personalBonus: 0.3,
      supportBonus: 0,
    },
    {
      rank: 5,
      name: "狂乱的谐振",
      effect: "赫卡忒协同输出增幅，自身加算池累计+39%（较上命提升9%）。",
      personalBonus: 0.39,
      supportBonus: 0,
    },
    {
      rank: 6,
      name: "永恒的乐章",
      effect:
        "【质变节点】自身加算池累计+54%；首轮直接释放赫卡忒爆发，开场即享终末满层斩杀增益！",
      personalBonus: 0.54,
      supportBonus: 0,
    },
  ],
  cantarella: [
    {
      rank: 1,
      name: "迷离之汐",
      effect: "施放技能回复迷离，核心伤害倍率提升，自身加算池累计+4%。",
      personalBonus: 0.04,
      supportBonus: 0,
    },
    {
      rank: 2,
      name: "惊醒之潮",
      effect:
        "【关键节点】大幅强化共鸣解放触发【惊醒】爆发，自身加算池累计+22%。",
      personalBonus: 0.22,
      supportBonus: 0,
    },
    {
      rank: 3,
      name: "织梦蜃境",
      effect: "登场直接进入蜃境状态，自身加算池累计+26%。",
      personalBonus: 0.26,
      supportBonus: 0,
    },
    {
      rank: 4,
      name: "溺水之歌",
      effect: "自身加算池累计+30%；织梦水母协同追击无视目标15%抗性与防御。",
      personalBonus: 0.3,
      supportBonus: 0,
    },
    {
      rank: 5,
      name: "幽夜隐帷",
      effect: "全技能伤害倍率提升，自身加算池累计+39%（较上命提升9%）。",
      personalBonus: 0.39,
      supportBonus: 0,
    },
    {
      rank: 6,
      name: "深渊浮现",
      effect:
        "【质变节点】自身加算池累计+54%；共鸣解放期间无视目标30%防御，协同追击峰值启动！",
      personalBonus: 0.54,
      supportBonus: 0,
    },
  ],
  yuno: [
    {
      rank: 1,
      name: "新月启示",
      effect: "优化形态流转，全队承伤减免及双C联动效能累计提升2%。",
      personalBonus: 0.02,
      supportBonus: 0.02,
    },
    {
      rank: 2,
      name: "弦月生辉",
      effect:
        "【关键节点】满月护盾厚度与全队减伤提升6%（基础减伤提升至8.48%）。",
      personalBonus: 0.06,
      supportBonus: 0.06,
    },
    {
      rank: 3,
      name: "持存秘记",
      effect: "职责与联动效能累计提升8%。",
      personalBonus: 0.08,
      supportBonus: 0.08,
    },
    {
      rank: 4,
      name: "七丘金石",
      effect: "全队减伤与联动效能累计提升10%；受击时触发月岩反击。",
      personalBonus: 0.1,
      supportBonus: 0.1,
    },
    {
      rank: 5,
      name: "谕女誓言",
      effect: "效能累计提升12%。",
      personalBonus: 0.12,
      supportBonus: 0.12,
    },
    {
      rank: 6,
      name: "至臻永曜",
      effect:
        "【质变节点】守护减伤与联动效能累计提升18%（全队减伤提升至9.44%，提供双C联动7.08%）；生成至臻满月结界。",
      personalBonus: 0.18,
      supportBonus: 0.18,
    },
  ],
  shorekeeper: [
    {
      rank: 1,
      name: "繁星如诉",
      effect: "星域持续与范围扩充，治疗与联动效能累计提升2%。",
      personalBonus: 0.02,
      supportBonus: 0.02,
    },
    {
      rank: 2,
      name: "幽夜将尽",
      effect:
        "【关键节点】星域内全队攻击力飞跃，全队减伤与联动效能累计提升6%。",
      personalBonus: 0.06,
      supportBonus: 0.06,
    },
    {
      rank: 3,
      name: "执灯相渡",
      effect: "共鸣解放恢复协奏能量，循环加速，治疗效能累计提升8%。",
      personalBonus: 0.08,
      supportBonus: 0.08,
    },
    {
      rank: 4,
      name: "停滞之蝶",
      effect: "有效治疗为目标附加5%减伤护盾，效能累计提升10%。",
      personalBonus: 0.1,
      supportBonus: 0.1,
    },
    {
      rank: 5,
      name: "终焉之歌",
      effect: "星域增益效能累计提升12%。",
      personalBonus: 0.12,
      supportBonus: 0.12,
    },
    {
      rank: 6,
      name: "往日同游",
      effect:
        "【质变节点】全能星域解放！治疗与双C联动累计提升18%（每轮治疗提升至3.54%）；队友濒死时触发耀蝶庇佑翻倍救治。",
      personalBonus: 0.18,
      supportBonus: 0.18,
    },
  ],
  xinyuehu: [
    {
      rank: 1,
      name: "灵狐初醒",
      effect: "专辅Buff与双C联动效能提升2%。",
      personalBonus: 0.02,
      supportBonus: 0.02,
    },
    {
      rank: 2,
      name: "万相分身",
      effect:
        "【关键节点】专辅Buff与联动累计提升6%；【终兆】斩杀阈值前置。",
      personalBonus: 0.06,
      supportBonus: 0.06,
    },
    {
      rank: 3,
      name: "天工机关",
      effect: "专辅效能累计提升8%。",
      personalBonus: 0.08,
      supportBonus: 0.08,
    },
    {
      rank: 4,
      name: "偏谐共鸣",
      effect: "专辅效能累计提升10%；每两轮为主副C注入终末破防电磁爆击。",
      personalBonus: 0.1,
      supportBonus: 0.1,
    },
    {
      rank: 5,
      name: "岁主真容",
      effect: "效能累计提升12%。",
      personalBonus: 0.12,
      supportBonus: 0.12,
    },
    {
      rank: 6,
      name: "九霄月曜",
      effect:
        "【质变节点】专辅Buff与联动累计提升18%（双C联动提升至23.6%）；第三轮双C直接伤害额外提高10%，终末破防提升至峰值！",
      personalBonus: 0.18,
      supportBonus: 0.18,
    },
  ],
};

const endPath = COMBAT_PATHS.find((p) => p.id === "end")!;

/** Combat Kits calibrated for End Path balance; scaled by 250 in combat points. */
export const WUWA_COMBAT_KITS: Record<string, EquippedCombatKit> = {
  // Tank: Yuno
  yuno: {
    stats: {
      ...endPath.stats,
      attack: endPath.stats.attack * 0.12,
      hp: endPath.stats.hp * 2.2 * 1.05,
      defense: 880,
      reflect: 0.08,
      crit: 0.22,
      critDamage: 1.85,
    },
    mechanicPath: "end",
    actionCoefficients: [0.75, 1.0, 1.25],
    personalBonuses: [...WUWA_SUPPORT_BONUSES],
    supportBonuses: [...WUWA_SUPPORT_BONUSES],
    openingAtC6: false,
    linkCoefficient: 0.06,
  },
  // Healer: Shorekeeper
  shorekeeper: {
    stats: {
      ...endPath.stats,
      attack: endPath.stats.attack * 0.10 * 1.1,
      hp: endPath.stats.hp * 1.2 * 1.08,
      defense: 460,
      lifesteal: 0.08,
      crit: 0.25,
      critDamage: 1.95,
    },
    mechanicPath: "end",
    actionCoefficients: [0.75, 1.0, 1.25],
    personalBonuses: [...WUWA_SUPPORT_BONUSES],
    supportBonuses: [...WUWA_SUPPORT_BONUSES],
    openingAtC6: false,
    linkCoefficient: 0.06,
  },
  // Carry1: Phrolova
  phrolova: {
    stats: {
      ...endPath.stats,
      attack: endPath.stats.attack * 1.0,
      hp: endPath.stats.hp * 1.0,
      defense: 350,
      crit: 0.28,
      critDamage: 2.15,
      dot: 0.06,
      pursuit: 0.12,
    },
    mechanicPath: "end",
    actionCoefficients: [0.75, 1.0, 1.25],
    personalBonuses: [...WUWA_PERSONAL_BONUSES],
    supportBonuses: [0, 0, 0, 0, 0, 0, 0],
    openingAtC6: true,
    linkCoefficient: 0.1,
  },
  // Carry2: Cantarella
  cantarella: {
    stats: {
      ...endPath.stats,
      attack: endPath.stats.attack * 0.8,
      hp: endPath.stats.hp * 1.0 * 1.02,
      defense: 360,
      crit: 0.28,
      critDamage: 2.05,
      pursuit: 0.16,
      dot: 0.08,
    },
    mechanicPath: "end",
    actionCoefficients: [1.0, 1.05, 0.95],
    personalBonuses: [...WUWA_PERSONAL_BONUSES],
    supportBonuses: [0, 0, 0, 0, 0, 0, 0],
    openingAtC6: true,
    linkCoefficient: 0.1,
  },
  // Specialist: Xinyuehu
  xinyuehu: {
    stats: {
      ...endPath.stats,
      attack: endPath.stats.attack * 0.18,
      hp: endPath.stats.hp * 1.1,
      defense: 420,
      crit: 0.25,
      critDamage: 2.0,
      pursuit: 0.12,
    },
    mechanicPath: "end",
    actionCoefficients: [0.75, 1.0, 1.25],
    personalBonuses: [...WUWA_SUPPORT_BONUSES],
    supportBonuses: [...WUWA_SUPPORT_BONUSES],
    openingAtC6: false,
    linkCoefficient: 0.2,
  },
};

function createWuwaCharacter(
  id: string,
  slot: FormationSlot,
  specialties: PathId[],
  compatible: PathId[],
  kit: EquippedCombatKit,
  skillNames: [string, string, string],
  roleDesc: string
): FourStarCharacter {
  const target: CombatStats = {
    ...kit.stats,
    attack: kit.stats.attack * COMBAT_POINT_SCALE,
    hp: kit.stats.hp * COMBAT_POINT_SCALE,
  };
  const buffStat: keyof CombatStats = "critDamage";
  const buffAmount = 0.15;
  const baseStats: CombatStats = {
    ...target,
    attack: target.attack * 0.6,
    hp: target.hp * 0.7,
    defense: target.defense * 0.7,
    [buffStat]: target[buffStat] - buffAmount,
  };

  const weapon: NumericEquipment = {
    id: `${id}-W`,
    type: "weapon",
    slot: 0,
    maxed: true,
    age: 100000,
    color: "red",
    flat: { attack: target.attack * 0.25, hp: 0, defense: 0 },
    buff: {
      id: `${id}-W-B`,
      stat: buffStat,
      amount: buffAmount * 0.4,
      specialties,
      compatible,
    },
  };

  const rings = [1, 2, 3].map(
    (index): NumericEquipment => ({
      id: `${id}-R${index}`,
      type: "ring",
      slot: index,
      maxed: true,
      age: 100000,
      color: "red",
      flat: {
        attack: target.attack * 0.05,
        hp: target.hp * 0.1,
        defense: target.defense * 0.1,
      },
      buff: {
        id: `${id}-R${index}-B`,
        stat: buffStat,
        amount: buffAmount * 0.2,
        specialties,
        compatible,
      },
    })
  ) as [NumericEquipment, NumericEquipment, NumericEquipment];

  const constellations: NumericConstellation[] = WUWA_CONSTELLATIONS[id].map(
    (c) => ({
      rank: c.rank,
      personalBonus: c.personalBonus,
      supportBonus: c.supportBonus,
      effect: `${c.name}：${c.effect}`,
    })
  );

  const skills: [NumericSkill, NumericSkill, NumericSkill, NumericSkill] = [
    {
      id: `${id}-S1`,
      kind: "normal",
      target: "oneBoss",
      directCoefficient: kit.actionCoefficients[0],
      description: `第1、4、7…回合使用【${skillNames[0]}】；一次直接攻击，可暴击。`,
    },
    {
      id: `${id}-S2`,
      kind: "skill",
      target: "oneBoss",
      directCoefficient: kit.actionCoefficients[1],
      description: `第2、5、8…回合使用【${skillNames[1]}】；替代普攻，一次直接攻击，可暴击。`,
    },
    {
      id: `${id}-S3`,
      kind: "burst",
      target: "oneBoss",
      directCoefficient: kit.actionCoefficients[2],
      description: `第3、6、9…回合使用【${skillNames[2]}】；替代普攻，一次直接攻击，可暴击。`,
    },
    {
      id: `${id}-S4`,
      kind: "passive",
      target:
        slot === "healer"
          ? "allLivingAllies"
          : slot === "tank"
            ? "self"
            : "bothCarries",
      directCoefficient: 0,
      description: `${roleDesc}满配终末面板：追击系数${Number((target.pursuit * 100).toFixed(4))}%，每次行动最多一次；目标行动前生命≤30%时直接伤害加算25%。`,
    },
  ];

  return {
    id,
    rarity: 4,
    slot,
    specialties,
    compatible,
    mechanicPath: "end",
    progression: null,
    baseStats,
    weapon,
    rings,
    skills,
    exclusiveBuff: {
      id: `${id}-B`,
      link: kit.linkCoefficient,
      description: roleDesc,
      statBonus: null,
    },
    constellations,
  };
}

export const WUWA_FOUR_STAR_CHARACTERS: FourStarCharacter[] = [
  createWuwaCharacter(
    "yuno",
    "tank",
    ["end"],
    ["mortal"],
    WUWA_COMBAT_KITS.yuno,
    ["弦月断空", "越限弦引", "至臻完满·满月庇护"],
    "存活时承担攻击包65%，全队基础减伤8%×职责效能；提供双C联动6%。"
  ),
  createWuwaCharacter(
    "shorekeeper",
    "healer",
    ["end"],
    ["time"],
    WUWA_COMBAT_KITS.shorekeeper,
    ["实论衍射", "浅析星域", "解限星域·繁星归途"],
    "行动结束后每轮治疗所有存活队友各自最大生命3%×职责效能；提供双C联动6%。"
  ),
  createWuwaCharacter(
    "phrolova",
    "carry1",
    ["end"],
    ["desire"],
    WUWA_COMBAT_KITS.phrolova,
    ["音符连奏·序曲", "律动轰鸣·裂隙", "赫卡忒降临·终焉交响"],
    "双C均存活且适配时共享一份10%联动；不能叠成20%。"
  ),
  createWuwaCharacter(
    "cantarella",
    "carry2",
    ["end"],
    ["memory"],
    WUWA_COMBAT_KITS.cantarella,
    ["浮潜幻海·轻掠", "斑驳幻梦·迷离", "陷溺·织梦水母"],
    "双C均存活且适配时共享一份10%联动；不能叠成20%。"
  ),
  createWuwaCharacter(
    "xinyuehu",
    "specialist",
    ["end"],
    ["flame"],
    WUWA_COMBAT_KITS.xinyuehu,
    ["机关雷梭·连发", "狐火万相·分形", "岁主天权·九尾裂穹"],
    "存活时提供双C联动20%；在终末阵法激活专属Buff【终兆】：目标生命低于50%时直接伤害提高20%。"
  ),
];

export const WUWA_CHARACTERS_MAP: Record<string, FourStarCharacter> = Object.fromEntries(
  WUWA_FOUR_STAR_CHARACTERS.map((c) => [c.id, c])
);

export const wuwaRoleTemplates: RoleTemplate[] = [
  {
    slot: "tank",
    kind: "premium",
    constellation: 0,
    specialties: ["end"],
    compatible: ["mortal"],
    combatKit: WUWA_COMBAT_KITS.yuno,
  },
  {
    slot: "healer",
    kind: "premium",
    constellation: 0,
    specialties: ["end"],
    compatible: ["time"],
    combatKit: WUWA_COMBAT_KITS.shorekeeper,
  },
  {
    slot: "carry1",
    kind: "premium",
    constellation: 0,
    specialties: ["end"],
    compatible: ["desire"],
    combatKit: WUWA_COMBAT_KITS.phrolova,
  },
  {
    slot: "carry2",
    kind: "premium",
    constellation: 0,
    specialties: ["end"],
    compatible: ["memory"],
    combatKit: WUWA_COMBAT_KITS.cantarella,
  },
  {
    slot: "specialist",
    kind: "premium",
    constellation: 0,
    specialties: ["end"],
    compatible: ["flame"],
    combatKit: WUWA_COMBAT_KITS.xinyuehu,
  },
];

export const WUWA_END_FORMATION: NumericFormation = {
  path: "end",
  members: wuwaRoleTemplates,
};

export const wuwaSignatureWeapons: Weapon[] = wuwaCompanions.map((c) => ({
  id: `w-${c.id}`,
  name: WUWA_HERO_LORE[c.id].weapon,
  rarity: "5星",
  level: 1,
  refinement: 1,
  signatureFor: c.id,
  passive:
    "本命共鸣：攻击 +18%，伤害系数 +8%。敌方生命低于30%时直接伤害再提高10%。" +
    WUWA_HERO_LORE[c.id].weaponPassiveDesc +
    "异主仅生效基础攻击。",
}));

/** Alternative layout: Cantarella as Main Carry, Phrolova as Sub-C. */
export const WUWA_SWAPPED_END_FORMATION: NumericFormation = {
  path: "end",
  members: [
    {
      slot: "tank",
      kind: "premium",
      constellation: 0,
      specialties: ["end"],
      compatible: ["mortal"],
      combatKit: WUWA_COMBAT_KITS.yuno,
    },
    {
      slot: "healer",
      kind: "premium",
      constellation: 0,
      specialties: ["end"],
      compatible: ["time"],
      combatKit: WUWA_COMBAT_KITS.shorekeeper,
    },
    {
      slot: "carry1",
      kind: "premium",
      constellation: 0,
      specialties: ["end"],
      compatible: ["memory"],
      combatKit: {
        ...WUWA_COMBAT_KITS.cantarella,
        stats: {
          ...endPath.stats,
          attack: endPath.stats.attack * 1.0,
          hp: endPath.stats.hp * 1.0,
          defense: 360,
          crit: 0.28,
          critDamage: 2.1,
          pursuit: 0.2,
          dot: 0.06,
        },
        actionCoefficients: [0.75, 1.0, 1.25],
        linkCoefficient: 0.1,
      },
    },
    {
      slot: "carry2",
      kind: "premium",
      constellation: 0,
      specialties: ["end"],
      compatible: ["desire"],
      combatKit: {
        ...WUWA_COMBAT_KITS.phrolova,
        stats: {
          ...endPath.stats,
          attack: endPath.stats.attack * 0.8,
          hp: endPath.stats.hp * 1.0,
          defense: 360,
          crit: 0.28,
          critDamage: 2.05,
          dot: 0.08,
          pursuit: 0.1,
        },
        actionCoefficients: [1.0, 1.05, 0.95],
        linkCoefficient: 0.1,
      },
    },
    {
      slot: "specialist",
      kind: "premium",
      constellation: 0,
      specialties: ["end"],
      compatible: ["flame"],
      combatKit: WUWA_COMBAT_KITS.xinyuehu,
    },
  ],
};
