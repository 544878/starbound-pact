import { useState } from "react";
import { towerFloors, towerRegions, elementLabels } from "../data/catalog";
import { enemyArt, getEncounter } from "../data/encounters";
import { useGame } from "../state/GameContext";
import { Icon } from "../components/Icon";

const elementName = (id: string) =>
  elementLabels[id as keyof typeof elementLabels] ?? id;
const typeName = (type: string) =>
  ({
    mob: "巡游魔裔",
    elite: "高阶精英",
    boss_rush: "三王连战",
    dual_boss: "双神同临",
  })[type] ?? "法则首领";
const number = (n: number) => Math.round(n * 250).toLocaleString("zh-CN");

export function TowerScreen() {
  const { state, dispatch, sweepTowerFloor } = useGame();
  const clearedList =
    state.clearedTowerFloors ??
    Array.from({ length: state.highestTowerFloor }, (_, i) => i + 1);
  const initial =
    towerFloors.find((f) => f.floor === state.towerFloor) ?? towerFloors[0];
  const [selected, setSelected] = useState(initial.floor);
  const [enemyIndex, setEnemyIndex] = useState(0);
  const [notice, setNotice] = useState("");
  const floor = towerFloors.find((f) => f.floor === selected) ?? initial;
  const region = towerRegions.find((r) => r.id === floor.regionId)!;
  const regionFloors = towerFloors.filter((f) => f.regionId === region.id);
  const encounter = getEncounter({ kind: "tower", id: String(floor.floor) });
  const enemies = encounter.boss.bossWave ?? [
    encounter.boss,
    ...(encounter.boss.dualBoss ? [encounter.boss.dualBoss] : []),
  ];
  const boss = enemies[enemyIndex] ?? enemies[0];
  const cleared = clearedList.includes(floor.floor);
  const isUnlocked = (f: typeof floor) =>
    clearedList.includes(f.floor) ||
    f.stageInRegion === 1 ||
    clearedList.includes(f.floor - 1);
  const select = (id: number) => {
    setSelected(id);
    setEnemyIndex(0);
    setNotice("");
  };
  const canStart = isUnlocked(floor) && state.stamina >= encounter.cost;
  return (
    <section className="abyss-page" aria-label="法则深渊">
      <header className="abyss-heading">
        <div>
          <span>ABYSSAL SPIRE</span>
          <h1>
            深渊<span>向更高处，问道。</span>
          </h1>
        </div>
        <div className="abyss-progress">
          <Icon name="tower" />
          <div>
            <b>
              {
                clearedList.filter((n) =>
                  towerFloors.some((f) => f.floor === n),
                ).length
              }
              <small> / 18</small>
            </b>
            <span>深境探索</span>
          </div>
        </div>
      </header>
      <div className="abyss-regions" aria-label="深境选择">
        {towerRegions.map((r) => {
          const count = towerFloors.filter(
            (f) => f.regionId === r.id && clearedList.includes(f.floor),
          ).length;
          return (
            <button
              key={r.id}
              aria-pressed={r.id === region.id}
              onClick={() =>
                select(
                  towerFloors.find(
                    (f) =>
                      f.regionId === r.id && !clearedList.includes(f.floor),
                  )?.floor ??
                    towerFloors.find((f) => f.regionId === r.id)!.floor,
                )
              }
            >
              <Icon
                name={r.id === 1 ? "plant" : r.id === 2 ? "sword" : "sparkle"}
              />
              <div>
                <b>{r.name}</b>
                <span>{r.theme}</span>
              </div>
              <small>{count} / 6</small>
              <i style={{ width: `${(count / 6) * 100}%` }} />
            </button>
          );
        })}
      </div>
      <div className="abyss-region-summary">
        <span>{region.subtitle}</span>
        <p>{region.description}</p>
        <span>{region.tag}</span>
      </div>
      <div className="abyss-layout">
        <nav className="abyss-floors" aria-label="深渊楼层">
          <div className="abyss-nav-caption">
            第 {region.id} 深境 <span>六重试炼</span>
          </div>
          {regionFloors.map((f) => (
            <button
              key={f.floor}
              aria-pressed={f.floor === selected}
              onClick={() => select(f.floor)}
            >
              <span className="abyss-floor-number">
                {String(f.stageInRegion).padStart(2, "0")}
              </span>
              <div>
                <b>{f.title}</b>
                <small>{typeName(f.enemyType ?? "mob")}</small>
              </div>
              <Icon
                name={
                  clearedList.includes(f.floor)
                    ? "check"
                    : isUnlocked(f)
                      ? "chevron"
                      : "lock"
                }
              />
            </button>
          ))}
          <p className="abyss-nav-note">
            三大法则地域
            <br />
            八位首领，静候来者。
          </p>
        </nav>
        <div className="abyss-art-column">
          <div
            className={`abyss-art-frame ${floor.enemyType === "dual_boss" ? "is-dual" : ""}`}
          >
            {floor.enemyType === "dual_boss" ? (
              enemies.map((enemy, i) => (
                <button
                  key={enemy.name}
                  onClick={() => setEnemyIndex(i)}
                  aria-label={`查看${enemy.name}`}
                  aria-pressed={i === enemyIndex}
                >
                  <img src={enemyArt(enemy)} alt={enemy.name} />
                </button>
              ))
            ) : (
              <img key={enemyArt(boss)} src={enemyArt(boss)} alt={boss.name} />
            )}
            <div className="abyss-art-caption">
              <small>
                {typeName(floor.enemyType ?? "mob")} · F{floor.floor}
              </small>
              <b>{boss.name}</b>
              <span>
                {floor.enemyType === "boss_rush"
                  ? `第 ${enemyIndex + 1} 席 / 击破后迎战下一位首领`
                  : floor.enemyType === "dual_boss"
                    ? "双神同时登场 · 一方战败，另一方狂暴"
                    : boss.subtitle}
              </span>
            </div>
          </div>
          <div className="abyss-enemy-strip" aria-label="本层敌人">
            {enemies.map((enemy, i) => (
              <button
                key={enemy.name}
                aria-pressed={i === enemyIndex}
                onClick={() => setEnemyIndex(i)}
              >
                <img src={enemyArt(enemy)} alt="" />
                <span>
                  {enemy.name}
                  <small>
                    {floor.enemyType === "boss_rush"
                      ? `第 ${i + 1} 席`
                      : "主敌"}{" "}
                    · {elementName(enemy.weakness)}弱点
                  </small>
                </span>
              </button>
            ))}
            {boss.minions?.map((m) => (
              <div className="abyss-minion-preview" key={m.id}>
                <img src={m.art} alt={m.name} />
                <span>
                  {m.name}
                  <small>随从 · 生命 {number(m.hp)}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
        <article className="abyss-detail">
          <div className="abyss-detail-top">
            <span>
              第 {floor.stageInRegion} 层 · {floor.title}
            </span>
            <b>{floor.mechanicTag}</b>
          </div>
          <h2>{boss.name}</h2>
          <p className="abyss-subtitle">{boss.subtitle}</p>
          <dl className="abyss-stats">
            <div>
              <dt>生命</dt>
              <dd>{number(boss.hp)}</dd>
            </div>
            <div>
              <dt>攻击</dt>
              <dd>{number(boss.attack)}</dd>
            </div>
            <div>
              <dt>防御</dt>
              <dd>{boss.defense}</dd>
            </div>
          </dl>
          <div className="abyss-weakness">
            <Icon name="sparkle" />
            <span>属性弱点</span>
            <b className={`element-${boss.weakness}`}>
              {elementName(boss.weakness)}
            </b>
            <small>战技命中加速破盾</small>
          </div>
          <div className="abyss-rule">
            <h3>
              <Icon name="scroll" />
              {floor.modifierName}
            </h3>
            <p>{floor.modifierDesc}</p>
          </div>
          <details className="abyss-intel">
            <summary>
              战斗情报{" "}
              <span>
                护盾 {boss.shield} 层<Icon name="chevron" />
              </span>
            </summary>
            <p>{boss.hint}</p>
            <p>
              战技削韧 1 层，弱点命中 2 层；破盾增伤 20%（灭世主教为
              100%）。半血进入「{boss.phaseName}」，攻击提高{" "}
              {Math.round((boss.phaseAttack - 1) * 100)}%。
            </p>
            <p>
              直接抗性 {Math.round(boss.directResistance * 100)}% · 追击抗性{" "}
              {Math.round(boss.pursuitResistance * 100)}% · 持续抗性{" "}
              {Math.round(boss.dotResistance * 100)}% · 治疗压制{" "}
              {Math.round(boss.healingSuppression * 100)}%
            </p>
          </details>
          <div className="abyss-rewards">
            <h3>
              首次通关奖励 <small>{cleared ? "已领取" : "未领取"}</small>
            </h3>
            <div>
              <span>
                <Icon name="sparkle" />
                <b>{floor.firstClearRewards.crystals}</b>
                <small>星晶</small>
              </span>
              <span>
                <Icon name="coin" />
                <b>{floor.firstClearRewards.gold.toLocaleString()}</b>
                <small>金币</small>
              </span>
              {floor.firstClearRewards.materials.map((m) => (
                <span key={m.name}>
                  <Icon name="gift" />
                  <b>×{m.count}</b>
                  <small>{m.name}</small>
                </span>
              ))}
            </div>
          </div>
          <p className="abyss-recommendation">
            建议战力 {floor.recommendedPower.toLocaleString()} · 等级{" "}
            {40 + floor.stageInRegion * 5} · 最多 60 回合
          </p>
          <div className="abyss-actions">
            <button
              disabled={!cleared || state.stamina < 6}
              onClick={() => {
                sweepTowerFloor(floor.floor);
                setNotice(
                  `扫荡成功：${floor.sweepRewards.gold}金币，${floor.sweepRewards.materials.map((m) => `${m.name}×${m.count}`).join("、")}`,
                );
              }}
            >
              <Icon name="reset" />
              扫荡<small>6 体力</small>
            </button>
            <button
              className="abyss-challenge"
              disabled={!canStart}
              onClick={() =>
                dispatch({
                  type: "PREPARE_ENCOUNTER",
                  encounter: { kind: "tower", id: String(floor.floor) },
                })
              }
            >
              <Icon name="sword" />
              {!isUnlocked(floor)
                ? "前置关卡未通关"
                : state.stamina < 8
                  ? "体力不足"
                  : "集结出战"}
              <small>8 体力</small>
            </button>
          </div>
          <p className="abyss-notice" aria-live="polite">
            {notice ||
              `当前体力 ${state.stamina} · ${cleared ? "本层已通关，可再次挑战" : isUnlocked(floor) ? "关卡已开启，等待出战" : "可预览情报，通关前层后开启"}`}
          </p>
        </article>
      </div>
    </section>
  );
}
