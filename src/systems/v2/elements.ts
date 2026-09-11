export type Element = '火' | '水' | '森' | '风' | '光' | '暗';
export interface Aura { element: Exclude<Element, '风'>; units: number; expires: number }
export interface Reaction { name: string; coefficient: number; effect: 'damage' | 'burn' | 'armor' | 'early' | 'heal' | 'cleanse' | 'poison' | 'seed' | 'bind' | 'dispel' | 'spread' | 'shield' | 'move' | 'light' | 'hide'; element: Element }
const rules: Array<[Element, Element, Reaction]> = [
  ['火', '水', { name: '蒸汽', coefficient: 1.2, effect: 'damage', element: '水' }],
  ['火', '森', { name: '燃烧', coefficient: .55, effect: 'burn', element: '火' }],
  ['火', '光', { name: '烧甲', coefficient: .7, effect: 'armor', element: '火' }],
  ['火', '暗', { name: '爆燃', coefficient: .7, effect: 'early', element: '暗' }],
  ['水', '森', { name: '滋养', coefficient: .75, effect: 'heal', element: '水' }],
  ['水', '光', { name: '清洗', coefficient: .4, effect: 'cleanse', element: '光' }],
  ['水', '暗', { name: '中毒', coefficient: .5, effect: 'poison', element: '水' }],
  ['森', '光', { name: '回春种子', coefficient: .35, effect: 'seed', element: '森' }],
  ['森', '暗', { name: '缠住', coefficient: 0, effect: 'bind', element: '森' }],
  ['光', '暗', { name: '破障', coefficient: .8, effect: 'dispel', element: '光' }],
  ['风', '火', { name: '传火', coefficient: .7, effect: 'spread', element: '风' }],
  ['风', '水', { name: '水幕', coefficient: .6, effect: 'shield', element: '水' }],
  ['风', '森', { name: '播种', coefficient: .45, effect: 'move', element: '森' }],
  ['风', '光', { name: '导光', coefficient: 0, effect: 'light', element: '光' }],
  ['风', '暗', { name: '藏身', coefficient: 0, effect: 'hide', element: '暗' }],
];
export const reactionFor = (a: Element, b: Element) => rules.find(([x, y]) => (x === a && y === b) || (x === b && y === a))?.[2];
export interface AttachmentBudget { targets: string[]; reactions: number }
export function attach(auras: readonly Aura[], element: Element, target: string, av: number, budget: AttachmentBudget, derived = false) {
  const live = auras.filter(a => a.expires > av && a.units > 0).map(a => ({ ...a })).sort((a, b) => a.expires - b.expires);
  if (derived || budget.targets.includes(target)) return { auras: live, budget };
  const nextBudget = { targets: [...budget.targets, target], reactions: budget.reactions };
  const partner = live.find(a => a.element !== element);
  if (partner && budget.reactions < 3) {
    partner.units--;
    return { auras: live.filter(a => a.units > 0), budget: { ...nextBudget, reactions: nextBudget.reactions + 1 }, reaction: reactionFor(element, partner.element) };
  }
  if (element !== '风') {
    const same = live.find(a => a.element === element);
    if (same) { same.units = Math.min(2, same.units + 1); same.expires = av + 100; }
    else if (live.length < 2) live.push({ element, units: 1, expires: av + 100 });
  }
  return { auras: live, budget: nextBudget };
}
