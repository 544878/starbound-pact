import type { Companion, Realm, Weapon } from "../domain/types";
import type { PathId } from "../domain/combat";
import { expansionCompanions } from './expansion';

export const HERO_LORE: Record<
  string,
  {
    realm: Realm;
    path: PathId;
    adaptedPath: PathId;
    faction: string;
    soulName: string;
    weapon: string;
    vow: string;
  }
> = {
  lumi: {
    realm: "神使",
    path: "time",
    adaptedPath: "end",
    faction: "风阙·星契同行",
    soulName: "不归之风",
    weapon: "回风的诗章",
    vow: "神谕可以迟到，求救不可以。",
  },
  alden: {
    realm: "主角团",
    path: "inverse",
    adaptedPath: "mortal",
    faction: "白昼盟约",
    soulName: "凡人不退",
    weapon: "晨星誓约",
    vow: "我的盾，为每一个没有神明庇佑的人而举。",
  },
  selene: {
    realm: "半神",
    path: "memory",
    adaptedPath: "flame",
    faction: "溯海书庭",
    soulName: "万潮归忆",
    weapon: "静海之杖",
    vow: "历史不应只记住神的名字。",
  },
  mira: {
    realm: "大尊",
    path: "desire",
    adaptedPath: "mortal",
    faction: "百草花庭",
    soulName: "众生春息",
    weapon: "万生药典",
    vow: "我救一个人，也是在救他所牵挂的世界。",
  },
  noctis: {
    realm: "帝",
    path: "end",
    adaptedPath: "flame",
    faction: "缄夜帝庭",
    soulName: "无冕终夜",
    weapon: "终夜裁衡",
    vow: "若王座必须吞下无辜，那就让王座倒下。",
  },
  kael: {
    realm: "主角团",
    path: "flame",
    adaptedPath: "end",
    faction: "赤原游猎",
    soulName: "逆焰不熄",
    weapon: "余烬猎弓",
    vow: "我会害怕。但我会和你们一起往前。",
  },
  astra: {
    realm: "主角团",
    path: "mortal",
    adaptedPath: "desire",
    faction: "星契同行",
    soulName: "自由白星",
    weapon: "问天·白星",
    vow: "我不是天命的容器，我要亲手选择未来。",
  },
  xuanzhao: {
    realm: "神",
    path: "inverse",
    adaptedPath: "mortal",
    faction: "太初日阙",
    soulName: "太初日轮",
    weapon: "照世长戈",
    vow: "众生抬头时，天上应当有光，而不是锁链。",
  },
  canglan: {
    realm: "神",
    path: "memory",
    adaptedPath: "time",
    faction: "沧溟神庭",
    soulName: "归墟万象",
    weapon: "万潮神戟",
    vow: "我听得见海底每一声呜咽，便不能假装万界风平浪静。",
  },
  yanhuang: {
    realm: "帝",
    path: "flame",
    adaptedPath: "end",
    faction: "赤霄帝朝",
    soulName: "焚天帝心",
    weapon: "赤霄断岳",
    vow: "帝冠之重，不该压垮苍生的脊背；若王权噬民，我便焚碎这万里山河！",
  },
  jingxuan: {
    realm: "半神",
    path: "dream",
    adaptedPath: "time",
    faction: "无相镜宫",
    soulName: "照我真心",
    weapon: "不妄月镜",
    vow: "即便万千面水镜都映照出必败的终局，我仍赌你们心底这寸微芒。",
  },
  siming: {
    realm: "神使",
    path: "time",
    adaptedPath: "memory",
    faction: "司命天台",
    soulName: "命外一笔",
    weapon: "改命天书",
    vow: "天书若有缺，正好容得下一个凡人亲手写下自己的名字。",
  },
  yueheng: {
    realm: "大尊",
    path: "mortal",
    adaptedPath: "inverse",
    faction: "万岳守盟",
    soulName: "山河同担",
    weapon: "山河不动",
    vow: "我守的从不是一道冰冷的边塞国界，而是界线后千万盏凡人灯火。",
  },
};

expansionCompanions.forEach((c) => {
  HERO_LORE[c.id] = {
    realm: c.realm!,
    path: c.path!,
    adaptedPath: c.adaptedPath ?? (c.path === "inverse" ? "mortal" : "inverse"),
    faction: c.faction!,
    soulName: c.soulName!,
    weapon: c.weaponName ?? `${c.name}·本命神兵`,
    vow: c.vow ?? c.quotes![0],
  };
});

const seeds: Array<
  [
    string,
    string,
    string,
    Companion["element"],
    Companion["role"],
    Companion["rarity"],
    Companion["gender"],
    string,
    [string, string],
    string,
  ]
> = [
  [
    "xuanzhao",
    "玄照",
    "太初照世神",
    "light",
    "guardian",
    "5星",
    "male",
    "#b99545",
    ["日轮破妄", "照世天壁"],
    "太初执掌日轮的不灭古神。目睹旧天庭以百万凡人魂火填补天之裂痕的惨象后，他毅然折断神杖，带着一身焚骨天罚走入人间。如今他收敛万丈神光，甘愿化作一柄照世长戈，为星璃与世人挡住苍天冰冷的视线。",
  ],
  [
    "canglan",
    "沧澜",
    "万潮归墟神",
    "water",
    "mystic",
    "5星",
    "female",
    "#328f98",
    ["潮生万象", "归墟回响"],
    "统御归墟惊涛的万潮海神。千年前她曾引动滔天神迹独力封印海渊裂隙，却也令沉没的文明被神史彻底抹煞、海民陷入无休止的祭神依附。如今她走下神坛成为同行者，是为了打破神迹的枷锁，将守护波涛的权利亲手交还人间。",
  ],
  [
    "yanhuang",
    "炎煌",
    "赤霄焚天帝",
    "fire",
    "striker",
    "5星",
    "male",
    "#ba6549",
    ["断岳", "万军共炬"],
    "以布衣之身横扫八荒登临帝位的赤原狂帝。当旧朝元老与神使逼他签发‘焦土焚城令’以阻灾厄时，他斩碎帝印抗命而起。他与凯尔在火场并肩浴血，虽言语刻薄互不相让，但每逢绝境，他宽阔的战袍总是率先挡在最脆弱的人面前。",
  ],
  [
    "jingxuan",
    "镜玄",
    "照心半神",
    "shadow",
    "mystic",
    "5星",
    "female",
    "#9981b8",
    ["照影", "千镜归真"],
    "寄宿于万镜深处、能窥见亿万种时间支流的无相半神。在目睹无数被神谕判定‘注定灭亡’的世界与生灵后，她第一次违背了冷漠的全知神性，出手救下一名祭坛上的凡人孩童。自那刻起，她亲手打碎心镜，踏入那条没有被预言书写的未知前路。",
  ],
  [
    "siming",
    "司命",
    "改命行走",
    "wind",
    "support",
    "4星",
    "male",
    "#607e99",
    ["落笔成星", "命外一息"],
    "司命天台最年轻的执笔神使。奉命持命册追索忤逆天命的星璃，却在亲眼目睹凡人为了同伴舍生忘死的光辉后，当着诸神之面将写满既定命运的竹简撕得粉碎。失去神赐的全知权能，却换来了属于他自己的一双明澈眼眸。",
  ],
  [
    "yueheng",
    "岳衡",
    "镇世山河尊",
    "flora",
    "guardian",
    "4星",
    "female",
    "#808953",
    ["镇岳", "山河共守"],
    "坐镇极天险隘三百年未曾离开边城一步的守盟大尊。重甲染霜，心如磐岳。她深知任何高耸的城墙都不能永远依赖单个神明或英雄来扛起，因而奔走各界，联合流民、百工与异族缔结平等的‘万岳守盟’，誓教山河在众人合力下坚不可摧。",
  ],
];
export const epicCompanions: Companion[] = seeds.map(
  ([
    id,
    name,
    title,
    element,
    role,
    rarity,
    gender,
    accent,
    skills,
    biography,
  ]) => ({
    id,
    name,
    title,
    element,
    role,
    rarity,
    gender,
    accent,
    skills,
    biography,
    level: 20,
    power: rarity === "5星" ? 3950 : 3400,
    constellation: 0,
    artPosition: "0% 0%",
    ...HERO_LORE[id],
    quotes: [HERO_LORE[id].vow, "今日同行，来日同归。"],
  }),
);
export const SIGNATURE_PASSIVES: Record<string, string> = {
  inverse: "本命持有者承伤再降低6%。",
  memory: "本命持有者追击伤害再提高15%。",
  flame: "本命持有者持续伤害再提高15%。",
  desire: "本命持有者治疗效果再提高10%。",
  dream: "本命持有者暴击率再提高10个百分点。",
  end: "敌方生命低于30%时，本命持有者直接伤害再提高10%。",
  time: "本命持有者每次行动额外恢复5能量。",
  mortal: "全队存活时，本命持有者直接伤害再提高10%。",
};
export function signatureWeapons(roster: Companion[]): Weapon[] {
  const legacy: Record<string, string> = {
    lumi: "w-wind",
    alden: "w-light",
    selene: "w-tide",
    kael: "w-ember",
  };
  return roster.map((c) => ({
    id: legacy[c.id] ?? `w-${c.id}`,
    name: HERO_LORE[c.id].weapon,
    rarity: c.rarity,
    level: 1,
    refinement: 1,
    signatureFor: c.id,
    passive:
      "星阵：本命完整提供原版武器预算，异主保留85%；强化、精炼提高完成度。活动玩法：攻击+18%、伤害系数+8%。" + SIGNATURE_PASSIVES[c.path ?? "mortal"],
  }));
}
export const REALMS: Realm[] = ["神", "半神", "帝", "神使", "大尊", "主角团"];
export const ART_VIEWS = ["正面", "侧面", "背面", "萌版", "头像"] as const;
export const expansionArtIndex = (id: string) => expansionCompanions.findIndex(c => c.id === id);
export const characterSheet = (id: string) =>
  expansionArtIndex(id) >= 0 ? `/assets/characters/expansion-views-${Math.floor(expansionArtIndex(id) / 4) + 1}.png` : `/assets/characters/${id}-sheet.png`;
