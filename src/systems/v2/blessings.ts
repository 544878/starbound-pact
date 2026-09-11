import type { Battle, Unit } from './model';
import { addShield } from './defense';

export const FEATURE_BLESSINGS: Record<number, string> = {
  3: '击杀自爆藤灵，清除全队各1个持续伤害状态，每100AV一次',
  4: '拆除敌方护盾或护甲，最低生命队友获得8%生命盾，每100AV一次',
  6: '每波击败首领后全队恢复15%生命，保留已有能量至容量60%',
  7: '普攻拆除护甲后，下次战技额外削韧8，最多存一次',
  9: '倒计时最后10AV内主动命中，返还5%门槛能量，每100AV一次',
  10: '击破敌方护盾，提前结算至多一份持续伤害并扣次数',
  12: '每波首次破韧后，下次普攻额外回1点，受每100AV上限约束',
  13: '净化持续伤害，将未来一次结算的20%转为本目标护盾',
  15: '被压制治疗的20%转盾，上限施法者生命5%，每目标每100AV一次',
  17: '被偷或溢出的能量保存25%，至多门槛5%，下次大招后返还，每人每100AV一次',
  18: '一名首领破韧时，下次主动攻击将30%基础削韧分给另一名首领',
};
export const feature = (b: Battle, floor: number) => b.blessing === 'feature' && b.encounterId === `tower:${floor}`;
export function once(b: Battle, key: string) {
  const windowKey = `blessing:${key}:${Math.floor(b.av / 100)}`;
  if (b.counters[windowKey]) return false;
  b.counters[windowKey] = 1;
  return true;
}
export function equipmentShield(b: Battle, u: Unit, amount: number, source: string) {
  if (u.hp <= 0 || amount <= 0) return;
  const before = u.shields.reduce((sum, s) => sum + s.remaining, 0);
  u.shields = addShield(u.shields, { id: `equipment:${b.serial++}`, owner: u.id, source, remaining: amount, expires: b.av + 100 }, u.stats.hp, b.av);
  b.log.push({ root_id: `equipment:${b.serial++}`, event_id: `event:${b.serial++}`, source_actor: u.id, target: u.id, parent_id: null, tags: ['EQUIPMENT'], depth: 0, av: b.av, amount, effective: u.shields.reduce((sum, s) => sum + s.remaining, 0) - before, detail: `${source} · 护盾` });
}
export function cleanse(b: Battle, u: Unit, keys: string[], count = Infinity) {
  const removed = u.statuses.filter(s => keys.includes(s.key) && (s.uses === undefined || s.uses > 0)).slice(0, count);
  u.statuses = u.statuses.filter(s => !removed.includes(s));
  if (feature(b, 13)) for (const s of removed.filter(s => s.key === 'enemyPoison')) equipmentShield(b, u, s.value * 1000 / (1000 + u.stats.defense) * .2, '净化祝福');
}
export function bankLostEnergy(b: Battle, u: Unit, lost: number) {
  if (feature(b, 17) && lost > 0 && once(b, `lost:${u.id}`)) u.counters.blessingEnergy = Math.min(u.resource.rule.cost * .05, (u.counters.blessingEnergy ?? 0) + lost * .25);
}
