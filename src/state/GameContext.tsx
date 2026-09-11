import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { DropItem, GameState, PullResult, Screen } from "../domain/types";
import { wishPayment, type WishPool } from "../systems/wishCurrency";
import { performCharacterPulls, performPulls, performWeaponPulls } from "../systems/gacha";
import {
  gameReducer,
  restoreGameState,
  saveGameState,
  type GameAction,
} from "./gameState";

interface GameContextValue {
  dispatch: (action: GameAction) => void;
  state: GameState;
  navigate: (screen: Screen) => void;
  selectCompanion: (id: string) => void;
  setWeaponTarget: (id: string) => void;
  setFormation: (formation: Array<string | null>) => void;
  startBattle: () => void;
  finishBattle: (drops?: DropItem[], victory?: boolean) => void;
  summon: (
    kind: "companion" | "weapon",
    count: 1 | 10,
    pool?: WishPool,
  ) => PullResult[];
  addCrystals: (amount: number) => void;
  addGold: (amount: number) => void;
  recharge: (tierId: string) => void;
  reset: () => void;
  claimTask: (taskType: "daily" | "weekly" | "monthly", taskId: string) => void;
  claimAllTasks: (taskType?: "daily" | "weekly" | "monthly") => void;
  claimActivityChest: (
    taskType: "daily" | "weekly" | "monthly",
    points: number,
  ) => void;
  completeStoryStage: (stageId: string) => void;
  claimSideQuest: (questId: string) => void;
  clearTowerFloor: (floor: number) => void;
  sweepTowerFloor: (floor: number) => void;
  cycleAssistantQuote: () => void;
  harvestHomestead: () => void;
  toggleStationCompanion: (companionId: string) => void;
  updateCurrencyWarsScore: (score: number) => void;
  updateDefenseScore: (score: number) => void;
  recordPvpWin: () => void;
}

const GameContext: ReturnType<typeof createContext<GameContextValue | null>> =
  import.meta.hot?.data.gameContext ??
  createContext<GameContextValue | null>(null);
if (import.meta.hot) import.meta.hot.data.gameContext = GameContext;

export function GameProvider({ children, previewState }: { children: ReactNode; previewState?: GameState }) {
  const [state, rawDispatch] = useReducer(gameReducer, undefined, () =>
    previewState ?? restoreGameState(localStorage),
  );
  const dispatch = (action: GameAction) => rawDispatch(action);
  useEffect(() => {
    if (!previewState) saveGameState(localStorage, state);
  }, [state, previewState]);

  useEffect(() => {
    rawDispatch({ type: "REFRESH_PERIODS" });
    const timer = window.setInterval(
      () => rawDispatch({ type: "REFRESH_PERIODS" }),
      60000,
    );
    return () => window.clearInterval(timer);
  }, []);
  const value = useMemo<GameContextValue>(
    () => ({
      state,
      dispatch,
      navigate: (screen) => dispatch({ type: "NAVIGATE", screen }),
      selectCompanion: (id) => dispatch({ type: "SELECT_COMPANION", id }),
      setWeaponTarget: (id) => dispatch({ type: "SET_WEAPON_TARGET", id }),
      setFormation: (formation) =>
        dispatch({ type: "SET_FORMATION", formation }),
      startBattle: () => dispatch({ type: "START_BATTLE" }),
      finishBattle: (drops, victory) =>
        dispatch({
          type: "FINISH_BATTLE",
          drops,
          victory,
          ticket: state.battleTicket,
        }),
      summon: (kind, count, pool = "standard") => {
        if (
          !wishPayment(state, kind === "weapon" ? "weapon" : pool, count)
            .affordable
        )
          return [];
        const pity =
          kind === "companion"
            ? pool === "limited"
              ? (state.pityLimited ?? 0)
              : pool === "collab"
                ? (state.pityCollab ?? 0)
                : state.pityCharacter
            : state.pityWeapon;
        const outcome =
          kind === "companion"
            ? performCharacterPulls(
                pool === "weapon" ? "standard" : pool,
                count,
                pity,
                state.limitedGuaranteed,
                state.companions,
              )
            : performWeaponPulls(count, pity, state.weaponTargetCompanionId ?? "yanhuang", state.weapons);
        dispatch({
          type: "APPLY_PULLS",
          pool,
          guaranteed:
            "guaranteed" in outcome ? Boolean(outcome.guaranteed) : false,
          time: new Date().toISOString(),
          kind,
          count,
          results: outcome.results,
          pity: outcome.pity,
        });
        return outcome.results;
      },
      addCrystals: (amount) => dispatch({ type: "ADD_CRYSTALS", amount }),
      addGold: (amount) => dispatch({ type: "ADD_GOLD", amount }),
      recharge: (tierId) => dispatch({ type: "RECHARGE", tierId }),
      reset: () => dispatch({ type: "RESET" }),
      claimTask: (taskType, taskId) =>
        dispatch({ type: "CLAIM_TASK", taskType, taskId }),
      claimAllTasks: (taskType) =>
        dispatch({ type: "CLAIM_ALL_TASKS", taskType }),
      claimActivityChest: (taskType, points) =>
        dispatch({ type: "CLAIM_ACTIVITY_CHEST", taskType, points }),
      completeStoryStage: (stageId) =>
        dispatch({ type: "COMPLETE_STORY_STAGE", stageId }),
      claimSideQuest: (questId) =>
        dispatch({ type: "CLAIM_SIDE_QUEST", questId }),
      clearTowerFloor: (floor) =>
        dispatch({ type: "CLEAR_TOWER_FLOOR", floor }),
      sweepTowerFloor: (floor) =>
        dispatch({ type: "SWEEP_TOWER_FLOOR", floor }),
      cycleAssistantQuote: () => dispatch({ type: "CYCLE_ASSISTANT_QUOTE" }),
      harvestHomestead: () => dispatch({ type: "HARVEST_HOMESTEAD" }),
      toggleStationCompanion: (companionId) =>
        dispatch({ type: "TOGGLE_STATION_COMPANION", companionId }),
      updateCurrencyWarsScore: (score) =>
        dispatch({ type: "UPDATE_CURRENCY_WARS_SCORE", score }),
      updateDefenseScore: (score) =>
        dispatch({ type: "UPDATE_DEFENSE_SCORE", score }),
      recordPvpWin: () => dispatch({ type: "RECORD_PVP_WIN" }),
    }),
    [state],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used inside GameProvider");
  return context;
}
