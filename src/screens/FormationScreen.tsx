import { enemyArt } from "../data/encounters";
import { useState, useMemo } from "react";
import { FormationDiagram } from "../components/FormationDiagram";
import { FORMATION_LAYOUTS } from "../data/formationLayouts";
import {
  FORMATION_THEMES,
  getCompanionPrimaryPath,
  getCompanionAdaptedPath,
  getCompanionResonance,
  countTeamResonance,
} from "../data/formationTheme";
import { Portrait } from "../components/Portrait";
import { useGame } from "../state/GameContext";
import { elementLabels } from "../data/catalog";
import { COMBAT_PATHS } from "../data/combat";
import { getEncounter } from "../data/encounters";
import { combatPanel as stats } from "../systems/rosterCombat";
import { PLAYABLE_TEAMS } from "../data/expansion";
import { companionCatalog } from "../data/catalog";
import { getBossOptimalRecommendation } from "../data/bossRecommendation";
import type { PathId } from "../domain/combat";

const PRESET_COUNT = 9;

export function FormationScreen() {
  const { state, selectCompanion, setFormation, startBattle, dispatch } =
    useGame();

  const [selected, setSelected] = useState(state.selectedCompanionId);
  const [targetSlot, setTargetSlot] = useState<number | null>(null);
  const [slot, setSlot] = useState(0);
  const [search, setSearch] = useState("");
  const [systemFilter, setSystemFilter] = useState<string>("all");
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "affinity" | "counter" | "power" | "level" | "rarity"
  >("affinity");
  const [notice, setNotice] = useState("");

  const count = state.formation.filter(Boolean).length;
  const e = getEncounter(state.encounter);
  const activePath: PathId = (state.formationPath ?? e.path) as PathId;
  const activeTheme = FORMATION_THEMES[activePath] ?? FORMATION_THEMES.mortal;

  // 计算针对当前关卡/本期首领的最优阵容推荐
  const bossRecommendation = useMemo(
    () => getBossOptimalRecommendation(e, state.companions),
    [e, state.companions]
  );
  const counterTheme =
    FORMATION_THEMES[bossRecommendation.counterPath] ?? FORMATION_THEMES.mortal;

  const selectedUnit =
    state.companions.find((c) => c.id === selected) ?? state.companions[0];

  // 计算当前队伍的阵法共鸣总览
  const teamResonance = useMemo(
    () => countTeamResonance(state.formation, state.companions, activePath),
    [state.formation, state.companions, activePath]
  );

  // 放置角色至特定阵位
  const place = (index: number, companionIdToPlace?: string) => {
    const charId = companionIdToPlace ?? selected;
    if (!charId) return;

    if (!state.formation.includes(charId) && count >= 5 && !state.formation[index]) {
      setNotice("队伍上限5人，请先移除一位同伴。");
      return;
    }

    const next = state.formation.map((id) => (id === charId ? null : id));
    next[index] = charId;
    setFormation(next);
    setNotice("编队已更新。");
  };

  // 从阵位移除角色
  const removeSlot = (index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const next = [...state.formation];
    next[index] = null;
    setFormation(next);
    setNotice("已将同伴移出编队。");
  };

  // 快捷一键上阵
  const quickDeploy = (companionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelected(companionId);

    // 如果已经在队伍中，点击则选中
    if (state.formation.includes(companionId)) {
      setNotice("该角色已在出战队伍中。");
      return;
    }

    // 如果指定了目标阵位且为空
    if (targetSlot !== null && !state.formation[targetSlot]) {
      place(targetSlot, companionId);
      setTargetSlot(null);
      return;
    }

    // 寻找第一个空位
    const firstEmptyIndex = state.formation.findIndex((id) => id === null);
    if (firstEmptyIndex !== -1) {
      place(firstEmptyIndex, companionId);
    } else if (count >= 5) {
      setNotice("队伍已满5人，请点击阵位进行替换或移除。");
    }
  };

  // 清空当前阵位
  const clearFormation = () => {
    setFormation([null, null, null, null, null, null, null, null, null]);
    setNotice("当前阵位已清空。");
  };

  // 读取预设
  const loadPreset = (presetIndex: number) => {
    setSlot(presetIndex);
    const savedLineup = state.formationPresets?.[presetIndex];
    const savedPath = state.formationPresetPaths?.[presetIndex];

    if (savedLineup && savedLineup.some(Boolean)) {
      setFormation(savedLineup);
      if (savedPath && COMBAT_PATHS.some((p) => p.id === savedPath)) {
        dispatch({ type: "SET_PATH", path: savedPath });
      }
      setNotice(`已读取预设 0${presetIndex + 1}。`);
    } else {
      setNotice(`预设 0${presetIndex + 1} 尚未保存内容。`);
    }
  };

  // 保存当前预设
  const saveCurrentPreset = () => {
    dispatch({ type: "SAVE_FORMATION", slot });
    setNotice(`阵容与【${activeTheme.formationName}】已保存至预设 0${slot + 1}。`);
  };

  // 一键应用当前首领的最优推荐阵容
  const applyBossRecommendation = () => {
    if (!bossRecommendation || bossRecommendation.optimalIds.length === 0) {
      setNotice("暂无适配当前首领的最优阵容。");
      return;
    }
    const newFormation: Array<string | null> = [
      ...bossRecommendation.optimalIds.slice(0, 5),
      null,
      null,
      null,
      null,
    ];
    setFormation(newFormation);
    dispatch({ type: "SET_PATH", path: bossRecommendation.counterPath });
    const memberNames = bossRecommendation.optimalCompanions
      .map((c) => c.name)
      .join("、");
    setNotice(
      `已一键编入针对【${e.boss.name}】的最优克制阵容（${counterTheme.name}体系 · ${memberNames}）。`
    );
  };

  // 角色列表过滤与多维排序（直接按八大体系筛选，移除旧版职业词汇）
  const filteredCompanions = useMemo(() => {
    return state.companions
      .filter((c) => {
        // 名字/称号/体系文本检索
        if (search.trim()) {
          const query = search.trim().toLowerCase();
          const primaryName = FORMATION_THEMES[getCompanionPrimaryPath(c)]?.name ?? "";
          const adaptedName = FORMATION_THEMES[getCompanionAdaptedPath(c)]?.name ?? "";
          const matchName = c.name.toLowerCase().includes(query);
          const matchTitle = (c.title ?? "").toLowerCase().includes(query);
          const matchSystem = primaryName.includes(query) || adaptedName.includes(query);
          if (!matchName && !matchTitle && !matchSystem) return false;
        }

        // 八大体系过滤
        if (systemFilter === "current_affinity") {
          const primary = getCompanionPrimaryPath(c);
          const adapted = getCompanionAdaptedPath(c);
          if (primary !== activePath && adapted !== activePath) return false;
        } else if (systemFilter !== "all") {
          const primary = getCompanionPrimaryPath(c);
          const adapted = getCompanionAdaptedPath(c);
          if (primary !== systemFilter && adapted !== systemFilter) return false;
        }

        // 稀有度过滤
        if (rarityFilter !== "all" && c.rarity !== rarityFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "counter") {
          // 首领克制优先：弱点属性 > 专精克制体系 > 适配克制体系 > 战力
          const weakA = a.element === e.boss.weakness ? 4 : 0;
          const weakB = b.element === e.boss.weakness ? 4 : 0;
          const pathA =
            getCompanionPrimaryPath(a) === bossRecommendation.counterPath
              ? 3
              : getCompanionAdaptedPath(a) === bossRecommendation.counterPath
              ? 1.5
              : 0;
          const pathB =
            getCompanionPrimaryPath(b) === bossRecommendation.counterPath
              ? 3
              : getCompanionAdaptedPath(b) === bossRecommendation.counterPath
              ? 1.5
              : 0;
          const scoreA = weakA + pathA;
          const scoreB = weakB + pathB;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return b.power - a.power;
        }
        if (sortBy === "affinity") {
          const resA = getCompanionResonance(a, activePath).percent;
          const resB = getCompanionResonance(b, activePath).percent;
          if (resB !== resA) return resB - resA;
          return b.power - a.power;
        }
        if (sortBy === "power") {
          return b.power - a.power;
        }
        if (sortBy === "level") {
          return b.level - a.level;
        }
        if (sortBy === "rarity") {
          const rA = a.rarity === "5星" ? 5 : 4;
          const rB = b.rarity === "5星" ? 5 : 4;
          return rB - rA;
        }
        return 0;
      });
  }, [
    state.companions,
    search,
    systemFilter,
    rarityFilter,
    sortBy,
    activePath,
    e.boss.weakness,
    bossRecommendation.counterPath,
  ]);

  return (
    <section className="formation-deluxe-screen">
      {/* 顶部标题栏 */}
      <header className="formation-deluxe-header">
        <div>
          <span className="eyebrow">FORMATION & ASTROLABE / 乾坤星契集结</span>
          <h1>{e.title} · 迎战备战</h1>
          <p>排布乾坤阵位，调谐八大专属阵法与角色专精，激活全队星轨共鸣。</p>
        </div>
        <div
          className={`formation-team-count-badge ${count >= 5 ? "is-full" : ""}`}
        >
          <span>出战同行者</span>
          <b>{count}</b> / 5
        </div>
      </header>

      <div className="formation-deluxe-grid">
        {/* 左侧：首领战况情报卡 */}
        <aside className="formation-boss-panel">
          <div className={`formation-boss-figure ${e.boss.towerFloor ? "abyss-enemy" : ""}`}>
            <img
              src={enemyArt(e.boss)}
              alt={e.boss.name}
            />
            <div className="formation-boss-weakness-badge">
              <span>弱点</span>
              <b>{elementLabels[e.boss.weakness as keyof typeof elementLabels] ?? "全"}</b>
            </div>
          </div>

          <h2 className="formation-boss-name">{e.boss.name}</h2>
          <p className="formation-boss-hint">{e.boss.hint}</p>

          <div className="formation-boss-metrics">
            <div>
              <span>生命总额</span>
              <b>{(e.boss.hp * 250).toLocaleString()}</b>
            </div>
            <div>
              <span>出战消耗</span>
              <b>{e.cost} 体力</b>
            </div>
          </div>

          {/* 本期Boss最优克制情报与推荐 */}
          <div className="formation-boss-tactic-card">
            <div className="boss-tactic-header">
              <span className="tactic-title-tag">✦ 本期最优克制</span>
              <span
                className="tactic-path-pill"
                style={{
                  color: counterTheme.color,
                  borderColor: counterTheme.borderColor,
                  backgroundColor: `${counterTheme.color}20`,
                }}
              >
                {counterTheme.rune} {counterTheme.name} · {bossRecommendation.strategyTitle}
              </span>
            </div>
            <p className="boss-tactic-reason">{bossRecommendation.reason}</p>
            <div className="boss-tactic-core-row">
              <span className="core-label">推荐核心：</span>
              <span className="core-names">
                {bossRecommendation.optimalCompanions
                  .map((comp) => comp.name)
                  .join(" / ")}
              </span>
            </div>
          </div>

          {/* 选中同伴预览 */}
          <div className="formation-selected-companion-box">
            <div className="box-title">
              <span>✦</span> 选中同伴属性
            </div>
            <div className="formation-selected-stats-grid">
              <div className="formation-stat-cell">
                <small>{selectedUnit.name} 生命</small>
                <b>{stats(selectedUnit, state.weapons).hp.toLocaleString()}</b>
              </div>
              <div className="formation-stat-cell">
                <small>综合攻击</small>
                <b>{stats(selectedUnit, state.weapons).attack.toLocaleString()}</b>
              </div>
            </div>
          </div>
        </aside>

        {/* 中间主要操作区 */}
        <main className="formation-center-stage">
          {/* 9个预设单行控制器（不堆叠罗列） */}
          <div className="formation-preset-control-bar">
            <div className="preset-control-left">
              <span className="preset-control-title">阵容预设</span>
              <div className="preset-pills-row" role="tablist" aria-label="九套阵容预设">
                {Array.from({ length: PRESET_COUNT }, (_, i) => {
                  const saved = state.formationPresets?.[i];
                  const hasData = saved && saved.some(Boolean);
                  return (
                    <button
                      key={i}
                      role="tab"
                      aria-pressed={slot === i}
                      className="preset-pill-btn"
                      title={`预设 0${i + 1}${hasData ? " (已存)" : " (空)"}`}
                      onClick={() => loadPreset(i)}
                    >
                      <span>0{i + 1}</span>
                      <i className={hasData ? "preset-saved-pip" : "preset-empty-pip"} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="preset-control-actions">
              <button
                className="preset-action-btn save-btn"
                onClick={saveCurrentPreset}
                title="保存当前出战成员与选定阵法到选中预设"
              >
                <span>💾</span> 保存预设
              </button>
              <button
                className="preset-action-btn"
                onClick={clearFormation}
                title="清空九宫阵位"
              >
                <span>🧹</span> 清空
              </button>
            </div>
          </div>

          <div className="preset-status-bar">
            <span className="active-info">
              当前编辑：<b>预设 0{slot + 1}</b>
              {state.formationPresets?.[slot]?.some(Boolean) ? "（已保存阵容）" : "（未保存）"}
            </span>
            <span aria-live="polite">{notice}</span>
          </div>

          {/* 乾坤九宫阵位大盘 */}
          <div className="formation-epic-board-deluxe" aria-label="乾坤九宫编队">
            {state.formation.map((id, i) => {
              const c = state.companions.find((comp) => comp.id === id);
              const resonance = c ? getCompanionResonance(c, activePath) : null;
              const isTarget = targetSlot === i;

              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  aria-label={`阵位 0${i + 1}${c ? ` ${c.name}` : " (空位)"}`}
                  className={`formation-slot-card ${c ? "occupied" : ""} ${
                    resonance ? resonance.badgeClass : ""
                  } ${isTarget ? "is-target-focus" : ""}`}
                  onDragOver={(ev) => ev.preventDefault()}
                  onDrop={() => place(i)}
                  onClick={() => {
                    if (c) {
                      if (c.id === selected) {
                        removeSlot(i);
                      } else {
                        setSelected(c.id);
                        selectCompanion(c.id);
                      }
                    } else {
                      place(i);
                      setTargetSlot(null);
                    }
                  }}
                >
                  <span className="formation-slot-index">0{i + 1}</span>

                  {c ? (
                    <>
                      {resonance && resonance.type !== "none" && (
                        <div
                          className={`slot-resonance-badge ${resonance.type}`}
                          title={resonance.bonus}
                        >
                          {resonance.label}
                        </div>
                      )}

                      <div className="slot-companion-avatar-wrap">
                        <Portrait companion={c} />
                      </div>

                      <span className="slot-companion-name">{c.name}</span>

                      <div className="slot-companion-tags">
                        <span className="slot-role-tag">
                          {elementLabels[c.element]}系
                        </span>
                        <span className="slot-role-tag">
                          {FORMATION_THEMES[getCompanionPrimaryPath(c)]?.rune}{" "}
                          {FORMATION_THEMES[getCompanionPrimaryPath(c)]?.name ?? "体系"}
                        </span>
                      </div>

                      <button
                        className="slot-remove-btn"
                        title="移出此阵位"
                        onClick={(ev) => removeSlot(i, ev)}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="slot-empty-content">
                      <span className="slot-empty-rune">＋</span>
                      <span className="slot-empty-hint">点击入阵</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 八大专属阵法选择与特效展示区 */}
          <div className="formation-paths-section">
            <div className="formation-section-head">
              <h2>
                <span>⚡</span> 八大专属阵法 · 调谐
              </h2>
              <div className="formation-synergy-summary">
                <span>当前队伍共鸣：</span>
                <b>{teamResonance.specialtyCount} 专精</b> ·{" "}
                <b>{teamResonance.adaptedCount} 适配</b> / 5人
              </div>
            </div>

            {/* 8个阵法卡片 */}
            <div className="formation-paths-grid">
              {COMBAT_PATHS.map((p) => {
                const theme = FORMATION_THEMES[p.id];
                const isSelected = activePath === p.id;
                const matchCount = state.formation.reduce((acc, compId) => {
                  if (!compId) return acc;
                  const comp = state.companions.find((item) => item.id === compId);
                  if (!comp) return acc;
                  const res = getCompanionResonance(comp, p.id);
                  return res.type !== "none" ? acc + 1 : acc;
                }, 0);

                return (
                  <button
                    key={p.id}
                    className="formation-path-card"
                    aria-pressed={isSelected}
                    style={
                      {
                        "--path-color": theme.color,
                        "--path-glow": theme.glowColor,
                        "--path-bg": theme.bgGradient,
                      } as React.CSSProperties
                    }
                    onClick={() => dispatch({ type: "SET_PATH", path: p.id })}
                  >
                    <span className="path-card-rune">{theme.rune}</span>
                    <div className="path-card-info">
                      <span className="path-card-name">{theme.name} · {theme.formationName}</span>
                      <span className="path-card-formation">{theme.trait}</span>
                    </div>
                    <span className={`path-card-count ${matchCount > 0 ? "has-resonance" : ""}`}>
                      {matchCount}/5
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 阵法罗盘与特性详情 */}
            <div className="formation-astrolabe-details-panel">
              <FormationDiagram path={activePath} />
              <div className="formation-details-text">
                <div className="formation-details-header">
                  <h3>{activeTheme.formationName}</h3>
                  <span>{activeTheme.subTitle}</span>
                </div>
                <p className="formation-details-passive">{activeTheme.passive}</p>
                <span className="formation-details-sub">
                  右侧迎敌站位 · 匹配体系角色将获得最高 100% 灵气加成
                </span>
              </div>
            </div>

            {/* 一键编入体系队 */}
            <div className="formation-quick-team-strip">
              <div className="quick-team-text">
                <span>{activeTheme.name} 完整体系队：</span>
                <b>
                  {PLAYABLE_TEAMS[activePath]
                    .map((id) => companionCatalog.find((c) => c.id === id)?.name)
                    .join(" / ")}
                </b>
              </div>
              <button
                className="quick-team-btn"
                disabled={PLAYABLE_TEAMS[activePath].some(
                  (id) => !state.companions.some((c) => c.id === id)
                )}
                onClick={() => {
                  setFormation([
                    ...PLAYABLE_TEAMS[activePath],
                    null,
                    null,
                    null,
                    null,
                  ]);
                  setNotice(`已一键编入【${activeTheme.name}】完整体系队。`);
                }}
              >
                一键编入体系队
              </button>
            </div>
          </div>

          {/* 底部出战操作栏 */}
          <div className="formation-bottom-actions">
            <button
              className="btn-boss-optimal-recommend"
              onClick={applyBossRecommendation}
              title={`一键编入针对【${e.boss.name}】的最优克制阵容：${bossRecommendation.reason}`}
            >
              <span className="recommend-icon">🎯</span>
              <div className="recommend-btn-content">
                <span className="recommend-btn-title">本期Boss最优角色推荐</span>
                <span className="recommend-btn-sub">
                  克制【{e.boss.name}】· 推荐{counterTheme.name}体系
                </span>
              </div>
            </button>
            <button
              className="btn-enter-battle"
              disabled={count !== 5 || state.stamina < e.cost}
              onClick={startBattle}
            >
              <span>⚔️</span>
              {state.stamina < e.cost
                ? "体力不足"
                : count < 5
                  ? `还需上阵 ${5 - count} 位`
                  : "进入战斗 →"}
            </button>
          </div>
        </main>

        {/* 右侧：同行者检索与选择面板（选角色更方便、查找不同体系） */}
        <aside className="formation-roster-panel">
          <div className="formation-roster-title">
            <h2>同行者名册</h2>
            <span>已拥有 {state.companions.length} 位</span>
          </div>

          {/* 即时搜索框 */}
          <div className="formation-search-box">
            <input
              type="text"
              placeholder="🔍 搜索角色名字、称号或体系..."
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
            />
            {search && (
              <button
                className="formation-search-clear"
                onClick={() => setSearch("")}
              >
                ✕
              </button>
            )}
          </div>

          {/* 八大体系筛选胶囊组 */}
          <div className="system-filter-strip" role="tablist" aria-label="八大体系筛选">
            <button
              className={`system-filter-pill ${systemFilter === "all" ? "is-active" : ""}`}
              onClick={() => setSystemFilter("all")}
            >
              全部体系
            </button>
            <button
              className={`system-filter-pill highlight-current ${
                systemFilter === "current_affinity" ? "is-active" : ""
              }`}
              onClick={() => setSystemFilter("current_affinity")}
              title="一键筛选与当前阵法契合的专精和适配角色"
            >
              🔥 阵法适配
            </button>
            {COMBAT_PATHS.map((p) => {
              const theme = FORMATION_THEMES[p.id];
              return (
                <button
                  key={p.id}
                  className={`system-filter-pill ${systemFilter === p.id ? "is-active" : ""}`}
                  onClick={() => setSystemFilter(p.id)}
                >
                  {theme?.rune} {p.name}
                </button>
              );
            })}
          </div>

          {/* 八大体系快捷下拉与名册排序 */}
          <div className="formation-filter-secondary-row">
            <select
              aria-label="八大体系筛选"
              value={systemFilter}
              onChange={(ev) => setSystemFilter(ev.target.value)}
            >
              <option value="all">八大体系 · 全部</option>
              <option value="current_affinity">🔥 当前阵法适配</option>
              {COMBAT_PATHS.map((p) => (
                <option value={p.id} key={p.id}>
                  {FORMATION_THEMES[p.id]?.rune} {p.name}体系
                </option>
              ))}
            </select>

            <select
              aria-label="名册排序"
              value={sortBy}
              onChange={(ev) => setSortBy(ev.target.value as any)}
            >
              <option value="affinity">阵法适配优先</option>
              <option value="counter">首领克制优先</option>
              <option value="power">战力从高到低</option>
              <option value="level">等级从高到低</option>
            </select>
          </div>

          {/* 同行者滚动列表 */}
          <div className="formation-companions-scroll-list">
            {filteredCompanions.map((c) => {
              const isInTeam = state.formation.includes(c.id);
              const teamSlotIndex = state.formation.findIndex((id) => id === c.id);
              const resonance = getCompanionResonance(c, activePath);
              const primaryPath = getCompanionPrimaryPath(c);
              const adaptedPath = getCompanionAdaptedPath(c);
              const isSelected = c.id === selected;
              const isWeaknessMatch = c.element === e.boss.weakness;
              const isCounterPathMatch =
                primaryPath === bossRecommendation.counterPath ||
                adaptedPath === bossRecommendation.counterPath;

              return (
                <div
                  key={c.id}
                  className={`formation-companion-card ${isSelected ? "is-selected" : ""} ${
                    isInTeam ? "is-in-team" : ""
                  }`}
                  draggable
                  onDragStart={() => setSelected(c.id)}
                  onClick={() => {
                    setSelected(c.id);
                    selectCompanion(c.id);
                  }}
                >
                  <div className="roster-card-avatar">
                    <Portrait companion={c} />
                  </div>

                  <div className="roster-card-info">
                    <div className="roster-card-top-line">
                      <span className="roster-card-name">{c.name}</span>
                      <span className="roster-card-rarity">{c.rarity}</span>
                    </div>

                    <div className="roster-card-meta">
                      <span>Lv.{c.level}</span>
                      <span>·</span>
                      <span className="roster-meta-element">{elementLabels[c.element]}系</span>
                      <span>·</span>
                      <span>战力 {c.power}</span>
                    </div>

                    {/* 专精与适配体系展示 */}
                    <div className="roster-card-systems">
                      <span
                        className="system-badge primary"
                        title="专精体系：获得 100% 潜能加成"
                      >
                        专: {FORMATION_THEMES[primaryPath]?.name}
                      </span>
                      <span
                        className="system-badge adapted"
                        title="适配体系：获得 65% 灵气加成"
                      >
                        适: {FORMATION_THEMES[adaptedPath]?.name}
                      </span>
                      {(isWeaknessMatch || isCounterPathMatch) && (
                        <span
                          className={`system-badge boss-advantage ${
                            isWeaknessMatch ? "is-weakness" : "is-counter"
                          }`}
                          title={`克制本期首领【${e.boss.name}】（${
                            isWeaknessMatch ? "双倍破盾弱点" : "克制体系"
                          }）`}
                        >
                          {isWeaknessMatch ? "⚡弱点" : "🎯克制"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="roster-card-actions">
                    {isInTeam ? (
                      <span className="in-team-badge">
                        阵位 0{teamSlotIndex + 1}
                      </span>
                    ) : (
                      <button
                        className="quick-deploy-btn"
                        title="点击快速入阵"
                        onClick={(ev) => quickDeploy(c.id, ev)}
                      >
                        + 上阵
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredCompanions.length === 0 && (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--f-text-muted)", fontSize: "12px" }}>
                未找到匹配的同行者
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
