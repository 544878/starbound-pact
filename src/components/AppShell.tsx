import { useEffect, useRef, useState, type ReactNode } from "react";
import { useGame } from "../state/GameContext";
import type { Screen } from "../domain/types";
import { Icon } from "./Icon";
const nav = [
  { screen: "home", label: "主页", icon: "home" },
  { screen: "activities", label: "作战", icon: "gamepad" },
  { screen: "companions", label: "角色", icon: "paw" },
  { screen: "summon", label: "祈愿", icon: "star" },
] as const;
export function AppShell({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  const { state, navigate, reset } = useGame();
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    content.current?.scrollTo({ top: 0, left: 0 });
  }, [state.screen]);
  const [more, setMore] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  function go(screen: Screen) {
    navigate(screen);
    setMore(false);
    setConfirmReset(false);
  }
  return (
    <main className={`app-shell screen-${state.screen}`}>
      <header className="topbar">
        <button className="brand" onClick={() => go("home")}>
          <span className="brand-mark">✦</span>
          <div className="brand-text">
            <b>星契纪元</b>
            <small>以星为契 · 与你同行</small>
          </div>
        </button>
        <div className="resources">
          <span>
            金币 <b>{state.gold.toLocaleString()}</b>
          </span>
          <span>
            星晶 <b>{state.crystals.toLocaleString()}</b>
          </span>
          <span>
            体力 <b>{state.stamina}</b>
          </span>
        </div>
      </header>
      <div className="screen-content" ref={content}>
        {children}
      </div>
      {!hideNav && (
        <nav className="bottom-nav" aria-label="主要导航">
          {nav.map((n) => (
            <button
              key={n.screen}
              className={state.screen === n.screen ? "active" : ""}
              onClick={() => go(n.screen)}
            >
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </button>
          ))}
          <button
            className={more ? "active" : ""}
            onClick={() => setMore((v) => !v)}
          >
            <Icon name="bag" />
            <span>更多</span>
          </button>
        </nav>
      )}
      {more && (
        <div className="more-menu">
          <h2>更多功能</h2>
          {(
            [
              ["formation", "编队"],
              ["inventory", "背包"],
              ["tasks", "任务"],
              ["story", "剧情"],
              ["tower", "深塔"],
              ["shop", "补给商店"],
            ] as [Screen, string][]
          ).map(([id, label]) => (
            <button key={id} onClick={() => go(id)}>
              {label}
            </button>
          ))}
          <button onClick={() => setConfirmReset((v) => !v)}>
            本地存档管理
          </button>
          {confirmReset && (
            <div>
              <p>重置会清空当前养成与资源。</p>
              <button
                onClick={() => {
                  reset();
                  setMore(false);
                  setConfirmReset(false);
                }}
              >
                确认重置存档
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
