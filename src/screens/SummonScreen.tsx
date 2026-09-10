import { COMBAT_PATHS } from "../data/combat";
import { useEffect, useRef, useState } from "react";
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
  ["limited", "限定召唤", "静候下一次相逢", "astra"],
  ["collab", "异界交汇", "跨越世界的契约", COLLAB_IDS[0]],
  ["weapon", "武器召唤", "本命神兵", "yanhuang"],
  ["ring", "魂环祈愿", "定向共鸣", "selene"],
] as const;
type Pool = (typeof pools)[number][0];

export function SummonScreen() {
  const { state, summon, selectCompanion, dispatch, navigate } = useGame();
  const [pool, setPool] = useState<Pool>("standard");
  const [results, setResults] = useState<PullResult[] | null>(null);
  const [dialog, setDialog] = useState<"rules" | "history" | "selector" | null>(
    null,
  );
  const [selection, setSelection] = useState("");
  const [search, setSearch] = useState("");
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
        : state.pityCharacter;
  const total = state.standardPullTotal;
  const ready = total >= 200 && !state.standardSelectorClaimed;
  const hero = companionCatalog.find(
    (c) => c.id === (pool === "collab" ? COLLAB_IDS[0] : "xuanzhao"),
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
          {pools.map(([id, title, subtitle, portrait]) => (
            <button
              key={id}
              aria-pressed={pool === id}
              onClick={() => {
                setPool(id);
                setNotice("");
              }}
            >
              <Portrait
                companion={companionCatalog.find((c) => c.id === portrait)!}
              />
              <span>
                <b>{title}</b>
                <small>{subtitle}</small>
              </span>
            </button>
          ))}
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
          <div className="summon-special summon-coming">
            <small>下一段命运，正在酝酿</small>
            <h2>静候星辰归来</h2>
            <p>限定五星召唤尚未开放。</p>
            <button onClick={() => setPool("collab")}>前往异界交汇</button>
          </div>
        ) : (
          <>
            <div className="summon-feature">
              <div className="summon-feature-copy">
                <small>
                  {pool === "standard"
                    ? "THE STARRY COVENANT"
                    : pool === "collab"
                      ? "BEYOND THE WORLDS"
                      : "ECHOES OF ARMS"}
                </small>
                <h2>
                  {pool === "standard"
                    ? "群星之约"
                    : pool === "collab"
                      ? "异界交汇"
                      : "神兵天授"}
                </h2>
                <h3>
                  {pool === "standard"
                    ? "常驻召唤 · 永久开放"
                    : pool === "collab"
                      ? "联动召唤 · 命运交汇"
                      : "武器召唤 · 本命共鸣"}
                </h3>
                <p>
                  群星流转，
                  <br />
                  希冀始终与您同在。
                </p>
              </div>
              {pool !== "standard" && (
                <div className="summon-alt-art">
                  {pool === "weapon" ? (
                    <EquipmentArt
                      kind="weapon"
                      signatureFor={hero.id}
                      path={hero.path}
                      name="本命神兵"
                    />
                  ) : (
                    <CharacterArt companion={hero} />
                  )}
                </div>
              )}
              <div className="summon-verse">
                循星而行
                <br />
                赴永恒之约
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
              ) : (
                <section className="summon-panel summon-pool-info">
                  <h2>
                    {pool === "weapon" ? "神兵共鸣" : "跨越世界，与你相遇"}
                  </h2>
                  <p>
                    {pool === "weapon"
                      ? "全部角色专武均已进入武器池，也可在角色页面定向锻造。"
                      : "五星为 Fate 与鸣潮联动角色，四星为常驻角色。同稀有度角色等概率抽取。"}
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
        {pool !== "limited" && pool !== "ring" && (
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
              <small>THE STARRY COVENANT</small>
              <h2 id="summon-dialog-title">
                {dialog === "rules"
                  ? "召唤详情"
                  : dialog === "history"
                    ? "召唤记录"
                    : "群星之约 · 自选五星"}
              </h2>
            </div>
            <button autoFocus onClick={closeDialog} aria-label="关闭弹窗">
              关闭
            </button>
          </header>
          {dialog === "rules" ? (
            <div className="summon-rules">
              <h3>五星保底 · 80 抽</h3>
              <p>
                角色基础五星概率为 1.6%，武器为 2.0%，其余结果均为四星。最迟第
                80
                抽必得五星，获得五星后对应池保底计数归零。常驻、联动与武器池分别计数。
              </p>
              <h3>常驻相逢礼 · 200 抽自选</h3>
              <p>
                常驻角色池累计召唤 200
                次，可免费自选一位常驻五星，每个存档仅可领取一次。抽出五星不重置累计进度；武器、联动、限定和魂环祈愿不计入。自选不消耗货币，不改变保底，也不计作抽卡。
              </p>
              <p>
                可选择全部非联动常驻五星（含星璃）。重复角色提升一重命座，上限六重，满命后不会额外获得补偿。领取前可查看持有情况并确认。
              </p>
              <h3>召唤消耗与范围</h3>
              <p>
                常驻与武器消耗造化之水；联动与未来限定消耗造化青莲，不足部分每份消耗
                160
                星晶。限定池尚未开放。同池同稀有度等概率。重复武器提升精炼，上限五阶。
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
