import type { Companion } from '../../domain/types';

export const FUNCTIONAL_SOULS = [
  { slot: 6, level: 60, name: '第7魂 · 防守', options: [
    ['resist', '开场100AV内效果抵抗+20个百分点'],
    ['rescue', '首次受伤后存活且生命低于35%，获得8%自身生命护盾'],
  ] },
  { slot: 7, level: 70, name: '第8魂 · 支援', options: [
    ['reserve', '跨波额外保留至多10%门槛的已有能量，不超过容量'],
    ['point', '开场全队共同获得1战技点，同类不叠加'],
  ] },
  { slot: 8, level: 80, name: '第9魂 · 攻击', options: [
    ['break', '首次本人破韧后，下一主动主包增伤8%'],
    ['opening', '每波首次主动命中额外削韧10'],
  ] },
] as const;
export type FunctionalSoulChoice = 'resist' | 'rescue' | 'reserve' | 'point' | 'break' | 'opening';
export type FunctionalSouls = Partial<Record<6 | 7 | 8, FunctionalSoulChoice>>;
export function functionalSoulUnlocked(c: Companion, slot: number) {
  const rule = FUNCTIONAL_SOULS.find(s => s.slot === slot);
  return !!rule && c.level >= rule.level && [`common-${slot + 1}`, `exclusive-${slot + 1}`].includes(c.rings?.[slot - 6] ?? '');
}
export function hasFunctionalSoul(c: Companion, choice: FunctionalSoulChoice) {
  const rule = FUNCTIONAL_SOULS.find(s => s.options.some(([id]) => id === choice));
  return !!rule && functionalSoulUnlocked(c, rule.slot) && c.v2FunctionalSouls?.[rule.slot] === choice;
}
export function hydrateFunctionalSouls(value: unknown): FunctionalSouls {
  if (!value || typeof value !== 'object') return {};
  const result: FunctionalSouls = {};
  for (const rule of FUNCTIONAL_SOULS) {
    const choice = (value as Record<number, unknown>)[rule.slot];
    if (rule.options.some(([id]) => id === choice)) result[rule.slot] = choice as FunctionalSoulChoice;
  }
  return result;
}
