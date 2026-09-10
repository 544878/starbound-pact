import { useState, type CSSProperties } from "react";
import type { Companion } from "../domain/types";
import { useGame } from "../state/GameContext";
import { SoulGem } from "./SoulGem";
import { ringAt } from "../systems/growth";
import {
  RING_NAMES,
  affixValue,
  ringAffixes,
  ringLevel,
  ringUnlocked,
} from "../systems/ringAffixes";
import { RULES } from "../data/advancedRules";
export function RingConstellation({ companion: c }: { companion: Companion }) {
  const { state, dispatch } = useGame();
  const [i, setSelected] = useState(0);
  const count = RING_NAMES.filter((_, i) => ringUnlocked(c, i)).length;
  const r = ringAt(c, i),
    level = ringLevel(c, i),
    open = ringUnlocked(c, i);
  const has = (state.materials[`ring:${c.id}:${i - 6}`] ?? 0) > 0;
  return (
    <section className="soul-constellation" aria-label="九重魂环">
      <div className="section-label">
        <h3>九重魂环</h3>
        <span>选择魂环</span>
      </div>
      <div className="ring-workspace">
        <div className="ring-map">
          <div className="ring-map-core">
            <span>九重魂环</span>
            <strong>
              {count}
              <small> / 9</small>
            </strong>
            <span>本命共鸣</span>
          </div>
          {RING_NAMES.map((name, slot) => {
            const unlocked = ringUnlocked(c, slot),
              angle = ((-90 + slot * 40) * Math.PI) / 180;
            return (
              <button
                key={name}
                className={`soul-node ${slot >= 6 ? "acquired" : ""} ${unlocked ? "unlocked" : "locked"} ${i === slot ? "selected" : ""}`}
                style={
                  {
                    "--x": `${50 + Math.cos(angle) * 37}%`,
                    "--y": `${50 + Math.sin(angle) * 37}%`,
                  } as CSSProperties
                }
                aria-label={`${name}魂环，${unlocked ? `强化${ringLevel(c, slot)}级` : "未解锁"}，查看详情`}
                aria-pressed={i === slot}
                onClick={() => setSelected(slot)}
              >
                <SoulGem slot={slot} companionId={c.id} />
                <b>{name}</b>
                <small>
                  {unlocked
                    ? `+${ringLevel(c, slot)}`
                    : slot < 6
                      ? `Lv.${RULES.growth.ringLevels[slot]}`
                      : "待装备"}
                </small>
              </button>
            );
          })}
        </div>
        <aside className="ring-inspector" aria-label="魂环详情">
          <div className="ring-inspector-heading">
            <SoulGem slot={i} companionId={c.id} />
            <div>
              <h3>{RING_NAMES[i]}</h3>
              <small>{i < 6 ? "先天魂环" : "本命魂环"}</small>
            </div>
          </div>
          <p className="ring-full-name">
            {r?.name ?? `${c.soulName ?? c.name}·${RING_NAMES[i]}`}
          </p>
          <div className="ring-level">
            Lv. <strong>+{level}</strong> / 12
          </div>
          <progress value={level} max={12} />
          <div className="soul-affixes">
            {ringAffixes(c, i).map((a) => (
              <div
                key={a.key}
                className={`${a.main ? "main-affix" : ""} ${a.active ? "" : "inactive"}`}
              >
                <span>
                  <small>
                    {a.main
                      ? "主属性"
                      : `副属性${!a.active ? ` · +${a.unlock}解锁` : ""}`}
                  </small>
                  {a.label}
                </span>
                <b>{affixValue(a.value)}</b>
              </div>
            ))}
          </div>
          {i >= 6 && (
            <div className="soul-actions">
              <button
                onClick={() =>
                  dispatch({
                    type: "EQUIP_RING",
                    id: c.id,
                    slot: i - 6,
                    exclusive: false,
                  })
                }
              >
                装备通用环
              </button>
              {has && (
                <button
                  disabled={r?.id.startsWith("exclusive")}
                  onClick={() =>
                    dispatch({
                      type: "EQUIP_RING",
                      id: c.id,
                      slot: i - 6,
                      exclusive: true,
                    })
                  }
                >
                  {r?.id.startsWith("exclusive") ? "已装专属" : "装备专属环"}
                </button>
              )}
            </div>
          )}
          <button
            className="primary-button wide"
            disabled={!open || level >= 12 || state.gold < 200 + level * 50}
            onClick={() =>
              dispatch({ type: "UPGRADE_RING", id: c.id, slot: i })
            }
          >
            {!open
              ? i < 6
                ? `Lv.${RULES.growth.ringLevels[i]} 解锁`
                : "请先装备"
              : level >= 12
                ? "强化已满级"
                : `强化 · ${200 + level * 50}金币`}
          </button>
          <p className="ring-status" role="status">
            {open && level < 12 && state.gold < 200 + level * 50
              ? "金币不足"
              : "+4 / +8 解锁副属性 · +12 提升50%"}
          </p>
        </aside>
      </div>
    </section>
  );
}
