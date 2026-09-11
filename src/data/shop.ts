export interface RechargeTier {
  id: string;
  price: number;
  crystals: number;
  bonusCrystals: number;
  firstBonusCrystals: number;
  name: string;
  badge?: string;
  icon: string;
  desc: string;
}

export const RECHARGE_TIERS: RechargeTier[] = [
  {
    id: "recharge_6",
    price: 6,
    crystals: 60,
    bonusCrystals: 0,
    firstBonusCrystals: 60,
    name: "微光星匣",
    badge: "初踏星途",
    icon: "✧",
    desc: "获得 60 星晶",
  },
  {
    id: "recharge_30",
    price: 30,
    crystals: 300,
    bonusCrystals: 30,
    firstBonusCrystals: 300,
    name: "凝辉星囊",
    badge: "热销精选",
    icon: "✦",
    desc: "获得 300 星晶 + 赠送 30",
  },
  {
    id: "recharge_68",
    price: 68,
    crystals: 680,
    bonusCrystals: 70,
    firstBonusCrystals: 680,
    name: "耀芒密匣",
    badge: "超值推荐",
    icon: "★",
    desc: "获得 680 星晶 + 赠送 70",
  },
  {
    id: "recharge_98",
    price: 98,
    crystals: 980,
    bonusCrystals: 110,
    firstBonusCrystals: 980,
    name: "璀璨星匮",
    badge: "人气特惠",
    icon: "✪",
    desc: "获得 980 星晶 + 赠送 110",
  },
  {
    id: "recharge_198",
    price: 198,
    crystals: 1980,
    bonusCrystals: 260,
    firstBonusCrystals: 1980,
    name: "星河宝匣",
    badge: "大额畅享",
    icon: "❂",
    desc: "获得 1,980 星晶 + 赠送 260",
  },
  {
    id: "recharge_398",
    price: 398,
    crystals: 3980,
    bonusCrystals: 600,
    firstBonusCrystals: 3980,
    name: "极光天穹",
    badge: "殿堂尊享",
    icon: "✵",
    desc: "获得 3,980 星晶 + 赠送 600",
  },
  {
    id: "recharge_648",
    price: 648,
    crystals: 6480,
    bonusCrystals: 1280,
    firstBonusCrystals: 6480,
    name: "星界主权",
    badge: "至尊极荐",
    icon: "✹",
    desc: "获得 6,480 星晶 + 赠送 1,280",
  },
  {
    id: "recharge_1028",
    price: 1028,
    crystals: 10280,
    bonusCrystals: 2580,
    firstBonusCrystals: 10280,
    name: "万界主宰",
    badge: "神眷典藏",
    icon: "✺",
    desc: "获得 10,280 星晶 + 赠送 2,580",
  },
];

export interface ShopGoodItem {
  id: string;
  name: string;
  desc: string;
  price: number;
  currency: "crystals" | "gold";
  gold?: number;
  stamina?: number;
  material?: string;
  count?: number;
  icon: string;
  badge?: string;
  category: "gold" | "supplies";
  dailyLimit?: number;
}

export const GOLD_GOODS: ShopGoodItem[] = [
  {
    id: "gold_free",
    name: "商会每日赠礼",
    desc: "万界商会每日赠予的盘缠，无偿馈赠，每日可领一次",
    price: 0,
    currency: "crystals",
    gold: 3000,
    icon: "🎁",
    badge: "每日免费",
    category: "gold",
    dailyLimit: 1,
  },
  {
    id: "gold_small",
    name: "零散钱袋",
    desc: "获得 2,500 金币，小额应急，起步无忧",
    price: 40,
    currency: "crystals",
    gold: 2500,
    icon: "🪙",
    badge: "应急实惠",
    category: "gold",
  },
  {
    id: "gold",
    name: "行旅盘缠",
    desc: "获得 8,000 金币，用于招募与伙伴日常进阶",
    price: 120,
    currency: "crystals",
    gold: 8000,
    icon: "◇",
    badge: "经典常备",
    category: "gold",
  },
  {
    id: "gold_large",
    name: "商贾宝箱",
    desc: "获得 22,000 金币，内含丰厚财富（加赠 10%）",
    price: 300,
    currency: "crystals",
    gold: 22000,
    icon: "💰",
    badge: "加赠10%",
    category: "gold",
  },
  {
    id: "gold_xlarge",
    name: "万界金库",
    desc: "获得 48,000 金币，大幅扩充行会金库（加赠 20%）",
    price: 600,
    currency: "crystals",
    gold: 48000,
    icon: "💎",
    badge: "热门+20%",
    category: "gold",
  },
  {
    id: "gold_treasury",
    name: "帝国秘藏",
    desc: "获得 105,000 金币，富甲一方的巨额财宝（加赠 30%）",
    price: 1200,
    currency: "crystals",
    gold: 105000,
    icon: "👑",
    badge: "豪礼+30%",
    category: "gold",
  },
  {
    id: "gold_mountain",
    name: "永恒金山",
    desc: "获得 220,000 金币，一举登顶财富顶峰（加赠 40%）",
    price: 2400,
    currency: "crystals",
    gold: 220000,
    icon: "🏛️",
    badge: "至尊+40%",
    category: "gold",
  },
];

export const SUPPLY_GOODS: ShopGoodItem[] = [
  { id: "wish_water", name: "造化之水", desc: "常驻角色与本命神兵祈愿，每次消耗1份", price: 160, currency: "crystals", material: "造化之水", count: 1, icon: "◈", category: "supplies" },
  { id: "wish_lotus", name: "造化青莲", desc: "联动与限定五星祈愿，每次消耗1朵", price: 160, currency: "crystals", material: "造化青莲", count: 1, icon: "✧", category: "supplies" },
  {
    id: "stamina",
    name: "灵泉甘露",
    desc: "恢复 60 体力（最多持有 240）",
    price: 80,
    currency: "crystals",
    stamina: 60,
    icon: "◌",
    badge: "恢复体力",
    category: "supplies",
  },
  {
    id: "core",
    name: "纯净星核",
    desc: "获得 1 枚星核，用于锻造专武和升华核心",
    price: 2000,
    currency: "gold",
    material: "纯净星核",
    count: 1,
    icon: "✧",
    badge: "锻造专武",
    category: "supplies",
  },
  {
    id: "prism",
    name: "折光棱晶",
    desc: "获得 3 枚稀有养成素材",
    price: 900,
    currency: "gold",
    material: "折光棱晶",
    count: 3,
    icon: "◈",
    badge: "突破素材",
    category: "supplies",
  },
  {
    id: "exp_books",
    name: "战术经验书",
    desc: "获得 5 本战术经验书，用于角色飞速升级",
    price: 1500,
    currency: "gold",
    material: "战术经验书",
    count: 5,
    icon: "📜",
    badge: "角色进阶",
    category: "supplies",
  },
];

export const SHOP_GOODS: readonly ShopGoodItem[] = [
  ...GOLD_GOODS,
  ...SUPPLY_GOODS,
];

