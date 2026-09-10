import { AscensionControl } from "./ProgressionControls";
import { MaterialArt } from "./MaterialArt";
import { levelCap, skillCost, skillMultiplier } from "../systems/progression";
import { useState } from "react";
import type { Companion } from "../domain/types";
import { useGame } from "../state/GameContext";
import { companionCatalog, weaponCatalog } from "../data/catalog";
import { skillNames } from "../data/skillNames";
import { numericKit } from "../systems/rosterCombat";
import { EquipmentArt } from "./EquipmentArt";
import { signatureArt, signatureDescription } from '../data/signatureArt';

export function SkillPanel({ companion: c }: { companion: Companion }) {
  const [selected, setSelected] = useState(0),
    kit = numericKit(c),
    s = kit.skills[selected];
  const { state, dispatch } = useGame();
  const cost = skillCost(c, selected);
  const owned = state.companions.some(u => u.id === c.id);
  const canUpgrade = owned && cost.level < cost.cap && state.gold >= cost.gold && (state.materials["战术经验书"] ?? 0) >= cost.book && (state.materials[cost.material] ?? 0) >= cost.count;
  const names = [...skillNames(c), "职责被动"];
  const descriptions = [
    "恢复1战技点、25能量。",
    "消耗1战技点、获得35能量。抗伤位护阵减伤15%；治疗位回复全队（含自身）6%最大生命×治疗效能；专辅强化自身本次攻击和下组双C。",
    "消耗100能量，替代本次行动。治疗位回复全队（含自身）12%最大生命×治疗效能；抗伤位护阵；专辅同时强化自身和下组双C。",
  ];
  return (
    <section className="compact-skills">
      <div className="skill-selector" role="group" aria-label="选择技能">
        {kit.skills.map((s, i) => (
          <button
            key={s.id}
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
          >
            <span>{["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ"][i]}</span>
            <b>{["普攻", "战技", "终结技", "被动"][i]}</b>
          </button>
        ))}
      </div>
      <article>
        <small>{["普攻", "战技", "终结技", "职责被动"][selected]}</small>
        <h3>{names[selected]}</h3>
        {selected < 3 && (
          <strong>
            {Math.round(s.directCoefficient * skillMultiplier(c, selected) * 100)}% <small>直接系数</small>
          </strong>
        )}
        <p>{selected < 3 ? descriptions[selected] : s.description}</p>
      </article>
      {selected < 3 && <div className="progression-box">
        <b>技能等级 {cost.level} / {cost.cap}</b><p>每级直接伤害系数 +8%；最高 10 级，角色突破可提高技能上限。</p>
        <div className="progression-materials"><span><MaterialArt name="战术经验书" size={32} inline /> {state.materials["战术经验书"] ?? 0} / {cost.book}</span><span><MaterialArt name={cost.material} size={32} inline /> {cost.material} {state.materials[cost.material] ?? 0} / {cost.count}</span></div>
        <button className="primary-button" disabled={!canUpgrade} onClick={() => dispatch({ type: "UPGRADE_SKILL", id: c.id, slot: selected })}>{cost.level >= 10 ? '技能已满级' : cost.level >= cost.cap ? '请先突破角色' : `升级技能 · ${cost.gold} 金币`}</button>
        {!canUpgrade && cost.level < cost.cap && <small>{owned ? '背包材料或金币不足' : '获得角色后可培养'}</small>}
        <button className="material-source" onClick={() => dispatch({ type: "NAVIGATE", screen: "tasks" })}>获取技能材料</button>
      </div>}
      <p className="panel-note">
        暴击上限80% · 爆伤上限250%
        <br />
        命座、联动与体系增伤加算。
      </p>
    </section>
  );
}
export function WeaponPanel({ companion: c }: { companion: Companion }) {
  const { state, dispatch } = useGame();
  const [selected, setSelected] = useState(0);
  const signature = weaponCatalog.find((w) => w.signatureFor === c.id)!;
  const owned = state.weapons.some((w) => w.id === signature.id);
  const equipped = state.weapons.find((w) => w.ownerId === c.id);
  const w = state.weapons[Math.min(selected, state.weapons.length - 1)];
  return (
    <section className="compact-weapons">
      <div className="signature-display">
        <EquipmentArt
          kind="weapon"
          signatureFor={c.id}
          path={c.path}
          name={signature.name}
        />
        <div>
          <small>本命专武</small>
          <h3>{signature.name}</h3>
          {signatureArt(c.id, 'weapon') && <p className="signature-model-description">{signatureDescription(c.id)}</p>}
          <p>
            {equipped?.signatureFor === c.id
              ? "本命共鸣已生效"
              : "本命共鸣未激活"}
          </p>
          <p>当前：{equipped?.name ?? "未装备"}</p>
          {!owned && (
            <button
              className="primary-button"
              disabled={
                state.gold < 2000 || (state.materials["纯净星核"] ?? 0) < 1
              }
              onClick={() => dispatch({ type: "FORGE_WEAPON", id: c.id })}
            >
              锻造 · 1星核 / 2000金币
            </button>
          )}
        </div>
      </div>
      {w ? (
        <div className="weapon-picker">
          <div className="page-controls">
            <button
              aria-label="上一件武器"
              disabled={selected === 0}
              onClick={() => setSelected((v) => v - 1)}
            >
              ‹
            </button>
            <span>
              武器 {Math.min(selected + 1, state.weapons.length)} /{" "}
              {state.weapons.length}
            </span>
            <button
              aria-label="下一件武器"
              disabled={selected >= state.weapons.length - 1}
              onClick={() => setSelected((v) => v + 1)}
            >
              ›
            </button>
          </div>
          <h3>{w.name} · Lv.{w.level}</h3><AscensionControl unit={w} kind="weapon" />
          <p>
            精炼 {w.refinement}
          </p>
          <p>
            {w.ownerId
              ? `持有者：${companionCatalog.find((c) => c.id === w.ownerId)?.name}`
              : "待装备"}
          </p>
          <div className="weapon-actions">
            <button
              disabled={equipped?.id === w.id}
              onClick={() =>
                dispatch({ type: "EQUIP_WEAPON", id: c.id, weaponId: w.id })
              }
            >
              {equipped?.id === w.id ? "已装备" : "装备"}
            </button>
            <button
              disabled={state.gold < 300 || w.level >= levelCap(w) || (state.materials["折光棱晶"] ?? 0) < 1}
              onClick={() => dispatch({ type: "UPGRADE_WEAPON", id: w.id })}
            >
              强化 · 300金币 / 1折光棱晶
            </button>
          </div>
        </div>
      ) : (
        <p>暂无武器</p>
      )}
      <p className="panel-note">
        本命完整提供武器预算，异主保留85%。强化与精炼提升预算完成度。
      </p>
    </section>
  );
}
