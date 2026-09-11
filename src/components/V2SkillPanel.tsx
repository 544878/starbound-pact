import { useState } from 'react';
import type { Companion } from '../domain/types';
import { characterDesign } from '../systems/v2/catalog';
export function V2SkillPanel({ companion }: { companion: Companion }) {
  const [selected, setSelected] = useState(0);
  const design = characterDesign(companion.id), keys = ['普攻', '战技', '大招', '被动与边界'] as const;
  return <section className="compact-skills"><div className="skill-selector" role="group" aria-label="选择技能">{keys.map((key, i) => <button key={key} aria-pressed={i === selected} onClick={() => setSelected(i)}><span>{['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ'][i]}</span><b>{key}</b></button>)}</div><article><small>星契 V2 · {design.path} · {design.role}</small><h3>{keys[selected]}</h3><p>{design.skills[keys[selected]]}</p></article><div className="progression-box"><b>{design.energy.name}</b><p>开场{design.energy.initial} / 上限{design.energy.capacity} · 大招门槛{design.energy.cost}</p><p>普攻基础充能{design.energy.basic}，战技基础充能{design.energy.skill}。充能效率只影响合法来源。</p></div><p className="panel-note">普攻通常回1战技点，战技消耗1点；大招插入时间轴，不替代自然行动。暴击率最高100%，暴伤表示额外伤害。</p></section>;
}
