import { ascensionStage, ascensionCost, levelCap, skillCost } from "../systems/progression";
import { createSoul, soulFor, upgradeSoul, hydrateSouls, type Soul, type SoulStat } from "../systems/v2/souls";
import { hydrateFunctionalSouls, type FunctionalSoulChoice } from "../systems/v2/functionalSouls";
import { resourceDungeon, resourceDrops } from "../data/resourceDungeons";
import { STANDARD_FIVE_IDS } from "../systems/gacha";
import { reduceCommerce, hydrateCommerce, hydrateWardrobe, emptyCommerce, emptyWardrobe, type CommerceAction } from '../systems/commerce';
import { ringLevel, ringUnlocked } from "../systems/ringAffixes";
import { wishPayment, type WishPool } from "../systems/wishCurrency";
import { soulPrice } from "../systems/rosterCombat";
import { COMBAT_PATHS } from "../data/combat";
import { RECHARGE_TIERS, SHOP_GOODS } from "../data/shop";
import { RULES } from "../data/advancedRules";
import {
  activityMilestones,
  companionCatalog,
  companions,
  getCompanionById,
  initialDailyTasks,
  initialMonthlyTasks,
  initialSideQuests,
  initialStoryChapters,
  initialWeeklyTasks,
  towerFloors,
  weapons,
  weaponCatalog,
} from "../data/catalog";
import type {
  Companion,
  DropItem,
  GameState,
  PullResult,
  Screen,
  Task,
} from "../domain/types";
import { generateBattleDrops } from "../systems/battle";
import { getEncounter, stageUnlocked } from "../data/encounters";

export const STORAGE_KEY = "starbound-pact-v3";
export const LEGACY_STORAGE_KEY = "starbound-pact-v2";
export const OLD_STORAGE_KEY = "starbound-pact-v1";
export const SAVE_VERSION = 10;

export type GameAction =
  | { type: "UPGRADE_V2_SOUL"; id: string; slot: number }
  | { type: "SET_V2_FUNCTIONAL_SOUL"; id: string; slot: 6 | 7 | 8; choice: FunctionalSoulChoice }
  | { type: "SET_V2_SOUL_MAIN"; id: string; slot: number; main: SoulStat }
  | { type: "FOCUS_V2_SOUL"; id: string; slot: number; focus: Soul["focus"] }
  | CommerceAction
  | { type: "CLAIM_STANDARD_SELECTOR"; id: string }
  | { type: "REFRESH_PERIODS" }
  | { type: "BUY_SOUL"; id: string }
  | { type: "ACTIVATE_CONSTELLATION"; id: string }
  | { type: "SET_PATH"; path: import("../domain/combat").PathId }
  | { type: "BUY_GOODS"; id: string; count?: number }
  | { type: "RECHARGE"; tierId: string }
  | { type: "ADD_GOLD"; amount: number }
  | { type: "RECRUIT"; id: string }
  | { type: "FORGE_WEAPON"; id: string }
  | { type: "ASCEND"; kind: "companion" | "weapon"; id: string }
  | { type: "UPGRADE_SKILL"; id: string; slot: number }
  | { type: "UPGRADE_WEAPON"; id: string }
  | { type: "CRAFT_RING"; id: string; slot: number }
  | {
      type: "PREPARE_ENCOUNTER";
      encounter: NonNullable<GameState["encounter"]>;
    }
  | { type: "STORY_CHOICE"; id: string; choice: "self" | "team" }
  | { type: "SAVE_FORMATION"; slot: number }
  | { type: "LEVEL_UP"; id: string }
  | { type: "LEVEL_UP_MAX"; id: string; targetLevel?: number }
  | { type: "EQUIP_WEAPON"; id: string; weaponId: string }
  | { type: "EQUIP_RING"; id: string; slot: number; exclusive: boolean }
  | { type: "UPGRADE_RING"; id: string; slot: number }
  | { type: "PULL_RING"; id: string; slot: number; roll: number }
  | { type: "NAVIGATE"; screen: Screen }
  | { type: "SELECT_COMPANION"; id: string }
  | { type: "SET_WEAPON_TARGET"; id: string }
  | { type: "SET_FORMATION"; formation: Array<string | null> }
  | { type: "START_BATTLE" }
  | {
      type: "FINISH_BATTLE";
      drops?: DropItem[];
      victory?: boolean;
      ticket?: number;
    }
  | {
      type: "APPLY_PULLS";
      kind: "companion" | "weapon";
      pool?: WishPool;
      guaranteed?: boolean;
      time?: string;
      count: number;
      results: PullResult[];
      pity: number;
    }
  | { type: "ADD_CRYSTALS"; amount: number }
  | { type: "RESET" }
  | {
      type: "CLAIM_TASK";
      taskType: "daily" | "weekly" | "monthly";
      taskId: string;
    }
  | { type: "CLAIM_ALL_TASKS"; taskType?: "daily" | "weekly" | "monthly" }
  | {
      type: "CLAIM_ACTIVITY_CHEST";
      taskType: "daily" | "weekly" | "monthly";
      points: number;
    }
  | { type: "COMPLETE_STORY_STAGE"; stageId: string; victory?: boolean }
  | { type: "CLAIM_SIDE_QUEST"; questId: string }
  | { type: "CLEAR_TOWER_FLOOR"; floor: number; victory?: boolean }
  | { type: "SWEEP_TOWER_FLOOR"; floor: number }
  | { type: "CYCLE_ASSISTANT_QUOTE" }
  | { type: "HARVEST_HOMESTEAD" }
  | { type: "UPDATE_CURRENCY_WARS_SCORE"; score: number }
  | { type: "UPDATE_DEFENSE_SCORE"; score: number }
  | { type: "RECORD_PVP_WIN"; winner?: "player1" | "player2" }
  | { type: "TOGGLE_STATION_COMPANION"; companionId: string };

export function createInitialState(): GameState {
  return {
    commerce: emptyCommerce(),
    wardrobe: emptyWardrobe(),
    screen: "home",
    taskPeriods: currentPeriods(),
    storyChoices: {},
    formationPresets: [],
    formationPresetPaths: [],
    stamina: 86,
    crystals: 1280,
    gold: 24800,
    pityCharacter: 34,
    standardPullTotal: 0,
    standardSelectorClaimed: false,
    pityLimited: 0,
    pityCollab: 0,
    limitedGuaranteed: false,
    pullHistory: [],
    pityWeapon: 12,
    playerLevel: 35,
    playerExp: 2450,
    battleRulesVersion: 2,
    companions: companions.map((companion) => ({
      ...companion,
      v2Souls: [0, 1, 2, 3, 4, 5].map((slot) => createSoul(companion.id, slot)),
      v2FunctionalSouls: {},
    })),
    weapons: weapons.map((weapon) => ({ ...weapon })),
    formation: [
      "lumi",
      "alden",
      "selene",
      "mira",
      null,
      null,
      "noctis",
      null,
      null,
    ],
    selectedCompanionId: "selene",
    weaponTargetCompanionId: "yanhuang",
    battleSeed: 7,
    hasSeenTutorial: true,

    materials: {
      风灵花蜜: 12,
      曜金碎屑: 19,
      潮汐结晶: 26,
      森语种子: 33,
      影蚀粉尘: 40,
      赤焰芯核: 47,
      纯净星核: 3,
      折光棱晶: 8,
      战术经验书: 15,
    },

    mainStoryChapter: 1,
    mainStoryStageId: "1-3",
    completedStages: ["1-1", "1-2"],
    sideQuests: initialSideQuests.map((quest) => ({ ...quest })),

    dailyTasks: initialDailyTasks.map((task) => ({ ...task })),
    weeklyTasks: initialWeeklyTasks.map((task) => ({ ...task })),
    monthlyTasks: initialMonthlyTasks.map((task) => ({ ...task })),
    dailyActivity: 60,
    weeklyActivity: 60,
    monthlyActivity: 100,
    claimedDailyChests: [20, 40],
    claimedWeeklyChests: [30],
    claimedMonthlyChests: [50],

    towerFloor: 5,
    highestTowerFloor: 4,
    clearedTowerFloors: [1, 2, 3, 4],
    assistantQuoteIndex: 0,

    homestead: {
      comfort: 520,
      stationedCompanionIds: ["lumi", "mira", "selene"],
      accumulatedStamina: 24,
      accumulatedGold: 4800,
      lastHarvestTimestamp: Date.now() - 3600 * 1000,
    },
    currencyWarsHighScore: 0,
    defenseHighScore: 5,
    pvpWins: 3,
    rechargedTiers: {},
    totalRechargedRmb: 0,
  };
}

function normalizeFormation(formation: unknown, ownedCompanions: Companion[]) {
  const ownedIds = new Set(ownedCompanions.map((companion) => companion.id));
  const usedIds = new Set<string>();
  let placed = 0;
  const slots = Array.isArray(formation) ? formation.slice(0, 9) : [];
  return Array.from({ length: 9 }, (_, index) => {
    const id = slots[index];
    if (
      typeof id !== "string" ||
      !ownedIds.has(id) ||
      usedIds.has(id) ||
      placed >= 5
    )
      return null;
    usedIds.add(id);
    placed += 1;
    return id;
  });
}

function addMaterials(
  current: Record<string, number>,
  items: Array<{ name: string; count: number }>,
): Record<string, number> {
  const next = { ...current };
  for (const item of items) {
    next[item.name] = (next[item.name] ?? 0) + item.count;
  }
  return next;
}

function coreReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'CREATE_SHOP_ORDER':
    case 'SETTLE_SHOP_ORDER':
    case 'CLAIM_MONTHLY':
    case 'EQUIP_SKIN':
    case 'SET_SKIN_MOTION':
      return reduceCommerce(state, action);
    case "REFRESH_PERIODS":
      return state;
    case "SET_PATH":
      return COMBAT_PATHS.some((p) => p.id === action.path)
        ? { ...state, formationPath: action.path }
        : state;
    case "BUY_SOUL": {
      const c = state.companions.find((c) => c.id === action.id);
      if (
        !c ||
        state.crystals < soulPrice(c) ||
        c.constellation + (state.materials[`soul:${c.id}`] ?? 0) >= 6
      )
        return state;
      return {
        ...state,
        crystals: state.crystals - soulPrice(c),
        materials: addMaterials(state.materials, [
          { name: `soul:${c.id}`, count: 1 },
        ]),
      };
    }
    case "ACTIVATE_CONSTELLATION": {
      const c = state.companions.find((c) => c.id === action.id),
        key = `soul:${action.id}`;
      if (!c || c.constellation >= 6 || !(state.materials[key] > 0))
        return state;
      return {
        ...state,
        materials: { ...state.materials, [key]: state.materials[key] - 1 },
        companions: state.companions.map((u) =>
          u.id === c.id ? { ...u, constellation: u.constellation + 1 } : u,
        ),
      };
    }
    case "BUY_GOODS": {
      const item = SHOP_GOODS.find((g) => g.id === action.id);
      const count = Math.max(1, Math.floor(action.count ?? 1));
      if (!item) return state;

      const totalPrice = item.price * count;
      if (state[item.currency] < totalPrice) return state;

      if (item.stamina && state.stamina + item.stamina * count > 240) {
        return state;
      }
      if (item.id === "stamina" && state.stamina > 180) {
        return state;
      }

      const todayKey = `shop_claimed_${item.id}_${state.taskPeriods?.day ?? "today"}`;
      const claimedSoFar = state.materials[todayKey] ?? 0;
      if (
        item.dailyLimit &&
        claimedSoFar + count > item.dailyLimit
      ) {
        return state;
      }

      const next = {
        ...state,
        [item.currency]: state[item.currency] - totalPrice,
      };
      if ("stamina" in item && typeof item.stamina === "number")
        next.stamina += item.stamina * count;
      if ("gold" in item && typeof item.gold === "number")
        next.gold += item.gold * count;
      if (
        "material" in item &&
        typeof item.material === "string" &&
        typeof item.count === "number"
      )
        next.materials = addMaterials(next.materials, [
          { name: item.material, count: item.count * count },
        ]);
      if (item.dailyLimit) {
        next.materials = {
          ...next.materials,
          [todayKey]: claimedSoFar + count,
        };
      }
      return next;
    }
    case "RECRUIT": {
      const c = getCompanionById(action.id);
      const cost = c?.rarity === "5星" ? 6000 : 3000;
      if (
        !c ||
        state.companions.some((u) => u.id === c.id) ||
        state.gold < cost
      )
        return state;
      return {
        ...state,
        gold: state.gold - cost,
        companions: [...state.companions, { ...c, constellation: 0 }],
        selectedCompanionId: c.id,
      };
    }
    case "FORGE_WEAPON": {
      const w = weaponCatalog.find((w) => w.signatureFor === action.id);
      if (
        !w ||
        !state.companions.some((c) => c.id === action.id) ||
        state.weapons.some((u) => u.id === w.id) ||
        state.gold < 2000 ||
        (state.materials["纯净星核"] ?? 0) < 1
      )
        return state;
      return {
        ...state,
        gold: state.gold - 2000,
        materials: {
          ...state.materials,
          纯净星核: state.materials["纯净星核"] - 1,
        },
        weapons: [...state.weapons, { ...w }],
      };
    }
    case "ASCEND": {
      const list = action.kind === "companion" ? state.companions : state.weapons;
      const unit = list.find(u => u.id === action.id);
      if (!unit || unit.level >= 90 || unit.level !== levelCap(unit) || (state.materials["纯净星核"] ?? 0) < ascensionCost(unit)) return state;
      const key = action.kind === "companion" ? "companions" : "weapons";
      return { ...state, materials: { ...state.materials, 纯净星核: state.materials["纯净星核"] - ascensionCost(unit) }, [key]: list.map(u => u.id === unit.id ? { ...u, ascension: ascensionStage(u) + 1 } : u) };
    }
    case "UPGRADE_SKILL": {
      const c = state.companions.find(c => c.id === action.id);
      if (!c || !Number.isInteger(action.slot) || action.slot < 0 || action.slot > 2) return state;
      const cost = skillCost(c, action.slot);
      if (cost.level >= cost.cap || state.gold < cost.gold || (state.materials["战术经验书"] ?? 0) < cost.book || (state.materials[cost.material] ?? 0) < cost.count) return state;
      return { ...state, gold: state.gold - cost.gold, materials: { ...state.materials, 战术经验书: state.materials["战术经验书"] - cost.book, [cost.material]: state.materials[cost.material] - cost.count }, companions: state.companions.map(u => u.id === c.id ? { ...u, skillLevels: Array.from({ length: 3 }, (_, i) => i === action.slot ? cost.level + 1 : (u.skillLevels?.[i] ?? 1)) } : u) };
    }
    case "UPGRADE_WEAPON": {
      const w = state.weapons.find((w) => w.id === action.id);
      if (!w || w.level >= levelCap(w) || state.gold < 300 || (state.materials["折光棱晶"] ?? 0) < 1) return state;
      return {
        ...state,
        gold: state.gold - 300,
        materials: { ...state.materials, 折光棱晶: state.materials["折光棱晶"] - 1 },
        weapons: state.weapons.map((w) =>
          w.id === action.id ? { ...w, level: w.level + 1 } : w,
        ),
      };
    }
    case "CRAFT_RING": {
      const key = `ring:${action.id}:${action.slot}`;
      if (
        !Number.isInteger(action.slot) ||
        action.slot < 0 ||
        action.slot > 2 ||
        !state.companions.some((c) => c.id === action.id) ||
        state.materials[key] > 0 ||
        state.gold < 1500 ||
        (state.materials["纯净星核"] ?? 0) < 1
      )
        return state;
      return {
        ...state,
        gold: state.gold - 1500,
        materials: {
          ...state.materials,
          纯净星核: state.materials["纯净星核"] - 1,
          [key]: 1,
        },
      };
    }
    case "PREPARE_ENCOUNTER": {
      const e = action.encounter;
      if (e.kind === "resource" && !resourceDungeon(e.id)) return state;
      if (e.kind === "story" && !stageUnlocked(state.completedStages, e.id))
        return state;
      if (e.kind === "tower") {
        const floorNum = Number(e.id);
        const cleared = state.clearedTowerFloors ?? Array.from({ length: state.highestTowerFloor }, (_, i) => i + 1);
        const isFirstInRegion = floorNum === 1 || floorNum === 7 || floorNum === 13;
        const isUnlocked = isFirstInRegion || cleared.includes(floorNum) || cleared.includes(floorNum - 1);
        if (!towerFloors.some((f) => String(f.floor) === e.id) || !isUnlocked)
          return state;
      }
      return {
        ...state,
        encounter: e,
        battleTicket: undefined,
        screen: "formation",
      };
    }
    case "STORY_CHOICE": {
      if (
        !state.completedStages.includes(action.id) ||
        !action.id.endsWith("-4") ||
        !["self", "team"].includes(action.choice)
      )
        return state;
      return {
        ...state,
        storyChoices: { ...state.storyChoices, [action.id]: action.choice },
      };
    }
    case "SAVE_FORMATION": {
      if (!Number.isInteger(action.slot) || action.slot < 0 || action.slot > 8)
        return state;
      const presets = [...(state.formationPresets ?? [])];
      presets[action.slot] = [...state.formation];
      const presetPaths = [...(state.formationPresetPaths ?? [])];
      presetPaths[action.slot] = state.formationPath;
      return { ...state, formationPresets: presets, formationPresetPaths: presetPaths };
    }
    case "LEVEL_UP": {
      const c = state.companions.find((c) => c.id === action.id);
      if (
        !c ||
        c.level >= levelCap(c) ||
        state.gold < RULES.growth.levelCost
      )
        return state;
      return {
        ...state,
        gold: state.gold - RULES.growth.levelCost,
        companions: state.companions.map((c) =>
          c.id === action.id ? { ...c, level: c.level + 1 } : c,
        ),
      };
    }
    case "LEVEL_UP_MAX": {
      const c = state.companions.find((c) => c.id === action.id);
      if (
        !c ||
        c.level >= levelCap(c) ||
        state.gold < RULES.growth.levelCost
      )
        return state;
      if (action.targetLevel !== undefined && !Number.isInteger(action.targetLevel)) return state;
      const target = Math.min(
        action.targetLevel ?? levelCap(c),
        levelCap(c),
      );
      const neededLevels = Math.max(0, target - c.level);
      const affordableLevels = Math.floor(state.gold / RULES.growth.levelCost);
      const levelsToAdd = Math.min(neededLevels, affordableLevels);
      if (levelsToAdd <= 0) return state;
      return {
        ...state,
        gold: state.gold - levelsToAdd * RULES.growth.levelCost,
        companions: state.companions.map((comp) =>
          comp.id === action.id
            ? { ...comp, level: comp.level + levelsToAdd }
            : comp,
        ),
      };
    }
    case "EQUIP_WEAPON": {
      if (
        !state.companions.some((c) => c.id === action.id) ||
        !state.weapons.some((w) => w.id === action.weaponId)
      )
        return state;
      return {
        ...state,
        weapons: state.weapons.map((w) => ({
          ...w,
          ownerId:
            w.id === action.weaponId
              ? action.id
              : w.ownerId === action.id
                ? undefined
                : w.ownerId,
        })),
      };
    }
    case "EQUIP_RING": {
      if (
        !Number.isInteger(action.slot) ||
        action.slot < 0 ||
        action.slot > 2 ||
        !state.companions.some((c) => c.id === action.id)
      )
        return state;
      const key = "ring:" + action.id + ":" + action.slot;
      if (action.exclusive && !(state.materials[key] > 0)) return state;
      return {
        ...state,
        companions: state.companions.map((c) => {
          if (c.id !== action.id) return c;
          const rings = [...(c.rings ?? [null, null, null])];
          rings[action.slot] =
            (action.exclusive ? "exclusive-" : "common-") + (action.slot + 7);
          return { ...c, rings };
        }),
      };
    }
    case "UPGRADE_RING": {
      const c = state.companions.find((c) => c.id === action.id);
      if (
        !c ||
        !Number.isInteger(action.slot) ||
        action.slot < 0 ||
        action.slot > 8 ||
        !ringUnlocked(c, action.slot)
      )
        return state;
      const level = ringLevel(c, action.slot),
        cost = 200 + level * 50;
      if (level >= 12 || state.gold < cost) return state;
      const levels = Array.from({ length: 9 }, (_, i) => ringLevel(c, i));
      levels[action.slot]++;
      return {
        ...state,
        gold: state.gold - cost,
        companions: state.companions.map((u) =>
          u.id === c.id ? { ...u, ringLevels: levels } : u,
        ),
      };
    }
    case "PULL_RING": {
      if (
        !Number.isInteger(action.slot) ||
        action.slot < 0 ||
        action.slot > 2 ||
        !state.companions.some((c) => c.id === action.id) ||
        state.crystals < RULES.growth.pullCost ||
        !Number.isFinite(action.roll) ||
        action.roll < 0 ||
        action.roll >= 1
      )
        return state;
      const key = "ring:" + action.id + ":" + action.slot,
        pityKey = key + ":pity";
      if (state.materials[key] > 0) return state;
      const pity = state.materials[pityKey] ?? 0,
        won = pity >= RULES.growth.ringPity - 1 || action.roll < 0.08;
      return {
        ...state,
        crystals: state.crystals - RULES.growth.pullCost,
        materials: {
          ...state.materials,
          [key]: won ? 1 : 0,
          [pityKey]: won ? 0 : pity + 1,
        },
      };
    }
    case "NAVIGATE":
      return {
        ...state,
        screen: action.screen,
        battleTicket:
          action.screen === "battle" ? state.battleTicket : undefined,
      };

    case "UPGRADE_V2_SOUL": {
      const c = state.companions.find((comp) => comp.id === action.id);
      if (!c || !Number.isInteger(action.slot) || action.slot < 0 || action.slot > 5) return state;
      const currentSoul = soulFor(c, action.slot);
      const cost = 200 + currentSoul.level * 50;
      if (currentSoul.level >= 20 || state.gold < cost) return state;
      const upgraded = upgradeSoul(c.id, currentSoul);
      const existingSouls = c.v2Souls ?? [0, 1, 2, 3, 4, 5].map((s) => createSoul(c.id, s));
      const newSouls = [0, 1, 2, 3, 4, 5].map((s) =>
        s === action.slot ? upgraded : (existingSouls.find((x) => x.slot === s) ?? createSoul(c.id, s)),
      );
      return {
        ...state,
        gold: state.gold - cost,
        companions: state.companions.map((comp) =>
          comp.id === action.id ? { ...comp, v2Souls: newSouls } : comp,
        ),
      };
    }

    case "SET_V2_FUNCTIONAL_SOUL": {
      const c = state.companions.find((comp) => comp.id === action.id);
      if (!c || ![6, 7, 8].includes(action.slot)) return state;
      const current = c.v2FunctionalSouls ?? {};
      return {
        ...state,
        companions: state.companions.map((comp) =>
          comp.id === action.id
            ? {
                ...comp,
                v2FunctionalSouls: { ...current, [action.slot]: action.choice },
              }
            : comp,
        ),
      };
    }

    case "SET_V2_SOUL_MAIN": {
      const c = state.companions.find((comp) => comp.id === action.id);
      if (!c || !Number.isInteger(action.slot) || action.slot < 0 || action.slot > 5) return state;
      const voucherKey = `V2魂转换券:${c.id}:${action.slot}`;
      const voucherCount = state.materials[voucherKey] ?? 0;
      const soulShards = state.materials["魂片"] ?? 0;
      if (voucherCount < 1 && soulShards < 60) return state;
      const currentSoul = soulFor(c, action.slot);
      const refund = Math.floor(
        (currentSoul.level * 200 + 50 * ((currentSoul.level * (currentSoul.level - 1)) / 2)) * 0.9,
      );
      const resetSoul = createSoul(c.id, action.slot, action.main);
      const existingSouls = c.v2Souls ?? [0, 1, 2, 3, 4, 5].map((s) => createSoul(c.id, s));
      const newSouls = [0, 1, 2, 3, 4, 5].map((s) =>
        s === action.slot ? resetSoul : (existingSouls.find((x) => x.slot === s) ?? createSoul(c.id, s)),
      );
      return {
        ...state,
        gold: state.gold + refund,
        materials: {
          ...state.materials,
          ...(voucherCount > 0
            ? { [voucherKey]: voucherCount - 1 }
            : { 魂片: soulShards - 60 }),
        },
        companions: state.companions.map((comp) =>
          comp.id === action.id ? { ...comp, v2Souls: newSouls } : comp,
        ),
      };
    }

    case "FOCUS_V2_SOUL": {
      const c = state.companions.find((comp) => comp.id === action.id);
      if (!c || !Number.isInteger(action.slot) || action.slot < 0 || action.slot > 5) return state;
      const currentSoul = soulFor(c, action.slot);
      const updatedSoul = { ...currentSoul, focus: action.focus };
      const existingSouls = c.v2Souls ?? [0, 1, 2, 3, 4, 5].map((s) => createSoul(c.id, s));
      const newSouls = [0, 1, 2, 3, 4, 5].map((s) =>
        s === action.slot ? updatedSoul : (existingSouls.find((x) => x.slot === s) ?? createSoul(c.id, s)),
      );
      return {
        ...state,
        companions: state.companions.map((comp) =>
          comp.id === action.id ? { ...comp, v2Souls: newSouls } : comp,
        ),
      };
    }

    case "SELECT_COMPANION":
      return state.companions.some((item) => item.id === action.id)
        ? { ...state, selectedCompanionId: action.id, assistantQuoteIndex: 0 }
        : state;

    case "SET_WEAPON_TARGET":
      return companionCatalog.some((item) => item.id === action.id)
        ? { ...state, weaponTargetCompanionId: action.id }
        : state;

    case "SET_FORMATION":
      return {
        ...state,
        formation: normalizeFormation(action.formation, state.companions),
      };

    case "START_BATTLE": {
      const cost = getEncounter(state.encounter).cost;
      if (
        state.stamina < cost ||
        state.formation.filter(Boolean).length !== 5 ||
        state.battleTicket
      )
        return state;
      return {
        ...state,
        screen: "battle",
        stamina: state.stamina - cost,
        battleSeed: state.battleSeed + 1,
        battleTicket: state.battleSeed + 1,
      };
    }

    case "FINISH_BATTLE": {
      if (
        !action.victory ||
        !state.battleTicket ||
        action.ticket !== state.battleTicket ||
        state.screen !== "battle"
      )
        return state;
      const dungeon = state.encounter?.kind === "resource" ? resourceDungeon(state.encounter.id) : undefined;
      const drops = dungeon ? resourceDrops(dungeon.id) : action.drops ?? generateBattleDrops(state.battleSeed);
      let settled = state;
      if (state.encounter?.kind === "story")
        settled = gameReducer(state, {
          type: "COMPLETE_STORY_STAGE",
          stageId: state.encounter.id,
          victory: true,
        });
      if (state.encounter?.kind === "tower")
        settled = gameReducer(state, {
          type: "CLEAR_TOWER_FLOOR",
          floor: Number(state.encounter.id),
          victory: true,
        });
      const updatedMaterials = addMaterials(
        settled.materials,
        drops.map((d) => ({ name: d.name, count: d.count })),
      );
      return {
        ...settled,
        battleTicket: undefined,
        screen:
          state.encounter?.kind === "story"
            ? "story"
            : state.encounter?.kind === "tower"
              ? "tower"
              : state.encounter?.kind === "resource" ? "tasks" : "home",
        gold: settled.gold + (dungeon?.gold ?? 1800),
        crystals: settled.crystals + (dungeon ? 0 : 40),
        materials: updatedMaterials,
        lastBattleDrops: drops,
        sideQuests: settled.sideQuests.map((q) => ({
          ...q,
          progress: Math.min(
            q.targetCount,
            q.progress +
              (state.encounter?.kind === "story" ||
              state.encounter?.kind === "tower"
                ? 1
                : 0),
          ),
        })),
      };
    }

    case "CLAIM_STANDARD_SELECTOR": {
      if (
        state.standardPullTotal < 200 ||
        state.standardSelectorClaimed ||
        !STANDARD_FIVE_IDS.includes(action.id)
      )
        return state;
      const selected = companionCatalog.find((c) => c.id === action.id)!;
      const owned = state.companions.some((c) => c.id === action.id);
      return {
        ...state,
        standardSelectorClaimed: true,
        companions: owned
          ? state.companions.map((c) =>
              c.id === action.id
                ? { ...c, constellation: Math.min(6, c.constellation + 1) }
                : c,
            )
          : [...state.companions, { ...selected, constellation: 0 }],
      };
    }

    case "APPLY_PULLS": {
      const pool =
        action.kind === "weapon" ? "weapon" : (action.pool ?? "standard");
      if (
        pool === "limited" ||
        ![1, 10].includes(action.count) ||
        action.results.length !== action.count
      )
        return state;
      const payment = wishPayment(state, pool, action.count);
      if (!payment.affordable) return state;
      const cost = payment.crystals;
      const materials = {
        ...state.materials,
        [payment.resource]:
          (state.materials[payment.resource] ?? 0) - payment.tickets,
      };
      if (action.kind === "companion") {
        const acquired = companionCatalog.filter(
          (c) =>
            !state.companions.some((u) => u.id === c.id) &&
            action.results.some((r) => r.id === c.id),
        );
        const upgraded = [
          ...state.companions,
          ...acquired.map((c) => ({ ...c, constellation: -1 })),
        ].map((companion) => {
          const copies = action.results.filter(
            (result) => result.id === companion.id,
          ).length;
          return copies
            ? {
                ...companion,
                constellation: Math.min(6, companion.constellation + copies),
              }
            : companion;
        });
        return {
          ...state,
          crystals: Math.max(0, state.crystals - cost),
          materials,
          pityCharacter:
            action.pool === "collab" || action.pool === "limited"
              ? state.pityCharacter
              : action.pity,
          pityCollab: action.pool === "collab" ? action.pity : state.pityCollab,
          pityLimited:
            action.pool === "limited" ? action.pity : state.pityLimited,
          limitedGuaranteed:
            action.pool === "limited"
              ? Boolean(action.guaranteed)
              : state.limitedGuaranteed,
          pullHistory: [
            ...action.results
              .map((r) => ({
                ...r,
                pool: action.pool ?? "standard",
                time: action.time ?? "",
              }))
              .reverse(),
            ...state.pullHistory,
          ].slice(0, 100),
          standardPullTotal:
            state.standardPullTotal + (pool === "standard" ? action.count : 0),
          companions: upgraded,
        };
      }
      const acquired = weaponCatalog.filter(
        (w) =>
          !state.weapons.some((u) => u.id === w.id) &&
          action.results.some((r) => r.id === w.id),
      );
      const upgraded = [
        ...state.weapons,
        ...acquired.map((w) => ({ ...w, refinement: 0 })),
      ].map((weapon) => {
        const copies = action.results.filter(
          (result) => result.id === weapon.id,
        ).length;
        return copies
          ? { ...weapon, refinement: Math.min(5, weapon.refinement + copies) }
          : weapon;
      });
      return {
        ...state,
        crystals: Math.max(0, state.crystals - cost),
        materials,
        pityWeapon: action.pity,
        pullHistory: [
          ...action.results
            .map((r) => ({ ...r, pool: "weapon", time: action.time ?? "" }))
            .reverse(),
          ...state.pullHistory,
        ].slice(0, 100),
        weapons: upgraded,
      };
    }

    case "ADD_CRYSTALS":
      return { ...state, crystals: state.crystals + action.amount };

    case "ADD_GOLD":
      return { ...state, gold: state.gold + action.amount };

    case "RECHARGE": {
      const tier = RECHARGE_TIERS.find((t) => t.id === action.tierId);
      if (!tier) return state;
      const isFirst = !state.rechargedTiers?.[tier.id];
      const bonus = isFirst ? tier.firstBonusCrystals : tier.bonusCrystals;
      const totalCrystals = tier.crystals + bonus;
      return {
        ...state,
        crystals: state.crystals + totalCrystals,
        rechargedTiers: {
          ...(state.rechargedTiers ?? {}),
          [tier.id]: true,
        },
        totalRechargedRmb: (state.totalRechargedRmb ?? 0) + tier.price,
      };
    }

    case "RESET":
      return createInitialState();

    case "CLAIM_TASK": {
      const taskListKey =
        action.taskType === "daily"
          ? "dailyTasks"
          : action.taskType === "weekly"
            ? "weeklyTasks"
            : "monthlyTasks";
      const activityKey =
        action.taskType === "daily"
          ? "dailyActivity"
          : action.taskType === "weekly"
            ? "weeklyActivity"
            : "monthlyActivity";

      let gainedCrystals = 0;
      let gainedGold = 0;
      let gainedActivity = 0;
      const gainedItems: Array<{ name: string; count: number }> = [];

      const updatedTasks = state[taskListKey].map((task) => {
        if (
          task.id === action.taskId &&
          !task.claimed &&
          task.progress >= task.target
        ) {
          gainedCrystals += task.rewardCrystals;
          gainedGold += task.rewardGold;
          gainedActivity += task.rewardActivity;
          if (task.rewardItem) gainedItems.push(task.rewardItem);
          return { ...task, claimed: true };
        }
        return task;
      });

      return {
        ...state,
        [taskListKey]: updatedTasks,
        [activityKey]: Math.min(
          action.taskType === "daily"
            ? 100
            : action.taskType === "weekly"
              ? 150
              : 250,
          state[activityKey] + gainedActivity,
        ),
        crystals: state.crystals + gainedCrystals,
        gold: state.gold + gainedGold,
        materials: addMaterials(state.materials, gainedItems),
      };
    }

    case "CLAIM_ALL_TASKS": {
      let nextState = state;
      const typesToClaim: Array<"daily" | "weekly" | "monthly"> =
        action.taskType ? [action.taskType] : ["daily", "weekly", "monthly"];

      for (const t of typesToClaim) {
        const listKey =
          t === "daily"
            ? "dailyTasks"
            : t === "weekly"
              ? "weeklyTasks"
              : "monthlyTasks";
        const actKey =
          t === "daily"
            ? "dailyActivity"
            : t === "weekly"
              ? "weeklyActivity"
              : "monthlyActivity";
        let crystals = 0;
        let gold = 0;
        let activity = 0;
        const items: Array<{ name: string; count: number }> = [];

        const updated = nextState[listKey].map((task) => {
          if (!task.claimed && task.progress >= task.target) {
            crystals += task.rewardCrystals;
            gold += task.rewardGold;
            activity += task.rewardActivity;
            if (task.rewardItem) items.push(task.rewardItem);
            return { ...task, claimed: true };
          }
          return task;
        });

        nextState = {
          ...nextState,
          [listKey]: updated,
          [actKey]: Math.min(
            t === "daily" ? 100 : t === "weekly" ? 150 : 250,
            nextState[actKey] + activity,
          ),
          crystals: nextState.crystals + crystals,
          gold: nextState.gold + gold,
          materials: addMaterials(nextState.materials, items),
        };
      }
      return nextState;
    }

    case "CLAIM_ACTIVITY_CHEST": {
      const activity =
        action.taskType === "daily"
          ? state.dailyActivity
          : action.taskType === "weekly"
            ? state.weeklyActivity
            : state.monthlyActivity;
      if (activity < action.points) return state;
      const chestKey =
        action.taskType === "daily"
          ? "claimedDailyChests"
          : action.taskType === "weekly"
            ? "claimedWeeklyChests"
            : "claimedMonthlyChests";
      const currentClaimed = state[chestKey];
      if (currentClaimed.includes(action.points)) return state;

      const milestones = activityMilestones[action.taskType];
      const milestone = milestones.find((m) => m.points === action.points);
      if (!milestone) return state;

      return {
        ...state,
        [chestKey]: [...currentClaimed, action.points],
        crystals: state.crystals + milestone.rewardCrystals,
        gold: state.gold + milestone.rewardGold,
        materials: milestone.rewardItem
          ? addMaterials(state.materials, [milestone.rewardItem])
          : state.materials,
      };
    }

    case "COMPLETE_STORY_STAGE": {
      if (
        !action.victory ||
        !state.battleTicket ||
        state.encounter?.kind !== "story" ||
        state.encounter.id !== action.stageId ||
        !stageUnlocked(state.completedStages, action.stageId)
      )
        return state;
      if (state.completedStages.includes(action.stageId)) return state;
      const chapter = initialStoryChapters.find((c) =>
        c.stages.some((s) => s.id === action.stageId),
      );
      const stage = chapter?.stages.find((s) => s.id === action.stageId);
      const rewards = stage?.firstClearRewards;
      if (!stage || !chapter || !rewards) return state;
      const completed = [...state.completedStages, action.stageId];
      const next = initialStoryChapters
        .flatMap((c) => c.stages)
        .find((s) => !completed.includes(s.id));

      return {
        ...state,
        completedStages: completed,
        mainStoryChapter: next?.chapterId ?? initialStoryChapters.length,
        mainStoryStageId: next?.id ?? action.stageId,
        crystals: state.crystals + (rewards?.crystals ?? 50),
        gold: state.gold + (rewards?.gold ?? 2000),
        materials: rewards?.items
          ? addMaterials(state.materials, rewards.items)
          : state.materials,
        playerExp: state.playerExp + 200,
      };
    }

    case "CLAIM_SIDE_QUEST": {
      const quest = state.sideQuests.find((q) => q.id === action.questId);
      if (!quest || quest.claimed || quest.progress < quest.targetCount)
        return state;

      const updated = state.sideQuests.map((q) =>
        q.id === action.questId ? { ...q, claimed: true } : q,
      );
      return {
        ...state,
        sideQuests: updated,
        crystals: state.crystals + quest.rewardCrystals,
        gold: state.gold + quest.rewardGold,
        materials: addMaterials(state.materials, quest.rewardMaterials),
      };
    }

    case "CLEAR_TOWER_FLOOR": {
      const clearedList = state.clearedTowerFloors ?? Array.from({ length: state.highestTowerFloor }, (_, i) => i + 1);
      const isFirstInRegion = action.floor === 1 || action.floor === 7 || action.floor === 13;
      const isUnlocked = isFirstInRegion || clearedList.includes(action.floor) || clearedList.includes(action.floor - 1);
      if (
        !action.victory ||
        !state.battleTicket ||
        state.encounter?.kind !== "tower" ||
        state.encounter.id !== String(action.floor) ||
        !isUnlocked
      )
        return state;
      const floorData = towerFloors.find((f) => f.floor === action.floor);
      const isFirstClear = !clearedList.includes(action.floor);
      const updatedCleared = isFirstClear && !clearedList.includes(action.floor) ? [...clearedList, action.floor] : clearedList;
      const crystals = isFirstClear
        ? (floorData?.firstClearRewards.crystals ?? 100)
        : 0;
      const gold = floorData
        ? isFirstClear
          ? floorData.firstClearRewards.gold
          : floorData.sweepRewards.gold
        : 1000;
      const materials = floorData
        ? isFirstClear
          ? floorData.firstClearRewards.materials
          : floorData.sweepRewards.materials
        : [];

      return {
        ...state,
        clearedTowerFloors: updatedCleared,
        highestTowerFloor: Math.max(state.highestTowerFloor, action.floor),
        towerFloor: Math.min(towerFloors.length, action.floor + 1),
        crystals: state.crystals + crystals,
        gold: state.gold + gold,
        materials: addMaterials(state.materials, materials),
      };
    }

    case "SWEEP_TOWER_FLOOR": {
      if (state.stamina < 6) return state;
      const clearedList = state.clearedTowerFloors ?? Array.from({ length: state.highestTowerFloor }, (_, i) => i + 1);
      if (!clearedList.includes(action.floor)) return state;
      const floorData = towerFloors.find((f) => f.floor === action.floor);
      if (!floorData) return state;

      return {
        ...state,
        stamina: state.stamina - 6,
        gold: state.gold + floorData.sweepRewards.gold,
        materials: addMaterials(
          state.materials,
          floorData.sweepRewards.materials,
        ),
      };
    }

    case "CYCLE_ASSISTANT_QUOTE": {
      const companion =
        state.companions.find((c) => c.id === state.selectedCompanionId) ??
        state.companions[0];
      const totalQuotes = companion.quotes?.length ?? 1;
      return {
        ...state,
        assistantQuoteIndex: (state.assistantQuoteIndex + 1) % totalQuotes,
      };
    }

    case "HARVEST_HOMESTEAD": {
      const now = Date.now();
      const minutes = Math.max(
        0,
        Math.floor((now - state.homestead.lastHarvestTimestamp) / 60000),
      );
      const staminaGained = Math.min(
        120,
        state.homestead.accumulatedStamina + Math.floor(minutes / 5),
      );
      const goldGained = Math.min(
        20000,
        state.homestead.accumulatedGold + minutes * 20,
      );
      if (!staminaGained && !goldGained) return state;
      return {
        ...state,
        stamina: Math.min(240, state.stamina + staminaGained),
        gold: state.gold + goldGained,
        homestead: {
          ...state.homestead,
          accumulatedStamina: 0,
          accumulatedGold: 0,
          lastHarvestTimestamp: now,
        },
      };
    }

    case "UPDATE_CURRENCY_WARS_SCORE": {
      const score = action.score;
      const bonusCrystals =
        score > 100000 ? Math.min(300, Math.floor(score / 1000)) : 50;
      return {
        ...state,
        crystals: state.crystals + bonusCrystals,
        currencyWarsHighScore: Math.max(state.currencyWarsHighScore, score),
      };
    }

    case "UPDATE_DEFENSE_SCORE": {
      const score = action.score;
      const rewardCrystals = Math.min(200, Math.floor(score / 10));
      return {
        ...state,
        crystals: state.crystals + rewardCrystals,
        defenseHighScore: Math.max(state.defenseHighScore, score),
      };
    }

    case "RECORD_PVP_WIN": {
      return {
        ...state,
        pvpWins: state.pvpWins + 1,
        gold: state.gold + 500,
      };
    }

    case "TOGGLE_STATION_COMPANION": {
      if (!state.companions.some((c) => c.id === action.companionId))
        return state;
      const exists = state.homestead.stationedCompanionIds.includes(
        action.companionId,
      );
      let nextStationed = state.homestead.stationedCompanionIds;
      if (exists) {
        nextStationed = nextStationed.filter((id) => id !== action.companionId);
      } else if (nextStationed.length < 4) {
        nextStationed = [...nextStationed, action.companionId];
      }
      return {
        ...state,
        homestead: {
          ...state.homestead,
          stationedCompanionIds: nextStationed,
          comfort: 300 + nextStationed.length * 110,
        },
      };
    }
    default:
      return state;
  }
}

export function currentPeriods(now = new Date()) {
  const local = new Date(now.getTime() + 8 * 3600000);
  const day = local.toISOString().slice(0, 10);
  local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7));
  return {
    day,
    week: local.toISOString().slice(0, 10),
    month: day.slice(0, 7),
  };
}
export function refreshPeriods(state: GameState, now = new Date()): GameState {
  const periods = currentPeriods(now),
    old = state.taskPeriods ?? periods;
  if (
    old.day === periods.day &&
    old.week === periods.week &&
    old.month === periods.month
  )
    return state;
  const reset = (tasks: Task[]) =>
    tasks.map((t) => ({ ...t, progress: 0, claimed: false }));
  let next = { ...state, taskPeriods: periods };
  if (old.month !== periods.month)
    next = {
      ...next,
      monthlyTasks: reset(initialMonthlyTasks),
      monthlyActivity: 0,
      claimedMonthlyChests: [],
    };
  if (old.week !== periods.week)
    next = {
      ...next,
      weeklyTasks: reset(initialWeeklyTasks),
      weeklyActivity: 0,
      claimedWeeklyChests: [],
    };
  if (old.day !== periods.day)
    next = {
      ...next,
      dailyTasks: reset(initialDailyTasks).map((t) =>
        t.id === "dt-1" ? { ...t, progress: 1 } : t,
      ),
      dailyActivity: 0,
      claimedDailyChests: [],
      monthlyTasks: next.monthlyTasks.map((t) =>
        t.id === "mt-1"
          ? { ...t, progress: Math.min(t.target, t.progress + 1) }
          : t,
      ),
    };
  next.monthlyTasks = next.monthlyTasks.map((t) => ({
    ...t,
    progress:
      t.id === "mt-2"
        ? Math.min(t.target, next.highestTowerFloor)
        : t.id === "mt-3"
          ? Math.min(
              t.target,
              next.companions.filter((c) => c.level >= 20).length,
            )
          : t.progress,
  }));
  return next;
}
export function gameReducer(state: GameState, action: GameAction): GameState {
  const current = refreshPeriods(state),
    next = coreReducer(current, action);
  if (next === current) return current;
  const spent = Math.max(0, current.stamina - next.stamina);
  const pulled = action.type === "APPLY_PULLS" ? action.count : 0;
  const cleared =
    action.type === "FINISH_BATTLE" &&
    !!current.battleTicket &&
    !next.battleTicket
      ? 1
      : 0;
  const tower =
    (cleared && current.encounter?.kind === "tower") ||
    action.type === "SWEEP_TOWER_FLOOR"
      ? 1
      : 0;
  const upgraded =
    (action.type === "LEVEL_UP" ||
      action.type === "LEVEL_UP_MAX" ||
      action.type === "UPGRADE_WEAPON") &&
    next.gold < current.gold
      ? 1
      : 0;
  const claimed =
    next.dailyTasks.filter((t) => t.claimed).length -
    current.dailyTasks.filter((t) => t.claimed).length;
  const drops = cleared
    ? (next.lastBattleDrops ?? []).reduce((n, d) => n + d.count, 0)
    : 0;
  const apply = (tasks: Task[], increments: Record<string, number>) =>
    tasks.map((t) =>
      increments[t.id]
        ? { ...t, progress: Math.min(t.target, t.progress + increments[t.id]) }
        : t,
    );
  return {
    ...next,
    dailyTasks: apply(next.dailyTasks, {
      "dt-2": spent,
      "dt-3": cleared,
      "dt-4": pulled,
      "dt-5": upgraded,
    }),
    weeklyTasks: apply(next.weeklyTasks, {
      "wt-1": spent,
      "wt-2": tower,
      "wt-3": claimed,
      "wt-4": pulled,
      "wt-5": drops,
    }),
    monthlyTasks: apply(next.monthlyTasks, {
      "mt-4": spent,
      "mt-5": pulled,
    }).map((t) =>
      t.id === "mt-2"
        ? { ...t, progress: Math.min(t.target, next.highestTowerFloor) }
        : t.id === "mt-3"
          ? {
              ...t,
              progress: Math.min(
                t.target,
                next.companions.filter((c) => c.level >= 20).length,
              ),
            }
          : t,
    ),
  };
}

type ReadStorage = Pick<Storage, "getItem">;
type WriteStorage = Pick<Storage, "setItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function hydrateCompanions(value: unknown, fallback: Companion[]) {
  if (!Array.isArray(value)) return fallback;
  const savedById = new Map(
    value.filter(isRecord).map((item) => [item.id, item]),
  );
  const hydrated = companionCatalog.flatMap((definition) => {
    const saved = savedById.get(definition.id);
    if (!saved) return definition.id === "astra" ? [{ ...definition }] : [];
    return [
      {
        ...definition,
        level: Math.max(
          1,
          Math.min(90, Math.floor(finiteNumber(saved.level, definition.level))),
        ),
        ascension: Math.max(0, Math.min(8, Math.floor(finiteNumber(saved.ascension, Math.ceil(finiteNumber(saved.level, definition.level) / 10) - 1)))),
        skillLevels: Array.from({ length: 3 }, (_, i) => Math.max(1, Math.min(10, Math.floor(finiteNumber(Array.isArray(saved.skillLevels) ? saved.skillLevels[i] : 1, 1))))),
        power: finiteNumber(saved.power, definition.power),
        v2Souls: hydrateSouls(saved.v2Souls) ?? [0, 1, 2, 3, 4, 5].map((s) => createSoul(definition.id, s)),
        v2FunctionalSouls: hydrateFunctionalSouls(saved.v2FunctionalSouls),
        constellation: Math.max(
          0,
          Math.min(
            6,
            Math.floor(
              finiteNumber(saved.constellation, definition.constellation),
            ),
          ),
        ),
        ringLevels: Array.from({ length: 9 }, (_, i) =>
          Array.isArray(saved.ringLevels)
            ? Math.max(
                0,
                Math.min(12, Math.floor(finiteNumber(saved.ringLevels[i], 0))),
              )
            : 0,
        ),
        rings: Array.from({ length: 3 }, (_, i) =>
          Array.isArray(saved.rings) &&
          [`common-${i + 7}`, `exclusive-${i + 7}`].includes(saved.rings[i])
            ? saved.rings[i]
            : null,
        ),
      },
    ];
  });
  return hydrated.length ? hydrated : fallback;
}

export function hydrateGameState(value: unknown): GameState {
  const initial = createInitialState();
  if (!isRecord(value)) return initial;
  const candidate = isRecord(value.state) ? value.state : value;
  const restoredCompanions = hydrateCompanions(
    candidate.companions,
    initial.companions,
  );
  const savedWeapons = Array.isArray(candidate.weapons)
    ? candidate.weapons
    : [];
  const usedOwners = new Set<string>();
  const restoredWeapons = Array.isArray(candidate.weapons)
    ? weaponCatalog.flatMap((definition) => {
        const saved = savedWeapons.find(
          (item) => isRecord(item) && item.id === definition.id,
        );
        if (!isRecord(saved)) return [];
        const owner =
          typeof saved.ownerId === "string" &&
          restoredCompanions.some((c) => c.id === saved.ownerId) &&
          !usedOwners.has(saved.ownerId)
            ? saved.ownerId
            : undefined;
        if (owner) usedOwners.add(owner);
        return [
          {
            ...definition,
            level: Math.max(1, Math.min(90, Math.floor(finiteNumber(saved.level, 1)))),
            ascension: Math.max(0, Math.min(8, Math.floor(finiteNumber(saved.ascension, Math.ceil(finiteNumber(saved.level, 1) / 10) - 1)))),
            refinement: Math.max(
              1,
              Math.min(5, finiteNumber(saved.refinement, 1)),
            ),
            ownerId: owner,
          },
        ];
      })
    : initial.weapons;
  const taskState = <
    T extends { id: string; progress: number; claimed: boolean },
  >(
    key: string,
    definitions: T[],
  ): T[] =>
    definitions.map((d) => {
      const list = candidate[key];
      const saved = Array.isArray(list)
        ? list.find((v) => isRecord(v) && v.id === d.id)
        : undefined;
      return isRecord(saved)
        ? {
            ...d,
            progress: Math.max(0, finiteNumber(saved.progress, d.progress)),
            claimed: saved.claimed === true,
          }
        : d;
    });
  const claimed = (key: string, fallback: number[]) =>
    Array.isArray(candidate[key])
      ? [
          ...new Set(
            (candidate[key] as unknown[]).filter(
              (v): v is number => typeof v === "number" && Number.isFinite(v),
            ),
          ),
        ]
      : fallback;
  const validStageIds = new Set(
    initialStoryChapters.flatMap((c) => c.stages.map((s) => s.id)),
  );
  const completed = Array.isArray(candidate.completedStages)
    ? [
        ...new Set(
          candidate.completedStages.filter(
            (s): s is string => typeof s === "string" && validStageIds.has(s),
          ),
        ),
      ]
    : initial.completedStages;
  const nextStory = initialStoryChapters
    .flatMap((c) => c.stages)
    .find((s) => !completed.includes(s.id));
  const seleneExists = restoredCompanions.some((c) => c.id === "selene");
  const selectedId =
    typeof candidate.selectedCompanionId === "string" &&
    candidate.selectedCompanionId !== "lumi" &&
    restoredCompanions.some((item) => item.id === candidate.selectedCompanionId)
      ? candidate.selectedCompanionId
      : (seleneExists ? "selene" : restoredCompanions[0].id);

  const validScreens: Screen[] = [
    "home",
    "formation",
    "battle",
    "companions",
    "summon",
    "inventory",
    "shop",
    "story",
    "tower",
    "tasks",
    "activities",
  ];

  const restoredMaterials = isRecord(candidate.materials)
    ? Object.fromEntries(
        Object.entries(candidate.materials).filter(
          (entry): entry is [string, number] =>
            typeof entry[1] === "number" &&
            Number.isFinite(entry[1]) &&
            entry[1] >= 0,
        ),
      )
    : initial.materials;

  return {
    ...initial,
    taskPeriods:
      isRecord(candidate.taskPeriods) &&
      typeof candidate.taskPeriods.day === "string" &&
      typeof candidate.taskPeriods.week === "string" &&
      typeof candidate.taskPeriods.month === "string"
        ? (candidate.taskPeriods as GameState["taskPeriods"])
        : currentPeriods(),
    encounter:
      isRecord(candidate.encounter) &&
      ["story", "tower", "trial", "resource"].includes(String(candidate.encounter.kind)) &&
      typeof candidate.encounter.id === "string"
        ? (candidate.encounter as GameState["encounter"])
        : undefined,
    battleTicket: undefined,
    storyChoices: isRecord(candidate.storyChoices)
      ? (Object.fromEntries(
          Object.entries(candidate.storyChoices).filter(
            ([id, v]) =>
              completed.includes(id) && (v === "self" || v === "team"),
          ),
        ) as GameState["storyChoices"])
      : {},
    formationPresets: Array.isArray(candidate.formationPresets)
      ? candidate.formationPresets
          .slice(0, 9)
          .map((p) => normalizeFormation(p, restoredCompanions))
      : [],
    formationPresetPaths: Array.isArray(candidate.formationPresetPaths)
      ? candidate.formationPresetPaths
          .slice(0, 9)
          .map((p) => (COMBAT_PATHS.some((cp) => cp.id === p) ? (p as import("../domain/combat").PathId) : undefined))
      : [],
    dailyTasks: taskState("dailyTasks", initial.dailyTasks),
    weeklyTasks: taskState("weeklyTasks", initial.weeklyTasks),
    monthlyTasks: taskState("monthlyTasks", initial.monthlyTasks),
    sideQuests: taskState("sideQuests", initial.sideQuests),
    claimedDailyChests: claimed(
      "claimedDailyChests",
      initial.claimedDailyChests,
    ),
    claimedWeeklyChests: claimed(
      "claimedWeeklyChests",
      initial.claimedWeeklyChests,
    ),
    claimedMonthlyChests: claimed(
      "claimedMonthlyChests",
      initial.claimedMonthlyChests,
    ),
    screen:
      candidate.screen === "battle"
        ? "formation"
        : validScreens.includes(candidate.screen as Screen)
          ? (candidate.screen as Screen)
          : initial.screen,
    stamina: finiteNumber(candidate.stamina, initial.stamina),
    crystals: finiteNumber(candidate.crystals, initial.crystals),
    gold: finiteNumber(candidate.gold, initial.gold),
    standardPullTotal: Math.max(
      0,
      Math.floor(
        finiteNumber(
          candidate.standardPullTotal,
          Array.isArray(candidate.pullHistory)
            ? candidate.pullHistory.filter(
                (r) =>
                  isRecord(r) &&
                  r.kind === "companion" &&
                  r.pool === "standard" &&
                  typeof r.id === "string" &&
                  companionCatalog.some((c) => c.id === r.id),
              ).length
            : 0,
        ),
      ),
    ),
    standardSelectorClaimed: candidate.standardSelectorClaimed === true,
    pityCharacter: Math.max(
      0,
      Math.min(
        79,
        Math.floor(
          finiteNumber(candidate.pityCharacter, initial.pityCharacter),
        ),
      ),
    ),
    pityWeapon: finiteNumber(candidate.pityWeapon, initial.pityWeapon),
    pityCollab: Math.max(
      0,
      Math.min(79, Math.floor(finiteNumber(candidate.pityCollab, 0))),
    ),
    pityLimited: Math.max(
      0,
      Math.min(79, Math.floor(finiteNumber(candidate.pityLimited, 0))),
    ),
    limitedGuaranteed: candidate.limitedGuaranteed === true,
    pullHistory: Array.isArray(candidate.pullHistory)
      ? candidate.pullHistory
          .filter(
            (r): r is GameState["pullHistory"][number] =>
              isRecord(r) &&
              typeof r.id === "string" &&
              (r.kind === "companion" || r.kind === "weapon") &&
              (r.rarity === "4星" || r.rarity === "5星") &&
              typeof r.pool === "string" &&
              typeof r.time === "string",
          )
          .slice(0, 100)
      : [],
    formationPath: COMBAT_PATHS.some((p) => p.id === candidate.formationPath)
      ? (candidate.formationPath as GameState["formationPath"])
      : undefined,
    battleRulesVersion: finiteNumber(candidate.battleRulesVersion, 2),
    companions: restoredCompanions,
    weapons: restoredWeapons,
    formation: normalizeFormation(candidate.formation, restoredCompanions),
    selectedCompanionId: selectedId,
    weaponTargetCompanionId:
      typeof candidate.weaponTargetCompanionId === "string" &&
      companionCatalog.some((c) => c.id === candidate.weaponTargetCompanionId)
        ? candidate.weaponTargetCompanionId
        : "yanhuang",
    battleSeed: finiteNumber(candidate.battleSeed, initial.battleSeed),
    hasSeenTutorial:
      typeof candidate.hasSeenTutorial === "boolean"
        ? candidate.hasSeenTutorial
        : initial.hasSeenTutorial,
    playerLevel: finiteNumber(candidate.playerLevel, initial.playerLevel),
    playerExp: finiteNumber(candidate.playerExp, initial.playerExp),
    materials: { ...initial.materials, ...restoredMaterials },
    mainStoryChapter: nextStory?.chapterId ?? initialStoryChapters.length,
    mainStoryStageId: nextStory?.id ?? "8-4",
    completedStages: completed,
    towerFloor: finiteNumber(candidate.towerFloor, initial.towerFloor),
    highestTowerFloor: finiteNumber(
      candidate.highestTowerFloor,
      initial.highestTowerFloor,
    ),
    clearedTowerFloors: Array.isArray(candidate.clearedTowerFloors)
      ? candidate.clearedTowerFloors.map(Number).filter(Number.isFinite)
      : initial.clearedTowerFloors,
    dailyActivity: finiteNumber(candidate.dailyActivity, initial.dailyActivity),
    weeklyActivity: finiteNumber(
      candidate.weeklyActivity,
      initial.weeklyActivity,
    ),
    monthlyActivity: finiteNumber(
      candidate.monthlyActivity,
      initial.monthlyActivity,
    ),
    homestead: isRecord(candidate.homestead)
      ? {
          comfort: finiteNumber(
            candidate.homestead.comfort,
            initial.homestead.comfort,
          ),
          accumulatedStamina: finiteNumber(
            candidate.homestead.accumulatedStamina,
            initial.homestead.accumulatedStamina,
          ),
          accumulatedGold: finiteNumber(
            candidate.homestead.accumulatedGold,
            initial.homestead.accumulatedGold,
          ),
          lastHarvestTimestamp: finiteNumber(
            candidate.homestead.lastHarvestTimestamp,
            initial.homestead.lastHarvestTimestamp,
          ),
          stationedCompanionIds: Array.isArray(
            candidate.homestead.stationedCompanionIds,
          )
            ? candidate.homestead.stationedCompanionIds.filter(
                (id): id is string =>
                  typeof id === "string" &&
                  restoredCompanions.some((c) => c.id === id),
              )
            : initial.homestead.stationedCompanionIds,
        }
      : initial.homestead,
    currencyWarsHighScore:
      Number(value.version) >= 4
        ? finiteNumber(candidate.currencyWarsHighScore, 0)
        : 0,
    defenseHighScore: finiteNumber(
      candidate.defenseHighScore,
      initial.defenseHighScore,
    ),
    pvpWins: finiteNumber(candidate.pvpWins, initial.pvpWins),
    rechargedTiers: isRecord(candidate.rechargedTiers)
      ? Object.entries(candidate.rechargedTiers).reduce<
          Record<string, boolean>
        >((acc, [k, v]) => {
          if (typeof k === "string" && typeof v === "boolean") {
            acc[k] = v;
          }
          return acc;
        }, {})
      : {},
    totalRechargedRmb: finiteNumber(candidate.totalRechargedRmb, 0),
    commerce: hydrateCommerce(candidate.commerce),
    wardrobe: hydrateWardrobe(candidate.wardrobe),
  };
}

export function restoreGameState(storage: ReadStorage): GameState {
  try {
    const saved =
      storage.getItem(STORAGE_KEY) ??
      storage.getItem(LEGACY_STORAGE_KEY) ??
      storage.getItem(OLD_STORAGE_KEY);
    if (!saved) return createInitialState();
    const parsed = JSON.parse(saved);
    const candidate = parsed?.state ?? parsed;
    const battleRulesVersion = candidate?.battleRulesVersion ?? 1;
    let didMigrateV2 = false;
    let refundGold = 0;
    if (battleRulesVersion < 2) {
      try {
        (storage as any).setItem?.(`${STORAGE_KEY}:before-battle-v2`, saved);
        didMigrateV2 = true;
        if (Array.isArray(candidate.companions)) {
          for (const comp of candidate.companions) {
            if (Array.isArray(comp.ringLevels)) {
              for (const lvl of comp.ringLevels) {
                if (typeof lvl === "number" && lvl > 0) {
                  refundGold += lvl * 200 + 50 * ((lvl * (lvl - 1)) / 2);
                }
              }
            }
          }
        }
      } catch {
        // If backup throws, do not apply migration refund
      }
    }
    const hydrated = hydrateGameState(parsed);
    if (didMigrateV2) {
      hydrated.gold += refundGold;
      hydrated.battleRulesVersion = 2;
    }
    if (!parsed?.version || parsed.version < 9) {
      if (hydrated.companions.some((c) => c.id === "selene")) {
        hydrated.selectedCompanionId = "selene";
      }
    }
    return hydrated;
  } catch {
    return createInitialState();
  }
}

export function saveGameState(storage: WriteStorage, state: GameState) {
  if (state.battleRulesVersion && state.battleRulesVersion < 2) return;
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SAVE_VERSION, state }),
    );
  } catch {
    // Storage can be unavailable in private mode or full; gameplay should continue.
  }
}
