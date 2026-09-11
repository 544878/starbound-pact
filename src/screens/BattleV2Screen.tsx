import { useEffect, useRef, useState } from 'react';
import { useGame } from '../state/GameContext';
import { skillNames } from '../data/skillNames';
import { CharacterArt } from '../components/CharacterArt';
import { act, advance, autoAction, actionError, createV2Battle, chooseV2Blessing } from '../systems/v2/battle';
import { FEATURE_BLESSINGS } from '../systems/v2/blessings';
import { canUltimate } from '../systems/v2/resources';
import { generateBattleDrops } from '../systems/battle';
import { resourceDrops } from '../data/resourceDungeons';
import { encounterKey } from '../systems/v2/catalog';
import type { Action, Battle, Command, Unit } from '../systems/v2/model';
import '../battle-v2.css';

const number = (n: number) => Math.round(n).toLocaleString('zh-CN');
const commandName = { basic: '普攻', skill: '战技', ultimate: '大招' } as const;
const choices: Record<string, Array<[string, string]>> = {
  gilgamesh: [['2', '2发'], ['4', '4发'], ['6', '6发'], ['reload', '战技额外装填 · 多付1点']],
  rin: [['blue', '蓝宝石 · 护盾'], ['green', '绿宝石 · 治疗'], ['red', '三红 · 群攻'], ['mixed', '三色 · 充能'], ['', '任意配方']],
  'R5-008': [['', '提前预约5AV'], ['delay', '延后5AV · 增加系数'], ['fast', '120能量 · 10AV速发']],
  'R4-016': [['', '立即风刃'], ['delay', '延后风刃15AV']],
  'R5-004': [['', '80档'], ['120', '120档']],
  'R4-020': [['', '60温 · 全场提前一次'], ['80', '80温 · 单体提前两次']],
  cantarella: [['', '放毒 · 延长一次'], ['collect', '收毒 · 即刻结算与治疗']],
  'R5-005': [['', '试探 · 影子补击'], ['withdraw', '收手 · 集中攻击']],
  'R5-001': [['', '普通攻击'], ['enhanced', '强化普攻 · 0.5许可']],
  saber: [['', '继续守护'], ['enhanced', '剑光强化普攻']],
  'R4-019': [['', '稳住 · 护盾'], ['accelerate', '加速 · 生命换增伤']],
  archer: [['', '长弓 · 单体'], ['blades', '双刃 · 群体']],
  yuno: [['', '铺盾'], ['transfer', '战技 · 转移次选队友的盾'], ['collect', '大招 · 收盾再分配']],
  phrolova: [['', '集中指令'], ['sweep', '扫击指令']],
};
function resourceDetails(u: Unit) {
  const entries: Array<[string, number]> = [['反击仓', u.counters.warehouse], ['回补', u.counters.repayment], ['存点', u.counters.pointStore], ['红', u.counters.red], ['蓝', u.counters.blue], ['绿', u.counters.green], ['指令', u.counters.orders], ['强化行动', u.counters.form], ['剑光', u.counters.sword], ['戏浪筹码', u.counters.chips]];
  return entries.filter(([, value]) => value > 0).map(([name, value]) => `${name} ${Number(value.toFixed(1))}`).join(' · ');
}
export function BattleScreen() {
  const { state, finishBattle, navigate } = useGame();
  const party = state.formation.flatMap(id => state.companions.filter(c => c.id === id)).slice(0, 5);
  const encounterId = encounterKey(state.encounter);
  const [battle, setBattle] = useState(() => createV2Battle(party, state.weapons, encounterId));
  const [enemy, setEnemy] = useState(battle.enemies[0]?.id ?? '');
  const [ally, setAlly] = useState(party[0]?.id ?? '');
  const [second, setSecond] = useState(party[1]?.id ?? '');
  const [selected, setSelected] = useState('');
  const [option, setOption] = useState('');
  const [auto, setAuto] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showLog, setShowLog] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const featureDescription = FEATURE_BLESSINGS[Number(encounterId.split(':')[1])];
  const [error, setError] = useState('');
  const settled = useRef(false);
  const actor = battle.units.find(u => u.id === selected && u.hp > 0) ?? battle.units.find(u => u.id === battle.active) ?? battle.units.find(u => u.hp > 0);
  const target = battle.enemies.find(e => e.id === enemy && e.hp > 0) ?? battle.enemies.find(e => e.hp > 0);
  const recipient = battle.units.find(u => u.id === ally && u.hp > 0) ?? battle.units.find(u => u.hp > 0);
  const other = battle.units.find(u => u.id === second && u.hp > 0 && u !== recipient) ?? battle.units.find(u => u.hp > 0 && u !== recipient);
  const timeline = [...battle.units.filter(u => u.hp > 0).map(u => ({ id: u.id, name: u.name, due: u.clock.due, enemy: false })), ...battle.enemies.filter(e => e.hp > 0 && e.name !== '药罐').map(e => ({ id: e.id, name: e.name, due: e.clock.due, enemy: true })), ...battle.scheduled.map(s => ({ id: s.id, name: s.kind === 'enemy' ? '预告重击' : '预约事件', due: s.at, enemy: s.kind === 'enemy' }))].sort((a, b) => a.due - b.due).slice(0, 9);
  const action = (command: Command): Action => ({ actor: actor?.id ?? '', command, enemy: target?.id ?? '', ally: recipient?.id ?? '', secondAlly: other?.id, option });
  const submit = (command: Command) => {
    const next = action(command); const reason = actionError(battle, next);
    if (reason) { setError(reason); return; }
    setBattle(current => act(current, next)); setSelected(''); setOption(''); setError('');
  };
  useEffect(() => {
    if (!auto || battle.outcome !== 'playing') return;
    const timer = window.setTimeout(() => setBattle(current => {
      const action = autoAction(current); return action ? act(current, action) : advance(current);
    }), 1000 / speed);
    return () => window.clearTimeout(timer);
  }, [auto, speed, battle]);
  const finish = () => {
    if (settled.current) return; settled.current = true;
    const victory = battle.outcome === 'win';
    finishBattle(victory ? state.encounter?.kind === 'resource' ? resourceDrops(state.encounter.id) : generateBattleDrops(state.battleSeed + Math.floor(battle.av / 100)) : [], victory);
  };
  const chooseBlessing = (value: Battle['blessing']) => setBattle(current => chooseV2Blessing(current, value));
  return <section className="battle-v2" aria-label="星契战斗">
    <header className="v2-heading">
      <button className="v2-back" aria-label="返回编队" onClick={() => { setAuto(false); finishBattle([], false); navigate('formation'); }}>‹</button>
      <div className="v2-title"><h1>{battle.name}</h1><span>第 {battle.wave + 1} / {battle.waves.length} 波</span></div>
      <div className="v2-clock"><span>战斗进度</span><progress value={battle.av} max={battle.limit} aria-label="战斗时间进度"/><b>{Math.round(battle.av / battle.limit * 100)}%</b></div>
      <button className="v2-auto" aria-pressed={auto} onClick={() => setAuto(v => !v)}>{auto ? 'Ⅱ 暂停' : '▷ 自动'}</button>
      <button aria-label={`播放速度${speed}倍`} onClick={() => setSpeed(v => v === 1 ? 2 : v === 2 ? 4 : 1)}>×{speed}</button>
      <details className="v2-time-help"><summary aria-label="行动时间说明">?</summary><div><strong>行动顺序怎么看？</strong><p>从左到右依次行动。「距行动」越小，越快轮到该角色。速度越高，行动间隔越短。</p><p>AV 是战斗内部的时间刻度，不是速度，也不是现实秒数。大招可在满足条件时插入，不占用下一次普通行动。</p><small>已用 {battle.av.toFixed(1)} / {battle.limit} 时间刻度</small></div></details>
    </header>
    <div className="v2-order"><span className="v2-order-label">行动顺序 <small>→</small></span><div className="v2-timeline" aria-label="行动时间轴">{timeline.map((item, index) => {
      const unit = battle.units.find(u => u.id === item.id), enemyUnit = battle.enemies.find(e => e.id === item.id);
      return <div key={item.id} className={`${item.enemy ? 'hostile' : ''} ${item.id === battle.active ? 'active' : ''}`}>
        <div className="v2-order-portrait">{unit ? <CharacterArt companion={unit.companion} view={4}/> : enemyUnit ? <img src={enemyUnit.art} alt=""/> : <span>◷</span>}</div>
        <div><span>{item.id === battle.active ? '当前' : String(index + 1).padStart(2, '0')} · {item.name}</span><small>{item.id === battle.active ? '即将行动' : `距行动 ${Math.max(0, item.due - battle.av).toFixed(1)}`}</small></div>
      </div>;
    })}</div></div>
    {encounterId.startsWith('tower:') && !battle.log.length && <div className="v2-blessing"><span>本层祝福 · 开战后锁定</span>{([['feature', featureDescription ? `本层特色 · ${featureDescription}` : '本层特色 · 尚未开放'], ['safety', '应急保护 · 首次重击前8%盾'], ['cycle', '稳住循环 · 三人接力回点']] as const).map(([id, name]) => <button key={id} disabled={id === 'feature' && !featureDescription} aria-pressed={battle.blessing === id} onClick={() => chooseBlessing(id)}>{name}</button>)}</div>}
    <div className="v2-arena">
      <div className={`v2-enemies ${battle.enemies.length > 4 ? 'crowded' : ''}`} aria-label="敌方目标">{battle.enemies.map(e => <button className={`v2-enemy ${e.id === target?.id ? 'chosen' : ''} ${e.hp <= 0 ? 'fallen' : ''}`} key={e.id} disabled={e.hp <= 0} aria-pressed={e.id === target?.id} aria-label={`攻击目标 ${e.name}`} onClick={() => setEnemy(e.id)}>
        <div className="v2-intent">{e.hp <= 0 ? '已击破' : e.chargingUntil > battle.av ? `重击预告 · 倒计时 ${Math.ceil(e.chargingUntil - battle.av)}` : e.intent === 'all' ? '群体攻击' : '点名攻击'}</div>
        <div className="v2-enemy-art"><img src={e.art} alt=""/><span className="v2-target-corners"/></div><strong>{e.name}</strong><progress value={e.hp} max={e.maxHp} aria-label={`${e.name}生命`}/><small>{number(e.hp)} / {number(e.maxHp)}</small>
        <div className="v2-toughness"><span>{e.toughness.brokenUntil > battle.av ? `破韧中 · 剩余 ${Math.ceil(e.toughness.brokenUntil - battle.av)} 刻度` : `韧性 ${Math.ceil(e.toughness.value)} / ${Math.ceil(e.toughness.max)}`}</span><progress value={e.toughness.value} max={e.toughness.max || 1}/></div>
        <span className="v2-tags">{e.auras.map(a => `${a.element}×${a.units}`).join(' · ')} {battle.dots.filter(d => d.target === e.id).map(d => `${d.kind === 'burn' ? '燃烧' : '中毒'}${d.weights.length}`).join(' ')} {e.shields.length > 0 ? `盾 ${number(e.shields.reduce((sum, s) => sum + s.remaining, 0))}` : ''}</span>
      </button>)}</div>
      <div className="v2-feedback" role="status">{battle.log.length ? battle.log.slice(-1).map(e => <span key={e.event_id}>{e.detail}</span>) : <span>选择敌方目标 · 下达战斗指令</span>}{battle.outcome === 'playing' && !battle.units.some(u => u.id === battle.active) && <button className="v2-advance" onClick={() => { setBattle(advance); setSelected(''); }}>推进战局 · 下一行动 →</button>}</div>
      <div className="v2-party" aria-label="我方角色">{battle.units.map(u => <button key={u.id} className={`v2-unit ${u.id === battle.active ? 'acting' : ''} ${u.id === actor?.id ? 'selected' : ''} ${u.hp <= 0 ? 'fallen' : ''}`} disabled={u.hp <= 0} aria-label={`选择角色 ${u.name}`} onClick={() => { setSelected(u.id); setOption(''); }}>
        <CharacterArt companion={u.companion} view={4} className="v2-character"/>
        <div className="v2-unit-info"><strong>{u.name} <small>{u.design.role}</small></strong><progress value={u.hp} max={u.stats.hp} aria-label={`${u.name}生命`}/><span>{number(u.hp)} / {number(u.stats.hp)}</span>
        <span className="v2-energy-name">{u.design.energy.name}</span><progress className="v2-energy" value={u.resource.value} max={u.resource.rule.capacity} aria-label={`${u.name}能量`}/><span>{Number(u.resource.value.toFixed(1))} / {u.resource.rule.capacity} · 大招需{u.resource.rule.cost}</span>
        {u.shields.length > 0 && <small>护盾 {number(u.shields.reduce((sum, s) => sum + s.remaining, 0))}</small>}
        <small className="v2-resource-detail">{resourceDetails(u)}</small></div>{canUltimate(u.resource, battle.av) && <b className="v2-ult-ready">大招就绪</b>}
      </button>)}</div>
    </div>
    {battle.outcome === 'playing' && actor && <div className="v2-command-panel">
      <div className="v2-points"><span>战技点</span><strong>{battle.points.value}<small> / 7</small></strong><span>{'◆'.repeat(battle.points.value)}{'◇'.repeat(7 - battle.points.value)}</span></div>
      <div className="v2-targets"><div className="v2-current"><CharacterArt companion={actor.companion} view={4}/><div><small>{actor.id === battle.active ? '当前行动' : '已选角色'}</small><strong>{actor.name}</strong></div></div>
        <details className="v2-target-options"><summary>队友与技能选项 ⌄</summary><div><label>队友目标<select value={recipient?.id ?? ''} onChange={e => setAlly(e.target.value)}>{battle.units.filter(u => u.hp > 0).map(u => <option key={u.id} value={u.id}>{u.name} · {Math.round(u.hp / u.stats.hp * 100)}%</option>)}</select></label>
        <label>第二目标<select value={other?.id ?? ''} onChange={e => setSecond(e.target.value)}>{battle.units.filter(u => u.hp > 0 && u !== recipient).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        {choices[actor.id] && <label>技能选项<select value={option} onChange={e => setOption(e.target.value)}><option value="">默认</option>{choices[actor.id].filter(([id]) => id).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}
        {actor.id === 'selene' && actor.records.length > 0 && <label>回放记录<select value={option} onChange={e => setOption(e.target.value)}><option value="">最早记录</option>{actor.records.map(r => <option key={r.id} value={r.id}>{r.element} · {Math.round(r.coefficient * 100)}% · {{ single: '单体', blast: '扩散', all: '群体' }[r.shape]}</option>)}</select></label>}
        </div></details>
      </div>
      <div className="v2-commands">{(['basic', 'skill', 'ultimate'] as const).map(cmd => { const reason = actionError(battle, action(cmd))?.replaceAll('AV', ' 时间刻度'); return <button key={cmd} className={cmd} disabled={!!reason} title={reason ?? actor.design.skills[commandName[cmd]]} onClick={() => submit(cmd)}><i className={`v2-skill-sigil ${cmd}`} aria-hidden="true">{cmd === 'basic' ? '⟡' : cmd === 'skill' ? '☽' : '✧'}</i><div><strong>{commandName[cmd]}<small>{cmd === 'basic' ? '+1 战技点' : cmd === 'skill' ? '−1 战技点' : `${actor.resource.rule.cost} 能量`}</small></strong><b className="v2-skill-name">{skillNames(actor.companion)[cmd === 'basic' ? 0 : cmd === 'skill' ? 1 : 2]}</b><span>{reason ?? (actor.design.skills[commandName[cmd]].split('；')[0])}</span></div></button>; })}</div>

      <div className="v2-command-foot"><span>目标 · {target?.name ?? '无'}{actor.id !== battle.active ? '　｜　当前仅可释放已就绪大招' : ''}</span><button aria-expanded={showSkills} onClick={() => setShowSkills(v => !v)}>{showSkills ? '收起技能说明 −' : '查看完整技能 +'}</button></div>
      {showSkills && <div className="v2-skill-details">{(['basic', 'skill', 'ultimate'] as const).map(cmd => <div key={cmd}><strong>{commandName[cmd]}</strong><p>{actor.design.skills[commandName[cmd]]}</p></div>)}</div>}
      {error && <p role="alert">{error}</p>}
    </div>}
    {battle.outcome !== 'playing' && <div className="v2-result"><h2>{battle.outcome === 'win' ? '战斗胜利' : battle.outcome === 'timeout' ? '时间耗尽' : '队伍失去战斗能力'}</h2><p>已用 {battle.av.toFixed(1)} 时间刻度 · 实际伤害 {number(battle.log.filter(e => battle.enemies.some(x => x.id === e.target) && e.tags.some(t => ['NORMAL_ACTION', 'ULTIMATE_ROOT', 'DOT_NATURAL', 'DOT_EARLY', 'REACTION', 'FOLLOW_UP', 'REPLAY'].includes(t))).reduce((sum, e) => sum + e.effective, 0))}</p><button onClick={finish}>{battle.outcome === 'win' ? '领取奖励并返回' : '结束战斗并返回'}</button></div>}
    <footer className="v2-log"><button onClick={() => setShowLog(v => !v)}>{showLog ? '收起' : '展开'}战斗记录 · {battle.log.length}条</button>{showLog && <ol>{battle.log.slice(-100).reverse().map(e => <li key={e.event_id}><time>{e.av.toFixed(1)} 刻度</time><span>{e.detail}</span></li>)}</ol>}</footer>
  </section>;
}
