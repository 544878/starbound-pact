export type Screen =
  | "home"
  | "formation"
  | "battle"
  | "companions"
  | "summon"
  | "inventory"
  | "shop"
  | "story"
  | "tower"
  | "tasks"
  | "activities";
export type Element = "wind" | "water" | "light" | "flora" | "shadow" | "fire";
export type Role = "guardian" | "striker" | "mystic" | "support";
export type Rarity = "4星" | "5星";
export type Realm = "神" | "半神" | "帝" | "神使" | "大尊" | "主角团";

export interface Companion {
  v2FunctionalSouls?: import("../systems/v2/functionalSouls").FunctionalSouls;
  v2Souls?: import("../systems/v2/souls").Soul[];
  numericId?: string;
  id: string;
  name: string;
  title: string;
  element: Element;
  role: Role;
  rarity: Rarity;
  level: number;
  ascension?: number;
  power: number;
  constellation: number;
  accent: string;
  artPosition: string;
  skills: [string, string];
  skillLevels?: number[];
  gender: "female" | "male";
  persona?: string;
  biography?: string;
  portraitSource?: "companion" | "enemy";
  rings?: Array<string | null>;
  ringLevels?: number[];
  quotes?: string[];
  realm?: Realm;
  path?: import("./combat").PathId;
  adaptedPath?: import("./combat").PathId;
  faction?: string;
  soulName?: string;
  weaponName?: string;
  vow?: string;
}

export interface Weapon {
  id: string;
  name: string;
  rarity: Rarity;
  level: number;
  ascension?: number;
  refinement: number;
  ownerId?: string;
  signatureFor?: string;
  passive?: string;
}

export interface DropItem {
  id: string;
  name: string;
  count: number;
  rarity: Rarity;
  icon: string;
  description?: string;
}

export type TaskType = "daily" | "weekly" | "monthly";

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  desc: string;
  target: number;
  progress: number;
  rewardCrystals: number;
  rewardGold: number;
  rewardActivity: number;
  rewardItem?: { name: string; count: number; icon: string };
  claimed: boolean;
}

export interface StoryStage {
  id: string;
  chapterId: number;
  stageNum: string;
  title: string;
  synopsis: string;
  recommendedPower: number;
  staminaCost: number;
  firstClearRewards: {
    crystals: number;
    gold: number;
    items: Array<{ name: string; count: number; icon: string }>;
  };
  cleared: boolean;
  stars: number;
}

export interface StoryChapter {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  stages: StoryStage[];
}

export interface SideQuest {
  id: string;
  title: string;
  tag: "角色" | "秘闻" | "委托";
  description: string;
  targetCount: number;
  progress: number;
  rewardCrystals: number;
  rewardGold: number;
  rewardMaterials: Array<{ name: string; count: number; icon: string }>;
  claimed: boolean;
}

export type TowerEnemyType = "mob" | "elite" | "boss_rush" | "dual_boss";

export interface TowerRegion {
  id: 1 | 2 | 3;
  name: string;
  subtitle: string;
  theme: string;
  description: string;
  bossCount: number;
  bosses: string[];
  icon: string;
  tag: string;
}

export interface TowerFloor {
  floor: number;
  regionId: 1 | 2 | 3;
  stageInRegion: number;
  title: string;
  subtitle?: string;
  recommendedPower: number;
  enemyType: TowerEnemyType;
  mechanicTag: string;
  modifierName: string;
  modifierDesc: string;
  bossName: string;
  bossElement: Element;
  bossArt?: string;
  bossesInWave?: string[];
  firstClearRewards: {
    crystals: number;
    gold: number;
    materials: Array<{ name: string; count: number; icon: string }>;
  };
  sweepRewards: {
    gold: number;
    materials: Array<{ name: string; count: number; icon: string }>;
  };
  cleared: boolean;
}


export interface GameState {
  battleRulesVersion?: number;
  commerce?: import('./commerce').CommerceState;
  wardrobe?: import('./commerce').WardrobeState;
  formationPath?: import("./combat").PathId;
  taskPeriods?: { day: string; week: string; month: string };
  encounter?: { kind: "story" | "tower" | "trial" | "resource"; id: string };
  battleTicket?: number;
  storyChoices?: Record<string, "self" | "team">;
  formationPresets?: Array<Array<string | null>>;
  formationPresetPaths?: Array<import("./combat").PathId | undefined>;
  screen: Screen;
  stamina: number;
  crystals: number;
  gold: number;
  pityCharacter: number;
  standardPullTotal: number;
  standardSelectorClaimed: boolean;
  pityLimited: number;
  pityCollab?: number;
  limitedGuaranteed: boolean;
  pullHistory: Array<PullResult & { pool: string; time: string }>;
  pityWeapon: number;
  companions: Companion[];
  weapons: Weapon[];
  formation: Array<string | null>;
  selectedCompanionId: string;
  weaponTargetCompanionId?: string;
  battleSeed: number;
  hasSeenTutorial: boolean;

  // 玩家基础信息
  playerLevel: number;
  playerExp: number;

  // 材料背包
  materials: Record<string, number>;

  // 主线与支线
  mainStoryChapter: number;
  mainStoryStageId: string;
  completedStages: string[];
  sideQuests: SideQuest[];

  // 任务系统
  dailyTasks: Task[];
  weeklyTasks: Task[];
  monthlyTasks: Task[];
  dailyActivity: number;
  weeklyActivity: number;
  monthlyActivity: number;
  claimedDailyChests: number[];
  claimedWeeklyChests: number[];
  claimedMonthlyChests: number[];

  // 深塔系统
  towerFloor: number;
  highestTowerFloor: number;
  clearedTowerFloors?: number[];

  // 看板娘互动
  assistantQuoteIndex: number;

  // 最近一次战斗掉落
  lastBattleDrops?: DropItem[];

  // 常驻活动小游戏系统
  homestead: HomesteadState;
  currencyWarsHighScore: number;
  defenseHighScore: number;
  pvpWins: number;

  // 充值记录
  rechargedTiers?: Record<string, boolean>;
  totalRechargedRmb?: number;
}

export interface HomesteadState {
  comfort: number;
  stationedCompanionIds: string[];
  accumulatedStamina: number;
  accumulatedGold: number;
  lastHarvestTimestamp: number;
}

export interface PullResult {
  kind: "companion" | "weapon";
  id: string;
  rarity: Rarity;
  duplicate: boolean;
}
