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

const FGO_PERSONAL_BONUSES: [number, number, number, number, number, number, number] = [0, 0.04, 0.22, 0.26, 0.3, 0.39, 0.54];
const FGO_SUPPORT_BONUSES: [number, number, number, number, number, number, number] = [0, 0.02, 0.06, 0.08, 0.1, 0.12, 0.18];

export interface FgoConstellationInfo {
  rank: number;
  name: string;
  effect: string;
  personalBonus: number;
  supportBonus: number;
}

export const FGO_HERO_LORE: Record<
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
  saber: {
    realm: "帝",
    path: "time",
    adaptedPath: "mortal",
    faction: "异界英灵·圆桌骑士",
    soulName: "誓约不泯",
    weapon: "誓约胜利之剑·理想乡",
    vow: "剑与盾皆为你而战，直到抵达命运的尽头。",
    weaponModelDesc:
      "黄金剑柄与深蓝珐琅交错的圣剑，缠绕风王结界（Invisible Air）透明气旋；侧方悬浮金蓝相间的阿瓦隆黄金鞘盾。",
    weaponPassiveDesc:
      "湖中加护：承伤再降低6%；每次受到直接攻击使全队本轮受到伤害降低3%。",
  },
  sakura: {
    realm: "半神",
    path: "time",
    adaptedPath: "dream",
    faction: "异界英灵·深渊生息",
    soulName: "虚数重溯",
    weapon: "圣杯回溯·虚数之绫",
    vow: "即使身处无边深渊，我也愿为你抚平所有痛楚。",
    weaponModelDesc:
      "柔滑半透明浅紫魔力绸缎，空中悬浮着一颗晶莹剔透的水滴形圣杯紫晶魔核，散发柔和纯净的生机涟漪。",
    weaponPassiveDesc:
      "溢满生息：治疗效能提升10%；每轮治疗为血量最低队友额外恢复已损生命的5%。",
  },
  rin: {
    realm: "大尊",
    path: "time",
    adaptedPath: "memory",
    faction: "异界英灵·远坂魔术",
    soulName: "平行干涉",
    weapon: "泽尔里奇宝石剑",
    vow: "无论发生什么，都要保持至死不渝的优雅！",
    weaponModelDesc:
      "刀身呈多面折射的晶莹平行棱镜质感，折射出红、蓝、绿、金多维以太光芒，握柄为华丽鎏金洛可可风格。",
    weaponPassiveDesc:
      "平行干涉：所提供的【同刻】追击增幅额外提高8个百分点；全员存活时自身能量获取+10%。",
  },
  archer: {
    realm: "主角团",
    path: "time",
    adaptedPath: "end",
    faction: "异界英灵·无铭守望",
    soulName: "剑骨不折",
    weapon: "干将·莫邪·投影",
    vow: "此身为剑所天成，此生无需留下姓名。",
    weaponModelDesc:
      "阴阳黑白对剑，黑剑干将具青色龟甲暗纹，白剑莫邪刃如秋水澄澈，柄端带有深红流苏，攻击带出阴阳双螺旋刀光。",
    weaponPassiveDesc:
      "无限剑迹：追击伤害提升15%；行动后若触发追击，使自身下一次直接伤害提升6%。",
  },
  gilgamesh: {
    realm: "帝",
    path: "time",
    adaptedPath: "flame",
    faction: "异界英灵·原初巴比伦",
    soulName: "霸王裁决",
    weapon: "天地乖离·乖离剑Ea",
    vow: "本王的宝库包罗万象，见证这开天辟地的一击吧！",
    weaponModelDesc:
      "黑金高古圆柄，三段独立反向旋转的圆柱剑身，周身雕刻猩红古代楔形符文，旋转时散发赤红与黑金裂空风暴。",
    weaponPassiveDesc:
      "霸王财宝：追击系数提升8%；第三轮直接伤害额外提升10%。",
  },
};

export const fgoCompanions: Companion[] = [
  {
    id: "saber",
    numericId: "FGO-001",
    name: "阿尔托莉雅",
    title: "骑士之王 · 誓约守护",
    element: "light",
    role: "guardian",
    rarity: "5星",
    level: 20,
    power: 4200,
    constellation: 0,
    accent: "#3a7bd5",
    artPosition: "0% 0%",
    gender: "female",
    persona: "正直骑士 · 坚毅王者",
    biography:
      "不列颠的传说之王，手持誓约胜利之剑与遥远的理想乡。身为守护骑士降临万界，坚守于战阵最前线，以身为盾庇护所有同行者。",
    skills: ["风王断空", "远离尘世的理想乡"],
    quotes: [
      "“问：你是我的Master吗？剑与盾皆为你而战。”",
      "“只要王之誓约未散，此剑与此盾绝不退缩半分。”",
      "“Ex——calibur！”",
      "“遥远的理想乡，将为你隔绝一切狂澜。”",
    ],
    ...FGO_HERO_LORE.saber,
  },
  {
    id: "sakura",
    numericId: "FGO-002",
    name: "间桐樱",
    title: "虚数圣杯 · 繁花医者",
    element: "water",
    role: "support",
    rarity: "5星",
    level: 20,
    power: 3980,
    constellation: 0,
    accent: "#9b59b6",
    artPosition: "0% 0%",
    gender: "female",
    persona: "温柔隐忍 · 虚数之泉",
    biography:
      "身负虚数属性与圣杯魔力之源的少女。在裂隙中将无限的生命魔力转化为抚平伤痕的时序回溯，以温柔而坚韧的心守护阵线安宁。",
    skills: ["虚数时流", "溢满生息·圣杯繁花"],
    quotes: [
      "“前辈，今天我也在好好努力呢。”",
      "“虚数的回流，请抚平大家的伤痛吧。”",
      "“圣杯的生息是无限的，请不要勉强自己。”",
      "“只要能在你身边，无论怎样的黑暗我都不怕。”",
    ],
    ...FGO_HERO_LORE.sakura,
  },
  {
    id: "rin",
    numericId: "FGO-003",
    name: "远坂凛",
    title: "宝石宗师 · 时序干涉",
    element: "fire",
    role: "mystic",
    rarity: "5星",
    level: 20,
    power: 4050,
    constellation: 0,
    accent: "#e74c3c",
    artPosition: "0% 0%",
    gender: "female",
    persona: "优雅傲娇 · 天才魔术师",
    biography:
      "冬木地脉的管理者、远坂家第五代当主。精通宝石魔术并持有第二魔法泽尔里奇平行干涉之力，调谐全队时序，点燃同刻爆发之火。",
    skills: ["阴弹·机巧连续", "第二魔法·泽尔里奇回响"],
    quotes: [
      "“真是的，关键时刻可别掉链子啊！”",
      "“第二魔法以太回路连接完毕，全员时序加速准备！”",
      "“Gandr！接招吧，这可是千锤百炼的魔弹射击！”",
      "“优雅不是做给别人看的，而是必须贯彻到底的信念！”",
    ],
    ...FGO_HERO_LORE.rin,
  },
  {
    id: "archer",
    numericId: "FGO-004",
    name: "卫宫",
    title: "炼铁英灵 · 投影连斩",
    element: "shadow",
    role: "striker",
    rarity: "5星",
    level: 20,
    power: 4120,
    constellation: 0,
    accent: "#c0392b",
    artPosition: "0% 0%",
    gender: "male",
    persona: "外冷内热 · 孤高守护者",
    biography:
      "手握干将·莫邪阴阳双刀的无铭之弓兵。身怀无限剑制固有结界，以高频投影魔术与鹤翼三连穿梭战场，为团队打出连绵不绝的追击。",
    skills: ["鹤翼双岚", "固有结界·无限剑制"],
    quotes: [
      "“I am the bone of my sword...”",
      "“虽然不是什么值得夸耀的人生，但这次的背后就交给我吧。”",
      "“鹤翼不落，投影连斩！”",
      "“理想并不可耻，战斗到最后一刻即可。”",
    ],
    ...FGO_HERO_LORE.archer,
  },
  {
    id: "gilgamesh",
    numericId: "FGO-005",
    name: "吉尔伽美什",
    title: "英雄之王 · 创世开辟",
    element: "light",
    role: "striker",
    rarity: "5星",
    level: 20,
    power: 4350,
    constellation: 0,
    accent: "#f1c40f",
    artPosition: "0% 0%",
    gender: "male",
    persona: "唯我独尊 · 霸道君王",
    biography:
      "人类最古老的乌鲁克英雄王。坐拥世间一切宝物原型的王之财宝，手持裁决天地的乖离剑Ea。以压倒性的宝具雨与开天辟地的爆发横扫一切深渊。",
    skills: ["王之财宝·万象齐发", "天地乖离·开辟之星"],
    quotes: [
      "“哼，杂修，能得本王相助，是你们几世修来的荣幸！”",
      "“看好了，这就是天地开辟的断层——Enuma Elish！”",
      "“王之财宝的雨幕，可不是区区凡骨所能承受的。”",
      "“时序也好命运也罢，唯有本王的准则才是真正的裁断！”",
    ],
    ...FGO_HERO_LORE.gilgamesh,
  },
];

export const FGO_CONSTELLATIONS: Record<string, FgoConstellationInfo[]> = {
  gilgamesh: [
    {
      rank: 1,
      name: "黄金律",
      effect: "自身直接与追击加算池累计+4%。",
      personalBonus: 0.04,
      supportBonus: 0,
    },
    {
      rank: 2,
      name: "王之财宝 · 宝库全开",
      effect:
        "【关键节点】自身加算池累计+22%（较上命提升18%）；追击判定全面强化。",
      personalBonus: 0.22,
      supportBonus: 0,
    },
    {
      rank: 3,
      name: "收藏家之傲",
      effect: "自身直接与追击加算池累计+26%。",
      personalBonus: 0.26,
      supportBonus: 0,
    },
    {
      rank: 4,
      name: "恩奇都的羁绊 · 天之锁",
      effect: "自身加算池累计+30%；攻击具备高额穿透。",
      personalBonus: 0.3,
      supportBonus: 0,
    },
    {
      rank: 5,
      name: "极度奢华的宴飨",
      effect: "自身加算池累计+39%（较上命提升9%）。",
      personalBonus: 0.39,
      supportBonus: 0,
    },
    {
      rank: 6,
      name: "叙事之终 · 原初创世",
      effect:
        "【质变节点】自身加算池累计+54%；首轮直接攻击改用乖离剑爆发系数，开场直接满配时序增益！",
      personalBonus: 0.54,
      supportBonus: 0,
    },
  ],
  archer: [
    {
      rank: 1,
      name: "心眼（真）",
      effect: "自身直接与追击加算池累计+4%。",
      personalBonus: 0.04,
      supportBonus: 0,
    },
    {
      rank: 2,
      name: "鹤翼三连 · 必中",
      effect:
        "【关键节点】自身加算池累计+22%（较上命提升18%）；追击暴击判定独立提升。",
      personalBonus: 0.22,
      supportBonus: 0,
    },
    {
      rank: 3,
      name: "投影魔术 · 精工",
      effect: "自身直接与追击加算池累计+26%。",
      personalBonus: 0.26,
      supportBonus: 0,
    },
    {
      rank: 4,
      name: "赤原猎犬 · 锁死追踪",
      effect: "自身加算池累计+30%；追击伤害无视目标15%防御。",
      personalBonus: 0.3,
      supportBonus: 0,
    },
    {
      rank: 5,
      name: "幻想崩坏 (Broken Phantasm)",
      effect: "自身加算池累计+39%（较上命提升9%）。",
      personalBonus: 0.39,
      supportBonus: 0,
    },
    {
      rank: 6,
      name: "心象风景 · 剑丘之巅",
      effect:
        "【质变节点】自身加算池累计+54%；首轮直接释放无限剑制爆发，追击系数开场即达峰值！",
      personalBonus: 0.54,
      supportBonus: 0,
    },
  ],
  saber: [
    {
      rank: 1,
      name: "骑乘本能",
      effect: "全队承伤减免及双C联动效能累计提升2%。",
      personalBonus: 0.02,
      supportBonus: 0.02,
    },
    {
      rank: 2,
      name: "遥远的理想乡 · 投影",
      effect:
        "【关键节点】全队减伤及联动效能累计提升6%（基础减伤提升至8.48%）。",
      personalBonus: 0.06,
      supportBonus: 0.06,
    },
    {
      rank: 3,
      name: "龙之因子",
      effect: "职责与联动效能累计提升8%。",
      personalBonus: 0.08,
      supportBonus: 0.08,
    },
    {
      rank: 4,
      name: "风王结界 · 解放",
      effect: "全队减伤与联动效能累计提升10%；受击时触发不屈减伤。",
      personalBonus: 0.1,
      supportBonus: 0.1,
    },
    {
      rank: 5,
      name: "不列颠的红龙",
      effect: "效能累计提升12%。",
      personalBonus: 0.12,
      supportBonus: 0.12,
    },
    {
      rank: 6,
      name: "远离尘世的终极理想乡",
      effect:
        "【质变节点】守护减伤与联动效能累计提升18%（全队减伤提升至9.44%，所提供双C联动达到7.08%）；生成誓约护盾。",
      personalBonus: 0.18,
      supportBonus: 0.18,
    },
  ],
  rin: [
    {
      rank: 1,
      name: "优雅的贵族淑女",
      effect: "专辅Buff与双C联动效能提升2%。",
      personalBonus: 0.02,
      supportBonus: 0.02,
    },
    {
      rank: 2,
      name: "魔术刻印 · 继承",
      effect:
        "【关键节点】专辅Buff与联动效能累计提升6%；【同刻】追击加成提升至47.7%。",
      personalBonus: 0.06,
      supportBonus: 0.06,
    },
    {
      rank: 3,
      name: "五大元素适性",
      effect: "专辅效能累计提升8%。",
      personalBonus: 0.08,
      supportBonus: 0.08,
    },
    {
      rank: 4,
      name: "极速充能 · 宝石回路",
      effect: "专辅效能累计提升10%；每两轮为主副C额外提供能量加速。",
      personalBonus: 0.1,
      supportBonus: 0.1,
    },
    {
      rank: 5,
      name: "远坂家当主之傲",
      effect: "效能累计提升12%。",
      personalBonus: 0.12,
      supportBonus: 0.12,
    },
    {
      rank: 6,
      name: "第二魔法 · 平行干涉之境",
      effect:
        "【质变节点】专辅Buff与联动效能累计提升18%（【同刻】追击增幅提升至53.1%，双C联动提升至23.6%）；第三轮双C直接伤害额外提高10%。",
      personalBonus: 0.18,
      supportBonus: 0.18,
    },
  ],
  sakura: [
    {
      rank: 1,
      name: "温柔的心愿",
      effect: "治疗与双C联动效能累计提升2%。",
      personalBonus: 0.02,
      supportBonus: 0.02,
    },
    {
      rank: 2,
      name: "虚数之渊 · 包容",
      effect:
        "【关键节点】治疗效能累计提升6%（每轮治疗提升至队友生命3.18%）。",
      personalBonus: 0.06,
      supportBonus: 0.06,
    },
    {
      rank: 3,
      name: "魔力回流",
      effect: "治疗效能累计提升8%。",
      personalBonus: 0.08,
      supportBonus: 0.08,
    },
    {
      rank: 4,
      name: "圣杯之器 · 孕育",
      effect: "治疗效能累计提升10%；有效治疗时为目标附加5%减伤。",
      personalBonus: 0.1,
      supportBonus: 0.1,
    },
    {
      rank: 5,
      name: "樱花信约",
      effect: "效能累计提升12%。",
      personalBonus: 0.12,
      supportBonus: 0.12,
    },
    {
      rank: 6,
      name: "此世之生 · 繁花抚世",
      effect:
        "【质变节点】治疗与联动效能累计提升18%（每轮治疗提升至3.54%）；队友低血量时触发抚慰急救翻倍。",
      personalBonus: 0.18,
      supportBonus: 0.18,
    },
  ],
};

const timePath = COMBAT_PATHS.find((p) => p.id === "time")!;

/** Combat Kits calibrated in original balance units; scaled by 250 in combat points. */
export const FGO_COMBAT_KITS: Record<string, EquippedCombatKit> = {
  // Tank: Saber
  saber: {
    stats: {
      ...timePath.stats,
      attack: timePath.stats.attack * 0.12,
      hp: timePath.stats.hp * 2.2 * 1.1,
      defense: 1000,
      reflect: 0.12,
      pursuit: 0.2,
      crit: 0.25,
      critDamage: 1.75,
    },
    mechanicPath: "time",
    actionCoefficients: [0.7, 0.9, 1.4],
    personalBonuses: [...FGO_SUPPORT_BONUSES],
    supportBonuses: [...FGO_SUPPORT_BONUSES],
    openingAtC6: false,
    linkCoefficient: 0.06,
  },
  // Healer: Sakura
  sakura: {
    stats: {
      ...timePath.stats,
      attack: timePath.stats.attack * 0.1 * 1.1,
      hp: timePath.stats.hp * 1.2 * 1.08,
      defense: 480,
      lifesteal: 0.08,
      pursuit: 0.15,
      crit: 0.2,
      critDamage: 1.65,
    },
    mechanicPath: "time",
    actionCoefficients: [0.7, 0.9, 1.4],
    personalBonuses: [...FGO_SUPPORT_BONUSES],
    supportBonuses: [...FGO_SUPPORT_BONUSES],
    openingAtC6: false,
    linkCoefficient: 0.06,
  },
  // Carry1: Gilgamesh
  gilgamesh: {
    stats: {
      ...timePath.stats,
      attack: timePath.stats.attack * 1.0,
      hp: timePath.stats.hp * 1.0,
      defense: 400,
      pursuit: 0.42,
      dot: 0.12,
      crit: 0.25,
      critDamage: 1.75,
    },
    mechanicPath: "time",
    actionCoefficients: [0.7, 0.9, 1.4],
    personalBonuses: [...FGO_PERSONAL_BONUSES],
    supportBonuses: [0, 0, 0, 0, 0, 0, 0],
    openingAtC6: true,
    linkCoefficient: 0.1,
  },
  // Carry2: Archer
  archer: {
    stats: {
      ...timePath.stats,
      attack: timePath.stats.attack * 0.8,
      hp: timePath.stats.hp * 1.0 * 1.02,
      defense: 400,
      pursuit: 0.36,
      dot: 0.18,
      crit: 0.25,
      critDamage: 1.7,
    },
    mechanicPath: "time",
    actionCoefficients: [1.0, 1.05, 0.95],
    personalBonuses: [...FGO_PERSONAL_BONUSES],
    supportBonuses: [0, 0, 0, 0, 0, 0, 0],
    openingAtC6: true,
    linkCoefficient: 0.1,
  },
  // Specialist: Rin
  rin: {
    stats: {
      ...timePath.stats,
      attack: timePath.stats.attack * 0.18,
      hp: timePath.stats.hp * 1.1,
      defense: 440,
      pursuit: 0.4,
      dot: 0.14,
      crit: 0.25,
      critDamage: 1.7,
    },
    mechanicPath: "time",
    actionCoefficients: [0.7, 0.9, 1.4],
    personalBonuses: [...FGO_SUPPORT_BONUSES],
    supportBonuses: [...FGO_SUPPORT_BONUSES],
    openingAtC6: false,
    linkCoefficient: 0.2,
  },
};

function createFgoCharacter(
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
  const buffStat: keyof CombatStats = "pursuit";
  const buffAmount = 0.06;
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

  const constellations: NumericConstellation[] = FGO_CONSTELLATIONS[id].map(
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
      description: `${roleDesc}满配时序面板：追击系数${Number((target.pursuit * 100).toFixed(4))}%，每次行动最多一次；每第三轮直接伤害加算45%。`,
    },
  ];

  return {
    id,
    rarity: 4,
    slot,
    specialties,
    compatible,
    mechanicPath: "time",
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

export const FGO_FOUR_STAR_CHARACTERS: FourStarCharacter[] = [
  createFgoCharacter(
    "saber",
    "tank",
    ["time"],
    ["mortal"],
    FGO_COMBAT_KITS.saber,
    ["风王断空", "风王铁锤", "誓约胜利之剑 (Excalibur)"],
    "存活时承担攻击包65%，全队基础减伤8%×职责效能；提供双C联动6%。"
  ),
  createFgoCharacter(
    "sakura",
    "healer",
    ["time"],
    ["dream"],
    FGO_COMBAT_KITS.sakura,
    ["虚数光波", "虚数脉冲", "圣杯涌泉·繁花抚世"],
    "行动结束后每轮治疗所有存活队友各自最大生命3%×职责效能；提供双C联动6%。"
  ),
  createFgoCharacter(
    "gilgamesh",
    "carry1",
    ["time"],
    ["flame"],
    FGO_COMBAT_KITS.gilgamesh,
    ["王之财宝·轻射", "天之锁·穿刺", "天地乖离·开辟之星 (Enuma Elish)"],
    "双C均存活且适配时共享一份10%联动；不能叠成20%。"
  ),
  createFgoCharacter(
    "archer",
    "carry2",
    ["time"],
    ["end"],
    FGO_COMBAT_KITS.archer,
    ["干将莫邪·疾斩", "伪·螺旋剑 (Caladbolg II)", "固有结界·无限剑制 (UBW)"],
    "双C均存活且适配时共享一份10%联动；不能叠成20%。"
  ),
  createFgoCharacter(
    "rin",
    "specialist",
    ["time"],
    ["memory"],
    FGO_COMBAT_KITS.rin,
    ["Gandr·机巧阴弹", "五色宝石连锁", "第二魔法·平行干涉"],
    "存活时提供双C联动20%；在时序阵法激活专属Buff【同刻】：每第三轮追击提高45%。"
  ),
];

export const FGO_CHARACTERS_MAP: Record<string, FourStarCharacter> = Object.fromEntries(
  FGO_FOUR_STAR_CHARACTERS.map((c) => [c.id, c])
);

export const fgoRoleTemplates: RoleTemplate[] = [
  {
    slot: "tank",
    kind: "premium",
    constellation: 0,
    specialties: ["time"],
    compatible: ["mortal"],
    combatKit: FGO_COMBAT_KITS.saber,
  },
  {
    slot: "healer",
    kind: "premium",
    constellation: 0,
    specialties: ["time"],
    compatible: ["dream"],
    combatKit: FGO_COMBAT_KITS.sakura,
  },
  {
    slot: "carry1",
    kind: "premium",
    constellation: 0,
    specialties: ["time"],
    compatible: ["flame"],
    combatKit: FGO_COMBAT_KITS.gilgamesh,
  },
  {
    slot: "carry2",
    kind: "premium",
    constellation: 0,
    specialties: ["time"],
    compatible: ["end"],
    combatKit: FGO_COMBAT_KITS.archer,
  },
  {
    slot: "specialist",
    kind: "premium",
    constellation: 0,
    specialties: ["time"],
    compatible: ["memory"],
    combatKit: FGO_COMBAT_KITS.rin,
  },
];

export const FGO_TIME_FORMATION: NumericFormation = {
  path: "time",
  members: fgoRoleTemplates,
};

export const fgoSignatureWeapons: Weapon[] = fgoCompanions.map((c) => ({
  id: `w-${c.id}`,
  name: FGO_HERO_LORE[c.id].weapon,
  rarity: "5星",
  level: 1,
  refinement: 1,
  signatureFor: c.id,
  passive:
    "本命共鸣：攻击 +18%，伤害系数 +8%。本命持有者每次行动额外恢复5能量。" +
    FGO_HERO_LORE[c.id].weaponPassiveDesc +
    "异主仅生效基础攻击。",
}));

/** Alternative layout: Saber as Main Carry, Archer as Tank (Rho Aias), Gilgamesh as Sub-C. */
export const FGO_SWAPPED_TIME_FORMATION: NumericFormation = {
  path: "time",
  members: [
    {
      slot: "tank",
      kind: "premium",
      constellation: 0,
      specialties: ["time"],
      compatible: ["inverse"],
      combatKit: {
        ...FGO_COMBAT_KITS.archer,
        stats: {
          ...timePath.stats,
          attack: timePath.stats.attack * 0.12,
          hp: timePath.stats.hp * 2.2 * 1.1,
          defense: 950,
          reflect: 0.1,
          pursuit: 0.25,
        },
        linkCoefficient: 0.06,
      },
    },
    {
      slot: "healer",
      kind: "premium",
      constellation: 0,
      specialties: ["time"],
      compatible: ["dream"],
      combatKit: FGO_COMBAT_KITS.sakura,
    },
    {
      slot: "carry1",
      kind: "premium",
      constellation: 0,
      specialties: ["time"],
      compatible: ["mortal"],
      combatKit: {
        ...FGO_COMBAT_KITS.saber,
        stats: {
          ...timePath.stats,
          attack: timePath.stats.attack * 1.0,
          hp: timePath.stats.hp * 1.0,
          defense: 400,
          pursuit: 0.4,
          crit: 0.25,
          critDamage: 1.75,
        },
        linkCoefficient: 0.1,
      },
    },
    {
      slot: "carry2",
      kind: "premium",
      constellation: 0,
      specialties: ["time"],
      compatible: ["flame"],
      combatKit: {
        ...FGO_COMBAT_KITS.gilgamesh,
        stats: {
          ...timePath.stats,
          attack: timePath.stats.attack * 0.8,
          hp: timePath.stats.hp * 1.0,
          defense: 400,
          pursuit: 0.45,
          crit: 0.25,
          critDamage: 1.7,
        },
        linkCoefficient: 0.1,
      },
    },
    {
      slot: "specialist",
      kind: "premium",
      constellation: 0,
      specialties: ["time"],
      compatible: ["memory"],
      combatKit: FGO_COMBAT_KITS.rin,
    },
  ],
};
