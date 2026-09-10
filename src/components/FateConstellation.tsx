import { useState, type CSSProperties } from "react";
import type { Companion } from "../domain/types";
import { constellationNodes } from "../systems/rosterCombat";
import { useGame } from "../state/GameContext";

const points = [
  [25, 22],
  [61, 12],
  [80, 39],
  [57, 54],
  [72, 83],
  [25, 74],
];
const names = ["初遇", "同行", "知心", "守望", "共鸣", "不负"];
export function FateConstellation({ companion: c }: { companion: Companion }) {
  const { state, dispatch } = useGame();
  const [selected, setSelected] = useState(0);
  const nodes = constellationNodes(c),
    node = nodes[selected];
  const souls = state.materials[`soul:${c.id}`] ?? 0;
  return (
    <section className="fate-panel" aria-label="六重命座">
      <div className="section-label">
        <h3>六重命座</h3>
        <span>{c.constellation} / 6 已激活</span>
      </div>
      <div className="fate-stage">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="fate-lines"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="fate-glow">
              <stop stopColor={c.accent} stopOpacity=".18" />
              <stop offset="1" stopColor={c.accent} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="49" fill="url(#fate-glow)" />
          <path
            d="M25 22 L61 12 L80 39 L57 54 L72 83 L25 74 L25 22 M25 22 L57 54 L25 74"
            fill="none"
            stroke="#b59b6a"
            strokeWidth=".25"
          />
          <circle
            cx="50"
            cy="50"
            r="43"
            fill="none"
            stroke="#b59b6a"
            strokeWidth=".15"
            strokeDasharray=".6 2"
          />
        </svg>
        {nodes.map((n, i) => (
          <button
            key={n.rank}
            className={`fate-star ${n.rank <= c.constellation ? "lit" : ""} ${selected === i ? "selected" : ""}`}
            style={
              {
                left: `${points[i][0]}%`,
                top: `${points[i][1]}%`,
                "--star-color": c.accent,
              } as CSSProperties
            }
            aria-label={`命座${n.rank}·${names[i]}`}
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
          >
            <span>✧</span>
            <b>{names[i]}</b>
            <small>{n.rank <= c.constellation ? "已激活" : `C${n.rank}`}</small>
          </button>
        ))}
      </div>
      <div className="fate-description">
        <div>
          <h3>
            C{node.rank} · {names[selected]}
          </h3>
          <small>{node.rank <= c.constellation ? "已激活" : "未激活"}</small>
        </div>
        <p>{node.effect}</p>
      </div>
      <div className="fate-activate">
        <span>
          角色星魂 <b>{souls}</b>
        </span>
        <button
          className="primary-button"
          disabled={c.constellation >= 6 || souls < 1}
          onClick={() => dispatch({ type: "ACTIVATE_CONSTELLATION", id: c.id })}
        >
          {c.constellation >= 6
            ? "六命已圆满"
            : `激活 C${c.constellation + 1} · 1星魂`}
        </button>
      </div>
    </section>
  );
}
