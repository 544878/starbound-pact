import { resourceDungeon, resourceDrops } from "../data/resourceDungeons";
import { getEncounter } from "../data/encounters";
import { FormationDiagram } from "../components/FormationDiagram";
import { FORMATION_LAYOUTS } from "../data/formationLayouts";

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Portrait } from "../components/Portrait";
import type { PerformanceCue } from "../components/AstralStage";
import { useGame } from "../state/GameContext";
import { COMBAT_PATHS } from "../data/combat";
import type { PathId } from "../domain/combat";
import {
  canCommand,
  battleEnemies,
  isAreaAttack,
  actionPresentation,
  createAstralBattle,
  formationLink,
  PATH_BUFFS,
  PATH_COLORS,
  resolveAstralAction,
  ROLE_NAMES,
  setBattleTarget,
  signatureActive,
  type Command,
} from "../systems/astralBattle";
import { generateBattleDrops } from "../systems/battle";
import { MusicPlayerPill } from "../components/MusicPlayerPill";
import { audioEngine } from "../audio/audioEngine";
import { useAudio } from "../audio/useAudio";
import "../astral-battle.css";
const AstralStage = lazy(() => import("../components/IllustratedStage"));
const number = (v: number) => Math.round(v * 250).toLocaleString("zh-CN");
function SkillGlyph({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <g
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {kind === "basic" ? (
          <>
            <path d="M17 48 45 12l-5 23-17 11-6 2Z M22 41l7 6 M18 46l-6 9 M27 36 40 21" />
            <path d="m9 31 7-2 2-7 2 7 7 2-7 2-2 7-2-7Z" />
          </>
        ) : kind === "skill" ? (
          <>
            <path d="M50 19C37 8 13 20 15 37c2 15 22 20 31 7-12 5-22-1-20-12 2-9 14-14 24-13Z" />
            <path d="m44 29 3 7 8 3-8 3-3 8-3-8-8-3 8-3Z" />
          </>
        ) : (
          <>
            <path d="m32 5 6 19 18-10-12 18 15 5-19 4-8 19-4-20-21 5 15-14L9 17l19 7Z" />
            <circle cx="32" cy="32" r="23" />
            <circle cx="32" cy="32" r="5" />
          </>
        )}
      </g>
    </svg>
  );
}
export function BattleScreen() {
  const { state, navigate, finishBattle } = useGame();
  const { settings: audioSettings } = useAudio();
  const encounter = getEncounter(state.encounter);
  const resolve = Object.entries(state.storyChoices ?? {}).sort(([a], [b]) =>
    b.localeCompare(a),
  )[0]?.[1];
  const party = state.formation
    .flatMap((id) => state.companions.filter((c) => c.id === id))
    .slice(0, 5);
  const [battle, setBattle] = useState(() =>
    createAstralBattle(
      party,
      state.weapons,
      state.formationPath ?? encounter.path,
      encounter.boss,
      resolve,
    ),
  );
  const [cue, setCue] = useState<PerformanceCue | null>(null);
  const [auto, setAuto] = useState(false),
    [speed, setSpeed] = useState(1);

  useEffect(() => {
    return () => {
      audioEngine.setBattlePhase2(false);
    };
  }, []);

  useEffect(() => {
    const isP2 = battle.phase === 2 || battle.bossHp / battle.bossMaxHp <= 0.5;
    audioEngine.setBattlePhase2(isP2);
  }, [battle.phase, battle.bossHp, battle.bossMaxHp]);

  useEffect(() => {
    if (battle.outcome === "win") {
      audioEngine.playSfx("victory");
    }
  }, [battle.outcome]);

  const [overview, setOverview] = useState(false),
    [reduced, setReduced] = useState(
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  const [ready, setReady] = useState(false),
    [showLog, setShowLog] = useState(false),
    [exit, setExit] = useState(false),
    [help, setHelp] = useState(false),
    [impact, setImpact] = useState(false);
  const busy = useRef(false),
    claimed = useRef(false),
    token = useRef(0),
    timers = useRef<number[]>([]);
  const current = useRef({ battle, speed, reduced });
  current.current = { battle, speed, reduced };
  const act = useCallback((command: Command = "basic") => {
    if (busy.current) return;
    const now = current.current,
      resolution = resolveAstralAction(now.battle, command);
    if (!resolution) return;
    busy.current = true;
    const duration =
      (now.reduced
        ? 650
        : resolution.event.kind === "ultimate"
          ? 2300
          : resolution.event.kind === "enemy"
            ? 1700
            : resolution.event.kind === "skill"
              ? 1400
              : 1000) / now.speed;
    setImpact(false);
    setCue({
      event: resolution.event,
      started: performance.now(),
      duration,
      token: ++token.current,
    });
    timers.current = [
      window.setTimeout(() => {
        setBattle(resolution.battle);
        setImpact(true);
        if (resolution.event.kind === "ultimate") {
          audioEngine.playSfx("ultimate");
        } else if (resolution.event.kind === "skill") {
          audioEngine.playSfx("skill");
        } else if (resolution.event.tone === "heal") {
          audioEngine.playSfx("heal");
        } else if (resolution.event.kind === "enemy") {
          audioEngine.playSfx("heavyHit");
        } else {
          audioEngine.playSfx("hit");
        }
      }, duration * 0.44),
      window.setTimeout(() => {
        setCue(null);
        setImpact(false);
        busy.current = false;
      }, duration),
    ];
  }, []);
  useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout);
    },
    [],
  );
  useEffect(() => {
    if (
      cue ||
      exit ||
      help ||
      battle.outcome !== "playing" ||
      !ready ||
      (battle.active !== 5 && !auto)
    )
      return;
    const timer = window.setTimeout(
      () => {
        const u = battle.units[battle.active];
        act(
          u?.energy >= 100
            ? "ultimate"
            : battle.points > 0 &&
                (battle.active !== 1 ||
                  battle.units.some((u) => u.hp > 0 && u.hp < u.maxHp * 0.85))
              ? "skill"
              : "basic",
        );
      },
      battle.active === 5 ? 300 : 550 / speed,
    );
    return () => clearTimeout(timer);
  }, [cue, exit, help, battle, auto, speed, act, ready]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLInputElement ||
        e.repeat ||
        exit ||
        help
      )
        return;
      const command = { q: "basic", e: "skill", r: "ultimate" }[
        e.key.toLowerCase()
      ] as Command | undefined;
      if (command && ready) {
        e.preventDefault();
        act(command);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [act, exit, help, ready]);
  const changePath = (path: PathId) => {
    if (!battle.actions && !busy.current)
      setBattle(
        createAstralBattle(party, state.weapons, path, encounter.boss, resolve),
      );
  };
  const restart = () => {
    claimed.current = false;
    busy.current = false;
    setCue(null);
    setAuto(false);
    setBattle(
      createAstralBattle(
        party,
        state.weapons,
        battle.path,
        encounter.boss,
        resolve,
      ),
    );
  };
  const claim = () => {
    if (claimed.current || battle.outcome !== "win") return;
    claimed.current = true;
    finishBattle(
      generateBattleDrops(state.battleSeed + battle.round),
      battle.outcome === "win",
    );
  };
  const actorId = cue?.event.actor ?? battle.active,
    actor = battle.units[actorId];
  const activePath = COMBAT_PATHS.find((p) => p.id === battle.path)!,
    buff = PATH_BUFFS[battle.path],
    linked = signatureActive(battle);
  const result = battle.outcome !== "playing" && !cue;
  const sequence = [...Array(6)]
    .map((_, i) => (Math.min(battle.active, 5) + i) % 6)
    .filter((i) => i === 5 || battle.units[i]?.hp > 0);
  return (
    <section
      className={`astral-battle ${battleEnemies(battle).length > 1 ? "multi-enemy" : ""} ${overview ? "formation-expanded" : ""} ${reduced ? "calm-motion" : ""}`}
      style={{ "--path-color": PATH_COLORS[battle.path] } as CSSProperties}
    >
      <div className="astral-sky" />
      <Suspense fallback={<div className="astral-loading">正在展开星阵…</div>}>
        <AstralStage
          battle={battle}
          cue={cue}
          impact={impact}
          overview={overview}
          reduced={reduced}
          onReady={() => setReady(true)}
          targetLocked={
            !!cue ||
            auto ||
            battle.active === 5 ||
            battle.outcome !== "playing" ||
            exit ||
            help
          }
          onTarget={(index) => {
            if (!busy.current) setBattle((b) => setBattleTarget(b, index));
          }}
        />
      </Suspense>
      <div className="astral-vignette" />
      <header className="astral-top">
        <button
          className="astral-back"
          aria-label="离开战斗"
          onClick={() => setExit(true)}
        >
          ←
        </button>
        <div className="astral-location">
          <b>{encounter.title}</b>
          <span>星阵试炼 · 第 {battle.round} 回合</span>
        </div>
        <div className="astral-options">
          <MusicPlayerPill compact />
          <button
            aria-pressed={audioSettings.sfxEnabled}
            onClick={() => audioEngine.toggleSfx()}
            title={audioSettings.sfxEnabled ? "关闭战斗音效" : "开启战斗音效"}
          >
            {audioSettings.sfxEnabled ? "⚔️ 音效开" : "⚔️ 音效关"}
          </button>
          <button aria-pressed={auto} onClick={() => setAuto((v) => !v)}>
            {auto ? "Ⅱ 停止自动" : "▷ 自动"}
          </button>
          <button
            disabled={!!cue}
            onClick={() => setSpeed((v) => (v === 1 ? 2 : 1))}
            aria-label="切换战斗倍速"
          >
            {speed}×
          </button>
          <button onClick={() => setHelp(true)} aria-label="战斗说明">
            ?
          </button>
        </div>
      </header>
      <div className="astral-boss enemy-summary" aria-label="敌方状态">
        <div className="astral-boss-title">
          <span>⌖</span>
          <h1>
            {
              battleEnemies(battle).find(
                (e) => e.index === battle.targetBossIndex,
              )?.name
            }
          </h1>
          <small>
            存活 {battleEnemies(battle).filter((e) => e.hp > 0).length}/
            {battleEnemies(battle).length}
          </small>
        </div>
        <div className="enemy-target-tabs" aria-label="选择攻击目标">
          {battleEnemies(battle).map((enemy, i) => (
            <button
              key={enemy.index}
              type="button"
              disabled={
                !!cue ||
                auto ||
                battle.active === 5 ||
                battle.outcome !== "playing" ||
                enemy.hp <= 0
              }
              aria-pressed={battle.targetBossIndex === enemy.index}
              onClick={() => {
                if (!busy.current)
                  setBattle((b) => setBattleTarget(b, enemy.index));
              }}
            >
              {i + 1} · {enemy.name}
              {enemy.hp <= 0 ? " · 已击破" : ""}
              <progress
                value={enemy.hp}
                max={enemy.maxHp}
                aria-label={enemy.name + "生命"}
              />
            </button>
          ))}
        </div>
        <div className="astral-boss-meta">
          <span>
            {battleEnemies(battle).length > 1
              ? "点击敌人切换单攻目标 · 群攻命中全体"
              : battle.boss.subtitle}
          </span>
          <b data-testid="boss-hp">
            {number(
              battleEnemies(battle).find(
                (e) => e.index === battle.targetBossIndex,
              )?.hp ?? 0,
            )}
          </b>
        </div>
        {battle.maxWaves > 1 && (
          <small>
            第 {battle.waveIndex + 1}/{battle.maxWaves} 席首领
          </small>
        )}
      </div>
      <aside className="astral-order" aria-label="行动顺序">
        <span className="astral-order-label">行动序列</span>
        {sequence.map((i, n) => (
          <div
            key={i}
            className={`astral-turn ${n === 0 ? "now" : ""} ${i === 5 ? "enemy" : ""}`}
          >
            {i === 5 ? (
              <div className="astral-enemy-symbol">✥</div>
            ) : (
              <Portrait companion={battle.units[i].companion} />
            )}
            <span>
              {i === 5 ? battle.boss.name : battle.units[i].companion.name}
            </span>
            <small>{n === 0 ? "当前" : String(n + 1).padStart(2, "0")}</small>
          </div>
        ))}
      </aside>
      <aside className="astral-formation">
        <select
          aria-label="选择阵法体系"
          value={battle.path}
          disabled={battle.actions > 0 || !!cue}
          onChange={(e) => changePath(e.target.value as PathId)}
        >
          {COMBAT_PATHS.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name}之阵
            </option>
          ))}
        </select>
        <FormationDiagram
          path={battle.path}
          active={actorId}
          alive={battle.units.map((u) => u.hp > 0)}
        />
        <strong>{FORMATION_LAYOUTS[battle.path].name}</strong>
        <small>{FORMATION_LAYOUTS[battle.path].description}</small>
        <b>联动池 +{Math.round(formationLink(battle) * 100)}%</b>
        <span className={linked ? "active" : ""}>
          {linked ? "✦" : "◇"} {buff.name} · {linked ? "生效中" : "待触发"}
        </span>
        <button aria-pressed={overview} onClick={() => setOverview((v) => !v)}>
          {overview ? "切回演出镜头" : "全阵视角"}
        </button>
      </aside>
      {cue && (
        <div
          className={`astral-action-title tone-${cue.event.tone} ${cue.event.kind}`}
          key={cue.token}
        >
          <span>
            {cue.event.actor === 5 ? "敌方行动" : actor?.companion.name}
          </span>
          <b>{cue.event.title}</b>
          <p className="action-effect">{cue.event.effect}</p>
          <i />
        </div>
      )}
      {cue && impact && (
        <div
          className={`astral-damage tone-${cue.event.tone} ${cue.event.kind} ${cue.event.actor === 5 ? "incoming" : ""}`}
          key={`hit${cue.token}`}
          aria-live="polite"
        >
          <span>
            {cue.event.actor === 5
              ? "全阵承伤"
              : cue.event.linked
                ? "阵法联动"
                : cue.event.tone === "heal"
                  ? "生命恢复"
                  : cue.event.tone === "support"
                    ? "协同增幅"
                    : cue.event.kind === "basic"
                      ? "命中"
                      : "战技命中"}
          </span>
          <strong>
            {cue.event.tone === "heal" && cue.event.healing === 0
              ? "生命充盈"
              : number(
                  cue.event.actor === 5
                    ? cue.event.incoming.reduce((a, b) => a + b, 0)
                    : cue.event.tone === "heal"
                      ? cue.event.healing
                      : cue.event.damage,
                )}
          </strong>
          {cue.event.pursuit > 0 && (
            <small>
              追击 {number(cue.event.pursuit)} · 持续 {number(cue.event.dot)}
            </small>
          )}
          {cue.event.tone !== "heal" && cue.event.healing > 0 && (
            <em>恢复 +{number(cue.event.healing)}</em>
          )}
          {cue.event.reflected > 0 && (
            <small>逆鳞反伤 {number(cue.event.reflected)}</small>
          )}
        </div>
      )}
      <div className="astral-bottom">
        <div className="astral-party" aria-label="我方状态">
          {battle.units.map((u, i) => (
            <div
              className={`astral-member ${actorId === i ? "selected" : ""} ${u.hp <= 0 ? "fallen" : ""}`}
              key={u.companion.id}
              style={{ "--unit-accent": u.companion.accent } as CSSProperties}
            >
              <div className="astral-portrait">
                <Portrait companion={u.companion} />
                <span>{i + 1}</span>
              </div>
              <div className="astral-member-info">
                <small>
                  {ROLE_NAMES[i]}
                  {battle.guard && i === 0 ? " · 守护" : ""}
                </small>
                <b>{u.companion.name}</b>
                <span>
                  {number(u.hp)}
                  <em>/{number(u.maxHp)}</em>
                </span>
                <div className="astral-health">
                  <i style={{ width: `${(u.hp / u.maxHp) * 100}%` }} />
                </div>
                <div className="astral-energy">
                  <i style={{ width: `${u.energy}%` }} />
                </div>
                <small>{u.hp <= 0 ? "无法战斗" : `能量 ${u.energy}%`}</small>
              </div>
            </div>
          ))}
        </div>
        <div className="astral-command-panel">
          <div className="astral-skill-points">
            <span>战技点</span>
            {[0, 1, 2, 3, 4].map((i) => (
              <i className={i < battle.points ? "filled" : ""} key={i} />
            ))}
            <b>{battle.points}/5</b>
          </div>
          <div className="astral-skills">
            {(["basic", "skill", "ultimate"] as Command[]).map((command, i) => (
              <button
                className={`astral-skill ${command}`}
                key={command}
                disabled={!ready || !!cue || !canCommand(battle, command)}
                onClick={() => act(command)}
                title={
                  actor
                    ? actionPresentation(actor, command, battle.boss).effect
                    : ""
                }
              >
                <span className="astral-skill-disc">
                  <SkillGlyph kind={command} />
                </span>
                <span className="skill-category">
                  {["普攻", "战技", "终结技"][i]} ·{" "}
                  {actor && isAreaAttack(actor, command) ? "群攻" : "单攻"}
                </span>
                <b>
                  {actor
                    ? actionPresentation(actor, command, battle.boss).name
                    : "等待行动"}
                </b>
                <span className="skill-effect">
                  {actor
                    ? actionPresentation(actor, command, battle.boss).effect
                    : "敌方行动中"}
                </span>
                <small>
                  {command === "basic"
                    ? "+1 战技点"
                    : command === "skill"
                      ? "−1 战技点"
                      : `${actor?.energy ?? 0}/100`}
                </small>
                <kbd>{["Q", "E", "R"][i]}</kbd>
              </button>
            ))}
          </div>
        </div>
        <div className="astral-status-line" aria-live="polite">
          <span>
            {cue
              ? "行动演出中"
              : battle.active === 5
                ? "敌方即将行动"
                : battle.outcome !== "playing"
                  ? "战斗结束"
                  : `${actor?.companion.name ?? ""} · 请选择行动`}
          </span>
          <button onClick={() => setShowLog((v) => !v)} aria-expanded={showLog}>
            战报 {showLog ? "⌄" : "⌃"}
          </button>
          <button aria-pressed={reduced} onClick={() => setReduced((v) => !v)}>
            {reduced ? "简洁演出" : "完整演出"}
          </button>
        </div>
      </div>
      {showLog && (
        <aside className="astral-log">
          <h3>战斗记录</h3>
          {battle.log.map((line, i) => (
            <p key={`${battle.actions}-${i}`}>{line}</p>
          ))}
        </aside>
      )}
      {help && (
        <div className="astral-overlay">
          <section
            className="astral-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="战斗说明"
          >
            <h2>五人同阵 · 各司其职</h2>
            <p>
              抗伤位承接 65%
              攻击包；治疗位每轮恢复全队（包含自身）。双C存活形成联动，专辅开启当前体系的专属效果。
            </p>
            <p>
              <b>
                {activePath.name} · {buff.name}
              </b>
              <br />
              {buff.description}
            </p>
            <p>
              点击敌方站位或顶部血条选敌，单攻只命中锁定目标；协攻型和术士型角色战技、终结技为群攻，命中全部存活敌人。普攻恢复战技点，战技消耗
              1 点；辅助同时强化自身本次攻击和下一组双攻。能量达到 100
              时可释放终结技。每轮五人行动后，守阵者反击；每第三轮发动强化攻击。
            </p>
            <p>
              {battle.boss.towerBlessing && (
                <span>
                  深塔祝福：{battle.boss.towerBlessing}
                  <br />
                </span>
              )}
              专精获得100%、兼容65%、无适配不获得联动。第60回合结束仍未击破首领则挑战失败。本试炼将出战角色按职责调谐至所选体系，沿用等级、武器、命座和魂环属性。首次行动前可切换体系。
            </p>
            <button autoFocus onClick={() => setHelp(false)}>
              返回战斗
            </button>
          </section>
        </div>
      )}
      {exit && (
        <div className="astral-overlay">
          <section
            className="astral-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="离开战斗"
          >
            <h2>暂别星阵？</h2>
            <p>离开本场战斗不会获得奖励。</p>
            <div>
              <button autoFocus onClick={() => setExit(false)}>
                继续战斗
              </button>
              <button onClick={() => navigate("formation")}>返回编队</button>
            </div>
          </section>
        </div>
      )}
      {result && (
        <div className="astral-overlay result">
          <section
            className="astral-dialog astral-result"
            role="dialog"
            aria-modal="true"
            aria-label={battle.outcome === "win" ? "战斗胜利" : "战斗失败"}
          >
            <div className="astral-result-star">✧</div>
            <span>{battle.outcome === "win" ? "VICTORY" : "DEFEAT"}</span>
            <h2>
              {battle.outcome === "win"
                ? "星契共鸣 · 试炼完成"
                : "星阵未散 · 再度启程"}
            </h2>
            <p>
              {battle.round} 回合 · 累计伤害 {number(battle.totalDamage)} · 存活{" "}
              {battle.units.filter((u) => u.hp > 0).length}/5
            </p>
            {battle.outcome === "win" ? (
              <>
                <div className="astral-rewards">
                  <span>
                    金币 <b>+{(state.encounter?.kind === "resource" ? resourceDungeon(state.encounter.id)?.gold ?? 0 : 1800).toLocaleString()}</b>
                  </span>
                  <span>
                    星晶 <b>+{state.encounter?.kind === "resource" ? 0 : 40}</b>
                  </span>
                </div>
                <div className="astral-drops">
                  {(state.encounter?.kind === "resource" ? resourceDrops(state.encounter.id) : generateBattleDrops(state.battleSeed + battle.round)).map(
                    (d, i) => (
                      <span key={`${d.id}-${i}`}>
                        {d.name} ×{d.count}
                      </span>
                    ),
                  )}
                </div>
                <div>
                  <p>奖励领取后存入背包；副本资源可用于角色与武器养成。</p>
                  <button autoFocus onClick={() => claim()}>
                    收下奖励 · 返回
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>用守护战技抵御第三轮重击，及时治疗抗伤位。</p>
                <div>
                  <button onClick={restart}>再次挑战</button>
                  <button autoFocus onClick={() => navigate("formation")}>
                    调整编队
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
