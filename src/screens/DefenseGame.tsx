import { skillNames } from '../data/skillNames';
import { useCallback, useEffect, useRef, useState } from "react";
import { Portrait } from "../components/Portrait";
import { GardenBattlefield } from "../components/GardenBattlefield";
import { useGame } from "../state/GameContext";
import { roleLabels, elementLabels } from "../data/catalog";
import { RULES } from "../data/advancedRules";
import { stats } from "../systems/growth";
import {
  createDefense,
  deploy,
  retreat,
  activateSkill,
  startWave,
  tickDefense,
  isGround,
  defenseCost,
  inRange,
} from "../systems/defense";

const arrows = ["→", "↓", "←", "↑"];
export function DefenseGame({
  onSelectionChange,
}: {
  onSelectionChange?: (id: string) => void;
}) {
  const { state, updateDefenseScore } = useGame();
  const [game, setGame] = useState(createDefense);
  const [selected, setSelected] = useState(
    state.companions[1]?.id ?? state.companions[0].id,
  );
  const [tile, setTile] = useState<[number, number] | null>(null);
  const [direction, setDirection] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [grid, setGrid] = useState(false);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("选择下方角色，再点击战场地块。");
  useEffect(() => {
    onSelectionChange?.(selected);
  }, [selected, onSelectionChange]);
  const awarded = useRef(false);
  const c = state.companions.find((c) => c.id === selected)!;
  const deployed = game.operators.find((o) => o.id === selected);
  const unitStats = stats(c, state.weapons);
  const ended = game.phase === "won" || game.phase === "lost";
  const groundUnit = c.role === "guardian" || c.role === "striker";
  const canPlace =
    !!tile &&
    !deployed &&
    !ended &&
    game.dp >= defenseCost(c) &&
    groundUnit === isGround(...tile) &&
    !game.operators.some((o) => o.x === tile[0] && o.y === tile[1]) &&
    !(tile[0] === 0 && tile[1] === 2) &&
    !(tile[0] === 8 && tile[1] === 3) &&
    !(game.redeploy[c.id] > 0);
  useEffect(() => {
    if (paused || game.phase !== "running") return;
    const timer = setInterval(
      () => setGame((g) => tickDefense(g, 0.1 * speed)),
      100,
    );
    return () => clearInterval(timer);
  }, [paused, speed, game.phase]);
  useEffect(() => {
    if (ended && !awarded.current) {
      awarded.current = true;
      updateDefenseScore(
        game.phase === "won" ? RULES.defense.waves : Math.max(0, game.wave - 1),
      );
    }
  }, [ended, game.phase, game.wave, updateDefenseScore]);
  const selectTile = useCallback(
    (x: number, y: number) => {
      setTile([x, y]);
      const o = game.operators.find((o) => o.x === x && o.y === y);
      if (o) {
        setSelected(o.id);
        setDirection(o.direction);
      }
    },
    [game.operators],
  );
  function place() {
    if (!tile || !canPlace) return;
    setGame((g) => deploy(g, c, ...tile, direction, state.weapons));
    setMessage(`${c.name}已部署 · 朝向${["右", "下", "左", "上"][direction]}`);
  }
  function resetBattle() {
    setGame(createDefense());
    awarded.current = false;
    setPaused(false);
    setTile(null);
    setMessage("防线已重置，请重新部署。");
  }
  const skillDescription =
    c.role === "support"
      ? "治疗效果翻倍，恢复范围内友方生命。"
      : c.role === "guardian"
        ? "受到的阻挡伤害减半，攻击伤害翻倍。"
        : "攻击伤害翻倍，灵术角色附带范围伤害。";
  const previewOperator = {
    id: c.id,
    x: 3,
    y: 3,
    direction: deployed?.direction ?? direction,
    hp: unitStats.hp,
    stats: unitStats,
    role: c.role,
    timer: 0,
    cooldown: 0,
    skill: 0,
    hits: 0,
  };
  return (
    <section className="defense-page garden-defense">
      <div className="garden-main">
        <header className="garden-heading">
          <h1>星光守卫战</h1>
          <span>——</span>
          <p>守住最后的星光，便是守住这个世界的温柔。</p>
        </header>
        <div className="garden-hud">
          <div>
            <i className="hud-leaf">❧</i>
            <span>DP</span>
            <b>
              {Math.floor(game.dp)} <small>/ {RULES.defense.maxDp}</small>
            </b>
          </div>
          <div>
            <i>♟</i>
            <span>当前波次</span>
            <b>
              {game.wave} <small>/ {RULES.defense.waves}</small>
            </b>
          </div>
          <div>
            <i className="hud-heart">♥</i>
            <span>基地生命</span>
            <b>
              {game.health} <small>/ {RULES.defense.health}</small>
            </b>
          </div>
          <p>
            微风花庭 · 第 1 章
            <small>
              {game.phase === "prepare"
                ? "准备部署"
                : game.phase === "between"
                  ? "波次完成"
                  : paused
                    ? "战斗已暂停"
                    : ended
                      ? "作战结束"
                      : "守卫进行中"}{" "}
              · 击退 {game.kills}
            </small>
          </p>
        </div>
        <div className="garden-stage">
          <GardenBattlefield
            game={game}
            companions={state.companions}
            selected={tile}
            selectedId={selected}
            onSelect={selectTile}
            grid={grid}
            paused={paused || game.phase !== "running"}
          />
          <div className="garden-field-controls">
            <button
              aria-pressed={grid}
              onClick={() => setGrid((v) => !v)}
              className={grid ? "active" : ""}
            >
              ▧ <span>{grid ? "收起网格" : "战术网格"}</span>
            </button>
            <span className="terrain-key">
              <i />
              地面 <i />
              高台
            </span>
            <div className="playback-controls">
              <button
                onClick={() => setSpeed((v) => (v === 1 ? 2 : 1))}
                aria-label="切换战斗速度"
              >
                ×{speed}
              </button>
              <button
                disabled={game.phase !== "running"}
                aria-label={paused ? "继续战斗" : "暂停战斗"}
                onClick={() => setPaused((v) => !v)}
              >
                {paused ? "▶" : "Ⅱ"}
              </button>
            </div>
          </div>
          {ended && (
            <div className="garden-result">
              <span>✧</span>
              <h2>{game.phase === "won" ? "守卫成功" : "防线失守"}</h2>
              <p>
                击退 {game.kills} 名敌人 ·{" "}
                {game.phase === "won"
                  ? "星光仍在，感谢你的守护。"
                  : "调整部署，重新守护这片花庭。"}
              </p>
              <button onClick={resetBattle}>重新部署</button>
            </div>
          )}
        </div>
        <section className="garden-roster-panel" aria-label="作战干员">
          <header>
            <h2>作战干员</h2>
            <span>
              已部署 {game.operators.length} / {state.companions.length}
              <i>✧</i>
            </span>
          </header>
          <div className="garden-roster">
            {state.companions.map((unit) => {
              const placed = game.operators.some((o) => o.id === unit.id),
                cooldown = game.redeploy[unit.id] ?? 0;
              return (
                <button
                  key={unit.id}
                  aria-pressed={selected === unit.id}
                  className={selected === unit.id ? "selected" : ""}
                  onClick={() => {
                    setSelected(unit.id);
                    setPreview(false);
                    setMessage(
                      `${unit.name} · ${unit.role === "guardian" || unit.role === "striker" ? "选择地面地块" : "选择高台地块"}`,
                    );
                  }}
                >
                  <div className="roster-image">
                    <Portrait companion={unit} />
                    <span className="roster-level">Lv.{unit.level}</span>
                    <span className="roster-cost">{defenseCost(unit)}</span>
                    <span className={`roster-element element-${unit.element}`}>
                      {elementLabels[unit.element]}
                    </span>
                    {placed && <span className="roster-deployed">已部署</span>}
                  </div>
                  <b>{unit.name}</b>
                  <small>
                    {cooldown > 0
                      ? `${Math.ceil(cooldown)} 秒后再部署`
                      : roleLabels[unit.role]}
                  </small>
                </button>
              );
            })}
          </div>
        </section>
      </div>
      <aside className="garden-inspector">
        <div className="inspector-art">
          <Portrait companion={c} />
          <span className={`inspector-element element-${c.element}`}>
            ✧<small>{elementLabels[c.element]}</small>
          </span>
        </div>
        <div className="inspector-body">
          <h2>{c.name}</h2>
          <p className="character-title">{c.title}</p>
          <div className="character-role">
            {groundUnit ? "⚔ 近战" : "✧ 远程"} · {roleLabels[c.role]}
            <span>{groundUnit ? "地面" : "高台"}</span>
          </div>
          <div className="character-level">
            Lv. <b>{c.level}</b>
            <span>{"★".repeat(c.rarity === "5星" ? 5 : 4)}</span>
          </div>
          <div className="inspector-stats">
            <dl>
              <div>
                <dt>♥ 生命</dt>
                <dd>{deployed ? Math.ceil(deployed.hp) : unitStats.hp}</dd>
              </div>
              <div>
                <dt>⚔ 攻击</dt>
                <dd>{unitStats.attack}</dd>
              </div>
              <div>
                <dt>◈ 防御</dt>
                <dd>{unitStats.defense}</dd>
              </div>
              <div>
                <dt>♧ 阻挡</dt>
                <dd>
                  {c.role === "guardian" ? 3 : c.role === "striker" ? 1 : 0}
                </dd>
              </div>
            </dl>
            <div className="range-preview">
              <span>攻击范围</span>
              <div>
                {Array.from({ length: 49 }, (_, i) => (
                  <i
                    key={i}
                    className={
                      i === 24
                        ? "origin"
                        : inRange(previewOperator, i % 7, Math.floor(i / 7))
                          ? "covered"
                          : ""
                    }
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="inspector-tabs">
            <button
              className={!preview ? "active" : ""}
              onClick={() => setPreview(false)}
            >
              部署设置
            </button>
            <button
              className={preview ? "active" : ""}
              onClick={() => setPreview(true)}
            >
              技能预览
            </button>
          </div>
          {preview ? (
            <div className="skill-preview">
              <h3>✧ {skillNames(c)[1]}</h3>
              <p>{skillDescription}</p>
              <p>持续 6 秒 · 冷却 {RULES.defense.skillCooldown} 秒</p>
            </div>
          ) : (
            <>
              <p className="direction-label">
                朝向选择 <span>{deployed ? "已部署，朝向固定" : ""}</span>
              </p>
              <div className="garden-directions">
                {[2, 3, 1, 0].map((i) => (
                  <button
                    key={i}
                    aria-label={`朝向${["右", "下", "左", "上"][i]}`}
                    disabled={!!deployed}
                    aria-pressed={direction === i}
                    className={direction === i ? "active" : ""}
                    onClick={() => setDirection(i)}
                  >
                    {arrows[i]}
                  </button>
                ))}
              </div>
            </>
          )}
          <p className="tile-status">
            {tile
              ? `地块 ${tile[0] + 1} · ${tile[1] + 1} / ${isGround(...tile) ? "地面" : "高台"}`
              : "点击战场，选择部署位置"}
            {tile && !deployed && groundUnit !== isGround(...tile) && (
              <strong>需要{groundUnit ? "地面" : "高台"}地块</strong>
            )}
          </p>
          <div className="garden-deploy-actions">
            <button
              className="deploy-button"
              disabled={!canPlace}
              onClick={place}
            >
              <b>部署</b>
              <small>消耗 DP {defenseCost(c)}</small>
            </button>
            <button
              disabled={!deployed || ended}
              onClick={() => {
                setGame((g) => retreat(g, selected));
                setMessage(`${c.name}已撤退，15 秒后可再次部署。`);
              }}
            >
              <b>⟳</b>
              <small>撤退</small>
            </button>
          </div>
          <button
            className="garden-skill"
            disabled={
              !deployed || deployed.cooldown > 0 || game.phase !== "running"
            }
            onClick={() => {
              setGame((g) => activateSkill(g, selected));
              setMessage(`${skillNames(c)[1]}已发动。`);
            }}
          >
            <span>✺</span>
            <div>
              <b>{skillNames(c)[1]}</b>
              <small>
                {deployed && deployed.cooldown > 0
                  ? `冷却 ${Math.ceil(deployed.cooldown)} 秒`
                  : skillDescription}
              </small>
            </div>
          </button>
          <p className="garden-feedback" aria-live="polite">
            {message}
          </p>
          {(game.phase === "prepare" || game.phase === "between") && (
            <button
              className="begin-wave"
              onClick={() => {
                setPaused(false);
                setGame((g) => startWave(g));
                setMessage("敌人来袭，守护花庭！");
              }}
            >
              开始第 {game.wave} 波 <span>→</span>
            </button>
          )}
          <details className="garden-help">
            <summary>作战指南</summary>
            <p>
              先部署地面角色阻挡，再部署高台角色治疗与输出。点选已部署角色查看范围；撤退返还一半费用，15
              秒后可再次部署。守卫攻击一格，其余角色攻击前方三格。
            </p>
          </details>
        </div>
        <p className="inspector-quote">
          星与少女
          <br />
          <span>— 仍在守望这个世界。</span>
        </p>
      </aside>
    </section>
  );
}
