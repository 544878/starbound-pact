import { FORMATION_LAYOUTS } from '../data/formationLayouts';
import { FORMATION_THEMES } from '../data/formationTheme';
import type { PathId } from '../domain/combat';

const labels = ['抗', '疗', '主', '协', '辅'];

export function FormationDiagram({
  path,
  active = -1,
  alive = [true, true, true, true, true],
}: {
  path: PathId;
  active?: number;
  alive?: boolean[];
}) {
  const layout = FORMATION_LAYOUTS[path];
  const theme = FORMATION_THEMES[path];
  const pathData = `M${layout.points.map((p) => p.join(',')).join(' L')} Z`;

  return (
    <div className="astrolabe-diagram-wrap">
      <svg
        viewBox="0 0 120 100"
        role="img"
        aria-label={`${layout.name}：${layout.description}，右侧为敌方`}
        className="astrolabe-diagram-svg"
      >
        <defs>
          <filter id={`astral-glow-${path}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id={`node-bg-${path}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0b0f17" />
          </radialGradient>
        </defs>

        {/* Outer and Inner Celestial Rotating Astrolabe Rings */}
        <g className="astrolabe-rings">
          <circle
            cx="60"
            cy="50"
            r="46"
            stroke={theme.color}
            strokeWidth="0.8"
            strokeDasharray="3 5"
            opacity="0.3"
            className="astrolabe-ring-spin-cw"
          />
          <circle
            cx="60"
            cy="50"
            r="38"
            stroke={theme.color}
            strokeWidth="0.5"
            strokeDasharray="1 3"
            opacity="0.25"
            className="astrolabe-ring-spin-ccw"
          />
          <circle
            cx="60"
            cy="50"
            r="49"
            stroke={theme.borderColor}
            strokeWidth="0.4"
            opacity="0.2"
          />
        </g>

        {/* Direction Indicator */}
        <g className="astrolabe-enemy-arrow" opacity="0.6">
          <line x1="113" y1="50" x2="118" y2="50" stroke={theme.color} strokeWidth="1" />
          <polyline points="115,47 118,50 115,53" fill="none" stroke={theme.color} strokeWidth="1" />
        </g>

        {/* Constellation Base Connection Line */}
        <path
          d={pathData}
          stroke={theme.color}
          strokeWidth="1.2"
          strokeOpacity="0.3"
          fill="none"
        />

        {/* Constellation Animated Energy Flow Beam */}
        <path
          d={pathData}
          stroke={theme.color}
          strokeWidth="1.6"
          strokeDasharray="6 8"
          fill="none"
          strokeOpacity="0.85"
          filter={`url(#astral-glow-${path})`}
          className="astrolabe-energy-flow"
        />

        {/* Tactical Nodes */}
        {layout.points.map(([x, y], i) => {
          const isCurrentActor = i === active;
          const isAlive = alive[i] ?? true;
          return (
            <g
              key={i}
              opacity={isAlive ? 1 : 0.25}
              className={`astrolabe-node-group ${isCurrentActor ? 'node-active' : ''}`}
            >
              {isAlive && (
                <circle
                  cx={x}
                  cy={y}
                  r={isCurrentActor ? '13' : '11'}
                  fill="none"
                  stroke={theme.color}
                  strokeWidth="0.8"
                  opacity={isCurrentActor ? '0.75' : '0.35'}
                  className="astrolabe-pulse-beacon"
                />
              )}
              <circle
                cx={x}
                cy={y}
                r="8"
                fill={isCurrentActor ? theme.color : `url(#node-bg-${path})`}
                stroke={theme.color}
                strokeWidth={isCurrentActor ? '2' : '1.2'}
                filter={isCurrentActor ? `url(#astral-glow-${path})` : undefined}
              />
              <text
                x={x}
                y={y + 2.8}
                fontSize="7.5"
                fontWeight="700"
                fontFamily="sans-serif"
                textAnchor="middle"
                fill={isCurrentActor ? '#0b0f17' : '#f8fafc'}
              >
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

