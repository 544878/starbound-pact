import { memo, type CSSProperties } from "react";
import { CharacterArt } from "./CharacterArt";
import type { Companion } from "../domain/types";
import {
  enemyPosition,
  inRange,
  isGround,
  PATH,
  type Defense,
} from "../systems/defense";

// Shared projection keeps art, hit targets, route, and moving units aligned.
const project = (x: number, y: number) => [
  400 + x * 54 - y * 60,
  132 + x * 25 + y * 34,
];
const cellPoints = (x: number, y: number, lift = 0) =>
  [
    [x, y],
    [x + 1, y],
    [x + 1, y + 1],
    [x, y + 1],
  ]
    .map(([a, b]) => {
      const p = project(a, b);
      return `${p[0]},${p[1] - lift}`;
    })
    .join(" ");
const cells = Array.from({ length: 45 }, (_, i) => ({
  x: i % 9,
  y: Math.floor(i / 9),
}));
const route = PATH.map(([x, y]) => project(x + 0.5, y + 0.5).join(",")).join(
  " ",
);
const platforms = [
  [3, 0],
  [6, 0],
  [3, 2],
  [6, 2],
  [3, 4],
];
const elevation = (x: number, y: number) =>
  platforms.some((p) => p[0] === x && p[1] === y) ? 18 : isGround(x, y) ? 0 : 7;

function Sprite({
  position,
  size,
  enemy = false,
}: {
  position: string;
  size: number;
  enemy?: boolean;
}) {
  const [x, y] = position.split(" ").map(parseFloat);
  return (
    <svg
      x={-size / 2}
      y={-size + 5}
      width={size}
      height={size}
      viewBox={`${(x / 50) * 512} ${(y / 100) * 512} 512 512`}
      overflow="hidden"
      className="unit-art"
    >
      <image
        href={
          enemy
            ? "/assets/defense-enemies-v4.png"
            : "/assets/defense-characters-v4.png"
        }
        width="1536"
        height="1024"
      />
    </svg>
  );
}

export const GardenBattlefield = memo(function GardenBattlefield({
  game,
  companions,
  selected,
  selectedId,
  onSelect,
  grid,
  paused,
}: {
  game: Defense;
  companions: Companion[];
  selected: [number, number] | null;
  selectedId: string;
  onSelect: (x: number, y: number) => void;
  grid: boolean;
  paused: boolean;
}) {
  const active = game.operators.find((o) => o.id === selectedId);
  const units = [
    ...game.operators.map((o) => ({
      kind: "operator" as const,
      depth: project(o.x + 0.5, o.y + 0.5)[1],
      o,
    })),
    ...game.enemies.map((e) => {
      const p = enemyPosition(e);
      return {
        kind: "enemy" as const,
        depth: project(p.x + 0.5, p.y + 0.5)[1],
        e,
      };
    }),
  ].sort((a, b) => a.depth - b.depth);
  return (
    <div className={`garden-battlefield ${paused ? "is-paused" : ""}`}>
      <svg
        viewBox="0 0 1000 667"
        preserveAspectRatio="none"
        className="garden-canvas"
        aria-label="微风花庭战场"
      >
        <defs>
          <linearGradient id="portal-red" x2="0" y2="1">
            <stop stopColor="#ffba93" stopOpacity="0" />
            <stop offset="1" stopColor="#d85249" stopOpacity=".65" />
          </linearGradient>
          <linearGradient id="portal-blue" x2="0" y2="1">
            <stop stopColor="#d5f9ff" stopOpacity="0" />
            <stop offset="1" stopColor="#4bafff" stopOpacity=".75" />
          </linearGradient>
          <linearGradient id="tile-side" x2="0" y2="1">
            <stop stopColor="#b5b8a2" />
            <stop offset="1" stopColor="#6b7764" />
          </linearGradient>
          <pattern
            id="stone-top"
            width="1000"
            height="667"
            patternUnits="userSpaceOnUse"
          >
            <image
              href="/assets/defense-garden-v4.png"
              width="1000"
              height="667"
            />
          </pattern>
        </defs>
        <image href="/assets/defense-garden-v4.png" width="1000" height="667" />
        <g className={`garden-tiles ${grid ? "show-grid" : ""}`}>
          {cells.map(({ x, y }) => {
            const ground = isGround(x, y),
              chosen = selected?.[0] === x && selected?.[1] === y;
            const range = active && inRange(active, x, y);
            const p = project(x + 0.5, y + 0.5);
            return (
              <g key={`${x}-${y}`}>
                {!ground && (
                  <>
                    <polygon
                      points={cellPoints(x, y, -2)}
                      fill="url(#tile-side)"
                      stroke="#73806a"
                      strokeWidth=".5"
                    />
                    <polygon
                      points={cellPoints(x, y, 7)}
                      fill="url(#stone-top)"
                      stroke="#eee9d3"
                      strokeWidth="1.4"
                    />
                  </>
                )}
                <polygon
                  points={cellPoints(x, y, elevation(x, y))}
                  className={`garden-tile ${ground ? "path-tile" : "terrace-tile"} ${chosen ? "selected-tile" : ""} ${range ? "in-range" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`地块 ${x + 1},${y + 1} ${ground ? "地面" : "高台"}`}
                  aria-pressed={chosen}
                  onClick={() => onSelect(x, y)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(x, y);
                    }
                  }}
                />
                {grid && (
                  <text
                    x={p[0]}
                    y={p[1]}
                    className="tile-coordinate"
                    textAnchor="middle"
                  >
                    {x + 1} · {y + 1}
                  </text>
                )}
              </g>
            );
          })}
        </g>
        <g pointerEvents="none">
          {platforms.map(([x, y]) => {
            const p = project(x + 0.5, y + 0.5);
            return (
              <svg
                key={`platform-${x}-${y}`}
                x={p[0] - 57}
                y={p[1] - 55}
                width="114"
                height="91"
                viewBox="0 0 610 512"
                overflow="hidden"
              >
                <image
                  href="/assets/defense-props-v4.png"
                  width="1536"
                  height="1024"
                />
              </svg>
            );
          })}
          {[
            [0.1, 0.1],
            [8.6, 0.2],
            [0.15, 4.8],
            [8.5, 4.7],
          ].map(([x, y], i) => {
            const p = project(x, y);
            return (
              <svg
                key={`flower-${i}`}
                x={p[0] - 20}
                y={p[1] - 37}
                width="40"
                height="45"
                viewBox="590 0 440 512"
                overflow="hidden"
              >
                <image
                  href="/assets/defense-props-v4.png"
                  width="1536"
                  height="1024"
                />
              </svg>
            );
          })}
          <polyline points={route} className="garden-route" />
          {PATH.slice(1, -1).map(([x, y], i) => {
            const p = project(x + 0.5, y + 0.5),
              q = project(PATH[i + 2][0] + 0.5, PATH[i + 2][1] + 0.5);
            const angle =
              (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI;
            return (
              <path
                key={i}
                d="M-5,-4 L1,0 -5,4 M1,-4 L7,0 1,4"
                transform={`translate(${p}) rotate(${angle})`}
                className="route-arrow"
              />
            );
          })}
          {(
            [
              [0, 2, "red"],
              [8, 3, "blue"],
            ] as const
          ).map(([x, y, color]) => {
            const p = project(x + 0.5, y + 0.5);
            return (
              <g
                key={color}
                transform={`translate(${p})`}
                className={`portal portal-${color}`}
              >
                <ellipse rx="26" ry="13" className="portal-ring" />
                <ellipse rx="19" ry="9" className="portal-inner" />
                <path
                  d="M-20,0 L-13,-100 13,-100 20,0Z"
                  fill={`url(#portal-${color})`}
                />
                <path
                  d="M0,0 V-96 M-12,-83 H12 L10,-49 0,-42 -10,-49Z"
                  className="portal-flag"
                />
                <text y="-59" textAnchor="middle" className="portal-star">
                  ✦
                </text>
                <text y="25" textAnchor="middle" className="portal-label">
                  {color === "red" ? "敌方入口" : "守护终点"}
                </text>
              </g>
            );
          })}
          {units.map((unit) => {
            if (unit.kind === "operator") {
              const o = unit.o,
                c = companions.find((c) => c.id === o.id)!;
              const p = project(o.x + 0.5, o.y + 0.5);
              p[1] -= elevation(o.x, o.y);
              return (
                <g
                  key={o.id}
                  transform={`translate(${p})`}
                  style={{ "--unit-color": c.accent } as CSSProperties}
                >
                  <ellipse cy="2" rx="23" ry="10" fill="#26362d55" />
                  <ellipse
                    rx="26"
                    ry="12"
                    className={`unit-circle ${o.skill > 0 ? "skill-active" : ""}`}
                  />
                  <g className="operator-sway">
                    <g key={o.hits} className={o.hits ? "operator-strike" : ""}>
                      <foreignObject
                        x="-33"
                        y="-99"
                        width="66"
                        height="104"
                        className="defense-chibi"
                      >
                        <CharacterArt companion={c} view={3} />
                      </foreignObject>
                    </g>
                  </g>
                  {o.skill > 0 && (
                    <g className="skill-sparks">
                      <text x="-26" y="-25">
                        ✧
                      </text>
                      <text x="21" y="-55">
                        ✦
                      </text>
                      <ellipse rx="32" ry="15" />
                    </g>
                  )}
                  <rect
                    x="-23"
                    y="8"
                    width="46"
                    height="10"
                    rx="3"
                    fill="#f8f7e8"
                    stroke="#71866b"
                    strokeWidth=".6"
                  />
                  <rect
                    x="-15"
                    y="11"
                    width={32 * Math.max(0, o.hp / o.stats.hp)}
                    height="3"
                    fill="#668f63"
                  />
                  <text x="-21" y="15" fontSize="8" fill="#294333">
                    {["→", "↓", "←", "↑"][o.direction]}
                  </text>
                  {selectedId === o.id && (
                    <path
                      d="M-4,-111 0,-105 4,-111"
                      fill="#fffbe5"
                      stroke="#527251"
                    />
                  )}
                </g>
              );
            }
            const e = unit.e,
              pos = enemyPosition(e),
              p = project(pos.x + 0.5, pos.y + 0.5);
            return (
              <g key={`enemy-${e.id}`} transform={`translate(${p})`}>
                <ellipse rx="17" ry="7" fill="#25352c66" />
                <g
                  className="enemy-walk"
                  style={{ animationDelay: `-${e.id * 0.21}s` }}
                >
                  <Sprite
                    position={`${game.wave >= 4 ? "50%" : "0%"} ${Math.floor(game.time * 4) % 2 ? "100%" : "0%"}`}
                    size={66}
                    enemy
                  />
                </g>
                <rect x="-17" y="-58" width="34" height="3.5" fill="#3d322c" />
                <rect
                  x="-17"
                  y="-58"
                  width={34 * Math.max(0, e.hp / e.maxHp)}
                  height="2.5"
                  fill="#d96855"
                />
              </g>
            );
          })}
          {game.operators
            .filter((o) => o.timer > o.stats.interval - 0.25)
            .map((o) => {
              const p = project(o.x + 0.5, o.y + 0.5);
              const target =
                o.role === "support"
                  ? game.operators.find(
                      (t) => t.hp < t.stats.hp && inRange(o, t.x, t.y),
                    )
                  : game.enemies.find((e) => {
                      const t = enemyPosition(e);
                      return inRange(o, t.x, t.y);
                    });
              if (!target) return null;
              const t = "progress" in target ? enemyPosition(target) : target,
                q = project(t.x + 0.5, t.y + 0.5);
              return (
                <path
                  key={`${o.id}-${o.hits}`}
                  d={`M${p[0]},${p[1] - 45} Q${(p[0] + q[0]) / 2},${Math.min(p[1], q[1]) - 70} ${q[0]},${q[1] - 25}`}
                  className={`attack-trail ${o.role === "support" ? "healing-trail" : ""}`}
                />
              );
            })}
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse
              key={i}
              cx={60 + i * 79}
              cy={90 + ((i * 97) % 410)}
              rx="3"
              ry="1.2"
              className="garden-petal"
              style={{ animationDelay: `-${i * 1.3}s` }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
});
