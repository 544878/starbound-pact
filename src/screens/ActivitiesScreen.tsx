import { useState } from "react";
import { CurrencyGame } from "./CurrencyGame";
import { DuelGame } from "./DuelGame";
import { DefenseGame } from "./DefenseGame";
import { HomesteadGame } from "./HomesteadGame";
import { useGame } from "../state/GameContext";
import { Portrait } from "../components/Portrait";
import { activeRings } from "../systems/growth";
export function ActivitiesScreen() {
  const [tab, setTab] = useState("defense");
  const { navigate, state, selectCompanion, dispatch } = useGame();
  const [defenseSelected, setDefenseSelected] = useState(
    state.companions[1]?.id ?? state.companions[0].id,
  );
  const companion =
    state.companions.find((c) => c.id === defenseSelected) ??
    state.companions[0];
  const weapon = state.weapons.find((w) => w.ownerId === companion.id);
  function openGrowth() {
    selectCompanion(companion.id);
    navigate("companions");
  }
  return (
    <div
      className={`operations ${tab === "defense" ? "garden-operations" : ""}`}
    >
      <nav className="mode-nav" aria-label="作战模式">
        <button onClick={() => { dispatch({type:"PREPARE_ENCOUNTER",encounter:{kind:"trial",id:"free"}}) }}>✦ 星阵试炼 · 萌版回合战</button>
        {tab === "defense" && (
          <h2 className="rail-title">
            活动模式 <span>✧</span>
          </h2>
        )}
        {[
          ["currency", "货币战争", "◈", "聚敛资源 · 赢得未来"],
          ["pvp", "双人对决", "⚔", "并肩或对立 · 皆为星途"],
          ["defense", "星光守卫战", "✧", "守护星光 · 直至黎明"],
          ...(tab === "defense"
            ? []
            : [["homestead", "家园", "⌂", "花庭小憩"]]),
        ].map(([id, name, icon, subtitle]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {tab === "defense" ? (
              <>
                <i>{icon}</i>
                <span>
                  {name}
                  <small>{subtitle}</small>
                </span>
              </>
            ) : (
              name
            )}
          </button>
        ))}
        {tab === "defense" ? (
          <div className="rail-shortcuts">
            <button onClick={() => setTab("homestead")}>家园</button>
            <button onClick={() => navigate("story")}>剧情</button>
            <button onClick={() => navigate("tower")}>深塔</button>
            <button onClick={() => navigate("formation")}>编队</button>
          </div>
        ) : (
          <>
            <button onClick={() => navigate("story")}>剧情</button>
            <button onClick={() => navigate("tower")}>深塔</button>
            <button onClick={() => navigate("formation")}>编队</button>
          </>
        )}
        {tab === "defense" && (
          <div className="garden-growth">
            <h2 className="rail-title">
              角色成长 <span>✧</span>
            </h2>
            <button
              className="constellation-art"
              aria-label="查看角色养成"
              onClick={openGrowth}
            >
              <div className="constellation-orbit" />
              <Portrait companion={companion} />
              {Array.from({ length: 6 }, (_, i) => (
                <span
                  key={i}
                  className={`constellation-star ${i < companion.constellation ? "unlocked" : ""}`}
                  style={{
                    left: `${50 + 42 * Math.sin((i * Math.PI) / 3)}%`,
                    top: `${50 - 42 * Math.cos((i * Math.PI) / 3)}%`,
                  }}
                >
                  ✦
                </span>
              ))}
            </button>
            <p className="constellation-caption">
              星魂共鸣 <strong>{companion.constellation} / 6</strong>
            </p>
            <div className="growth-equipment">
              <button onClick={openGrowth}>
                <small>专属武器</small>
                <span className="weapon-sigil">⚔</span>
                <b>{weapon?.name ?? "尚未装备"}</b>
                <small>{weapon ? `Lv.${weapon.level}` : "前往装备"}</small>
              </button>
              <button onClick={openGrowth}>
                <small>星环</small>
                <div className="mini-rings">
                  {Array.from({ length: 9 }, (_, i) => (
                    <span
                      key={i}
                      className={
                        i < activeRings(companion).length ? "unlocked" : ""
                      }
                    >
                      ◈
                    </span>
                  ))}
                </div>
                <small>{activeRings(companion).length} / 9</small>
              </button>
            </div>
          </div>
        )}
      </nav>
      <div className="operation-content">
        {tab === "defense" ? (
          <DefenseGame onSelectionChange={setDefenseSelected} />
        ) : tab === "currency" ? (
          <CurrencyGame />
        ) : tab === "pvp" ? (
          <DuelGame />
        ) : (
          <HomesteadGame onBack={() => setTab("defense")} />
        )}
      </div>
    </div>
  );
}
