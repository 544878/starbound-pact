import { hasFunctionalSoul } from './functionalSouls';
import { FEATURE_BLESSINGS, feature, once, equipmentShield, cleanse, bankLostEnergy } from './blessings';
import type { Companion, Weapon } from '../../domain/types';
import { CHARACTERS, V2_BOSSES, encounterDesign, characterDesign, characterPanel } from './catalog';
import { damage, baseAmount, heal as calculateHeal, targets, masteryMultiplier, reactionBase, type Coefficients, type Shape, type DamageOptions } from './math';
import { createResource, beginNatural, gainEnergy, createPoints, canUltimate, payUltimate, gainPoints, spendPoint } from './resources';
import { clock, completeNatural, expired } from './timeline';
import { addShield, absorb, warehouseGain, repayHp, deferDamage, repayDeferred, settleDeferred, breakToughness } from './defense';
import { applyDot, tickDot, spreadDot, recordSkill } from './records';
import { attach, type Element, type AttachmentBudget } from './elements';
import type { Battle, Unit, Enemy, Action, SkillContext, Scheduled, Status } from './model';
import { executeSkill } from './skills';
import { withConstellations } from './constellations';
import type { Event, Tag } from './events';

const bossArt = ['inverse', 'memory', 'flame', 'desire', 'dream', 'end', 'time', 'inverse'];
const minionArt: Record<string, string> = { '巡游幻蝶': 'floor-1', '共生近卫': 'floor-2', '自爆藤灵': 'thorn', '镜影幻卒': 'mirror', '风向斥候': 'floor-5', '重铠侍卫': 'floor-7', '蓄力术士': 'floor-8', '援护医师': 'floor-4', '计时机偶': 'floor-9', '泡盾术士': 'floor-10', '毒雾使者': 'floor-13', '蓄能窃贼': 'floor-17', '药罐': 'floor-15', '镜影': 'phantom', '标准木桩': 'floor-14' };
const minions: Record<string, number[]> = {
  '巡游幻蝶': [8500, 1282, 380, 118, 30], '共生近卫': [15000, 1418, 550, 92, 55], '自爆藤灵': [7000, 1552, 320, 102, 25],
  '镜影幻卒': [12000, 1485, 450, 106, 40], '风向斥候': [9500, 1148, 380, 120, 30], '重铠侍卫': [18000, 1688, 650, 86, 60],
  '蓄力术士': [13500, 1823, 430, 96, 40], '援护医师': [10000, 878, 400, 105, 30], '计时机偶': [11000, 1215, 420, 113, 35],
  '泡盾术士': [12000, 1080, 430, 100, 35], '毒雾使者': [12500, 1350, 420, 108, 35], '蓄能窃贼': [14000, 1418, 470, 107, 45],
  '药罐': [6000, 0, 0, 1, 0], '镜影': [12000, 1485, 450, 106, 40], '标准木桩': [1000000, 0, 700, 100, 100000],
};
export function enemyInstance(name: string, hp: number, id: string, av: number, encounterId: string): Enemy {
  const bossIndex = V2_BOSSES.findIndex(b => b.name === name), boss = V2_BOSSES[bossIndex];
  const source = boss ? [boss.hp, boss.attack, boss.defense, boss.speed, boss.toughness] : minions[name];
  if (!source) throw new Error(`V2 unknown enemy ${name}`);
  const floor = encounterId.startsWith('tower:') ? Number(encounterId.split(':')[1]) : 0;
  const chapter = encounterId.startsWith('story:') ? Number(encounterId.split(':')[1].split('-')[0]) : 0;
  const stage = chapter ? Number(encounterId.split('-')[1]) : 0;
  const g = chapter ? .4 + .6 * (Math.min(90, 25 + chapter * 7) - 1) / 89 : 1;
  const stats = { hp, attack: source[1] * g * (stage && stage <= 3 && boss ? .72 : 1) * (floor ? 1 + .018 * (floor - 1) : 1) * (floor === 18 ? .72 : 1), defense: source[2] * g, speed: source[3], crit: 0, critDamage: .5, energyEfficiency: 1, mastery: 0 };
  return { id, name, hp, maxHp: hp, stats, clock: clock(id, source[3], av), toughness: { value: source[4] * (stage && stage <= 3 && boss ? .65 : 1), max: source[4] * (stage && stage <= 3 && boss ? .65 : 1), brokenUntil: 0, lastDelayWindow: -1 },
    art: boss ? `/assets/bosses/${bossArt[bossIndex]}.png` : `/assets/abyss/${minionArt[name]}.png`, boss: !!boss, weaknesses: boss?.weaknesses ?? [], auras: [], shields: [], statuses: [], phase: 0,
    counters: { armor: name === '重铠侍卫' ? 3 : 0, wall: name === '苍穹暴风领主' ? 3 : 0, heat: name === '焚界龙骸' ? 1 : 0, born: av }, intent: 'single', target: '', chargingUntil: 0 };
}
function spawn(b: Battle, name: string, hp: number) {
  const enemy = enemyInstance(name, hp, `enemy:${b.serial++}`, b.av, b.encounterId);
  if (b.enemies.filter(e => e.hp > 0).length < 8) b.enemies.push(enemy);
}
function initializeMechanics(b: Battle) {
  for (const enemy of [...b.enemies]) {
    if (enemy.name === '枯荣司祭') { spawn(b, '药罐', 6000); spawn(b, '药罐', 6000); }
    if (enemy.name === '覆天古主') { spawn(b, '共生近卫', 15000); spawn(b, '共生近卫', 15000); }
  }
}
export function createV2Battle(companions: Companion[], weapons: Weapon[], encounterId = 'free:default', blessing: Battle['blessing'] = 'feature'): Battle {
  if (blessing === 'feature' && encounterId.startsWith('tower:') && !FEATURE_BLESSINGS[Number(encounterId.split(':')[1])]) blessing = 'safety';
  const encounter = encounterDesign(encounterId);
  const units: Unit[] = companions.slice(0, 5).map(companion => {
    const design = characterDesign(companion.id), build = characterPanel(companion, weapons);
    return { id: companion.id, name: companion.name, companion, design, ...build, hp: build.stats.hp, resource: createResource(design.energy), clock: clock(companion.id, build.stats.speed), shields: [], statuses: [], records: [], defenseRecords: [], counters: {}, strings: {} };
  });
  for (const u of units) { if (u.id === 'lumi' && u.companion.constellation >= 1) u.resource.value += 10; }
  const waves = encounter.mode === 'rush' ? encounter.enemies.map(e => [e]) : [encounter.enemies];
  const battle: Battle = { version: 2, av: 0, limit: encounter.mode === 'rush' || encounter.mode === 'dual' ? 1250 : 1000, encounterId, name: encounter.name, units,
    enemies: waves[0].map((e, i) => enemyInstance(e.name, e.hp, `enemy:${i}`, 0, encounterId)), waves, wave: 0, points: createPoints(), active: '', outcome: units.length === 5 && new Set(units.map(u => u.id)).size === 5 ? 'playing' : 'loss', scheduled: [], dots: [], costs: [], debts: [], log: [], serial: 100,
    lastActor: '', lastCommand: '', lastElement: '水', actionKinds: [], blessing, counters: {} };
  if (units.some(u => hasFunctionalSoul(u.companion, 'point'))) battle.points = gainPoints(battle.points, 1, 0, true);
  initializeMechanics(battle);
  selectNext(battle);
  return battle;
}
export function chooseV2Blessing(b: Battle, blessing: Battle['blessing']): Battle {
  if (b.log.length || !b.encounterId.startsWith('tower:') || !['feature', 'safety', 'cycle'].includes(blessing)) return b;
  if (blessing === 'feature' && !FEATURE_BLESSINGS[Number(b.encounterId.split(':')[1])]) return b;
  return { ...b, blessing };
}
const living = (b: Battle) => b.units.filter(u => u.hp > 0);
const opponents = (b: Battle) => b.enemies.filter(e => e.hp > 0);
const statusValue = (actor: Unit | Enemy, key: string) => actor.statuses.filter(s => s.key === key).reduce((n, s) => n + s.value, 0);
function gainLimited(u: Unit, key: string, amount: number, cap: number, window: number = u.resource.naturalId) {
  const usedKey = `limit:${key}:${window}`, used = u.counters[usedKey] ?? 0;
  const legal = Math.min(Math.max(0, amount), Math.max(0, cap - used));
  u.counters[usedKey] = used + legal;
  u.resource = gainEnergy(u.resource, legal, 'passive').resource;
  return legal;
}
const refine = (u: Unit) => 1 + .1 * Math.max(0, Math.min(4, u.refinement - 1));
function grant(who: Unit | Enemy, owner: Unit, key: string, value: number, av: number, duration = 200, uses = 1, data?: string) {
  who.statuses = [...who.statuses.filter(s => !(s.key === key && s.owner === owner.id)), { key, owner: owner.id, value, uses, duration: { kind: 'av', expires: av + duration }, data }];
}
function expire(b: Battle) {
  const turns = Object.fromEntries([...b.units, ...b.enemies].map(u => [u.id, u.clock.naturalId]));
  for (const u of [...b.units, ...b.enemies]) {
    if ('toughness' in u && u.toughness.value === 0 && u.toughness.brokenUntil <= b.av) u.toughness.value = u.toughness.max * .75;
    u.statuses = u.statuses.filter(s => !expired(s.duration, b.av, turns) && (s.uses === undefined || s.uses > 0));
    for (const s of u.shields.filter(s => s.remaining > 0 && s.expires <= b.av)) { const owner = b.units.find(x => x.id === s.owner); if (owner?.id === 'yuno') gainLimited(owner, 'shieldExpiry', s.remaining / owner.stats.hp * 100, 10); }
    u.shields = u.shields.filter(s => s.remaining > 0 && s.expires > b.av);
  }
}
function log(b: Battle, source: string, target: string, tag: Tag, amount: number, effective: number, detail: string, root?: string, parent?: string, depth = 0) {
  const event: Event = { root_id: root ?? `root:${b.serial++}`, event_id: `event:${b.serial++}`, source_actor: source, target, parent_id: parent ?? null, tags: [tag], depth, av: b.av, amount, effective, detail };
  b.log.push(event); return event;
}
function finish(b: Battle) {
  if (!living(b).length) b.outcome = 'loss';
  else if (!opponents(b).length) {
    if (b.wave + 1 < b.waves.length) {
      b.wave++;
      b.enemies = b.waves[b.wave].map(e => enemyInstance(e.name, e.hp, `enemy:${b.serial++}`, b.av, b.encounterId));
      b.dots = []; b.scheduled = b.scheduled.filter(s => s.kind !== 'enemy');
      for (const u of living(b)) {
        const reserve = hasFunctionalSoul(u.companion, 'reserve') ? u.resource.rule.cost * .1 : 0;
        if (feature(b, 6)) u.hp = Math.min(u.stats.hp, u.hp + u.stats.hp * .15);
        u.resource.value = Math.min(u.resource.value, u.resource.rule.capacity, (feature(b, 6) ? u.resource.rule.capacity * .6 : 0) + reserve);
      }
      initializeMechanics(b);
      log(b, 'system', 'all', 'NORMAL_ACTION', 0, 0, `进入第${b.wave + 1}波${feature(b, 6) ? " · 特色祝福恢复15%生命并保留至多60%已有能量" : ""}`);
    } else b.outcome = 'win';
  } else if (b.av >= b.limit) b.outcome = 'timeout';
}
function selectNext(b: Battle) {
  finish(b);
  if (b.outcome !== 'playing') { b.active = ''; return; }
  const due = [...living(b).map(u => ({ id: u.id, due: u.clock.due })), ...opponents(b).filter(e => e.name !== '药罐').map(e => ({ id: e.id, due: e.clock.due })), ...b.scheduled.map(e => ({ id: e.id, due: e.at }))].sort((a, z) => a.due - z.due || a.id.localeCompare(z.id))[0];
  if (!due || due.due > b.limit) { b.av = b.limit; b.outcome = 'timeout'; b.active = ''; return; }
  b.av = Math.max(b.av, due.due); b.active = due.id; expire(b);
}
function emitContext(b: Battle, action: Action, derived = false, rootTag: Tag = action.command === 'ultimate' ? 'ULTIMATE_ROOT' : 'NORMAL_ACTION'): SkillContext {
  const u = b.units.find(u => u.id === action.actor)!;
  const target = b.enemies.find(e => e.id === action.enemy) ?? opponents(b)[0];
  const ally = b.units.find(x => x.id === action.ally && x.hp > 0) ?? u;
  const second = b.units.find(x => x.id === action.secondAlly && x.hp > 0 && x !== ally) ?? living(b).find(x => x !== ally) ?? ally;
  const root = log(b, u.id, target?.id ?? ally.id, rootTag, 0, 0, `${u.name} · ${action.command === 'basic' ? '普攻' : action.command === 'skill' ? '战技' : '大招'}`);
  let count = 1;
  const emit = (to: string, tag: Tag, amount: number, effective: number, text: string, depth = 1) => {
    if (++count > 32 || depth > 2) throw new Error('V2 action event safety limit');
    log(b, u.id, to, tag, amount, effective, text, root.root_id, root.event_id, depth);
  };
  let attachmentBudget: AttachmentBudget = { targets: [], reactions: 0 };
  const breakTargets = new Set<string>();
  const addStatus: SkillContext['status'] = (who, key, value, duration = { kind: 'av', expires: b.av + 200 }, uses, data) => {
    who.statuses = [...who.statuses.filter(s => !(s.key === key && s.owner === u.id)), { key, owner: u.id, value, duration, uses, data }];
    if (key === 'defenseDown') {
      for (const observer of living(b).filter(x => x.id === 'R5-006')) gainLimited(observer, 'defenseDown', .5, 1);
      if (u.weapon?.name === '崩天重凿') grant(who, u, 'extraBreak', 8 * refine(u), b.av, 200, 1, u.id);
    }
    if (key === 'decoy' && u.weapon?.name === '镇梦晶壁环') grant(u, u, 'mitigation', .12 * refine(u), b.av);
    if (key === 'medicineMark') u.counters.weaponMedicineUses = 0;
  };
  const addEnergy: SkillContext['energy'] = (who, amount, external = false) => {
    const result = gainEnergy(who.resource, amount, external ? 'external' : 'passive'); who.resource = result.resource;
    if (result.gained) emit(who.id, external ? 'ENERGY_TRANSFER' : rootTag, amount, result.gained, `能量 +${result.gained.toFixed(2)}`);
    if (external && result.gained > 0 && u.weapon?.name === '回风的诗章') grant(who, u, 'damageBonus', .12 * refine(u), b.av);
  };
  const addHealing: SkillContext['heal'] = (coefficients, who = ally, passive = false) => {
    let sum = 0;
    for (const x of who === 'all' ? living(b) : [who]) {
      const suppression = opponents(b).some(e => e.name === '枯荣司祭') ? Math.min(.3, opponents(b).filter(e => e.name === '药罐').length * .15) : 0;
      let c = coefficients;
      if (statusValue(x, 'repayDebt')) {
        const nominal = baseAmount(u.stats, c) * (1 + (u.bonuses.healing ?? 0)) * (1 - suppression);
        const result = repayDeferred(b.debts, x.id, nominal * .7); b.debts = result.debts;
        c = { flat: (nominal - result.paid) / Math.max(.01, (1 + (u.bonuses.healing ?? 0)) * (1 - suppression)) };
        x.statuses = x.statuses.filter(s => s.key !== 'repayDebt');
      }
      const weaponHeal = u.weapon?.name === '抚伤往生幡' && (x.counters.heavyAt ?? -1000) >= b.av - 100 ? .15 * refine(u) : statusValue(u, 'weaponHeal');
      const result = calculateHeal(u.stats, c, x.hp, x.stats.hp, (u.bonuses.healing ?? 0) + weaponHeal, suppression);
      x.hp = result.hp; sum += result.effective;
      if (suppression > 0 && feature(b, 15) && once(b, `suppressed:${x.id}`)) equipmentShield(b, x, Math.min(u.stats.hp * .05, baseAmount(u.stats, c) * Math.max(0, 1 + (u.bonuses.healing ?? 0) + weaponHeal) * suppression * .2), '治疗转盾祝福');
      const repayment = repayHp(b.costs, x.id, result.effective); b.costs = repayment.ledger;
      if (x.id === 'R5-003') x.counters.repayment = Math.min(100, (x.counters.repayment ?? 0) + repayment.repaid / x.stats.hp * 300);
      emit(x.id, passive ? 'PASSIVE_HEAL' : 'SKILL_HEAL', result.nominal, result.effective, `治疗 ${Math.round(result.effective)} · 溢出 ${Math.round(result.overflow)}`);
      if (!passive && result.effective > 0 && u.counters.healEnergyTurn !== u.resource.naturalId && u.id === 'mira') { u.counters.healEnergyTurn = u.resource.naturalId; addEnergy(u, 8); }
      if (!passive && u.id === 'mira' && result.overflow > 0) gainLimited(u, 'overflowHeal', result.overflow * .05 / u.stats.hp * 100, 12);
      if (!passive && result.effective > 0 && u.weapon?.name === '万生药典') grant(x, u, 'weaponFlat', u.stats.hp * .02 * refine(u), b.av);
      if (result.effective > 0 && u.weapon?.name === '星序协响' && passive && !u.counters.fieldWeapon) { grant(x, u, 'damageBonus', .1 * refine(u), b.av, 50); }
      if (repayment.repaid > 0) {
        if (x.weapon?.name === '绝艳蔷薇剑') grant(x, x, 'damageBonus', .15 * refine(x), b.av);
        for (const observer of living(b)) {
          if (observer.id === 'R4-011') gainLimited(observer, `bloodHeal:${x.id}`, .5, .5);
          if (observer.id === 'R4-019') gainLimited(observer, 'bloodHeal', 4, 4);
        }
      }
    }
    if (u.weapon?.name === '星序协响' && passive && sum > 0) u.counters.fieldWeapon = 1;
    if (sum > 0) u.statuses = u.statuses.filter(s => s.key !== 'weaponHeal');
    if (!passive && !derived) registerKind('heal');
    return sum;
  };
  const addShields: SkillContext['shield'] = (coefficients, who = ally, source = 'skill') => {
    for (const x of who === 'all' ? living(b) : [who]) {
      const conditional = u.weapon?.name === '渡厄青铜楫' && x.shields.some(s => s.owner !== u.id) ? .12 * refine(u) : 0;
      const amount = baseAmount(u.stats, coefficients) * (1 + (u.bonuses.shield ?? 0) + statusValue(u, 'weaponShield') + conditional);
      const before = x.shields.reduce((n, s) => n + s.remaining, 0);
      x.shields = addShield(x.shields, { id: `shield:${b.serial++}`, owner: u.id, source, remaining: amount, expires: b.av + x.clock.interval * 2, priority: source === 'inner' ? 1 : 0 }, x.stats.hp, b.av);
      emit(x.id, rootTag, amount, x.shields.reduce((n, s) => n + s.remaining, 0) - before, `施盾 ${Math.round(amount)}`);
    }
    if (!derived && who === 'all' && u.id === 'saber') gainLimited(u, 'shieldTeam', 6, 6);
    if (!derived && u.weapon?.name === '砚雪断锋' && who !== u) grant(u, u, 'followupBonus', .18 * refine(u), b.av);
    if (!derived && u.weapon?.name === '朔雪天衡刃') grant(u, u, 'enhancedFlat', u.stats.attack * refine(u), b.av);
    u.statuses = u.statuses.filter(s => s.key !== 'weaponShield');
    if (!derived) registerKind('shield');
  };
  let registered = false;
  function registerKind(kind: string) {
    if (registered) return;
    registered = true;
    if (!b.actionKinds.includes(kind)) b.actionKinds.push(kind);
    if (u.weapon?.name === '唤风九节笛') { u.strings[`weaponKind:${kind}`] = '1'; if (u.strings['weaponKind:attack'] && (u.strings['weaponKind:heal'] || u.strings['weaponKind:shield'])) { grant(u, u, 'areaBonus', .16 * refine(u), b.av); delete u.strings['weaponKind:attack']; delete u.strings['weaponKind:heal']; delete u.strings['weaponKind:shield']; } }
    if (u.weapon?.name === '泽尔里奇宝石剑' && u.strings.weaponFunction && u.strings.weaponFunction !== kind) grant(u, u, 'ultimateWeapon', .12 * refine(u), b.av);
    u.strings.weaponFunction = kind;
    for (const observer of living(b).filter(x => x.weapon?.name === '问天·白星')) {
      const sequence = (observer.strings.weaponSequence ?? '').split(',').filter(Boolean);
      if (sequence.at(-1) !== u.id) sequence.push(u.id); else sequence.splice(0);
      observer.strings.weaponSequence = sequence.slice(-3).join(',');
      if (new Set(sequence.slice(-3)).size === 3) { grant(observer, observer, 'damageBonus', .16 * refine(observer), b.av); observer.strings.weaponSequence = ''; }
    }
    for (const observer of living(b)) {
      if (observer.id === 'astra' && observer !== u) gainLimited(observer, `relay:${u.id}`, .5, .5, u.resource.naturalId);
      if (observer.id === 'R5-002' && observer !== u && action.command !== 'ultimate') gainLimited(observer, `ensemble:${u.id}`, .5, .5, Math.floor(b.av / 100));
      if (observer.id === 'R4-010' && observer !== u && action.command === 'basic') gainLimited(observer, 'harmony', .25, .5);
      if (observer.id === 'R4-022' && observer !== u && action.command === 'skill') gainLimited(observer, 'noRecordSkill', 3, 9);
      if (observer.id === 'shorekeeper' && observer !== u && observer.resource.locked && action.command !== 'ultimate') gainLimited(observer, 'fieldAction', 3, 12, Math.floor(b.av / 100));
      if (observer.id === 'robin_lovesong' && observer !== u && !observer.resource.locked) gainLimited(observer, 'melodyAction', 2, 6, Math.floor(b.av / 100));
      if (observer.id === 'aventurine_waves' && observer !== u) observer.counters.chips = Math.min(10, (observer.counters.chips ?? 0) + 0.5);
    }
    const conductor = u.statuses.find(s => s.key === 'conductor');
    if (conductor) { const owner = b.units.find(x => x.id === conductor.owner); if (owner) owner.strings[kind] = '1'; conductor.uses = 0; }
    const contract = u.statuses.find(s => s.key === 'contractA');
    if (contract) { const recipient = b.units.find(x => x.id === contract.data); if (recipient) recipient.statuses.push({ key: kind === 'attack' ? 'contractHit' : 'contractRefund', owner: contract.owner, value: 1, duration: { kind: 'av', expires: b.av + 300 }, uses: 1, data: target?.id }); contract.uses = 0; }
  }
  const addDot: SkillContext['dot'] = (coefficients, count, who = target, kind = 'burn') => {
    if (!who || who.hp <= 0) return;
    const dotBonus = u.statuses.find(s => s.key === 'weaponDot' && (s.uses ?? 0) > 0);
    const enhanced = dotBonus ? { ...coefficients, attack: (coefficients.attack ?? 0) + dotBonus.value } : coefficients;
    b.dots = applyDot(b.dots, { id: `${u.id}:${who.id}:${kind}`, owner: u.id, target: who.id, element: kind === 'poison' ? '水' : '火', kind, coefficients: enhanced, weights: Array(count).fill(1) });
    if (dotBonus) dotBonus.uses = 0;
    emit(who.id, rootTag, count, count, `${kind === 'burn' ? '燃烧' : '中毒'} · ${count}次`);
  };
  const triggerReaction = (who: Enemy, element: Element) => {
    const previousAuraOwner = who.counters.auraOwner;
    const result = attach(who.auras, element, who.id, b.av, attachmentBudget, derived); who.auras = result.auras; attachmentBudget = result.budget;
    who.counters.auraOwner = b.units.indexOf(u);
    if (!result.reaction) return;

    if (u.weapon?.name === '听潮幽海螺' && previousAuraOwner !== undefined && previousAuraOwner !== b.units.indexOf(u)) for (const x of living(b)) grant(x, u, 'masteryBonus', 20 * refine(u), b.av, 100, 999);
    for (const observer of living(b).filter(x => x !== u)) { if (observer.id === 'R4-014') gainLimited(observer, 'reaction', .5, 1); if (observer.id === 'rin') gainLimited(observer, 'reaction', .5, .5); }
    const r = result.reaction, base = reactionBase(u.companion.level), low = [...living(b)].sort((a, z) => a.hp / a.stats.hp - z.hp / z.stats.hp)[0];
    emit(who.id, 'REACTION', 0, 0, r.name, 2);
    const amount = base * r.coefficient * masteryMultiplier(u.stats.mastery);
    if (['damage', 'armor', 'dispel'].includes(r.effect)) {
      if (r.effect === 'dispel' && who.shields.length) who.shields.shift();
      else hit({ flat: base * r.coefficient }, 'single', 'reaction', who, r.element);
      if (r.effect === 'armor') addStatus(who, 'extraBreak', 12, { kind: 'av', expires: b.av + 40 }, 1, u.id);
    } else if (r.effect === 'burn' || r.effect === 'poison') {
      b.dots = applyDot(b.dots, { id: `reaction:${u.id}:${who.id}:${r.effect}`, owner: u.id, target: who.id, element: r.element, kind: r.effect, coefficients: { flat: base * r.coefficient }, weights: [1, 1] });
    } else if (r.effect === 'early') { if (b.dots.some(d => d.target === who.id && d.weights.length)) early(false, 1, who); else hit({ flat: base * .7 }, 'single', 'reaction', who, '暗'); }
    else if (r.effect === 'spread') { const d = b.dots.find(d => d.target === who.id && d.kind === 'burn' && d.weights.length); const neighbor = opponents(b).find(e => e.id !== who.id); if (d && neighbor) { const split = spreadDot(d, neighbor.id, `spread:${b.serial++}`); b.dots = [...b.dots.filter(x => x !== d), split.original, split.moved]; const owner = b.units.find(x => x.id === d.owner); if (owner?.weapon?.name === '燎原逆火翎') grant(neighbor, owner, 'dotFlat', owner.stats.attack * .18 * refine(owner), b.av, 100); } else if (!d) hit({ flat: base * .7 }, 'single', 'reaction', who, '风'); }
    else if (r.effect === 'heal' || r.effect === 'move') { if (low) addHealing({ flat: Math.min(amount, r.effect === 'heal' ? u.stats.hp * .06 : Infinity) / Math.max(.01, 1 + (u.bonuses.healing ?? 0)) }, low, true); }
    else if (r.effect === 'shield' || r.effect === 'cleanse') { const x = b.units.find(x => x.id === who.target && x.hp > 0) ?? low; if (x) { const dot = b.dots.find(d => d.target === x.id); if (r.effect === 'cleanse' && dot) b.dots = b.dots.filter(d => d !== dot); else addShields({ flat: Math.min(amount, u.stats.hp * (r.effect === 'shield' ? .07 : .05)) / Math.max(.01, 1 + (u.bonuses.shield ?? 0)) }, x, 'reaction'); } }
    else if (r.effect === 'seed' && low) addStatus(low, 'regen', Math.min(amount, u.stats.hp * .03), { kind: 'target', actor: low.id, expires: low.clock.naturalId + 3 }, 2);
    else if (r.effect === 'bind') { const key = `bind:${Math.floor(b.av / 100)}`; if (!who.counters[key]) { who.counters[key] = 1; if (who.boss) applyBreak(who, 15); else who.clock.due += who.clock.interval * .1; } }
    else if (r.effect === 'light') addStatus(who, 'light', .05, { kind: 'av', expires: b.av + 40 }, 1, u.id);
    else if (r.effect === 'hide') { const x = b.units.find(x => x.id === who.target); if (x) addStatus(x, 'heavyMitigation', .12, { kind: 'av', expires: b.av + 100 }, 1); }
  };
  function applyBreak(who: Enemy, amount: number) {
    const result = breakToughness(who.toughness, amount, b.av); who.toughness = result.toughness;
    if (result.interrupted) {
      if (hasFunctionalSoul(u.companion, 'break') && !u.counters.soulBreakUsed) { u.counters.soulBreakUsed = 1; u.counters.soulBreakReady = 1; u.strings.soulBreakRoot = root.root_id; }
      if (feature(b, 12) && !b.counters[`firstBreak:${b.wave}`]) { b.counters[`firstBreak:${b.wave}`] = 1; b.counters.breakPointReady = 1; }
      who.chargingUntil = 0; b.scheduled = b.scheduled.filter(s => !(s.owner === who.id && s.kind === 'enemy')); who.clock.due += result.delay; who.counters.flaw = Math.min(4, (who.counters.flaw ?? 0) + 1); emit(who.id, rootTag, amount, amount, '韧性击破 · 40AV易伤窗口');
      for (const observer of living(b)) { if (observer.id === 'noctis') gainLimited(observer, 'break', 1, 1); if (observer.id === 'phrolova' && observer !== u) gainLimited(observer, 'break', .5, .5, Math.floor(b.av / 100)); }
      if (u.id === 'gilgamesh') gainLimited(u, 'break', .5, .5, Math.floor(b.av / 100));
      if (u.weapon?.name === '葬神残月镰') for (const x of living(b)) grant(x, u, 'damageBonus', .1 * refine(u), b.av, 40);
    }
  }
  let activePackets = 0;
  const hit: SkillContext['hit'] = (coefficients, shape: Shape = 'single', channel: DamageOptions['channel'] = 'direct', who = target, element = u.design.element as Element, breakAmount) => {
    if (!who || who.hp <= 0) return 0;
    let sum = 0;
    const active = channel === 'direct' && !derived;
    const soulBoost = active && activePackets++ === 0 && u.counters.soulBreakReady && u.strings.soulBreakRoot !== root.root_id ? .08 : 0;
    if (soulBoost) u.counters.soulBreakReady = 0;
    const bonusKey = channel === 'followup' ? 'followupBonus' : channel === 'replay' ? 'replayBonus' : 'damageBonus';
    for (const slot of targets(shape, who.id, b.enemies)) {
      const x = b.enemies.find(x => x.id === slot.id)!;
      const reduction = Math.min(.5, statusValue(x, 'defenseDown'));
      const historical = x.statuses.find(s => s.key === 'historicalDefense');
      const effectiveDefense = historical ? Math.min(x.stats.defense * (1 - reduction), Math.max(x.stats.defense * .5, x.stats.defense * (1 - reduction) - x.stats.defense * .2, historical.value)) : x.stats.defense;
      let weaponBonus = 0;
      if (active && u.weapon?.name === '终夜裁衡' && (x.chargingUntil > b.av || x.toughness.brokenUntil > b.av)) weaponBonus = .14;
      if (active && u.weapon?.name === '不妄月镜' && x.name !== '标准木桩') weaponBonus = .14;
      if (active && u.weapon?.name === '绝命双短刃' && x.hp / x.maxHp < u.hp / u.stats.hp) weaponBonus = .15;
      if (active && u.weapon?.name === '天地乖离·乖离剑Ea' && action.command === 'ultimate' && ultimateCost(u, action.option) >= u.resource.rule.capacity * 2 / 3) weaponBonus = .16;
      if (channel === 'followup' && u.weapon?.name === '幽冥的忘忧章' && u.counters.orders > 0) weaponBonus = .16;
      const amount = damage({ ...u.stats, mastery: u.stats.mastery + statusValue(u, 'masteryBonus') }, coefficients, { defense: effectiveDefense, reduction: historical ? 0 : reduction, resistance: x.weaknesses.includes(element) ? 0 : .1, resistanceReduction: statusValue(x, 'light'), broken: x.toughness.brokenUntil > b.av, vulnerability: statusValue(x, 'vulnerability'), mitigation: (x.counters.armor > 0 ? .2 : 0) + (x.name === '覆天古主' ? Math.min(.3, opponents(b).filter(e => e.name === '共生近卫').length * .15) : 0) }, { channel, damageBonus: (u.bonuses.damage ?? 0) + soulBoost + statusValue(u, bonusKey) + weaponBonus * refine(u) + (active ? statusValue(u, 'bloodBoost') + (shape === 'all' ? statusValue(u, 'areaBonus') : 0) + (action.command === 'ultimate' ? statusValue(u, 'ultimateWeapon') : 0) : 0) }) * slot.coefficient;
      const result = absorb(x.shields, amount, x.hp, b.av); x.shields = result.shields; x.hp = result.hp; sum += result.loss;
      if (result.ledger.some(s => s.broken)) {
        if (feature(b, 4) && once(b, 'protection')) { const low = [...living(b)].sort((a, z) => a.hp / a.stats.hp - z.hp / z.stats.hp)[0]; if (low) equipmentShield(b, low, low.stats.hp * .08, '拆盾祝福'); }
        if (feature(b, 10) && channel !== 'dot') { const dotTarget = b.dots.some(d => d.target === x.id && d.weights.length) ? x : opponents(b).find(e => b.dots.some(d => d.target === e.id && d.weights.length)); if (dotTarget) early(false, 1, dotTarget); }
      }
      emit(x.id, channel === 'direct' ? rootTag : channel === 'followup' ? 'FOLLOW_UP' : channel === 'replay' ? 'REPLAY' : channel === 'dot' ? rootTag === 'DOT_NATURAL' ? 'DOT_NATURAL' : 'DOT_EARLY' : channel === 'reaction' ? 'REACTION' : 'FOLLOW_UP', amount, result.loss, `${x.name} −${Math.round(result.loss)}`, channel === 'reaction' ? 2 : 1);
      if (active) {
        registerKind('attack');
        if (u.weapon?.name === '余烬猎弓' && action.command === 'basic' && b.dots.some(d => d.owner === u.id && d.target === x.id && d.kind === 'burn')) grant(u, u, 'weaponDot', .12 * refine(u), b.av);
        if (u.id === 'R5-005' && x.name !== '标准木桩') gainLimited(u, 'visibleIntent', .5, .5);
        if (feature(b, 9) && x.chargingUntil > b.av && x.chargingUntil - b.av <= 10 && once(b, 'countdown')) addEnergy(u, u.resource.rule.cost * .05, true);
        if (x.counters.armor > 0) {
          x.counters.armor--;
          if (feature(b, 7) && action.command === 'basic') u.counters.armorBreakReady = 1;
          if (feature(b, 4) && once(b, 'protection')) { const low = [...living(b)].sort((a, z) => a.hp / a.stats.hp - z.hp / z.stats.hp)[0]; if (low) equipmentShield(b, low, low.stats.hp * .08, '拆甲祝福'); }
        }
        if (!breakTargets.has(x.id) && baseAmount(u.stats, coefficients) > 0) {
          const extra = x.statuses.find(s => s.key === 'extraBreak' && s.data !== u.id);
          const base = breakAmount ?? (action.command === 'basic' ? 10 : action.command === 'skill' ? 20 : 30);
          let amount = base * (x.weaknesses.includes(element) ? 1.25 : 1) * (1 + (u.bonuses.toughness ?? 0) + statusValue(x, 'breakBonus'));
          const otherBoss = feature(b, 18) && x.boss && x.toughness.brokenUntil > b.av && !b.counters[`split:${x.id}:${x.toughness.brokenUntil}`] ? opponents(b).find(e => e.boss && e !== x && e.toughness.value > 0) : undefined;
          if (otherBoss) { b.counters[`split:${x.id}:${x.toughness.brokenUntil}`] = 1; applyBreak(otherBoss, amount * .3); amount *= .7; }
          if (hasFunctionalSoul(u.companion, 'opening') && u.counters.soulOpeningWave !== b.wave + 1) { u.counters.soulOpeningWave = b.wave + 1; amount += 10; }
          if (feature(b, 7) && action.command === 'skill' && u.counters.armorBreakReady) { amount += 8; u.counters.armorBreakReady = 0; }
          applyBreak(x, amount + (extra?.value ?? 0));
          if (extra) extra.uses = 0;
          x.statuses = x.statuses.filter(s => s.key !== 'breakBonus'); breakTargets.add(x.id);
        }
        const mark = x.statuses.find(s => s.key === 'medicineMark' && (s.uses ?? 0) > 0);
        if (mark && u.counters.medicineTurn !== u.resource.naturalId) { u.counters.medicineTurn = u.resource.naturalId; const value = Math.min(u.stats.hp - u.hp, mark.value); u.hp += value; mark.uses!--; emit(u.id, 'PASSIVE_HEAL', mark.value, value, '药印治疗'); const owner = b.units.find(x => x.id === mark.owner); if (owner?.id === 'R4-029') gainLimited(owner, 'medicineMark', .5, 1.5, Math.floor(b.av / 100)); }
        const siege = x.statuses.find(s => s.key === 'siege');
        if (siege && !x.counters[`siege:${u.id}:${siege.owner}`]) { const owner = b.units.find(x => x.id === siege.owner); if (owner) { const window = `siegeTotal:${Math.floor(b.av / 100)}`, cap = owner.companion.constellation >= 3 ? 24 : 20; const amount = Math.min(siege.value, cap - (owner.counters[window] ?? 0)); if (amount > 0) { applyBreak(x, amount); owner.counters[window] = (owner.counters[window] ?? 0) + amount; gainLimited(owner, 'siege', 4, 12); } } x.counters[`siege:${u.id}:${siege.owner}`] = 1; }
        if (action.command === 'skill') bossHit(b, x, u);
        if (x.hp > 0) triggerReaction(x, element);
      }
      if (x.hp <= 0) {
        if (feature(b, 3) && x.name === '自爆藤灵' && once(b, 'vineCleanse')) for (const ally of living(b)) cleanse(b, ally, ['enemyPoison', 'poison', 'burn'], 1);
        for (const observer of living(b)) { if (observer.id === 'noctis') gainLimited(observer, 'kill', .5, .5); if (observer.id === 'R4-015') gainLimited(observer, 'kill', .25, .25); if (observer.id === 'R4-030') gainLimited(observer, 'kill', 4, 8, Math.floor(b.av / 100)); }
        b.scheduled = b.scheduled.filter(s => !(s.owner === x.id && s.kind === 'enemy'));
        for (const owner of b.units) owner.defenseRecords = owner.defenseRecords.filter(r => r.target !== x.id);
        if (x.name === '自爆藤灵') { const boss = opponents(b).find(e => e.boss); if (boss && (b.counters.vineTotal ?? 0) < .06 && (b.counters[`vine:${Math.floor(b.av / 100)}`] ?? 0) < 3) { const lost = Math.min(boss.hp, boss.maxHp * .01); boss.hp -= lost; b.counters.vineTotal = (b.counters.vineTotal ?? 0) + .01; b.counters[`vine:${Math.floor(b.av / 100)}`] = (b.counters[`vine:${Math.floor(b.av / 100)}`] ?? 0) + 1; } }
        if (x.name === '镜影') for (const boss of opponents(b).filter(e => e.name === '无相天君')) boss.statuses.push({ key: 'vulnerability', owner: x.id, value: .2, duration: { kind: 'av', expires: b.av + 40 } });
        if (x.name === '蓄能窃贼') for (const owner of b.units) { const stolen = x.counters[`stolen:${owner.id}`] ?? 0; owner.resource.value = Math.min(owner.resource.rule.capacity, owner.resource.value + stolen * .5); }
      } else if (x.hp / x.maxHp < .5 && !x.counters.halfLife) {
        x.counters.halfLife = 1; for (const observer of living(b).filter(x => x.id === 'R4-015')) gainLimited(observer, `half:${x.id}`, .5, .5, 0);
      }
    }
    if (active && action.command === 'ultimate') for (const archer of living(b).filter(x => x.id === 'archer' && x !== u)) gainLimited(archer, 'allyUltimate', .25, .5);
    if (active && action.command === 'skill' && coefficients.attack && !coefficients.hp && !coefficients.defense) {
      for (const observer of living(b).filter(x => x.id === 'selene' && x.id !== u.id)) {
        observer.records = recordSkill(observer.records, { id: root.event_id, owner: u.id, coefficient: coefficients.attack, element, shape, locked: false }, coefficients, 'skill', root);
        const key = `record:${u.id}:${u.resource.naturalId}`; if (!observer.counters[key]) { observer.counters[key] = 1; addEnergy(observer, 1); }
      }
    }
    return sum;
  };
  const early: SkillContext['early'] = (ownerOnly, count, who = target) => {
    const d = b.dots.find(d => d.target === who.id && (!ownerOnly || d.owner === u.id) && d.weights.length);
    if (!d) return;
    const owner = b.units.find(x => x.id === d.owner); if (!owner) return;
    for (let i = 0; i < count && d.weights.length && who.hp > 0; i++) {
      const next = tickDot(d, u.id === 'cantarella' || !ownerOnly && action.command !== 'ultimate' ? .7 : 1); d.weights = next.dot.weights;
      const amount = damage(owner.stats, d.coefficients, { defense: who.stats.defense, resistance: who.weaknesses.includes(d.element) ? 0 : .1, reduction: statusValue(who, 'defenseDown'), broken: who.toughness.brokenUntil > b.av }, { channel: 'dot', damageBonus: owner.bonuses.damage }) * next.multiplier;
      const result = absorb(who.shields, amount, who.hp, b.av); who.hp = result.hp; who.shields = result.shields;
      emit(who.id, 'DOT_EARLY', amount, result.loss, `提前结算${d.kind === 'burn' ? '燃烧' : '中毒'} · 扣除1次`);
    }
    b.dots = b.dots.filter(d => d.weights.length > 0);
  };
  const schedule: SkillContext['schedule'] = (delay, coefficients, shape = 'single', kind = 'attack', who = target.id) => {
    b.scheduled.push({ id: `scheduled:${b.serial++}`, owner: u.id, target: who, at: b.av + delay, kind, coefficients, shape, channel: 'followup', retarget: true });
  };
  return { b, u, target, ally, second, action, hit, heal: addHealing, shield: addShields, status: addStatus, dot: addDot, early, energy: addEnergy, schedule };
}

function bossHit(b: Battle, enemy: Enemy, unit: Unit) {
  const key = `hit:${unit.id}`; enemy.counters[key] = 1;
  const distinct = Object.keys(enemy.counters).filter(k => k.startsWith('hit:')).length;
  if (distinct < 2) return;
  for (const key of Object.keys(enemy.counters).filter(k => k.startsWith('hit:'))) delete enemy.counters[key];
  if (enemy.name === '苍穹暴风领主') enemy.counters.wall = Math.max(0, enemy.counters.wall - 1);
  if (enemy.name === '焚界龙骸') enemy.counters.heat = Math.max(0, enemy.counters.heat - 1);
  if (['迟滞命轮', '蓄力术士', '残照刑天'].includes(enemy.name) && enemy.chargingUntil > b.av) {
    enemy.chargingUntil = 0; b.scheduled = b.scheduled.filter(s => !(s.owner === enemy.id && s.kind === 'enemy'));
    enemy.counters.flaw = Math.min(4, (enemy.counters.flaw ?? 0) + 2);
    log(b, unit.id, enemy.id, 'NORMAL_ACTION', 0, 0, '两名角色战技命中 · 蓄力打断');
  }
}
function phases(b: Battle) {
  if (b.encounterId.startsWith('story:') && Number(b.encounterId.split('-')[1]) < 4) return;
  for (const e of [...opponents(b)].filter(e => e.boss)) {
    const threshold = e.name === '苍穹暴风领主' ? .6 : e.name === '枯荣司祭' ? .4 : e.name === '残照刑天' ? .35 : .5;
    if (e.phase || e.hp / e.maxHp >= threshold) continue;
    e.phase = 1;
    if (e.name === '苍穹暴风领主') { e.counters.wall = 2; spawn(b, '风向斥候', 9500); }
    if (e.name === '枯荣司祭') spawn(b, '药罐', 6000);
    if (e.name === '无相天君' && opponents(b).filter(x => x.name === '镜影').length < 2) spawn(b, '镜影', 12000);
    log(b, e.id, 'all', 'NORMAL_ACTION', 0, 0, `${e.name}进入第二阶段`);
  }
}
export function applyEnemyStatus(b: Battle, u: Unit, status: Status) {
  const resistance = Math.min(.6, (u.bonuses.resistance ?? 0) + (b.av < 100 && hasFunctionalSoul(u.companion, 'resist') ? .2 : 0));
  const roll = ((Math.imul(b.serial++, 1664525) + Math.imul(Math.floor(b.av * 100), 1013904223)) >>> 0) / 4294967296;
  if (roll < resistance) { log(b, u.id, u.id, 'EQUIPMENT', 0, 0, '抵抗敌方状态'); return; }
  u.statuses.push(status);
}
function enemyDamage(b: Battle, enemy: Enemy, coefficient: number, shape: Shape, targetId: string, heavy = false) {
  if (enemy.hp <= 0) return;
  const all = living(b), selected = all.find(u => u.id === targetId) ?? all[0]; if (!selected) return;
  if (heavy && b.blessing === 'safety' && !b.counters.safety && b.encounterId.startsWith('tower:')) {
    b.counters.safety = 1; for (const x of all) x.shields = addShield(x.shields, { id: `safety:${x.id}`, owner: x.id, source: 'blessing', remaining: x.stats.hp * .08, expires: b.av + 100 }, x.stats.hp, b.av);
  }
  const hitUnits = shape === 'all' ? all : [selected];
  const enemyRoot = log(b, enemy.id, selected.id, 'NORMAL_ACTION', 0, 0, `${enemy.name} · ${heavy ? '预告重击' : shape === 'all' ? '群体攻击' : '点名攻击'}`);
  for (let x of hitUnits) {
    const intercept = x.statuses.find(s => s.key === 'intercept');
    if (shape === 'single' && intercept) { const protector = all.find(u => u.id === intercept.data); if (protector) { intercept.uses = 0; x = protector; } }
    const decoy = x.statuses.find(s => s.key === 'decoy');
    if (shape === 'single' && decoy) { const owner = all.find(u => u.id === decoy.data); if (owner && owner.counters.decoy > 0) { const amount = damage(enemy.stats, { attack: coefficient }, { defense: owner.stats.defense }); const lost = Math.min(owner.counters.decoy, amount); owner.counters.decoy -= lost; decoy.uses = 0; log(b, enemy.id, owner.id, 'NORMAL_ACTION', amount, lost, '替身承接点名', enemyRoot.root_id, enemyRoot.event_id, 1); continue; } }
    const reduction = statusValue(x, 'mitigation') + (heavy ? statusValue(x, 'heavyMitigation') : 0) + (shape === 'all' ? statusValue(x, 'areaMitigation') : 0);
    let amount = damage(enemy.stats, { attack: coefficient * (1 - statusValue(enemy, 'attackDownOnce')) }, { defense: x.stats.defense, mitigation: reduction });
    if (heavy && enemy.name === '苍穹暴风领主' && !enemy.counters.wall) amount *= .5;
    const save = x.statuses.find(s => s.key === 'lifesave' && (s.uses ?? 0) > 0);
    if (save && amount >= x.hp + x.shields.reduce((n, s) => n + s.remaining, 0)) { amount = x.hp - 1 + x.shields.reduce((n, s) => n + s.remaining, 0); save.uses = 0; const owner = b.units.find(u => u.id === save.owner); if (owner) owner.counters.saves = (owner.counters.saves ?? 0) + 1; }
    const result = absorb(x.shields, amount, x.hp, b.av); x.shields = result.shields;
    let loss = result.loss + result.overkill;
    const buffer = x.statuses.find(s => s.key === 'buffer');
    if (buffer) { const deferred = deferDamage(b.debts, { id: `debt:${b.serial++}`, owner: buffer.owner, target: x.id, remaining: 0, due: x.clock.due }, loss, .25, x.stats.hp * .2); b.debts = deferred.debts; loss = deferred.immediate; }
    const share = x.statuses.find(s => s.key === 'share' && s.data !== x.id);
    if (share) { const owner = all.find(u => u.id === share.data); if (owner) { const transferred = loss * .25; loss -= transferred; const deferred = deferDamage(b.debts, { id: `debt:${b.serial++}`, owner: owner.id, target: owner.id, remaining: 0, due: owner.clock.due }, transferred, .4, owner.stats.hp * .2); b.debts = deferred.debts; owner.hp = Math.max(0, owner.hp - deferred.immediate); } }
    x.hp = Math.max(0, x.hp - loss);
    if (x.hp > 0 && x.hp < x.stats.hp * .35 && hasFunctionalSoul(x.companion, 'rescue') && !x.counters.soulRescueUsed) { x.counters.soulRescueUsed = 1; equipmentShield(b, x, x.stats.hp * .08, '防守魂'); }
    if (x.hp / x.stats.hp < .4 && loss > 0) x.counters.woundedAt = b.av;
    log(b, enemy.id, x.id, 'NORMAL_ACTION', amount, loss, `${x.name} −${Math.round(loss)} · 盾吸收${Math.round(result.ledger.reduce((n, s) => n + s.absorbed, 0))}`, enemyRoot.root_id, enemyRoot.event_id, 1);
    for (const absorbed of result.ledger) {
      const owner = all.find(u => u.id === absorbed.owner); if (!owner) continue;
      log(b, owner.id, x.id, 'SHIELD_ABSORB', absorbed.absorbed, absorbed.absorbed, '护盾实际吸收', enemyRoot.root_id, enemyRoot.event_id, 1);
      if (owner.id === 'alden') gainLimited(owner, 'absorbed', absorbed.absorbed / owner.stats.hp * 200, 12, Number(enemyRoot.event_id.split(':')[1]));
      if (owner.id === 'xuanzhao') { const rootKey = `shieldRoot:${enemyRoot.event_id}`, used = owner.counters[rootKey] ?? 0; const amount = Math.min(16 - used, absorbed.absorbed / owner.stats.hp * 200); owner.counters[rootKey] = used + amount; gainLimited(owner, 'shieldAV', amount, 32, Math.floor(b.av / 100)); }
      if (heavy && x.statuses.some(s => s.key === 'warehouse' && s.data === owner.id)) owner.counters.warehouse = warehouseGain(owner.counters.warehouse ?? 0, absorbed.absorbed, owner.stats.hp);
      if (owner.id === 'aventurine_waves') owner.counters.chips = Math.min(10, (owner.counters.chips ?? 0) + 1);
      if (owner.id === 'saber' && heavy) owner.counters.swordLight = Math.min(3, (owner.counters.swordLight ?? 0) + 1);
      if (absorbed.broken) for (const frost of all.filter(u => u.id === 'R4-009')) {
        gainLimited(frost, 'broken', .5, 1);
        if (frost.counters.frostTurn !== frost.resource.naturalId) { frost.counters.frostTurn = frost.resource.naturalId; const amount = damage(frost.stats, { attack: frost.companion.constellation >= 3 ? 1 : .75 }, { defense: enemy.stats.defense, resistance: .1 }, { channel: 'followup' }); enemy.hp = Math.max(0, enemy.hp - amount); }
      }
      const hot = x.statuses.find(s => s.key === 'hotShield' && s.owner === owner.id);
      if (hot && !owner.counters[`hot:${enemyRoot.event_id}`]) { owner.counters[`hot:${enemyRoot.event_id}`] = 1; b.dots = applyDot(b.dots, { id: `${owner.id}:${enemy.id}:burn`, owner: owner.id, target: enemy.id, kind: 'burn', element: '火', coefficients: { attack: hot.value }, weights: [1] }); }
    }
    if (heavy && result.ledger.length > 0 && x.statuses.some(s => ['guarded', 'warehouse', 'parry'].includes(s.key))) {
      x.counters.guardedAt = b.av; if (enemy.name === '苍穹暴风领主') enemy.counters.wall = Math.max(0, enemy.counters.wall - 1);
      for (const observer of all) { if (observer.id === 'R5-001') gainLimited(observer, `guardAV`, .5, 1.5, Math.floor(b.av / 100)); if (observer.id === 'R4-017') gainLimited(observer, 'guard', .5, 1); if (observer.id === 'jingxuan') gainLimited(observer, 'guard', .5, .5, Number(enemyRoot.event_id.split(':')[1])); }
    }
    if (x.id === 'R4-026') gainLimited(x, 'attacked', 5, 15);
    if (x.hp / x.stats.hp < .4 && loss > 0) for (const observer of all.filter(u => u.id === 'R4-030')) gainLimited(observer, `wounded:${x.id}`, 6, 6, Math.floor(b.av / 100));
    const parry = x.statuses.find(s => s.key === 'parry' && (s.uses ?? 0) > 0);
    if (heavy && parry && x.hp > 0 && result.ledger.length) { const amount = damage(x.stats, { defense: parry.value }, { defense: enemy.stats.defense, resistance: .1 }, { channel: 'followup' }); enemy.hp = Math.max(0, enemy.hp - amount); parry.uses = 0; log(b, x.id, enemy.id, 'FOLLOW_UP', amount, amount, '架盾反击', enemyRoot.root_id, enemyRoot.event_id, 2); }
    const medicine = x.statuses.find(s => s.key === 'medicine' && (s.uses ?? 0) > 0);
    if (medicine && x.hp > 0 && loss > 0) { const healed = Math.min(x.stats.hp - x.hp, medicine.value); x.hp += healed; medicine.uses = 0; log(b, medicine.owner, x.id, 'PASSIVE_HEAL', medicine.value, healed, '备用药伤后回补', enemyRoot.root_id, enemyRoot.event_id, 2); }
    for (const s of x.statuses.filter(s => s.key === 'mitigation' || heavy && s.key === 'heavyMitigation' || shape === 'all' && s.key === 'areaMitigation')) if (s.uses !== undefined) s.uses--;
  }
  enemy.statuses = enemy.statuses.filter(s => s.key !== 'attackDownOnce');
}
function naturalDots(b: Battle, enemy: Enemy) {
  for (const d of b.dots.filter(d => d.target === enemy.id && d.weights.length)) {
    const owner = b.units.find(u => u.id === d.owner); if (!owner) continue;
    const next = tickDot(d); d.weights = next.dot.weights;
    const amount = damage(owner.stats, d.coefficients, { defense: enemy.stats.defense, reduction: statusValue(enemy, 'defenseDown'), resistance: enemy.weaknesses.includes(d.element) ? 0 : .1, broken: enemy.toughness.brokenUntil > b.av }, { channel: 'dot', damageBonus: owner.bonuses.damage }) * next.multiplier;
    const result = absorb(enemy.shields, amount, enemy.hp, b.av); enemy.shields = result.shields; enemy.hp = result.hp;
    log(b, owner.id, enemy.id, 'DOT_NATURAL', amount, result.loss, `${d.kind === 'burn' ? '燃烧' : '中毒'}自然结算 · 剩余${d.weights.length}次`);
    if (result.loss > 0) {
      if (owner.id === 'kael' && d.kind === 'burn') gainLimited(owner, 'dot', .5, .5);
      if (owner.id === 'R4-012' && d.kind === 'burn') gainLimited(owner, 'dot', .5, 1);
      if (owner.id === 'R5-004' && d.kind === 'burn') gainLimited(owner, 'dot', 4, 12);
      if (owner.id === 'cantarella' && d.kind === 'poison') gainLimited(owner, 'dot', .25, .5);
      if (d.kind === 'burn') for (const fire of living(b).filter(u => u.id === 'yanhuang' && !u.counters.form)) gainLimited(fire, 'dot', 3, 9);
    }
  }
  b.dots = b.dots.filter(d => d.weights.length > 0);
}
function enemyTurn(b: Battle, e: Enemy) {
  for (const needle of e.statuses.filter(s => s.key === 'needle')) { const owner = b.units.find(u => u.id === needle.owner); if (owner) { const amount = damage(owner.stats, { attack: needle.value }, { defense: e.stats.defense, resistance: .1 }, { channel: 'followup' }); const lost = Math.min(e.hp, amount); e.hp -= lost; log(b, owner.id, e.id, 'FOLLOW_UP', amount, lost, '伏击引针'); } }
  e.statuses = e.statuses.filter(s => s.key !== 'needle');
  naturalDots(b, e); if (e.hp <= 0) return;
  const units = living(b); if (!units.length) return;
  const target = units.find(u => u.id === e.target) ?? units[e.clock.naturalId % units.length]; e.target = target.id;
  const step = e.clock.naturalId % 3;
  if (e.boss) {
    const index = V2_BOSSES.findIndex(x => x.name === e.name);
    const patterns = [[1.1, .7, 1.6], [.9, .65, 1.5], [1.05, .75, 1.55], [1.15, .8, 1.2], [1.1, .7, 1.45], [1.25, .65, 2], [.9, .6, 1.35], [1.2, .75, 1.5]];
    if (step === 2 || index === 6 && step === 1) {
      const wait = index === 1 ? 20 : [2, 5, 6, 7].includes(index) ? 30 : 25;
      e.intent = 'charge'; e.chargingUntil = b.av + wait;
      b.scheduled.push({ id: `enemy-action:${b.serial++}`, owner: e.id, target: target.id, at: e.chargingUntil, kind: 'enemy', coefficients: { attack: patterns[index][2] }, shape: index === 5 ? 'single' : 'all', heavy: true });
      log(b, e.id, target.id, 'NORMAL_ACTION', wait, wait, `${e.name}预告：${wait}AV后${index === 5 ? `重击${target.name}` : '群体重击'}；两名角色战技或破韧可拆招`);
    } else { e.intent = step === 0 ? 'single' : 'all'; enemyDamage(b, e, patterns[index][step], step === 0 ? 'single' : 'all', target.id); }
    if (index === 4 && step === 1 && opponents(b).filter(x => x.name === '镜影').length < (e.phase ? 2 : 1)) spawn(b, '镜影', 12000);
    if (index === 1 && step === 1 && !opponents(b).some(x => x.name === '泡盾术士')) spawn(b, '泡盾术士', 12000);
  } else {
    switch (e.name) {
      case '标准木桩': break;
      case '援护医师': { const recipient = [...opponents(b)].sort((a, z) => a.hp / a.maxHp - z.hp / z.maxHp)[0]; if ((e.counters.heals ?? 0) < 2 && recipient.hp < recipient.maxHp) { const healed = Math.min(recipient.maxHp - recipient.hp, recipient.maxHp * .03, recipient.boss ? 6000 : Infinity); recipient.hp += healed; e.counters.heals = (e.counters.heals ?? 0) + 1; log(b, e.id, recipient.id, 'SKILL_HEAL', healed, healed, '敌方治疗'); } else enemyDamage(b, e, .8, 'single', target.id); break; }
      case '泡盾术士': { const boss = opponents(b).find(x => x.boss); if (boss && !boss.shields.length) { boss.shields = addShield(boss.shields, { id: `enemy-shield:${b.serial++}`, owner: e.id, source: 'bubble', remaining: 8000, expires: b.av + 100 }, boss.maxHp, b.av); } else enemyDamage(b, e, .8, 'single', target.id); break; }
      case '巡游幻蝶': enemyDamage(b, e, .75, 'single', [...units].sort((a, z) => z.hp - a.hp)[0].id); if (e.clock.naturalId >= 1 && !e.counters.split && opponents(b).filter(x => x.name === e.name).length < 4) { e.counters.split = 1; spawn(b, e.name, e.maxHp / 2); b.enemies[b.enemies.length - 1].counters.split = 1; } break;
      case '蓄力术士': e.intent = 'charge'; e.chargingUntil = b.av + 25; b.scheduled.push({ id: `enemy-action:${b.serial++}`, owner: e.id, target: target.id, at: e.chargingUntil, kind: 'enemy', coefficients: { attack: 1.6 }, shape: 'single', heavy: true }); break;
      case '计时机偶': { const next = [...units].sort((a, z) => a.clock.due - z.clock.due)[0]; next.clock.due += 5; enemyDamage(b, e, .75, 'single', target.id); break; }
      case '毒雾使者': enemyDamage(b, e, .6, 'all', target.id); applyEnemyStatus(b, target, { key: 'enemyPoison', owner: e.id, value: e.stats.attack * .35, uses: 2, duration: { kind: 'target', actor: target.id, expires: target.clock.naturalId + 3 } }); break;
      case '自爆藤灵': enemyDamage(b, e, 1.1, 'all', target.id); e.hp = 0; break;
      case '风向斥候': for (const other of opponents(b)) if (other !== e && !other.boss) other.target = target.id; enemyDamage(b, e, .65, 'single', target.id); break;
      case '蓄能窃贼': { const hp = target.hp; enemyDamage(b, e, .8, 'single', target.id); if (target.hp < hp) { const stolen = target.resource.value * .1; target.resource.value -= stolen; bankLostEnergy(b, target, stolen); e.counters[`stolen:${target.id}`] = (e.counters[`stolen:${target.id}`] ?? 0) + stolen; } break; }
      default: enemyDamage(b, e, e.name === '重铠侍卫' ? 1.1 : 1, 'single', target.id);
    }
  }
  e.clock = completeNatural(e.clock, b.av);
}
export function actionError(b: Battle, action: Action): string | undefined {
  const u = b.units.find(u => u.id === action.actor);
  if (b.outcome !== 'playing') return '战斗已结束';
  if (!u || u.hp <= 0) return '该角色无法行动';
  if (action.command !== 'ultimate' && b.active !== u.id) return '尚未轮到该角色的自然行动';
  if (statusValue(u, 'control') > 0) return '角色受到控制';
  if (!b.enemies.some(e => e.id === action.enemy && e.hp > 0)) return '请选择存活敌人';
  if (!b.units.some(e => e.id === action.ally && e.hp > 0)) return '请选择存活队友';
  if (action.command === 'skill' && b.points.value < (u.id === 'gilgamesh' && action.option === 'reload' ? 2 : 1)) return '战技点不足';
  if (action.command === 'ultimate') {
    if (!canUltimate(u.resource, b.av)) return u.resource.locked ? '形态或预约尚未结束' : '能量不足，或尚未完成下一次自然行动／10AV间隔';
    const cost = ultimateCost(u, action.option);
    if (cost > u.resource.value) return '所选档位能量不足';
  }
  if (action.command === 'skill' && ['siming', 'xinyuehu'].includes(u.id) && action.ally === action.secondAlly) return '请选择两名不同队友';
  if (u.id === 'siming' && action.command !== 'basic' && (action.ally === u.id || action.secondAlly === u.id)) return '不能调度正在结算的自己';
  return undefined;
}
function ultimateCost(u: Unit, option?: string) {
  if (u.id === 'gilgamesh') return ['2', '4', '6'].includes(option ?? '') ? Number(option) : 2;
  if (u.id === 'R5-008' && option === 'fast') return 120;
  if (u.id === 'R5-004' && option === '120') return 120;
  if (u.id === 'R4-020' && option === '80') return 80;
  return u.resource.rule.cost;
}
export function act(current: Battle, action: Action): Battle {
  const error = actionError(current, action); if (error) return current;
  const b = structuredClone(current), u = b.units.find(u => u.id === action.actor)!;
  const natural = action.command !== 'ultimate';
  if (natural) { u.resource = beginNatural(u.resource); u.clock.naturalId++; }
  if (action.command === 'skill') { b.points = spendPoint(b.points); if (u.id === 'gilgamesh' && action.option === 'reload') b.points = spendPoint(b.points); }
  if (!natural) { const heat = u.resource.value; u.resource = payUltimate(u.resource, b.av, ultimateCost(u, action.option)); if (u.id === 'yanhuang') u.resource.value = heat; }
  const logStart = b.log.length;
  const ctx = emitContext(b, action);
  const costsBefore = b.costs.length;
  if (natural) {
    for (const regen of u.statuses.filter(s => s.key === 'regen' && (s.uses ?? 0) > 0)) { ctx.heal({ flat: regen.value / Math.max(.01, 1 + (u.bonuses.healing ?? 0)) }, u, true); regen.uses!--; }
    for (const poison of u.statuses.filter(s => s.key === 'enemyPoison' && (s.uses ?? 0) > 0)) { const lost = Math.min(u.hp, poison.value * 1000 / (1000 + u.stats.defense)); u.hp -= lost; poison.uses!--; log(b, poison.owner, u.id, 'DOT_NATURAL', lost, lost, '中毒自然结算'); }
    if (u.counters.form > 0) { if (u.resource.value < 25) { u.counters.form = 0; u.resource.locked = false; } else u.resource.value -= 25; }
  }
  if (u.hp > 0) {
    const boost = u.statuses.find(s => s.key === 'bloodBoost');
    if (boost && action.command === 'skill') { const requested = u.hp * .05, paid = Math.min(requested, Math.max(0, u.hp - 1)); u.hp -= paid; b.costs.push({ id: `hp:${b.serial++}`, owner: u.id, paid, remaining: paid }); }
    executeSkill(withConstellations(ctx));
    for (const cost of b.costs.slice(costsBefore)) {
      log(b, cost.owner, cost.owner, 'HP_COST', cost.paid, cost.paid, `主动生命费用 ${Math.round(cost.paid)}`);
      if (u.id === 'R5-003') gainLimited(u, 'hpCost', cost.paid / u.stats.hp * 300, 24);
      if (u.weapon?.name === '惊梦描金扇') grant(u, u, 'damageBonus', .16 * refine(u), b.av);
      for (const observer of living(b)) { if (observer.id === 'R4-011') gainLimited(observer, `bloodCost:${u.id}`, .5, .5); if (observer.id === 'R4-019') gainLimited(observer, 'bloodCost', 4, 12); }
    }
    const extra = u.statuses.find(s => s.key === 'weaponFlat' && (s.uses ?? 0) > 0);
    if (extra && b.log.slice(logStart).some(e => e.source_actor === u.id && e.amount > 0 && b.enemies.some(x => x.id === e.target))) { ctx.hit({ flat: extra.value }, 'single', 'warehouse'); extra.uses = 0; }
    const chorus = u.statuses.find(s => s.key === 'chorus' && (s.uses ?? 0) > 0);
    if (chorus && action.command === 'basic') { const owner = b.units.find(x => x.id === chorus.owner); if (owner) ctx.hit({ flat: owner.stats.attack * chorus.value }, 'single', 'followup'); chorus.uses = 0; }
    const contract = u.statuses.find(s => s.key === 'contractHit' && (s.uses ?? 0) > 0 && s.data === action.enemy);
    if (contract) { const owner = b.units.find(x => x.id === contract.owner); if (owner) { ctx.hit({ flat: owner.stats.attack * (owner.companion.constellation >= 3 ? 1.25 : 1) }, 'single', 'followup'); gainLimited(owner, 'contractB', 8, 8); } contract.uses = 0; }
    const refund = u.statuses.find(s => s.key === 'contractRefund' && (s.uses ?? 0) > 0);
    if (refund && action.command === 'skill') { b.points = gainPoints(b.points, 1, b.av, true); refund.uses = 0; }
    const robin = living(b).find(x => x.id === 'robin_lovesong');
    if (u.id === 'aventurine_waves' && robin && (robin.statuses.some(s => s.key === 'singing') || robin.resource.locked)) {
      const duoFlat = robin.stats.attack * .75 + u.stats.defense * .15;
      const c6Bonus = robin.companion.constellation >= 6 ? 1.4 : 1;
      log(b, robin.id, action.enemy, 'FOLLOW_UP', duoFlat, duoFlat, '【联动·人来疯】这个炎热的夏天！知更鸟补击音波轰击');
      ctx.hit({ flat: duoFlat * c6Bonus }, 'blast', 'followup');
      if (u.companion.constellation >= 6) u.counters.chips = Math.min(10, (u.counters.chips ?? 0) + 1);
    }
    if (u.id === 'aventurine_waves' && (u.counters.chips ?? 0) >= 7) {
      u.counters.chips -= 7;
      const hits = u.companion.constellation >= 4 ? 10 : 7;
      const defBonus = u.companion.constellation >= 4 ? 1.2 : 1;
      log(b, u.id, action.enemy, 'FOLLOW_UP', 0, 0, `【戏浪豪赌】怒涛暗涌 · ${hits}段弹射追击`);
      for (let i = 0; i < hits; i++) {
        ctx.hit({ defense: .35 * defBonus }, 'all', 'followup');
      }
    }
  }
  if (natural && u.hp > 0) {
    if (action.command === 'basic' && !(u.id === 'yanhuang' && u.counters.form > 0)) b.points = gainPoints(b.points, 1, b.av);
    if (!(u.id === 'yanhuang' && u.counters.form > 0) && !u.counters.skipEnergy) {
      const gain = gainEnergy(u.resource, action.command === 'basic' ? u.resource.rule.basic : u.resource.rule.skill, 'base', u.stats.energyEfficiency); u.resource = gain.resource;
      bankLostEnergy(b, u, gain.overflow);
      const overflow = u.statuses.find(s => s.key === 'overflow' && (s.uses ?? 0) > 0);
      if (overflow && gain.overflow > 0) { const next = living(b).filter(x => x.id !== u.id).sort((a, z) => a.clock.due - z.clock.due)[0]; if (next) ctx.energy(next, Math.min(gain.overflow * .5, next.resource.rule.cost * .1), true); overflow.uses!--; }
    }
    u.counters.skipEnergy = 0;
    if (action.command === 'basic' && current.points.value === 7) for (const lamp of living(b).filter(x => x.id === 'R4-018')) gainLimited(lamp, 'fullPoints', 8, 16, Math.floor(b.av / 100));
    const battery = u.statuses.find(s => s.key === 'battery' && (s.uses ?? 0) > 0); if (battery) { ctx.energy(u, u.resource.rule.cost * battery.value, true); battery.uses = 0; }
    const relay = u.statuses.find(s => s.key === 'relayPoint' && (s.uses ?? 0) > 0); if (relay && action.command === 'basic') { b.points = gainPoints(b.points, 1, b.av, true); relay.uses = 0; }
    if (u.counters.orders > 0) { const n = u.companion.constellation; ctx.hit({ attack: u.strings.order === 'sweep' ? n >= 5 ? 1.05 : .9 : u.strings.order === 'focus' ? n >= 5 ? 1.85 : 1.6 : 1.2 }, u.strings.order === 'sweep' ? 'all' : 'single', 'followup'); u.counters.orders--; if (!u.counters.orders) u.resource.locked = false; }
    if (u.counters.form > 0) { u.counters.form--; if (!u.counters.form) u.resource.locked = false; }
    const debt = settleDeferred(b.debts, u.id, u.hp, b.av); u.hp = debt.hp; b.debts = debt.debts;
    if (debt.loss) log(b, 'deferred', u.id, 'NORMAL_ACTION', debt.loss, debt.loss, '延期伤害到期');
    u.clock = { ...completeNatural(u.clock, b.av), naturalId: u.clock.naturalId };
    if (u.counters.nextDelay) { const delay = u.clock.interval * u.counters.nextDelay; u.clock.due += delay; u.clock.delayed = delay; u.counters.nextDelay = 0; }
    b.lastActor = u.id; b.lastCommand = action.command; b.lastElement = u.design.element as Element;
    if (Math.floor(current.av / 100) !== Math.floor(b.av / 100)) b.actionKinds = [];
  }
  if (u.hp > 0 && b.blessing === 'cycle' && b.encounterId.startsWith('tower:')) {
    const window = Math.floor(b.av / 100);
    if (b.counters.cycleWindow !== window) { b.counters.cycleWindow = window; b.counters.cycleCount = 0; b.counters.cycleMask = 0; }
    const bit = 1 << b.units.indexOf(u);
    if ((b.counters.cycleMask ?? 0) & bit) { b.counters.cycleMask = bit; b.counters.cycleCount = 1; }
    else { b.counters.cycleMask = (b.counters.cycleMask ?? 0) | bit; b.counters.cycleCount = (b.counters.cycleCount ?? 0) + 1; }
    if (b.counters.cycleCount >= 3 && once(b, 'cycle')) { b.points = gainPoints(b.points, 1, b.av, true); log(b, 'blessing', u.id, 'EQUIPMENT', 1, 1, '三人依次行动 · 回1战技点'); }
  }
  if (u.hp > 0 && natural && action.command === 'basic' && feature(b, 12) && b.counters.breakPointReady && once(b, 'breakPoint')) { b.counters.breakPointReady = 0; b.points = gainPoints(b.points, 1, b.av, true); }
  if (!natural && u.hp > 0 && u.counters.blessingEnergy) { ctx.energy(u, u.counters.blessingEnergy, true); u.counters.blessingEnergy = 0; }
  const followup = u.statuses.find(s => s.key === 'ultimateFollowup' && (s.uses ?? 0) > 0);
  if (!natural && followup) { ctx.hit({ attack: followup.value }, 'single', 'followup'); followup.uses = 0; }
  u.statuses = u.statuses.filter(s => !['damageBonus', 'bloodBoost'].includes(s.key));
  phases(b); finish(b);
  if (natural) selectNext(b); else expire(b);
  return b;
}
/** Execute one enemy or timed event, leaving an insertion point for ultimates. */
export function advance(current: Battle): Battle {
  if (current.outcome !== 'playing' || current.units.some(u => u.id === current.active && u.hp > 0 && !statusValue(u, 'control'))) return current;
  const b = structuredClone(current);
  const controlled = b.units.find(u => u.id === b.active && statusValue(u, 'control') > 0);
  if (controlled) { controlled.resource = beginNatural(controlled.resource); controlled.clock = completeNatural(controlled.clock, b.av); log(b, controlled.id, controlled.id, 'NORMAL_ACTION', 0, 0, '受控 · 本次自然行动跳过'); selectNext(b); return b; }
  const scheduled = b.scheduled.find(s => s.id === b.active);
  if (scheduled) {
    b.scheduled = b.scheduled.filter(s => s !== scheduled);
    const enemy = b.enemies.find(e => e.id === scheduled.owner);
    const owner = b.units.find(u => u.id === scheduled.owner && u.hp > 0);
    if (scheduled.kind === 'enemy' && enemy && enemy.hp > 0) { enemyDamage(b, enemy, scheduled.coefficients.attack ?? 1, scheduled.shape, scheduled.target, scheduled.heavy); enemy.chargingUntil = 0; }
    else if (owner) {
      if (scheduled.kind === 'field-end') owner.resource.locked = false;
      else { const target = opponents(b).find(e => e.id === scheduled.target) ?? (scheduled.retarget ? opponents(b)[0] : undefined); if (target || scheduled.kind === 'heal') { const ctx = emitContext(b, { actor: owner.id, command: 'ultimate', enemy: target?.id ?? '', ally: owner.id }, true, scheduled.kind === 'heal' ? 'PASSIVE_HEAL' : 'FOLLOW_UP'); if (scheduled.kind === 'heal') ctx.heal(scheduled.coefficients, scheduled.shape === 'all' ? 'all' : owner, true); else ctx.hit(scheduled.coefficients, scheduled.shape, 'followup', target); } if (owner.id === 'R5-008') owner.resource.locked = false; }
    }
  } else { const enemy = b.enemies.find(e => e.id === b.active && e.hp > 0); if (enemy) enemyTurn(b, enemy); }
  phases(b); selectNext(b); return b;
}
export function autoAction(b: Battle): Action | undefined {
  const u = b.units.find(u => u.id === b.active && u.hp > 0); if (!u) return;
  if (statusValue(u, 'control')) return;
  const enemy = [...opponents(b)].sort((a, z) => (a.name === '药罐' ? -1 : 0) - (z.name === '药罐' ? -1 : 0) || a.hp - z.hp)[0];
  const allies = [...living(b)].filter(x => u.id !== 'siming' || x !== u).sort((a, z) => a.hp / a.stats.hp - z.hp / z.stats.hp);
  if (!enemy || !allies.length) return;
  return { actor: u.id, command: canUltimate(u.resource, b.av) ? 'ultimate' : b.points.value > 1 && u.clock.naturalId % 3 !== 2 ? 'skill' : 'basic', enemy: enemy.id, ally: allies[0].id, secondAlly: allies[1]?.id, option: u.id === 'gilgamesh' ? String(u.resource.value >= 6 ? 6 : u.resource.value >= 4 ? 4 : 2) : undefined };
}
export const implementationRoster = CHARACTERS.map(c => c.id);
