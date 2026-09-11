import type { Companion, Realm, Weapon } from "../domain/types";
import type { PathId } from "../domain/combat";

export const HSR_HERO_LORE: Record<
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
  robin_lovesong: {
    realm: "神使",
    path: "mortal",
    adaptedPath: "time",
    faction: "匹诺康尼 · 银河天籁",
    soulName: "千音同响",
    weapon: "夜曲·星辰鸣响",
    vow: "“愿我的歌声，跨越光年与炽热的夏天，成为照亮你身旁的微风。”",
    weaponModelDesc: "流光溢彩的金羽麦克风与透明星辉环绕的纯白琴键，散发着安抚心灵的温暖光晕。",
    weaponPassiveDesc: "星辰协奏：开启增益后全队追击伤害提高16%；队友施加护盾时回复音律。",
  },
  aventurine_waves: {
    realm: "半神",
    path: "inverse",
    adaptedPath: "memory",
    faction: "星际和平公司 · 盛夏度假行",
    soulName: "豪赌盛夏",
    weapon: "命途晴空·海滨筹码",
    vow: "“所有的筹码都已入池，朋友，在这炎热的夏日里，和我一起尽情狂欢吧。”",
    weaponModelDesc: "晶莹剔透的水晶筹码与蔚蓝水纹手环相映，伴随清脆的撞击声泛起阵阵清凉海浪。",
    weaponPassiveDesc: "晴空筹码：提供护盾时全队暴伤提高14%；受光环增益时自身追击伤害提高16%。",
  },
};

export const hsrCompanions: Companion[] = [
  {
    id: "robin_lovesong",
    numericId: "HSR-001",
    name: "知更鸟情歌",
    title: "银河歌者 · 盛夏序曲",
    element: "light",
    role: "support",
    rarity: "5星",
    level: 20,
    power: 4280,
    constellation: 0,
    accent: "#c7d2fe",
    artPosition: "0% 0%",
    gender: "female",
    persona: "温柔空灵 · 坚韧歌者",
    biography:
      "享誉银河的著名歌者，以歌声传递希望与勇气。在跨越界域的盛夏庆典中，她身披澄澈情歌的羽衣降临，以抚平一切创痛的咏唱为全队带来欢愉，并与同伴打出默契无间的协同音浪。",
    skills: ["清越初音", "和弦曼舞"],
    quotes: [
      "“听到了吗？这是属于这个夏天的旋律。”",
      "“无论身处怎样的风暴，歌声永远与你同行。”",
      "“人来疯可不是贬义词哦，盛夏就要尽情释放热情！”",
      "“来吧，让整个世界都倾听我们的合奏。”",
    ],
    ...HSR_HERO_LORE.robin_lovesong,
  },
  {
    id: "aventurine_waves",
    numericId: "HSR-002",
    name: "砂金戏浪",
    title: "海滨赌徒 · 碧浪狂想",
    element: "water",
    role: "guardian",
    rarity: "5星",
    level: 20,
    power: 4350,
    constellation: 0,
    accent: "#38bdf8",
    artPosition: "0% 0%",
    gender: "male",
    persona: "从容自信 · 豪赌夏日",
    biography:
      "换上清爽夏日装扮的高级干部。即便在海浪翻滚的度假胜地，命运的轮盘与筹码也从未停转。以水花构筑固若金汤的戏浪护盾，并将敌人的每一次冲击转化为反击的怒涛弹珠。",
    skills: ["碎浪投掷", "浪花盛宴·豪赌夏日"],
    quotes: [
      "“所有的筹码都已押在盛夏的浪尖上，朋友，敢不敢跟一注？”",
      "“夏天就是要人来疯！看我把这片水花变成狂欢派对。”",
      "“放轻松，只要有我的浪花在，没有谁能伤到你半分。”",
      "“哈哈，轮盘停转，这次依然是我赢了。”",
    ],
    ...HSR_HERO_LORE.aventurine_waves,
  },
];

export const hsrSignatureWeapons: Weapon[] = hsrCompanions.map((c) => ({
  id: 'w-' + c.id,
  name: HSR_HERO_LORE[c.id].weapon,
  rarity: "5星",
  level: 1,
  refinement: 1,
  signatureFor: c.id,
  passive:
    "本命共鸣：攻击/防御 +18%，队伍增益持续时间与护盾量提升。" +
    HSR_HERO_LORE[c.id].weaponPassiveDesc +
    "异主仅生效基础面板。",
}));