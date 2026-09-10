import { useRef, useState } from "react";
import { useGame } from "../state/GameContext";
import { SoulGem } from "./SoulGem";
import { RULES } from "../data/advancedRules";
import type { Companion } from "../domain/types";
import { affixValue, ringAffixes } from "../systems/ringAffixes";

export function RingWish({ companion: c }: { companion: Companion }) {
  const { state, dispatch } = useGame();
  const [slot, setSlot] = useState(0),
    [message, setMessage] = useState("");
  const lock = useRef(false);
  const key = `ring:${c.id}:${slot}`,
    owned = (state.materials[key] ?? 0) > 0;
  const pity = state.materials[`${key}:pity`] ?? 0;
  const pull = (count: number) => {
    if (lock.current || owned || state.crystals < RULES.growth.pullCost) return;
    lock.current = true;
    let attempts = 0,
      won = false;
    for (
      ;
      attempts < Math.min(count, Math.floor(state.crystals / 160));
      attempts++
    ) {
      const roll = Math.random();
      dispatch({ type: "PULL_RING", id: c.id, slot, roll });
      if (roll < 0.08 || pity + attempts >= 29) {
        won = true;
        attempts++;
        break;
      }
    }
    setMessage(
      won
        ? `${attempts}次祈愿获得专魂！消耗${attempts * 160}星晶，已自动停止，可立即装备。`
        : `${attempts}次祈愿未获得专魂，消耗${attempts * 160}星晶，保底进度已保存。`,
    );
    queueMicrotask(() => {
      lock.current = false;
    });
  };
  return (
    <section className="ring-wish" aria-label="定向魂环祈愿">
      <div className="ring-wish-art">
        <SoulGem slot={slot + 6} companionId={c.id} />
        <span>SOUL RESONANCE</span>
      </div>
      <div className="ring-wish-copy">
        <small>定向祈愿 · {c.name}</small>
        <h3>
          {c.soulName ?? c.name} · {["真身", "命器", "本源"][slot]}
        </h3>
        <div className="epic-tabs">
          {["真身", "命器", "本源"].map((label, i) => (
            <button
              key={label}
              aria-pressed={slot === i}
              onClick={() => {
                setSlot(i);
                setMessage("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p>
          {[100000, 200000, 500000][slot].toLocaleString()}年 · 固定三词条 ·
          获得后永久持有
        </p>
        <details>
          <summary>查看专魂词条</summary>
          <p>
            {ringAffixes(
              { ...c, rings: ["exclusive-7", "exclusive-8", "exclusive-9"] },
              slot + 6,
            )
              .map(
                (a) =>
                  `${a.main ? "主" : "副"} · ${a.label} ${affixValue(a.value)}${a.main ? "" : `（+${a.unlock}解锁）`}`,
              )
              .join(" / ")}
          </p>
          <p>沿用该环位强化等级。上限+12，获得与装备不会重抽词条。</p>
        </details>
        <div className="wish-meter">
          <b>{owned ? "已获得" : `${pity} / 30`}</b>
          <span>{owned ? "可以随时更换装备" : `最多再${30 - pity}次必得`}</span>
        </div>
        <progress max={30} value={owned ? 30 : pity} />
        <p className="fine-print">
          每次8%，第30次必得；角色与环位分别累计。连续祈愿获得即停，仅扣实际次数。
        </p>
        <div className="soul-actions">
          {owned ? (
            <button
              className="primary-button"
              disabled={c.rings?.[slot] === `exclusive-${slot + 7}`}
              onClick={() =>
                dispatch({
                  type: "EQUIP_RING",
                  id: c.id,
                  slot,
                  exclusive: true,
                })
              }
            >
              {c.rings?.[slot] === `exclusive-${slot + 7}`
                ? "专魂已装备"
                : "装备此专魂"}
            </button>
          ) : (
            <>
              <button disabled={state.crystals < 160} onClick={() => pull(1)}>
                祈愿一次 · 160晶
              </button>
              <button
                className="primary-button"
                disabled={state.crystals < 160}
                onClick={() => pull(10)}
              >
                连续祈愿 · 最多10次
              </button>
            </>
          )}
        </div>
        {!owned && (
          <button
            disabled={
              state.gold < 1500 || (state.materials["纯净星核"] ?? 0) < 1
            }
            onClick={() => dispatch({ type: "CRAFT_RING", id: c.id, slot })}
          >
            定向炼魂 · 1星核 / 1500金币
          </button>
        )}
        <p role="status">{message}</p>
      </div>
    </section>
  );
}
