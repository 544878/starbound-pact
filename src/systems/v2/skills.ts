import { cleanse } from './blessings';
import type { SkillContext, Unit, Enemy } from './model';
import { shiftAction } from './timeline';
import { consumeRecord } from './records';
import { payHp } from './defense';
import { gainPoints } from './resources';

// Each ID dispatches its own kit. Duties and team paths never select the skill.
export function executeSkill(c: SkillContext) {
  const { b, u, target: t, ally: a, second: z, action, hit, heal, shield, status, dot, early, energy, schedule } = c;
  const cmd = action.command, n = u.companion.constellation, option = action.option ?? '';
  const basic = cmd === 'basic', skill = cmd === 'skill', ult = cmd === 'ultimate';
  const all = b.units.filter(x => x.hp > 0);
  const low = [...all].sort((x, y) => x.hp / x.stats.hp - y.hp / y.stats.hp)[0] ?? u;
  const turn = (who: Unit | Enemy, count = 2) => ({ kind: 'target' as const, actor: who.id, expires: who.clock.naturalId + count });
  const av = (duration = 100) => ({ kind: 'av' as const, expires: b.av + duration });
  const attack = (amount: number, shape: 'single' | 'blast' | 'all' = 'single') => hit({ attack: amount }, shape);
  const pay = (amount: number, floor = 1) => {
    const r = payHp(b.costs, `hp:${b.serial++}`, u.id, u.hp, Math.min(amount, Math.max(0, u.hp - floor)));
    u.hp = r.hp; b.costs = r.ledger; return r.paid;
  };
  switch (u.id) {
    case 'lumi':
      if (basic) attack(.8);
      if (skill) { status(a, 'battery', .1, turn(a, 1), 1); if (n >= 5) a.statuses = a.statuses.filter(s => s.key !== 'slow'); }
      if (ult) { attack(n >= 3 ? 1.7 : 1.2, 'all'); for (const x of all) status(x, 'overflow', .5, av(500), 2); }
      break;
    case 'alden':
      if (basic) hit({ defense: .75 });
      if (skill) { shield({ defense: n >= 3 ? 2.2 : 1.8, flat: n >= 3 ? 650 : 600 }); status(a, 'intercept', 1, turn(u, 1), 1, u.id); }
      if (ult) { shield({ defense: 1.5, flat: 500 }, 'all'); status(u, 'parry', n >= 5 ? 3.1 : 2.2, turn(u, 1), 1, 'defense'); }
      break;
    case 'selene': {
      if (basic) attack(.85);
      if (skill) { attack(1.2, 'blast'); if (!u.records.length) u.records.push({ id: `record:${b.serial++}`, owner: u.id, coefficient: 1.2, element: '水', shape: 'single', locked: false }); u.records[u.records.length - 1].locked = true; }
      if (ult) {
        for (let i = 0; i < (n >= 6 ? 2 : 1); i++) {
          const r = u.records.find(r => r.id === option) ?? u.records[0];
          if (r) { const next = consumeRecord(u.records, r.id, i === 1 ? .3 : n >= 3 ? .72 : .65); u.records = next.records; hit({ attack: next.packet.coefficient }, r.shape, 'replay'); }
          else if (i === 0) hit({ attack: 2 * (n >= 3 ? .72 : .65) }, 'single', 'replay');
        }
        attack(n >= 5 ? 1.2 : .8, 'all');
      }
      break;
    }
    case 'mira':
      if (basic) { attack(.65); heal({ hp: .03 }, low); }
      if (skill) { const before = a.hp; heal({ hp: n >= 3 ? .21 : .18, flat: n >= 3 ? 1000 : 900 }); const nominal = (u.stats.hp * (n >= 3 ? .21 : .18) + (n >= 3 ? 1000 : 900)) * (1 + (u.bonuses.healing ?? 0)); status(a, 'medicine', Math.min(u.stats.hp * .08, Math.max(0, nominal - (a.hp - before)) * .4), turn(a, 2), 1); if (n >= 2) heal({ flat: (a.hp - before) * .25 }, z); }
      if (ult) { heal({ hp: n >= 5 ? .17 : .14, flat: n >= 5 ? 900 : 800 }, 'all'); for (const x of all) cleanse(b, x, ['control', 'slow', 'poison', 'enemyPoison']); if (n >= 6 && (u.counters.saves ?? 0) < 2) status(a, 'lifesave', 1, av(1000), 1); }
      break;
    case 'noctis':
      if (basic) attack(1);
      if (skill) { hit({ attack: 2 }, 'single', 'direct', t, undefined, 30); if (t.chargingUntil > b.av) t.counters.flaw = Math.min(4, (t.counters.flaw ?? 0) + 1); }
      if (ult) { const flaw = (t.counters.flaw ?? 0) >= 2; attack(4.3 + (flaw ? 1.6 : 0) + (t.hp / t.maxHp < .25 ? .6 : 0)); if (flaw) { t.counters.flaw -= 2; t.toughness.value = Math.max(0, t.toughness.value - 30); } }
      break;
    case 'kael':
      if (basic) attack(.9);
      if (skill) { attack(1.5); dot({ attack: .45 }, 2); }
      if (ult) { attack(2.6); if (!b.dots.some(d => d.owner === u.id && d.target === t.id)) dot({ attack: .45 }, 1); early(true, 1); }
      break;
    case 'astra':
      if (basic) attack(b.lastActor && b.lastActor !== u.id ? 1.15 : 1);
      if (skill) { attack(1.7, 'blast'); status(a.id !== u.id ? a : z, 'relayPoint', 1, av(), 1); }
      if (ult) { attack(3.3, 'blast'); attack((n >= 5 ? .6 : .45) * new Set(b.actionKinds).size); }
      break;
    case 'xuanzhao':
      if (basic) hit({ defense: .9 });
      if (skill) { shield({ defense: 1.4, flat: 500 }, 'all'); for (const x of [a, z]) status(x, 'warehouse', 1, turn(u, 1), undefined, u.id); }
      if (ult) { const stored = u.counters.warehouse ?? 0; hit({ defense: (n >= 5 ? 4.1 : 3.4) + (stored ? 0 : 1) }); if (stored) hit({ flat: stored }, 'single', 'warehouse'); u.counters.warehouse = 0; shield({ defense: 1, flat: 300 }, 'all'); }
      break;
    case 'canglan':
      if (basic) attack(.95);
      if (skill) { const high = !!u.counters.high; attack(high ? 1.2 : 1.8, high ? 'all' : 'single'); if (!high) { u.records.push({ id: `tide:${b.serial++}`, owner: u.id, coefficient: 1.8, element: '水', shape: 'single', locked: false }); u.records = u.records.slice(-2); } }
      if (ult) { attack(u.counters.high ? 3.9 : 2.6, 'blast'); if (!u.counters.high) for (let i = 0; i < 2; i++) hit({ attack: u.records[i] ? u.records[i].coefficient * .45 : .6 }, 'single', 'replay'); u.records = []; u.counters.high = u.counters.high ? 0 : 1; }
      break;
    case 'yanhuang':
      if (basic) attack(u.counters.form ? 1.8 : 1, u.counters.form ? 'blast' : 'single');
      if (skill) { attack(u.counters.form ? 2.6 : 1.8, 'blast'); if (!u.counters.form) for (const x of b.enemies.filter(x => x.hp > 0 && Math.abs(b.enemies.indexOf(x) - b.enemies.indexOf(t)) <= 1)) dot({ attack: .4 }, 2, x); }
      if (ult) { attack(1.6, 'all'); u.counters.form = 3; u.resource.locked = true; }
      break;
    case 'jingxuan':
      if (basic) attack(1);
      if (skill) { attack(1.8); status(t, 'seen', t.name === '标准木桩' ? .5 : 1, av(100)); if (t.intent === 'single') status(b.units.find(x => x.id === t.target) ?? a, 'mitigation', .15, av(100), 1); else if (t.intent === 'all') for (const x of all) status(x, 'mitigation', .08, av(100), 1); else hit({ flat: 0 }, 'single', 'direct', t, undefined, 20); }
      if (ult) { const seen = t.statuses.find(s => s.key === 'seen'); const previous = u.stats; const crit = u.stats.crit + .35 * (seen?.value ?? 0); u.stats = { ...u.stats, crit: Math.min(1, crit), critDamage: u.stats.critDamage + Math.min(.2, Math.max(0, crit - 1) * .5) }; attack(4.2); u.stats = previous; }
      break;
    case 'siming':
      if (basic) attack(.7);
      if (skill) { a.clock = shiftAction(a.clock, b.av, .1, 'advance'); u.counters.nextDelay = .08; }
      if (ult) { if (Math.min(a.clock.due, z.clock.due) - b.av <= 5) { const later = a.clock.due > z.clock.due ? a : z; later.clock = shiftAction(later.clock, b.av, .1, 'advance'); } else { const due = a.clock.due; a.clock.due = z.clock.due; z.clock.due = due; } attack(1, 'all'); }
      break;
    case 'yueheng':
      if (basic) hit({ defense: .65, hp: .02 });
      if (skill) for (const x of [a, z]) status(x, 'share', .25, turn(x, 2), undefined, u.id);
      if (ult) { shield({ hp: .09, flat: 450 }, 'all'); for (const d of b.debts.filter(d => d.target === u.id)) d.remaining *= .7; }
      break;
    case 'R4-009':
      if (basic) attack(.9);
      if (skill) { attack(1.5); shield({ attack: .35, flat: 700 }); }
      if (ult) { attack(2.7, 'blast'); for (const s of a.shields) s.expires += a.clock.interval; }
      break;
    case 'R4-010':
      if (basic) attack(.9 + (b.lastCommand === 'basic' && b.lastActor !== u.id ? .4 : 0));
      if (skill) { attack(1.2, 'all'); for (const x of [a, z]) status(x, 'chorus', .35, turn(x, 2), 1); }
      if (ult) { attack(2.4, 'all'); for (const x of all) status(x, 'splitBasic', .5, av(300), 1); }
      break;
    case 'R4-011':
      if (basic) attack(.85);
      if (skill) { const paid = pay(u.hp * .08); u.counters.cost1 = u.counters.cost2 ?? 0; u.counters.cost2 = paid; attack(1.8); }
      if (ult) { attack(2.8, 'blast'); hit({ flat: Math.min(u.stats.hp * .08, ((u.counters.cost1 ?? 0) + (u.counters.cost2 ?? 0)) * .8) }, 'single', 'warehouse'); u.counters.cost1 = u.counters.cost2 = 0; }
      break;
    case 'R4-012':
      if (basic) attack(.8);
      if (skill) { attack(1.1, 'all'); for (const x of b.enemies.filter(x => x.hp > 0 && Math.abs(b.enemies.indexOf(x) - b.enemies.indexOf(t)) <= 1)) dot({ attack: .4 }, 2, x); }
      if (ult) { attack(2.3, 'all'); const x = [...b.enemies].filter(x => x.hp > 0).sort((x, y) => y.hp - x.hp)[0]; if (x) dot({ attack: .5 }, 2, x); }
      break;
    case 'R4-013':
      if (basic) attack(.85);
      if (skill) { attack(1.3); const needles = b.enemies.filter(x => x.statuses.some(s => s.key === 'needle' && s.owner === u.id)); if (needles.length < 2 || needles.includes(t)) status(t, 'needle', n >= 3 ? 1.3 : 1, av(1000), 1); }
      if (ult) { attack(2.5); const needle = t.statuses.find(s => s.key === 'needle' && s.owner === u.id); if (needle) { hit({ attack: needle.value }, 'single', 'followup'); t.statuses = t.statuses.filter(s => s !== needle); } }
      break;
    case 'R4-014':
      if (basic) attack(.8);
      if (skill) { attack(1.4, 'blast'); u.strings.element = b.lastElement || '水'; }
      if (ult) { attack(2.4, 'blast'); const el = u.strings.element || '水'; if (el !== '风' && !t.auras.some(x => x.element === el) && t.auras.length < 2) t.auras.push({ element: el as '水', units: 1, expires: b.av + 100 }); }
      break;
    case 'R4-015':
      if (basic) attack(1);
      if (skill) { const low = t.hp / t.maxHp < .5; attack(1.7); if (low) hit({ attack: .4 }, 'single', 'followup'); }
      if (ult) attack(3.4);
      break;
    case 'R4-016':
      if (basic) attack(.9);
      if (skill) { attack(1.6); b.scheduled = b.scheduled.filter(s => !(s.owner === u.id && s.target === t.id)); schedule(20, { attack: .9 }); }
      if (ult) { attack(2.8, 'blast'); const s = b.scheduled.find(s => s.owner === u.id); if (s) s.at = option === 'delay' ? s.at + 15 : b.av; }
      break;
    case 'R4-017':
      if (basic) hit({ attack: .7 }, 'single', 'direct', t, undefined, 15);
      if (skill) { attack(1); status(t, 'breakBonus', .25, turn(t, 2), 1); }
      if (ult) { attack(1.8, 'all'); status(t, 'defenseDown', n >= 3 ? .21 : .18, turn(t, 2)); }
      break;
    case 'R4-018':
      if (basic) { attack(.65); if (b.points.value === 7) u.counters.pointStore = Math.min(2, (u.counters.pointStore ?? 0) + 1); }
      if (skill) { shield({ hp: .07, flat: 350 }); if (u.counters.pointStore) { u.counters.pointStore--; b.points = gainPoints(b.points, 1, b.av, true); } }
      if (ult) { heal({ hp: .06, flat: 300 }, 'all'); if (u.counters.pointStore) { b.points = gainPoints(b.points, u.counters.pointStore, b.av, true); u.counters.pointStore = 0; } else for (const x of [a, z]) energy(x, x.resource.rule.cost * .06, true); }
      break;
    case 'R4-019':
      if (basic) attack(.7);
      if (skill) { if (option === 'accelerate' && a.hp / a.stats.hp >= .3) status(a, 'bloodBoost', .18, turn(a, 2), 1); else shield({ hp: .1 }); }
      if (ult) { heal({ hp: .08, flat: 450 }, 'all'); for (const x of all) status(x, 'medicine', (u.stats.hp * .08 + 450) * .3, turn(x, 2), 1); }
      break;
    case 'R4-020': {
      if (basic) attack(.75);
      if (skill) { attack(1.1); const d = b.dots.find(d => d.target === t.id && d.kind === 'burn'); if (d && !u.strings[`extended:${d.id}`]) { if (d.weights.length < 3) d.weights.push(1); u.strings[`extended:${d.id}`] = 'yes'; } else if (!d) dot({ attack: .35 }, 2); }
      if (ult) { attack(1.7, 'all'); if (option === '80') early(false, 2); else for (const x of b.enemies.filter(x => x.hp > 0)) early(false, 1, x); }
      break;
    }
    case 'R4-021':
      if (basic) attack(.65);
      if (skill) status(t, 'extraBreak', t.boss ? 15 : 10, turn(t, 1), 1);
      if (ult) { attack(1.4, 'all'); for (const x of all) status(x, 'heavyMitigation', n >= 5 ? .19 : .15, av(300), 1); }
      break;
    case 'R4-022':
      if (basic) attack(.7);
      if (skill) status(a, ['selene', 'canglan'].includes(a.id) ? 'replayBonus' : 'followupBonus', ['selene', 'canglan'].includes(a.id) ? n >= 5 ? .13 : .1 : .18, av(300), 1);
      if (ult) { attack(1.5, 'all'); for (const x of [a, z]) status(x, 'retarget', 1, av(300), 1); }
      break;
    case 'R4-025':
      if (basic) hit({ defense: .8 });
      if (skill) { shield({ defense: .9, flat: 300 }, a, 'outer'); shield({ defense: 1.4, flat: 450 }, a, 'inner'); }
      if (ult) { shield({ defense: 1.6, flat: 450 }, 'all', 'inner'); for (const s of a.shields.filter(s => s.owner === u.id)) s.priority = 1; }
      break;
    case 'R4-026':
      if (basic) hit({ defense: .6, attack: .4 });
      if (skill) { shield({ defense: 1.2, flat: 450 }, 'all'); for (const x of all) status(x, 'hotShield', n >= 5 ? .5 : .35, turn(x, 2)); }
      if (ult) { hit({ defense: 2 }, 'all'); shield({ defense: 1.5, flat: 500 }, 'all'); }
      break;
    case 'R4-027':
      if (basic) hit({ defense: .7 });
      if (skill) { u.counters.decoy = u.stats.hp * (n >= 3 ? .18 : .15) + (n >= 3 ? 650 : 500); status(a, 'decoy', 1, av(300), 1, u.id); }
      if (ult) { shield({ hp: .08, flat: 500 }, 'all'); if (u.counters.decoy > 0) u.counters.decoy += (u.stats.hp * .15 + 500 - u.counters.decoy) * .5; }
      break;
    case 'R4-028':
      if (basic) { attack(.6); heal({ hp: .03, flat: 100 }, low); }
      if (skill) { heal({ hp: .08, flat: 500 }); status(a, 'regen', u.stats.hp * .06 + 250, turn(a, 3), 2); }
      if (ult) { heal({ hp: .11, flat: 650 }, 'all'); if (!low.statuses.some(s => s.key === 'regen')) status(low, 'regen', u.stats.hp * .06 + 250, turn(low, 2), 1); }
      break;
    case 'R4-029':
      if (basic) attack(.6);
      if (skill) status(t, 'medicineMark', u.stats.hp * (n >= 3 ? .075 : .06) + (n >= 3 ? 250 : 200), av(120), 3);
      if (ult) { heal({ hp: .1, flat: 600 }, 'all'); status(t, 'medicineMark', u.stats.hp * .06 + 200, av(120), Math.min(3, (t.statuses.find(s => s.key === 'medicineMark')?.uses ?? 0) + 2)); }
      break;
    case 'R4-030':
      if (basic) { attack(.65); heal({ hp: .03 }, low); }
      if (skill) { heal({ hp: .15, flat: 650 }); if ((a.counters.woundedAt ?? -1000) >= b.av - 100) a.statuses = a.statuses.filter(s => s.key !== 'control'); }
      if (ult) { heal({ hp: .1, flat: 650 }, 'all'); schedule(100, { hp: .03 }, 'all', 'heal', 'all'); u.counters.deathHeal = 1; }
      break;
    case 'R5-001':
      if (basic) { if (option === 'enhanced' && u.resource.value >= .5) { u.resource.value -= .5; attack(1.8); u.counters.skipEnergy = 1; } else attack(1.1); }
      if (skill) { attack(1.9); shield({ attack: .6, flat: 650 }, u); status(u, 'guarded', 1, turn(u, 1)); }
      if (ult) { attack(4, 'blast'); if ((u.counters.guardedAt ?? -1000) >= Math.floor(b.av / 100) * 100) attack(1.6); }
      break;
    case 'R5-002':
      if (basic) attack(.9);
      if (skill) { attack(1.45, 'all'); status(a, 'conductor', 1, av(300), 1); }
      if (ult) { attack(2.9, 'all'); if (u.strings.attack) attack(.8); if (u.strings.heal) heal({ hp: .04 }, 'all'); if (u.strings.shield) shield({ attack: .45, flat: 300 }, 'all'); u.strings = {}; }
      break;
    case 'R5-003':
      if (basic) hit({ hp: .105 });
      if (skill) { const requested = u.hp * .1, paid = pay(requested, u.stats.hp * .2); hit({ hp: (n >= 3 ? .26 : .22) * (.5 + .5 * (requested ? paid / requested : 0)) }, 'blast'); }
      if (ult) { const ratio = Math.min(1, (u.counters.repayment ?? 0) / 40); hit({ hp: (n >= 5 ? .5 : .44) + (n >= 5 ? .16 : .14) * ratio }); heal({ hp: .08 * ratio }, u); u.counters.repayment = Math.max(0, (u.counters.repayment ?? 0) - 40); }
      break;
    case 'R5-004':
      if (basic) attack(.9);
      if (skill) { attack(1.55, 'blast'); for (const x of b.enemies.filter(x => x.hp > 0 && Math.abs(b.enemies.indexOf(x) - b.enemies.indexOf(t)) <= 1)) dot({ attack: x === t ? .65 : .35 }, 2, x); }
      if (ult) { attack(option === '120' ? 3.3 : 2.6, 'blast'); if (option === '120') for (const x of b.enemies.filter(x => x.hp > 0)) early(true, 2, x); else early(true, 1); }
      break;
    case 'R5-005':
      if (basic) { attack(option === 'withdraw' ? 1.25 : .9); if (option !== 'withdraw') status(u, 'shadow', .5, turn(u, 2), 1); }
      if (skill) { attack(1.6, 'blast'); if (t.boss) status(t, 'attackDownOnce', .1, av(200), 1); else { t.target = u.id; shield({ hp: .08 }, u); } }
      if (ult) { if (option === 'withdraw') { attack(4.7); status(u, 'mitigation', .15, av(200), 1); } else { attack(3, 'all'); hit({ attack: 1.6 }, 'single', 'followup'); } }
      break;
    case 'R5-006': {
      const save = () => { u.defenseRecords = [...u.defenseRecords.filter(r => r.target !== t.id), { target: t.id, defense: t.stats.defense * (1 - Math.min(.5, t.statuses.filter(s => s.key === 'defenseDown').reduce((sum, s) => sum + s.value, 0))), resistance: t.weaknesses.includes('水') ? 0 : .1, expires: b.av + 1000 }].slice(-2); };
      if (basic) { attack(.95); if (t.statuses.some(s => s.key === 'defenseDown')) save(); }
      if (skill) { attack(1.8); status(t, 'defenseDown', n >= 3 ? .14 : .12, turn(t, 1)); save(); }
      if (ult) { const record = u.defenseRecords.find(r => r.target === t.id); if (record) status(t, 'historicalDefense', record.defense, av(.001), 1); attack(4.3); u.defenseRecords = u.defenseRecords.filter(r => r !== record); }
      break;
    }
    case 'R5-007':
      if (basic) hit({ attack: .7 }, 'single', 'direct', t, undefined, 15);
      if (skill) status(t, 'siege', n >= 3 ? 6 : 5, turn(t, 2));
      if (ult) { attack(1.8); for (const x of [a, z]) status(x, 'ultimateFollowup', .8, av(40), 1); }
      break;
    case 'R5-008':
      if (basic) attack(1);
      if (skill) { attack(1.9); const s = b.scheduled.find(s => s.owner === u.id); if (s) { if (option === 'delay' && (u.counters.delays ?? 0) < 2) { s.at += 5; s.coefficients.attack = (s.coefficients.attack ?? 0) + .3; u.counters.delays = (u.counters.delays ?? 0) + 1; } else s.at = Math.max(b.av, s.at - 5); } }
      if (ult) { schedule(option === 'fast' ? 10 : 30, { attack: 4.6 }); u.resource.locked = true; u.counters.delays = 0; u.counters.appointmentAt = b.av; }
      break;
    case 'saber':
      if (basic) { const sword = u.counters.sword > 0 && option === 'enhanced'; hit({ defense: sword ? 1.5 : .9 }, sword ? 'blast' : 'single'); if (sword) u.counters.sword--; }
      if (skill) { shield({ defense: 1.35, flat: 500 }, 'all'); for (const x of all) status(x, 'areaMitigation', .1, av(200), 1); }
      if (ult) { shield({ defense: 1.9, flat: 650 }, 'all'); u.counters.sword = Math.min(3, u.counters.swordLight ?? 0); u.counters.swordLight = 0; status(u, 'swordForm', 1, turn(u, 2)); }
      break;
    case 'sakura':
      if (basic) { attack(.65); heal({ hp: .03 }, low); }
      if (skill) { heal({ hp: .13, flat: 700 }); status(a, 'buffer', .25, turn(a, 2)); }
      if (ult) { for (const x of all) { status(x, 'repayDebt', .7, av(.001), 1); heal({ hp: .11, flat: 700 }, x); } }
      break;
    case 'rin': {
      const gem = (color: string) => { u.counters[color] = (u.counters[color] ?? 0) + u.stats.energyEfficiency; };
      if (basic) { attack(.85); gem('red'); }
      if (skill) { if (option === 'green') { heal({ hp: .09, flat: 450 }); gem('green'); } else { shield({ hp: .08, flat: 350 }); gem('blue'); } }
      if (ult) {
        const color = ['red', 'blue', 'green'].find(x => option === x && (u.counters[x] ?? 0) >= 3);
        if (color) { u.counters[color] -= 3; if (color === 'red') attack(3, 'all'); if (color === 'blue') shield({ hp: .1, flat: 500 }, 'all'); if (color === 'green') heal({ hp: .1, flat: 600 }, 'all'); }
        else if (option === 'mixed' && ['red', 'blue', 'green'].every(x => (u.counters[x] ?? 0) >= 1)) { for (const x of ['red', 'blue', 'green']) u.counters[x]--; attack(1.8, 'all'); for (const x of [a, z]) energy(x, x.resource.rule.cost * .08, true); }
        else { let count = 3; for (const x of ['red', 'blue', 'green']) { const take = Math.min(count, Math.floor(u.counters[x] ?? 0)); u.counters[x] = (u.counters[x] ?? 0) - take; count -= take; } attack(2.2, 'all'); }
      }
      break;
    }
    case 'archer': {
      const queue = (u.strings.projections ?? '').split(',').filter(Boolean);
      if (basic) { attack(.95); queue.push('short'); }
      if (skill) { attack(1.75); queue.push(option === 'blades' ? 'blades' : 'bow'); }
      if (ult) { attack(2); while (queue.length < 2) queue.push('short'); for (const item of queue.splice(0, 2)) hit({ attack: item === 'bow' ? 1.4 : item === 'blades' ? .8 : 1 }, item === 'blades' ? 'all' : 'single', 'followup'); }
      u.strings.projections = queue.slice(-3).join(','); break;
    }
    case 'gilgamesh':
      if (basic) attack(1.1);
      if (skill) { attack(1.8, 'blast'); if (option === 'reload') energy(u, 1); }
      if (ult) { const ammo = ['2', '4', '6'].includes(option) ? Number(option) : 2; hit({ attack: .8 + (n >= 5 ? 1.03 : .9) * ammo + (ammo === 6 ? 1 : 0) }, 'single', 'direct', t, undefined, ammo === 6 ? 50 : 30); }
      break;
    case 'yuno':
      if (basic) hit({ hp: .03 });
      if (skill) { shield({ hp: .13, flat: 600 }); if (option === 'transfer' && a !== z) for (const s of z.shields.filter(s => s.owner === u.id)) { const amount = Math.min(s.remaining / 2, Math.max(0, a.stats.hp * .5 - a.shields.reduce((sum, s) => sum + s.remaining, 0))); s.remaining -= amount; a.shields.push({ ...s, id: `moved:${b.serial++}`, remaining: amount }); } }
      if (ult) { if (option === 'collect') { let amount = 0; for (const x of all) for (const s of x.shields.filter(s => s.owner === u.id)) { const moved = s.remaining * .3; amount += moved; s.remaining -= moved; } for (const x of [a, z]) { const moved = Math.min(amount / 2, Math.max(0, x.stats.hp * .5 - x.shields.reduce((n, s) => n + s.remaining, 0))); x.shields.push({ id: `moved:${b.serial++}`, source: 'moved', owner: u.id, expires: b.av + 200, remaining: moved }); } shield({ hp: .05, flat: 300 }, 'all'); } else shield({ hp: .09, flat: 500 }, 'all'); }
      break;
    case 'shorekeeper':
      if (basic) { attack(.65); heal({ hp: .03 }, low); }
      if (skill) { heal({ hp: .14, flat: 700 }); for (const s of a.statuses.filter(s => s.key === 'control')) s.duration = turn(a, 1); }
      if (ult) { heal({ hp: .09, flat: 600 }, 'all'); schedule(50, { hp: .06, flat: 350 }, 'all', 'heal', 'all'); schedule(150, {}, 'single', 'field-end', u.id); u.resource.locked = true; }
      break;
    case 'phrolova':
      if (basic) { attack(.9); u.strings.order = 'single'; }
      if (skill) { attack(1.75, 'blast'); u.strings.order = option === 'sweep' ? 'sweep' : 'focus'; }
      if (ult) { attack(2.4, 'all'); u.counters.orders = 3; u.resource.locked = true; }
      break;
    case 'cantarella':
      if (basic) attack(.85);
      if (skill) { attack(1.5, 'blast'); for (const x of b.enemies.filter(x => x.hp > 0 && Math.abs(b.enemies.indexOf(x) - b.enemies.indexOf(t)) <= 1)) dot({ attack: x === t ? .55 : .35 }, x === t ? 2 : 1, x, 'poison'); }
      if (ult) { attack(2.7, 'blast'); if (option === 'collect') { early(true, 1); heal({ hp: .06, flat: 300 }, low); } else { const d = b.dots.find(d => d.owner === u.id && d.target === t.id); if (d && d.weights.length < 3) d.weights.push(1); } }
      break;
    case 'xinyuehu':
      if (basic) attack(.7);
      if (skill || ult) { if (ult) attack(1.8, 'all'); status(a, 'contractA', 10, av(300), 1, z.id); if (ult) { const rest = all.filter(x => x !== a && x !== z); if (rest.length >= 2) status(rest[0], 'contractA', 10, av(300), 1, rest[1].id); } }
      break;
    case 'robin_lovesong':
      if (basic) attack(.7);
      if (skill) {
        status(a, 'chord', 10, turn(a, 1), 1);
        for (const x of all) status(x, 'damageBonus', n >= 3 ? .22 : .18, av(100), 1);
      }
      if (ult) {
        schedule(120, {}, 'single', 'field-end', u.id);
        u.resource.locked = true;
        status(u, 'singing', 1, av(120), 1);
        for (const x of all) {
          status(x, 'elation', .2, av(120), 1);
          status(x, 'critDamageBonus', n >= 5 ? .32 : .25, av(120), 1);
          if (n >= 1) status(x, 'penBonus', .1, av(120), 1);
        }
        for (const e of b.enemies.filter(e => e.hp > 0)) {
          status(e, 'slow', .15, av(120), 1);
          status(e, 'vulnerability', n >= 3 ? .18 : .15, av(120), 1);
          e.clock.due += 15;
        }
      }
      break;
    case 'aventurine_waves':
      if (basic) {
        hit({ defense: .8 });
        u.counters.chips = Math.min(10, (u.counters.chips ?? 0) + 1);
        if (n >= 2 && t) status(t, 'resDown', .08, turn(t, 2), 1);
      }
      if (skill) {
        shield({ defense: n >= 3 ? .22 : .18, flat: n >= 3 ? 800 : 650 }, 'all');
        for (const x of all) status(x, 'effectRes', .12, av(150), 1);
        u.counters.chips = Math.min(10, (u.counters.chips ?? 0) + 2);
      }
      if (ult) {
        const roll = Math.floor(Math.random() * 7) + 1;
        u.counters.chips = Math.min(10, (u.counters.chips ?? 0) + roll);
        hit({ defense: n >= 5 ? 3.4 : 2.8 }, 'single', 'direct', t);
        if (t) status(t, 'critVuln', .15, turn(t, 2), 1);
        if (n >= 1) shield({ defense: .18, flat: 650 }, 'all');
      }
      break;
    default: throw new Error(`V2 handler missing: ${u.id}`);
  }
}
