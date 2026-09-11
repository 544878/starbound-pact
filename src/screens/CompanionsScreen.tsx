import { AscensionControl } from "../components/ProgressionControls";
import { levelCap } from "../systems/progression";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { RingConstellation } from "../components/RingConstellation";
import { FateConstellation } from "../components/FateConstellation";
import { SkillPanel, WeaponPanel } from "../components/CharacterDetailPanels";
import { ringBonuses } from "../systems/ringAffixes";
import { combatPanel } from "../systems/rosterCombat";
import { Portrait } from "../components/Portrait";
import { ArtGallery } from "../components/CharacterArt";
import { Wardrobe } from '../components/Wardrobe';
import { companionCatalog, elementLabels, roleLabels } from "../data/catalog";
import { HERO_LORE, REALMS } from "../data/epic";
import { COMBAT_PATHS } from "../data/combat";
import { RULES } from "../data/advancedRules";
import { useGame } from "../state/GameContext";
export function CompanionsScreen() {
  const { state, selectCompanion, dispatch } = useGame();
  const [tab, setTab] = useState("rings"),
    [browsing, setBrowsing] = useState(state.selectedCompanionId);
  const [realm, setRealm] = useState("全部"),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [pageSize, setPageSize] = useState(10);
  const [mobilePane, setMobilePane] = useState("art");
  const list = useRef<HTMLDivElement>(null),
    biography = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setPageSize(
        Math.max(
          4,
          Math.min(12, Math.floor(entry.contentRect.height / 104) * 2),
        ),
      ),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const c =
    state.companions.find((c) => c.id === browsing) ??
    companionCatalog.find((c) => c.id === browsing) ??
    state.companions[0];
  const owned = state.companions.some((u) => u.id === c.id),
    lore = HERO_LORE[c.id],
    panel = combatPanel(c, state.weapons),
    path = COMBAT_PATHS.find((p) => p.id === c.path);
  const roster = companionCatalog.filter(
    (u) =>
      (realm === "全部" || u.realm === realm) &&
      `${u.name}${u.title}${u.faction}${u.id}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(roster.length / pageSize)),
    currentPage = Math.min(page, pages - 1);
  const visible = roster.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const ownedById = new Map(state.companions.map((c) => [c.id, c]));
  return (
    <section
      className={`codex-screen soul-growth-screen mobile-pane-${mobilePane}`}
    >
      <div className="mobile-character-tabs">
        <button
          aria-pressed={mobilePane === "art"}
          onClick={() => setMobilePane("art")}
        >
          立绘
        </button>
        <button
          aria-pressed={mobilePane === "details"}
          onClick={() => setMobilePane("details")}
        >
          养成
        </button>
      </div>
      <div className="codex-layout">
        <aside className="codex-roster">
          <header className="roster-heading">
            <h1>角色列表</h1>
            <span>
              {state.companions.length}/{companionCatalog.length}
            </span>
          </header>
          <input
            aria-label="搜索角色"
            placeholder="搜索角色…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
          <select
            aria-label="筛选身份"
            value={realm}
            onChange={(e) => {
              setRealm(e.target.value);
              setPage(0);
            }}
          >
            {["全部", ...REALMS].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <div
            className="codex-roster-list"
            ref={list}
            style={{ "--roster-rows": pageSize / 2 } as CSSProperties}
          >
            {visible.map((u) => (
              <button
                key={u.id}
                aria-label={`${u.name}，${ownedById.has(u.id) ? "已结契" : "未结契"}`}
                aria-pressed={u.id === c.id}
                className={u.id === c.id ? "chosen" : ""}
                onClick={() => {
                  setBrowsing(u.id);
                  selectCompanion(u.id);
                }}
              >
                <Portrait companion={u} />
                <span>
                  <b>{u.name}</b>
                  <small>
                    {ownedById.has(u.id)
                      ? `Lv.${ownedById.get(u.id)!.level}`
                      : "未结契"}
                  </small>
                </span>
                <i>{u.rarity === "5星" ? "✦" : "✧"}</i>
              </button>
            ))}
            {!roster.length && (
              <p className="roster-empty">没有符合条件的角色</p>
            )}
          </div>
          <div className="page-controls">
            <button
              aria-label="上一页角色"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              ‹
            </button>
            <span>
              {currentPage + 1} / {pages}
            </span>
            <button
              aria-label="下一页角色"
              disabled={currentPage >= pages - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              ›
            </button>
          </div>
        </aside>
        <div className="codex-art">
          <ArtGallery key={c.id} companion={c} />
          <Wardrobe key={`wardrobe-${c.id}`} companion={c} />
          <div className="codex-name">
            <span>
              {c.realm} · {c.title}
            </span>
            <h2>{c.name}</h2>
            <p>{lore?.vow ?? c.quotes?.[0]}</p>
          </div>
        </div>
        <aside className="codex-detail">
          <div className="detail-intro">
            <div className="detail-tags">
              <span>{elementLabels[c.element]}</span>
              <span>{path?.name}</span>
              <span>{roleLabels[c.role]}</span>
              <button
                className="biography-button"
                onClick={() => biography.current?.showModal()}
                aria-label="角色档案"
              >
                档案
              </button>
            </div>
            <h2 className="growth-identity">
              <span>
                Lv.<b>{c.level}</b> / 90
              </span>
              <small>{owned ? "已结契" : "未结契"}</small>
            </h2>
            <progress value={c.level} max={levelCap(c)} />
          </div>
          <div className="epic-stats">
            {[
              ["生命", panel.hp.toLocaleString()],
              ["攻击", panel.attack.toLocaleString()],
              ["防御", panel.defense.toLocaleString()],
              ["暴击", `${(panel.crit * 100).toFixed(1)}%`],
              ["暴伤", `${(panel.critDamage * 100).toFixed(1)}%`],
              ["速度", `${(100 * (1 + ringBonuses(c).speed)).toFixed(0)}`],
            ].map(([label, value]) => (
              <span key={label}>
                <small>{label}</small>
                <b>{value}</b>
              </span>
            ))}
          </div>
          {owned ? (
            <>
              <div className="detail-tabs" role="tablist" aria-label="角色养成">
                {[
                  ["rings", "星魂"],
                  ["weapon", "专武"],
                  ["skills", "技能"],
                  ["constellation", "命座"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                className="character-tab-panel"
                role="tabpanel"
                key={`${c.id}-${tab}`}
              >
                {tab === "rings" ? (
                  <RingConstellation companion={c} />
                ) : tab === "weapon" ? (
                  <WeaponPanel companion={c} />
                ) : tab === "skills" ? (
                  <SkillPanel companion={c} />
                ) : (
                  <FateConstellation companion={c} />
                )}
              </div>
              {(() => {
                const maxLevel = levelCap(c);
                const levelCost = RULES.growth.levelCost;
                const isMaxLevel = c.level >= maxLevel;
                const neededLevels = Math.max(0, maxLevel - c.level);
                const affordableLevels = Math.floor(state.gold / levelCost);
                const maxUpgradeLevels = Math.min(neededLevels, affordableLevels);
                const maxUpgradeCost = maxUpgradeLevels * levelCost;
                const targetLevel = c.level + maxUpgradeLevels;
                const canLevelUpOnce = !isMaxLevel && state.gold >= levelCost;
                const canLevelUpMax = !isMaxLevel && maxUpgradeLevels > 0;
                return (
                  <div className="level-footer">
                    <AscensionControl unit={c} kind="companion" />
                    <div className="level-btn-group">
                      <button
                        className="primary-button level-single-btn"
                        disabled={!canLevelUpOnce}
                        onClick={() => dispatch({ type: "LEVEL_UP", id: c.id })}
                        title={
                          isMaxLevel
                            ? (c.level >= 90 ? "修行已圆满" : "需要星核突破")
                            : !canLevelUpOnce
                              ? `金币不足（升级需 ${levelCost} 金币）`
                              : `升级 1 级（消耗 ${levelCost} 金币）`
                        }
                      >
                        {isMaxLevel ? (c.level >= 90 ? "修行已圆满" : "需要星核突破") : "修行升级"}
                      </button>
                      <button
                        className="primary-button level-max-btn"
                        disabled={!canLevelUpMax}
                        onClick={() =>
                          dispatch({ type: "LEVEL_UP_MAX", id: c.id })
                        }
                        title={
                          isMaxLevel
                            ? (c.level >= 90 ? "修行已圆满" : "需要星核突破")
                            : !canLevelUpMax
                              ? `金币不足（单级需 ${levelCost} 金币）`
                              : `一键升级至 Lv.${targetLevel}（提升 ${maxUpgradeLevels} 级，消耗 ${maxUpgradeCost.toLocaleString()} 金币）`
                        }
                      >
                        {isMaxLevel
                          ? "已达上限"
                          : canLevelUpMax
                            ? `一键升级 (+${maxUpgradeLevels})`
                            : "一键升级"}
                      </button>
                    </div>
                    <div className="level-cost-info">
                      <span>
                        {isMaxLevel
                          ? `当前上限 Lv.${maxLevel} · 每 10 级消耗星核突破`
                          : !canLevelUpOnce
                            ? `金币不足 (单级需 ${levelCost} 金币，当前 ${state.gold.toLocaleString()})`
                            : `单级: ${levelCost} 金币 · 一键至 Lv.${targetLevel} (需 ${maxUpgradeCost.toLocaleString()} 金币)`}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : (
            <div className="recruit-card">
              <h3>邀请同行</h3>
              <p>结契后可加入编队，解锁魂环与专武养成。</p>
              <button
                className="primary-button wide"
                disabled={state.gold < (c.rarity === "5星" ? 6000 : 3000)}
                onClick={() => dispatch({ type: "RECRUIT", id: c.id })}
              >
                结契 · {c.rarity === "5星" ? "6,000" : "3,000"} 金币
              </button>
            </div>
          )}
        </aside>
      </div>
      <dialog className="character-bio-modal" ref={biography}>
        <header>
          <h2>{c.name} · 角色档案</h2>
          <button
            autoFocus
            onClick={() => biography.current?.close()}
            aria-label="关闭档案"
          >
            关闭 ×
          </button>
        </header>
        <p>{c.biography}</p>
        <blockquote>{lore?.vow ?? c.quotes?.[0]}</blockquote>
      </dialog>
    </section>
  );
}
