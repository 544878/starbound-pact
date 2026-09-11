import { COMBAT_PATHS } from "../data/combat";
import { useEffect, useRef, useState, useMemo } from "react";
import { wishPayment } from "../systems/wishCurrency";
import { COLLAB_IDS, STANDARD_FIVE_IDS } from "../systems/gacha";
import { RingWish } from "../components/RingWish";
import { EquipmentArt } from "../components/EquipmentArt";
import { Portrait } from "../components/Portrait";
import { CharacterArt } from "../components/CharacterArt";
import type { PullResult } from "../domain/types";
import { companionCatalog, weaponCatalog } from "../data/catalog";
import { useGame } from "../state/GameContext";
import { MaterialArt } from "../components/MaterialArt";
import { SummonAnimation } from "./SummonAnimation";
import "../summon.css";

const selectable = companionCatalog.filter((c) =>
  STANDARD_FIVE_IDS.includes(c.id),
);
const pools = [
  ["standard", "常驻召唤", "群星之约", "xuanzhao"],
  ["limited", "限定池一", "盛夏谐律 · 戏浪豪赌", "robin_lovesong"],
  ["collab", "异界交汇", "跨越世界的契约", COLLAB_IDS[0]],
  ["weapon", "武器召唤", "本命神兵", "yanhuang"],
  ["ring", "魂环祈愿", "定向共鸣", "selene"],
] as const;
type Pool = (typeof pools)[number][0];

export function SummonScreen() {
  const { state, summon, selectCompanion, setWeaponTarget, dispatch, navigate } = useGame();
  const [pool, setPool] = useState<Pool>("standard");
  const [results, setResults] = useState<PullResult[] | null>(null);
  const [dialog, setDialog] = useState<"rules" | "history" | "selector" | "weaponSelector" | null>(
    null,
  );
  const [selection, setSelection] = useState("");
  const [search, setSearch] = useState("");
  const [weaponSearch, setWeaponSearch] = useState("");
  const [weaponFilter, setWeaponFilter] = useState<"all" | "5star" | "4star" | "collab" | "standard">("all");
  const [weaponSelection, setWeaponSelection] = useState(state.weaponTargetCompanionId ?? "yanhuang");
  const [notice, setNotice] = useState("");
  const [session, setSession] = useState(0);
  const modal = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (dialog) modal.current?.showModal();
  }, [dialog]);

  const kind = pool === "weapon" ? "weapon" : "companion";
  const pity =
    pool === "weapon"
      ? state.pityWeapon
      : pool === "collab"
        ? (state.pityCollab ?? 0)
        : pool === "limited"
          ? (state.pityLimited ?? 0)
          : state.pityCharacter;
  const total = state.standardPullTotal;
  const ready = total >= 200 && !state.standardSelectorClaimed;

  // 定轨神兵与对应角色
  const weaponTargetCompanionId = state.weaponTargetCompanionId ?? "yanhuang";
  const currentWeaponCompanion =
    companionCatalog.find((c) => c.id === weaponTargetCompanionId) ??
    companionCatalog.find((c) => c.id === "yanhuang") ??
    companionCatalog[0];
  const currentWeapon =
    weaponCatalog.find((w) => w.signatureFor === currentWeaponCompanion.id) ??
    weaponCatalog[0];
  const ownedWeapon = state.weapons.find((w) => w.id === currentWeapon.id);

  const hero = companionCatalog.find(
    (c) =>
      c.id ===
      (pool === "collab"
        ? COLLAB_IDS[0]
        : pool === "limited"
          ? "robin_lovesong"
          : "xuanzhao"),
  )!;

  const paymentPool = pool === "ring" ? "standard" : pool;
  const single = wishPayment(state, paymentPool, 1),
    ten = wishPayment(state, paymentPool, 10);
  const selected = selectable.find((c) => c.id === selection);
  const owned = state.companions.find((c) => c.id === selection);

  const pull = (count: 1 | 10) => {
    const rows = summon(
      kind,
      count,
      pool === "collab"
        ? "collab"
        : pool === "limited"
          ? "limited"
          : pool === "weapon"
            ? "weapon"
            : "standard",
    );
    if (rows.length) {
      setResults(rows);
      setSession((n) => n + 1);
    }
  };

  const name = (r: PullResult) =>
    (r.kind === "companion" ? companionCatalog : weaponCatalog).find(
      (c) => c.id === r.id,
    )?.name ?? r.id;

  const closeDialog = () => setDialog(null);

  const filteredWeaponCompanions = useMemo(() => {
    return companionCatalog.filter((c) => {
      const w = weaponCatalog.find((item) => item.signatureFor === c.id);
      if (!w) return false;
      if (weaponFilter === "5star" && w.rarity !== "5星") return false;
      if (weaponFilter === "4star" && w.rarity !== "4星") return false;
      if (weaponFilter === "collab" && !COLLAB_IDS.includes(c.id)) return false;
      if (weaponFilter === "standard" && COLLAB_IDS.includes(c.id)) return false;
      if (weaponSearch.trim()) {
        const q = weaponSearch.trim().toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchTitle = c.title?.toLowerCase().includes(q);
        const matchWeapon = w.name.toLowerCase().includes(q);
        if (!matchName && !matchTitle && !matchWeapon) return false;
      }
      return true;
    });
  }, [weaponFilter, weaponSearch]);

  return (
    <section className={`summon-page summon-pool-${pool}`}>
      <div className="summon-backdrop" aria-hidden="true" />
      <header className="summon-header">
        <div className="summon-title">
          <button onClick={() => navigate("home")} aria-label="返回主页">
            返回
          </button>
          <h1>召唤</h1>
          <button
            className="summon-help"
            onClick={() => setDialog("rules")}
            aria-label="查看召唤规则"
          >
            ?
          </button>
        </div>
        <div className="summon-wallet">
          <span>
            星晶 <b>{state.crystals.toLocaleString()}</b>
            <button onClick={() => navigate("shop")} aria-label="前往补给商店">
              补给
            </button>
          </span>
          <span>
            <MaterialArt name={single.resource} fallbackIcon="◈" inline size={20} />
            {single.resource} <b>{state.materials[single.resource] ?? 0}</b>
            <button
              disabled={state.crystals < 160}
              onClick={() =>
                dispatch({
                  type: "BUY_GOODS",
                  id:
                    single.resource === "造化青莲"
                      ? "wish_lotus"
                      : "wish_water",
                })
              }
              aria-label={`兑换一份${single.resource}，消耗160星晶`}
            >
              兑换
            </button>
          </span>
        </div>
      </header>
      <div className="summon-body">
        <nav className="summon-pools" aria-label="召唤卡池">
          {pools.map(([id, title, subtitle, defaultPortrait]) => {
            const isWeapon = id === "weapon";
            const portraitId = isWeapon ? currentWeaponCompanion.id : defaultPortrait;
            const comp =
              companionCatalog.find((c) => c.id === portraitId) ??
              companionCatalog[0];
            const displaySubtitle = isWeapon
              ? `定轨 · ${currentWeaponCompanion.name}`
              : subtitle;
            return (
              <button
                key={id}
                aria-pressed={pool === id}
                onClick={() => {
                  setPool(id);
                  setNotice("");
                }}
              >
                <Portrait companion={comp} />
                <span>
                  <b>{title}</b>
                  <small>{displaySubtitle}</small>
                </span>
              </button>
            );
          })}
          <p className="summon-poem">
            星辰指引
            <br />
            而你终将抵达。
            <small>
              在无尽的星海中，
              <br />
              总有相逢的光。
            </small>
          </p>
        </nav>
        {pool === "ring" ? (
          <div className="summon-special">
            <label className="ring-target">
              选择定向角色
              <select
                aria-label="魂环定向角色"
                value={state.selectedCompanionId}
                onChange={(e) => selectCompanion(e.target.value)}
              >
                {state.companions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.rarity}
                  </option>
                ))}
              </select>
            </label>
            <RingWish
              key={state.selectedCompanionId}
              companion={
                state.companions.find(
                  (c) => c.id === state.selectedCompanionId,
                ) ?? state.companions[0]
              }
            />
          </div>
        ) : pool === "limited" ? (
          <>
            <div className="summon-limited-feature">
              <div className="summon-limited-visual-box">
                <img
                  src="/assets/hsr-summer-resort.jpg"
                  alt="盛夏谐律·知更鸟情歌与砂金戏浪限定立绘"
                  className="summon-limited-main-visual"
                />
                <div className="summon-limited-top-overlay">
                  <span className="summon-limited-tag">SUMMER OVERTURE · 限定池一</span>
                  <h2 className="summon-limited-title">盛夏谐律 · 戏浪豪赌</h2>
                  <h3 className="summon-limited-sub">「知更鸟情歌」·「砂金戏浪」（5星）限时概率UP</h3>
                </div>
                <div className="summon-limited-bottom-bar">
                  <p className="summon-limited-desc">
                    盛夏海滨的假日盛宴！全队协奏歌者与浪花护盾赌徒限定降临。
                  </p>
                  <span className="summon-limited-poem">✦ 浪花飞扬 · 星音同响 ✦</span>
                </div>
              </div>
            </div>
            <aside className="summon-progress-panels">
              <section className="summon-panel">
                <header>
                  <h2>五星保底</h2>
                  <small>获得五星后重新计数</small>
                </header>
                <div className="summon-count">
                  <b>{pity}</b>
                  <span>/ 80</span>
                </div>
                <div className="summon-progress-line">
                  <progress aria-label="五星保底进度" max={80} value={pity} />
                  <span>{+((pity / 80) * 100).toFixed(1)}%</span>
                </div>
                <p>
                  再抽 <strong>{80 - pity}</strong> 次内必得五星
                  <span className="summon-pity-highlight">
                    {" "}· {state.limitedGuaranteed ? "大保底已就绪 · 本次必出当期限定" : "小保底 · 50% 概率出当期限定"}
                  </span>
                </p>
              </section>

              <section className="summon-panel summon-limited-panel">
                <header>
                  <h2>当期限定UP</h2>
                  <small>盛夏特别企划 · 双五星概率提升</small>
                </header>
                <div className="summon-limited-up-list">
                  {[
                    companionCatalog.find((c) => c.id === "robin_lovesong")!,
                    companionCatalog.find((c) => c.id === "aventurine_waves")!,
                  ].map((comp) => {
                    const owned = state.companions.find((c) => c.id === comp.id);
                    return (
                      <div key={comp.id} className="summon-limited-up-card">
                        <div className="summon-limited-avatar-wrap">
                          <Portrait companion={comp} />
                        </div>
                        <div className="summon-limited-up-info">
                          <div className="summon-limited-up-name-row">
                            <b>{comp.name}</b>
                            <span className="rarity-tag rarity-5星">5星限定</span>
                          </div>
                          <small className="summon-limited-up-title">{comp.title}</small>
                          <span className="summon-limited-up-status">
                            {owned ? `已拥有 · ${owned.constellation} 重命座` : "未拥有 · 限时概率UP"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="summon-limited-guarantee-tip">
                  <span>
                    {state.limitedGuaranteed
                      ? "✦ 大保底已就绪：抽中5星必定为【知更鸟情歌】或【砂金戏浪】！"
                      : "✧ 小保底：抽中5星有50%概率为限定UP，若未命中则下次必出！"}
                  </span>
                </div>
              </section>
            </aside>
          </>
        ) : (
          <>
            <div className="summon-feature">
              <div className="summon-feature-copy">
                <small>
                  {pool === "standard"
                    ? "THE STARRY COVENANT"
                    : pool === "collab"
                      ? "BEYOND THE WORLDS"
                      : "TARGETED RESONANCE · 定轨神兵"}
                </small>
                <h2>
                  {pool === "standard"
                    ? "群星之约"
                    : pool === "collab"
                      ? "异界交汇"
                      : currentWeapon.name}
                </h2>
                <h3>
                  {pool === "standard"
                    ? "常驻召唤 · 永久开放"
                    : pool === "collab"
                      ? "联动召唤 · 命运交汇"
                      : `${currentWeaponCompanion.name} · 本命神兵（${currentWeapon.rarity}）`}
                </h3>
                <p>
                  {pool === "weapon" ? (
                    <>
                      {currentWeaponCompanion.title}专属神兵。
                      <br />
                      {(currentWeapon.passive ?? "").length > 58
                        ? (currentWeapon.passive ?? "").slice(0, 58) + "..."
                        : currentWeapon.passive ?? "本命神兵拥有专属战斗增益。"}
                    </>
                  ) : (
                    <>
                      群星流转，
                      <br />
                      希冀始终与您同在。
                    </>
                  )}
                </p>
                {pool === "weapon" && (
                  <div className="summon-weapon-action-group">
                    <button
                      className="summon-change-target-cta"
                      onClick={() => {
                        setWeaponSelection(currentWeaponCompanion.id);
                        setWeaponSearch("");
                        setWeaponFilter("all");
                        setDialog("weaponSelector");
                      }}
                    >
                      <span className="cta-icon">✦</span> 更换定轨神兵（全角色自选）
                    </button>
                  </div>
                )}
              </div>
              {pool !== "standard" && (
                <div className="summon-alt-art">
                  {pool === "weapon" ? (
                    <EquipmentArt
                      kind="weapon"
                      signatureFor={currentWeaponCompanion.id}
                      path={currentWeaponCompanion.path}
                      name={currentWeapon.name}
                    />
                  ) : (
                    <CharacterArt companion={hero} />
                  )}
                </div>
              )}
              <div className="summon-verse">
                {pool === "weapon" ? (
                  <>
                    神兵同调
                    <br />
                    所向披靡
                  </>
                ) : (
                  <>
                    循星而行
                    <br />
                    赴永恒之约
                  </>
                )}
              </div>
            </div>
            <aside className="summon-progress-panels">
              <section className="summon-panel">
                <header>
                  <h2>五星保底</h2>
                  <small>获得五星后重新计数</small>
                </header>
                <div className="summon-count">
                  <b>{pity}</b>
                  <span>/ 80</span>
                </div>
                <div className="summon-progress-line">
                  <progress aria-label="五星保底进度" max={80} value={pity} />
                  <span>{+((pity / 80) * 100).toFixed(1)}%</span>
                </div>
                <p>
                  再抽 <strong>{80 - pity}</strong> 次内必得五星
                  {pool === "weapon" && currentWeapon.rarity === "5星" && (
                    <span className="summon-pity-highlight"> · 100% 必得当前定轨神兵</span>
                  )}
                  {pool === "limited" && (
                    <span className="summon-pity-highlight">
                      {" "}· {state.limitedGuaranteed ? "大保底已就绪 · 本次必出当期限定" : "小保底 · 50% 概率出当期限定"}
                    </span>
                  )}
                </p>
              </section>

              {pool === "standard" ? (
                <section
                  className={`summon-panel summon-selector-panel ${ready ? "is-ready" : ""}`}
                >
                  <header>
                    <h2>200 抽自选</h2>
                    <small>
                      {state.standardSelectorClaimed
                        ? "常驻相逢礼 · 已领取"
                        : "累计进度不随五星出货清零"}
                    </small>
                  </header>
                  <div className="summon-count">
                    <b>{Math.min(total, 200)}</b>
                    <span>/ 200</span>
                  </div>
                  <div className="summon-progress-line">
                    <progress
                      aria-label="200抽自选进度"
                      max={200}
                      value={Math.min(total, 200)}
                    />
                    <span>{Math.min(100, +(total / 2).toFixed(1))}%</span>
                  </div>
                  <p>
                    {state.standardSelectorClaimed ? (
                      "相逢之礼已领取，愿群星伴你前行。"
                    ) : ready ? (
                      "约定已达成，可免费自选一位常驻五星。"
                    ) : (
                      <>
                        再抽 <strong>{200 - total}</strong> 次，可自选常驻五星
                      </>
                    )}
                  </p>
                  <div className="summon-candidates">
                    <small>可自选的常驻五星角色（部分）</small>
                    <div>
                      {selectable.slice(0, 4).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelection(c.id);
                            setDialog("selector");
                          }}
                        >
                          <Portrait companion={c} />
                          <b>{c.name}</b>
                          <small>
                            {COMBAT_PATHS.find((p) => p.id === c.path)?.name ??
                              "常驻五星"}
                          </small>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    className="summon-selector-cta"
                    onClick={() => setDialog("selector")}
                  >
                    {state.standardSelectorClaimed
                      ? "查看角色 · 已领取"
                      : ready
                        ? "领取自选五星"
                        : "查看自选角色"}
                  </button>
                  <small className="summon-once">
                    累计 {total} 抽 · 常驻池一次性奖励
                  </small>
                </section>
              ) : pool === "weapon" ? (
                <section className="summon-panel summon-weapon-panel">
                  <header>
                    <h2>定轨神兵</h2>
                    <small>100% 命中 · 绝不歪池</small>
                  </header>
                  <div className="summon-weapon-target-card">
                    <div className="summon-weapon-target-avatar">
                      <Portrait companion={currentWeaponCompanion} />
                    </div>
                    <div className="summon-weapon-target-info">
                      <div className="summon-weapon-target-header">
                        <b>{currentWeapon.name}</b>
                        <span className={`rarity-tag rarity-${currentWeapon.rarity}`}>
                          {currentWeapon.rarity}
                        </span>
                      </div>
                      <small className="summon-weapon-target-owner">
                        所属角色：{currentWeaponCompanion.name}（{currentWeaponCompanion.title}）
                      </small>
                      <div className="summon-weapon-target-status">
                        {ownedWeapon ? (
                          <span className="tag-owned">
                            已持有 · 精炼 {ownedWeapon.refinement} 阶 · Lv.{ownedWeapon.level}
                          </span>
                        ) : (
                          <span className="tag-unowned">未持有 · 抽取立得专属加成</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    className="summon-selector-cta summon-change-weapon-cta"
                    onClick={() => {
                      setWeaponSelection(currentWeaponCompanion.id);
                      setWeaponSearch("");
                      setWeaponFilter("all");
                      setDialog("weaponSelector");
                    }}
                  >
                    更换自选神兵（全 51 位角色可选）
                  </button>
                  <small className="summon-once">
                    已开放全角色专属神兵定轨。更换定轨目标不清除已有保底。
                  </small>
                </section>
              ) : pool === "limited" ? (
                <section className="summon-panel summon-limited-panel">
                  <header>
                    <h2>当期限定UP</h2>
                    <small>盛夏特别企划 · 双五星概率提升</small>
                  </header>
                  <div className="summon-limited-up-list">
                    {[
                      companionCatalog.find((c) => c.id === "robin_lovesong")!,
                      companionCatalog.find((c) => c.id === "aventurine_waves")!,
                    ].map((comp) => {
                      const owned = state.companions.find((c) => c.id === comp.id);
                      return (
                        <div key={comp.id} className="summon-limited-up-card">
                          <div className="summon-limited-avatar-wrap">
                            <Portrait companion={comp} />
                          </div>
                          <div className="summon-limited-up-info">
                            <div className="summon-limited-up-name-row">
                              <b>{comp.name}</b>
                              <span className="rarity-tag rarity-5星">5星限定</span>
                            </div>
                            <small className="summon-limited-up-title">{comp.title}</small>
                            <span className="summon-limited-up-status">
                              {owned ? `已拥有 · ${owned.constellation} 重命座` : "未拥有 · 限时概率UP"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="summon-limited-guarantee-tip">
                    <span>
                      {state.limitedGuaranteed
                        ? "✦ 大保底已就绪：抽中5星必定为【知更鸟情歌】或【砂金戏浪】！"
                        : "✧ 小保底：抽中5星有50%概率为限定UP，若未命中则下次必出！"}
                    </span>
                  </div>
                </section>
              ) : (
                <section className="summon-panel summon-pool-info">
                  <h2>跨越世界，与你相遇</h2>
                  <p>
                    五星为 Fate 与鸣潮联动角色，四星为常驻角色。同稀有度角色等概率抽取。
                  </p>
                  <small>本池独立保底，不计入常驻 200 抽自选。</small>
                </section>
              )}
            </aside>
          </>
        )}
      </div>
      <footer className="summon-footer">
        <div className="summon-record-links">
          <button onClick={() => setDialog("rules")}>召唤详情</button>
          <button onClick={() => setDialog("history")}>召唤记录</button>
        </div>
        {pool !== "ring" && (
          <>
            <div className="summon-cost-note">
              <b>
                每次至少获得一位四星或以上{kind === "weapon" ? "武器" : "角色"}
              </b>
              <small>优先消耗{single.resource}，不足按 160 星晶 / 份补足</small>
              <small>
                单抽补 {single.crystals} 星晶 · 十抽补 {ten.crystals} 星晶
              </small>
            </div>
            <div className="summon-pull-buttons">
              <button
                disabled={!single.affordable || !!results}
                onClick={() => pull(1)}
              >
                <small>× 1</small>召唤 1 次
              </button>
              <button
                disabled={!ten.affordable || !!results}
                onClick={() => pull(10)}
              >
                <small>× 10</small>召唤 10 次
              </button>
            </div>
          </>
        )}
      </footer>
      {notice && (
        <div className="summon-notice" role="status">
          {notice}
          <button onClick={() => setNotice("")}>关闭</button>
        </div>
      )}
      {dialog && (
        <dialog
          ref={modal}
          className="summon-dialog"
          onCancel={closeDialog}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDialog();
          }}
          aria-labelledby="summon-dialog-title"
        >
          <header>
            <div>
              <small>
                {dialog === "weaponSelector"
                  ? "TARGETED RESONANCE"
                  : "THE STARRY COVENANT"}
              </small>
              <h2 id="summon-dialog-title">
                {dialog === "rules"
                  ? "召唤详情"
                  : dialog === "history"
                    ? "召唤记录"
                    : dialog === "weaponSelector"
                      ? "自选神兵定轨"
                      : "群星之约 · 自选五星"}
              </h2>
            </div>
            <button autoFocus onClick={closeDialog} aria-label="关闭弹窗">
              关闭
            </button>
          </header>
          {dialog === "rules" ? (
            <div className="summon-rules">
              <h3>神兵定轨 · 100% 命中保证</h3>
              <p>
                武器召唤全面升级为全角色专属神兵自选定轨！您可自由选择全图鉴 51 位角色中的任意一位专属神兵作为定轨目标。
                抽取命中对应稀有度时，100% 必出所选定轨神兵，绝不歪池。最迟 80 抽必得五星武器，出金后保底重置。
                玩家可随时自由更换定轨目标，保底抽数跨更换完整继承！
              </p>
              <h3>限定池一 · 盛夏谐律 · 戏浪豪赌</h3>
              <p>
                限定池一当期双五星限定概率提升：【知更鸟情歌】与【砂金戏浪】。
                祈愿获得五星角色时，有 50% 概率为当期限定 UP 角色之一。
                若本次获得的五星角色非当期限定（小保底未命中），则下一次获得的五星角色 100% 必出当期限定 UP 角色（大保底）！
                限定五星角色不进入常驻池，不计入常驻 200 抽自选。
              </p>
              <h3>五星保底 · 80 抽</h3>
              <p>
                角色基础五星概率为 1.6%，武器为 2.0%，其余结果均为四星。最迟第 80
                抽必得五星，获得五星后对应池保底计数归零。常驻、限定一期、联动与武器池分别独立计数。
              </p>
              <h3>常驻相逢礼 · 200 抽自选</h3>
              <p>
                常驻角色池累计召唤 200
                次，可免费自选一位常驻五星，每个存档仅可领取一次。抽出五星不重置累计进度；武器、联动、限定和魂环祈愿不计入。自选不消耗货币，不改变保底，也不计作抽卡。
              </p>
              <p>
                可选择全部标准常驻五星（含星璃，不包含联动与限定角色）。重复角色提升一重命座，上限六重，满命后不会额外获得补偿。领取前可查看持有情况并确认。
              </p>
              <h3>召唤消耗与范围</h3>
              <p>
                常驻与武器消耗造化之水；联动与限定池消耗造化青莲，不足部分每份消耗 160 星晶。重复武器提升精炼，上限五阶。
              </p>
              <p>
                旧存档根据仍保留的常驻角色抽卡记录补计自选进度；超出历史保存上限的记录无法追溯。
              </p>
            </div>
          ) : dialog === "history" ? (
            <div className="summon-history">
              <p>最近 100 条召唤记录 · 自选领取不计入抽卡</p>
              {state.pullHistory.length ? (
                state.pullHistory.map((r, i) => (
                  <div key={i}>
                    <span>{r.rarity}</span>
                    <b>{name(r)}</b>
                    <small>
                      {r.pool === "collab"
                        ? "联动"
                        : r.pool === "weapon"
                          ? "武器"
                          : r.pool === "limited"
                            ? "限定"
                            : "常驻"}{" "}
                      ·{" "}
                      {r.time
                        ? new Date(r.time).toLocaleString("zh-CN")
                        : "早期记录"}
                    </small>
                  </div>
                ))
              ) : (
                <p>尚无召唤记录。你的第一场相遇将记录在这里。</p>
              )}
            </div>
          ) : dialog === "weaponSelector" ? (
            <div className="summon-weapon-modal-body">
              <div className="summon-weapon-modal-summary">
                <span>
                  当前定轨：<b>{currentWeaponCompanion.name} · {currentWeapon.name}</b>
                  <span className={`rarity-tag rarity-${currentWeapon.rarity}`}>
                    {currentWeapon.rarity}
                  </span>
                </span>
                <small>抽取到该稀有度时 100% 必出定轨神兵，更换定轨继承当前保底进度</small>
              </div>
              <div className="summon-weapon-filter-row">
                <div className="summon-weapon-tabs">
                  {[
                    ["all", `全部 (${companionCatalog.length})`],
                    ["5star", "五星神兵"],
                    ["4star", "四星神兵"],
                    ["collab", "联动专武"],
                    ["standard", "常驻角色"],
                  ].map(([fKey, fText]) => (
                    <button
                      key={fKey}
                      type="button"
                      className="summon-filter-tab"
                      aria-pressed={weaponFilter === fKey}
                      onClick={() => setWeaponFilter(fKey as any)}
                    >
                      {fText}
                    </button>
                  ))}
                </div>
                <input
                  className="summon-search summon-weapon-search-input"
                  aria-label="搜索自选武器或角色"
                  placeholder="搜索角色名、称号或武器名..."
                  value={weaponSearch}
                  onChange={(e) => setWeaponSearch(e.target.value)}
                />
              </div>
              <div className="summon-choice-grid summon-weapon-grid">
                {filteredWeaponCompanions.map((c) => {
                  const w = weaponCatalog.find((item) => item.signatureFor === c.id)!;
                  const existing = state.weapons.find((item) => item.id === w.id);
                  const isSelected = weaponSelection === c.id;
                  const isCurrentTarget = (state.weaponTargetCompanionId ?? "yanhuang") === c.id;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      className={`summon-weapon-card ${isSelected ? "is-selected" : ""} ${isCurrentTarget ? "is-active-target" : ""}`}
                      aria-pressed={isSelected}
                      onClick={() => setWeaponSelection(c.id)}
                    >
                      <div className="summon-weapon-card-top">
                        <Portrait companion={c} />
                        <div className="summon-weapon-card-meta">
                          <div className="summon-weapon-name-badge">
                            <b>{w.name}</b>
                            <span className={`rarity-pill rarity-${w.rarity}`}>{w.rarity}</span>
                          </div>
                          <small className="summon-weapon-char-title">
                            {c.name} · {c.title}
                          </small>
                          <small className="summon-weapon-state-text">
                            {existing
                              ? `已拥有 · 精炼 ${existing.refinement} 阶`
                              : "未拥有"}
                          </small>
                        </div>
                      </div>
                      {isCurrentTarget && <span className="current-target-indicator">当前定轨</span>}
                    </button>
                  );
                })}
              </div>
              {filteredWeaponCompanions.length === 0 && (
                <p className="summon-empty-tip">未找到符合搜索条件的武器或角色。</p>
              )}
              <footer className="summon-claim">
                {(() => {
                  const pickedComp = companionCatalog.find((c) => c.id === weaponSelection);
                  const pickedWpn = pickedComp ? weaponCatalog.find((w) => w.signatureFor === pickedComp.id) : null;
                  const isCurrent = (state.weaponTargetCompanionId ?? "yanhuang") === weaponSelection;
                  const existing = pickedWpn ? state.weapons.find((item) => item.id === pickedWpn.id) : null;
                  return (
                    <>
                      <p>
                        {pickedComp && pickedWpn
                          ? `${pickedComp.name} · ${pickedWpn.name}（${pickedWpn.rarity}） · ${existing ? `已持有（精炼 ${existing.refinement} 阶）` : "未拥有"}`
                          : "请选择想要定轨的专属神兵"}
                      </p>
                      <button
                        type="button"
                        disabled={!pickedComp || isCurrent}
                        onClick={() => {
                          if (!pickedComp) return;
                          setWeaponTarget(pickedComp.id);
                          setNotice(`已将定轨神兵切换为：${pickedComp.name} · ${pickedWpn?.name}`);
                          closeDialog();
                        }}
                      >
                        {isCurrent ? "当前正在定轨该神兵" : "确认定轨所选神兵"}
                      </button>
                    </>
                  );
                })()}
              </footer>
            </div>
          ) : (
            <>
              <p>
                累计 {total} / 200 抽 ·{" "}
                {state.standardSelectorClaimed
                  ? "奖励已领取"
                  : ready
                    ? "已达成，可免费领取一次"
                    : `还需 ${200 - total} 抽`}
                。请选择一位角色，再确认领取。
              </p>
              <input
                className="summon-search"
                aria-label="搜索自选角色"
                placeholder="搜索角色名称"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="summon-choice-grid">
                {selectable
                  .filter((c) => c.name.includes(search.trim()))
                  .map((c) => {
                    const existing = state.companions.find(
                      (u) => u.id === c.id,
                    );
                    return (
                      <button
                        aria-pressed={selection === c.id}
                        key={c.id}
                        onClick={() => setSelection(c.id)}
                      >
                        <Portrait companion={c} />
                        <b>{c.name}</b>
                        <small>
                          {existing
                            ? `已拥有 · ${existing.constellation} 重命座`
                            : "未拥有"}
                        </small>
                      </button>
                    );
                  })}
              </div>
              {!selectable.some((c) => c.name.includes(search.trim())) && (
                <p>未找到符合条件的角色。</p>
              )}
              <footer className="summon-claim">
                <p>
                  {selected
                    ? `${selected.name} · ${owned ? (owned.constellation >= 6 ? "已满命，领取无额外收益" : `命座提升至 ${owned.constellation + 1} 重`) : "首次获得，加入角色列表"}`
                    : "选择你想与之同行的角色"}
                </p>
                <button
                  disabled={!ready || !selected}
                  onClick={() => {
                    if (!ready || !selected) return;
                    dispatch({
                      type: "CLAIM_STANDARD_SELECTOR",
                      id: selection,
                    });
                    setNotice(`已领取常驻五星 · ${selected.name}`);
                    closeDialog();
                  }}
                >
                  {state.standardSelectorClaimed
                    ? "已领取"
                    : !ready
                      ? "累计 200 抽后可领取"
                      : "确认领取所选角色"}
                </button>
              </footer>
            </>
          )}
        </dialog>
      )}
      {results && (
        <SummonAnimation
          key={session}
          results={results}
          kind={kind}
          pool={paymentPool}
          onClose={() => setResults(null)}
          onRePull={pull}
        />
      )}
    </section>
  );
}
