import type { PathId } from '../domain/combat'
import { FORMATION_SLOTS, type InvestmentPlan, type NumericFormation } from '../domain/formationMath'

// C2 and C6 are the designated key/transformation nodes for this test budget.
export const PERSONAL_CONSTELLATION = [0, .04, .22, .26, .30, .39, .58] as const
export const SUPPORT_CONSTELLATION = [0, .02, .06, .08, .10, .12, .18] as const
export const ROLE_BUDGET = {
  tank: { attack: .12, hp: 2.2, defense: 2.5 },
  healer: { attack: .10, hp: 1.2, defense: 1.2 },
  carry1: { attack: 1, hp: 1, defense: 1 },
  carry2: { attack: .8, hp: 1, defense: 1 },
  specialist: { attack: .18, hp: 1.1, defense: 1.1 },
} as const

export const PATH_BUFFS: Record<PathId, { name: string; description: string }> = {
  inverse: { name: '逆鳞', description: '上轮承伤后，本轮反伤提高40%' },
  mortal: { name: '尘缘', description: '存活抗伤位与治疗位形成双联动，直接伤害提高8%，追击提高12%' },
  desire: { name: '惑心', description: '上轮产生有效治疗，本轮直接伤害提高12%' },
  flame: { name: '炎印', description: '满三层后，持续伤害提高30%' },
  dream: { name: '梦契', description: '暴击率达到40%且未被压制到阈值以下，直接伤害提高12%' },
  memory: { name: '共鸣', description: '双C均存活且完成两轮积累，追击提高30%' },
  end: { name: '终兆', description: '目标生命低于50%时直接伤害提高20%，与个人斩杀加算' },
  time: { name: '同刻', description: '每第三轮追击提高45%，不产生额外行动' },
}

export function investmentFixture(path: PathId, plan: InvestmentPlan): NumericFormation {
  return { path, members: FORMATION_SLOTS.map(slot => {
    const starter = plan === 'focused' && (slot === 'tank' || slot === 'healer')
    return { slot, kind: starter ? 'starter' : 'premium', constellation: plan === 'maxed' ? 6 : plan === 'focused' && slot === 'carry1' ? 2 : 0, specialties: starter ? [] : [path], compatible: [] }
  }) }
}
