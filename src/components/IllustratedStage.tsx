import { battleEnemies } from "../systems/astralBattle";
import { useEffect } from "react";
import type { AstralBattle } from "../systems/astralBattle";
import type { PerformanceCue } from "./AstralStage";
import { CharacterArt } from "./CharacterArt";
import { FORMATION_LAYOUTS } from "../data/formationLayouts";
export default function IllustratedStage({
  battle,
  cue,
  impact,
  overview,
  reduced,
  onReady,
  onTarget,
  targetLocked,
}: {
  battle: AstralBattle;
  cue: PerformanceCue | null;
  impact: boolean;
  overview: boolean;
  reduced: boolean;
  onReady: () => void;
  onTarget: (index: number) => void;
  targetLocked: boolean;
}) {
  useEffect(() => {
    onReady();
  }, []);
  return (
    <div
      className={`illustrated-stage ${battleEnemies(battle).length > 1 ? "formation-group" : "formation-solo"} ${battle.boss.towerFloor ? "abyss-battle" : ""} ${reduced ? "still" : ""} ${overview ? "overview" : ""} tone-${cue?.event.tone ?? "basic"} action-${cue?.event.kind ?? "idle"} ${impact ? "impact" : ""}`}
      aria-label="萌版五人星阵战场"
    >
      <div className="summoning-floor" />
      <div
        className={`enemy-formation ${battleEnemies(battle).length === 1 ? "solo" : "group"}`}
        aria-label="敌方站位"
      >
        {battleEnemies(battle).map((enemy, position) => {
          const hit = impact
            ? cue?.event.targets?.find((t) => t.index === enemy.index)
            : undefined;
          return (
            <button
              type="button"
              key={enemy.index}
              className={`enemy-position position-${position} ${battle.targetBossIndex === enemy.index ? "targeted" : ""} ${enemy.hp <= 0 ? "defeated" : ""} ${hit?.damage ? "struck" : ""}`}
              disabled={targetLocked || enemy.hp <= 0}
              onClick={() => onTarget(enemy.index)}
              aria-label={`选择目标：${position + 1}号 ${enemy.name}`}
              aria-pressed={battle.targetBossIndex === enemy.index}
            >
              <span className="enemy-position-label">
                {position + 1}号 · {enemy.index >= 2 ? "前排" : "后排"}
              </span>
              <img src={enemy.art} alt="" />
              <span className="enemy-ground-ring" />
              <strong>{enemy.name}</strong>
              <progress
                value={enemy.hp}
                max={enemy.maxHp}
                aria-label={enemy.name + "生命"}
              />
              <small>
                {enemy.hp <= 0
                  ? "已击破"
                  : `${Math.ceil(enemy.hp * 250).toLocaleString()} · ${enemy.shield ? "护盾 " + enemy.shield : "无护盾"}`}
              </small>
              {enemy.hp > 0 && battle.targetBossIndex === enemy.index && (
                <span className="enemy-lock">⌖ 锁定目标</span>
              )}
              {!!hit?.damage && (
                <>
                  <span
                    key={`hit-${cue?.token}`}
                    className={`enemy-hit-effect ${cue?.event.area ? "area" : ""}`}
                    aria-hidden="true"
                  />
                  <b className="enemy-hit-number" key={`n-${cue?.token}`}>
                    −{Math.round(hit.damage * 250).toLocaleString()}
                  </b>
                </>
              )}
            </button>
          );
        })}
        {cue?.event.area && (
          <div
            key={cue.token}
            className={`enemy-area-field ${impact ? "detonate" : ""}`}
            aria-hidden="true"
          >
            <i />
            <i />
            <i />
          </div>
        )}
      </div>
      <div className="illustrated-party">
        {battle.units.map((u, i) => (
          <div
            key={u.companion.id}
            className={`illustrated-unit unit-${i} ${cue?.event.actor === i ? "casting" : ""} ${u.hp <= 0 ? "fallen" : ""} ${impact && cue?.event.healingByUnit[i] ? "receiving-heal" : ""} ${impact && cue?.event.buffed.includes(i) ? "receiving-buff" : ""}`}
            style={{
              left: `${FORMATION_LAYOUTS[battle.path].points[i][0] / 1.2 - 10}%`,
              top: `${FORMATION_LAYOUTS[battle.path].points[i][1] * 0.7}%`,
              right: "auto",
              bottom: "auto",
            }}
          >
            <CharacterArt companion={u.companion} view={3} />
            <span>{u.companion.name}</span>
            {impact &&
              cue?.event.tone === "heal" &&
              u.hp > 0 &&
              cue.event.healingByUnit[i] === 0 && (
                <b className="unit-feedback healing">生命充盈</b>
              )}
            {impact && cue && cue.event.healingByUnit[i] > 0 && (
              <b className="unit-feedback healing" key={cue.token}>
                +
                {Math.round(cue.event.healingByUnit[i] * 250).toLocaleString(
                  "zh-CN",
                )}
              </b>
            )}
            {impact && cue?.event.buffed.includes(i) && (
              <b className="unit-feedback blessing" key={`buff-${cue.token}`}>
                {cue.event.tone === "guard"
                  ? "◇ 减伤"
                  : i === cue.event.actor
                    ? "✦ 自身强化"
                    : "✦ 攻击强化"}
              </b>
            )}
            {impact && cue && cue.event.incoming[i] > 0 && (
              <b className="unit-feedback incoming">
                −
                {Math.round(cue.event.incoming[i] * 250).toLocaleString(
                  "zh-CN",
                )}
              </b>
            )}
            <div className="unit-soul-rings">
              {"◌".repeat(Math.min(9, u.growth.effects.length))}
            </div>
          </div>
        ))}
      </div>
      {cue && cue.event.actor === 5 && (
        <div
          key={cue.token}
          className={`spell-trail ${cue.event.actor === 5 ? "enemy-spell" : ""}`}
        />
      )}
    </div>
  );
}
