import type { PathId } from '../domain/combat';
import type { Companion } from '../domain/types';
import { FORMATION_LAYOUTS } from './formationLayouts';

export interface FormationThemeInfo {
  id: PathId;
  name: string;
  formationName: string;
  subTitle: string;
  trait: string;
  passive: string;
  color: string;
  glowColor: string;
  borderColor: string;
  bgGradient: string;
  rune: string;
  astralMark: string;
}

export const FORMATION_THEMES: Record<PathId, FormationThemeInfo> = {
  inverse: {
    id: 'inverse',
    name: '逆道',
    formationName: '逆鳞锋阵',
    subTitle: FORMATION_LAYOUTS.inverse.description,
    trait: '承伤反击 · 坚如磐石',
    passive: '全队防御大幅提升，反伤属性+45%，受击后蓄势反震。',
    color: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.35)',
    borderColor: '#ca8a04',
    bgGradient: 'radial-gradient(ellipse at 50% 20%, rgba(202, 138, 4, 0.25) 0%, rgba(20, 25, 33, 0.95) 75%)',
    rune: '🛡️',
    astralMark: '✦ 逆鳞',
  },
  mortal: {
    id: 'mortal',
    name: '红尘',
    formationName: '同心雁阵',
    subTitle: FORMATION_LAYOUTS.mortal.description,
    trait: '众生同愿 · 均衡续航',
    passive: '全队生命上限与承伤均衡，全员存活时直接伤害+10%。',
    color: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.35)',
    borderColor: '#059669',
    bgGradient: 'radial-gradient(ellipse at 50% 20%, rgba(16, 185, 129, 0.25) 0%, rgba(20, 25, 33, 0.95) 75%)',
    rune: '🍃',
    astralMark: '✦ 同心',
  },
  desire: {
    id: 'desire',
    name: '色欲',
    formationName: '花庭环阵',
    subTitle: FORMATION_LAYOUTS.desire.description,
    trait: '春息繁花 · 嗜血易伤',
    passive: '附带高额攻击吸血与敌方易伤，攻击续航随回合不断攀升。',
    color: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.35)',
    borderColor: '#e11d48',
    bgGradient: 'radial-gradient(ellipse at 50% 20%, rgba(244, 63, 94, 0.25) 0%, rgba(20, 25, 33, 0.95) 75%)',
    rune: '🌸',
    astralMark: '✦ 花庭',
  },
  flame: {
    id: 'flame',
    name: '极炎',
    formationName: '燎原楔阵',
    subTitle: FORMATION_LAYOUTS.flame.description,
    trait: '炽焰焚天 · 叠层灼烧',
    passive: '持续伤害提高15%，累积三层灼烧后引爆焚界烈焰。',
    color: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.35)',
    borderColor: '#ea580c',
    bgGradient: 'radial-gradient(ellipse at 50% 20%, rgba(249, 115, 22, 0.25) 0%, rgba(20, 25, 33, 0.95) 75%)',
    rune: '🔥',
    astralMark: '✦ 燎原',
  },
  dream: {
    id: 'dream',
    name: '梦境',
    formationName: '幻镜错阵',
    subTitle: FORMATION_LAYOUTS.dream.description,
    trait: '镜花水月 · 极境暴击',
    passive: '暴击率大幅跃升，暴击伤害突破极限，直接贯穿薄弱环节。',
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.35)',
    borderColor: '#9333ea',
    bgGradient: 'radial-gradient(ellipse at 50% 20%, rgba(168, 85, 247, 0.25) 0%, rgba(20, 25, 33, 0.95) 75%)',
    rune: '🌙',
    astralMark: '✦ 幻镜',
  },
  memory: {
    id: 'memory',
    name: '记忆',
    formationName: '回潮叠阵',
    subTitle: FORMATION_LAYOUTS.memory.description,
    trait: '沧海潮涌 · 连携回响',
    passive: '追击伤害提高15%，行动累积三重连携回响，无隙连攻。',
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.35)',
    borderColor: '#0891b2',
    bgGradient: 'radial-gradient(ellipse at 50% 20%, rgba(6, 182, 212, 0.25) 0%, rgba(20, 25, 33, 0.95) 75%)',
    rune: '🌊',
    astralMark: '✦ 回潮',
  },
  end: {
    id: 'end',
    name: '终末',
    formationName: '终夜镰阵',
    subTitle: FORMATION_LAYOUTS.end.description,
    trait: '永夜裁衡 · 残血斩杀',
    passive: '目标生命低于30%时直接伤害提升25%，触发决绝斩杀效果。',
    color: '#818cf8',
    glowColor: 'rgba(129, 140, 248, 0.35)',
    borderColor: '#6366f1',
    bgGradient: 'radial-gradient(ellipse at 50% 20%, rgba(99, 102, 241, 0.25) 0%, rgba(20, 25, 33, 0.95) 75%)',
    rune: '⚔️',
    astralMark: '✦ 终夜',
  },
  time: {
    id: 'time',
    name: '时序',
    formationName: '时轮星阵',
    subTitle: FORMATION_LAYOUTS.time.description,
    trait: '岁序逆流 · 周期爆发',
    passive: '每三轮直接伤害暴增45%，每次行动加速恢复5点能量。',
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.35)',
    borderColor: '#0284c7',
    bgGradient: 'radial-gradient(ellipse at 50% 20%, rgba(56, 189, 248, 0.25) 0%, rgba(20, 25, 33, 0.95) 75%)',
    rune: '⏳',
    astralMark: '✦ 时轮',
  },
};

export function getCompanionPrimaryPath(c: Companion): PathId {
  return c.path ?? 'mortal';
}

export function getCompanionAdaptedPath(c: Companion): PathId {
  if (c.adaptedPath) return c.adaptedPath;
  const p = getCompanionPrimaryPath(c);
  return p === 'inverse' ? 'mortal' : 'inverse';
}

export interface ResonanceResult {
  type: 'specialty' | 'adapted' | 'none';
  label: string;
  bonus: string;
  percent: number;
  badgeClass: string;
}

export function getCompanionResonance(c: Companion, activePath: PathId): ResonanceResult {
  const primary = getCompanionPrimaryPath(c);
  const adapted = getCompanionAdaptedPath(c);

  if (primary === activePath) {
    return {
      type: 'specialty',
      label: '★ 专精共鸣',
      bonus: '原生体系 · 使用角色自身技能',
      percent: 100,
      badgeClass: 'resonance-specialty',
    };
  }

  if (adapted === activePath) {
    return {
      type: 'adapted',
      label: '✦ 体系适配',
      bonus: '跨队协同 · 完整保留面板',
      percent: 100,
      badgeClass: 'resonance-adapted',
    };
  }

  return {
    type: 'none',
    label: '中立出战',
    bonus: '自由编队 · 完整保留面板',
    percent: 100,
    badgeClass: 'resonance-none',
  };
}

export function countTeamResonance(
  formation: Array<string | null>,
  companions: Companion[],
  activePath: PathId
) {
  let specialtyCount = 0;
  let adaptedCount = 0;
  let totalCount = 0;

  for (const id of formation) {
    if (!id) continue;
    const c = companions.find((item) => item.id === id);
    if (!c) continue;
    totalCount++;
    const res = getCompanionResonance(c, activePath);
    if (res.type === 'specialty') specialtyCount++;
    else if (res.type === 'adapted') adaptedCount++;
  }

  return { specialtyCount, adaptedCount, totalCount };
}
