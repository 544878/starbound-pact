import { COMBAT_PATHS } from './combat'
import { COMBAT_POINT_SCALE } from './combatScale'
import { PATH_BUFFS, ROLE_BUDGET, SUPPORT_CONSTELLATION } from './formationMath'
import type { CombatStats, PathId } from '../domain/combat'
import type { FormationSlot } from '../domain/formationMath'
import type { FourStarCharacter, NumericEquipment } from '../domain/fourStar'

// Every row is an explicit character budget. There are no names, traits or growth curves.
type Seed = [string, FormationSlot, PathId[], PathId[], number, number, number, Partial<CombatStats>]
const SEEDS: Seed[] = [
  ['R4-001', 'carry1', ['inverse'], ['mortal'], 1.02, 1, 1, { reflect: .44, pursuit: .10 }],
  ['R4-002', 'carry1', ['mortal'], ['desire'], 1, 1, 1, { crit: .28, dot: .10 }],
  ['R4-003', 'carry1', ['desire'], ['dream'], 1, 1, 1, { lifesteal: .24, crit: .22 }],
  ['R4-004', 'carry1', ['flame'], ['end'], 1, 1, 1, { dot: .68, pursuit: .03 }],
  ['R4-005', 'carry1', ['dream'], ['time'], 1, 1, 1, { crit: .62, pursuit: .10 }],
  ['R4-006', 'carry1', ['memory'], ['time'], 1, 1, 1, { pursuit: .68, dot: .05 }],
  ['R4-007', 'carry1', ['end'], ['flame'], 1, 1, 1, { critDamage: 2.15, dot: .06 }],
  ['R4-008', 'carry1', ['time'], ['memory'], .98, 1, 1, { pursuit: .42, dot: .12 }],
  ['R4-009', 'carry2', ['inverse'], ['mortal'], .98, 1.05, 1.05, { reflect: .46, pursuit: .14 }],
  ['R4-010', 'carry2', ['mortal'], ['inverse'], 1, 1.04, 1, { crit: .20, pursuit: .24 }],
  ['R4-011', 'carry2', ['desire'], ['mortal'], 1, 1.02, 1, { vulnerability: .32, dot: .16 }],
  ['R4-012', 'carry2', ['flame'], ['memory'], 1, 1.02, 1, { dot: .60, pursuit: .10 }],
  ['R4-013', 'carry2', ['dream'], ['desire'], 1.02, 1.02, 1, { crit: .55, critDamage: 2.25 }],
  ['R4-014', 'carry2', ['memory'], ['flame'], 1, 1.02, 1, { pursuit: .60, dot: .12 }],
  ['R4-015', 'carry2', ['end'], ['dream'], 1, 1.02, 1, { crit: .28, critDamage: 2.0 }],
  ['R4-016', 'carry2', ['time'], ['end'], 1, 1.02, 1, { pursuit: .36, dot: .18 }],
  ['R4-017', 'specialist', ['inverse'], ['mortal'], 1, 1, 1, {}],
  ['R4-018', 'specialist', ['mortal'], ['desire'], 1, 1, 1, {}],
  ['R4-019', 'specialist', ['desire'], ['dream'], 1, 1, 1, {}],
  ['R4-020', 'specialist', ['flame'], ['memory'], 1, 1, 1, {}],
  ['R4-021', 'specialist', ['dream'], ['time'], 1, 1, 1, {}],
  ['R4-022', 'specialist', ['memory'], ['flame'], 1, 1, 1, {}],
  ['R4-023', 'specialist', ['end'], ['inverse'], 1, 1, 1, {}],
  ['R4-024', 'specialist', ['time'], ['end'], 1, 1, 1, {}],
  ['R4-025', 'tank', ['inverse', 'mortal'], ['desire'], 1, 1, 1, { reflect: .14 }],
  ['R4-026', 'tank', ['flame', 'end'], ['time'], 1, 1.05, 1.05, { reflect: .06, dot: .50 }],
  ['R4-027', 'tank', ['dream', 'memory'], ['time'], 1, 1.1, 1.1, { crit: .45, critDamage: 1.8, reflect: .08 }],
  ['R4-028', 'healer', ['mortal', 'desire'], ['inverse'], 1, 1, 1, { lifesteal: .12 }],
  ['R4-029', 'healer', ['flame', 'memory'], ['dream'], 1, 1.05, 1.05, { dot: .50, lifesteal: .08 }],
  ['R4-030', 'healer', ['end', 'time'], ['dream'], 1, 1.08, 1.08, { crit: .20, critDamage: 1.8, lifesteal: .08 }],
]

export const CHARACTER_PERSONAL_BONUSES = [0, .04, .22, .26, .30, .39, .54] as const
const ACTIONS: Record<PathId, [number, number, number]> = {
  inverse: [1, .9, 1.1], mortal: [.9, 1, 1.1], desire: [.85, 1, 1.15], flame: [.85, .95, 1.2],
  dream: [.7, 1, 1.3], memory: [.9, .9, 1.2], end: [.75, 1, 1.25], time: [.7, .9, 1.4],
}
export const EQUIPMENT_BUFF: Record<PathId, { stat: keyof CombatStats; amount: number }> = {
  inverse: { stat: 'reflect', amount: .06 }, mortal: { stat: 'lifesteal', amount: .03 },
  desire: { stat: 'vulnerability', amount: .06 }, flame: { stat: 'dot', amount: .09 },
  dream: { stat: 'crit', amount: .06 }, memory: { stat: 'pursuit', amount: .09 },
  end: { stat: 'critDamage', amount: .15 }, time: { stat: 'pursuit', amount: .06 },
}

function buildCharacter([id, slot, specialties, compatible, atk, hp, def, patch]: Seed): FourStarCharacter {
  const path = COMBAT_PATHS.find(p => p.id === specialties[0])!
  const role = ROLE_BUDGET[slot]
  const target: CombatStats = { ...path.stats, ...patch, attack: path.stats.attack * role.attack * atk * COMBAT_POINT_SCALE, hp: path.stats.hp * role.hp * hp * COMBAT_POINT_SCALE, defense: path.stats.defense * role.defense * def }
  const buff = EQUIPMENT_BUFF[path.id]
  const baseStats = { ...target, attack: target.attack * .6, hp: target.hp * .7, defense: target.defense * .7, [buff.stat]: target[buff.stat] - buff.amount }
  const equipment = (type: 'weapon' | 'ring', index: number): NumericEquipment => ({
    id: `${id}-${type === 'weapon' ? 'W' : `R${index}`}`, type, slot: index, maxed: true,
    age: type === 'ring' ? 100000 : null, color: type === 'ring' ? 'red' : null,
    flat: { attack: target.attack * (type === 'weapon' ? .25 : .05), hp: type === 'weapon' ? 0 : target.hp * .1, defense: type === 'weapon' ? 0 : target.defense * .1 },
    buff: { id: `${id}-${type === 'weapon' ? 'W' : `R${index}`}-B`, ...buff, amount: buff.amount * (type === 'weapon' ? .4 : .2), specialties, compatible },
  })
  const coefficients: [number, number, number] = slot === 'carry2' ? [1, 1.05, .95] : [...ACTIONS[path.id]]
  const carry = slot === 'carry1' || slot === 'carry2'
  const roleDescription = slot === 'tank' ? '存活时承担攻击包65%，全队减伤8%×职责效能；提供双C联动6%。' : slot === 'healer' ? '行动结束后每轮治疗所有存活队友各自最大生命3%×职责效能；提供双C联动6%。' : slot === 'specialist' ? `存活时提供双C联动20%；在${path.name}阵法激活专属Buff：${PATH_BUFFS[path.id].description}。` : '双C均存活且适配时共享一份10%联动；不能叠成20%。'
  const passive = `${roleDescription}满配第一专精面板：追击系数${Number((target.pursuit * 100).toFixed(4))}%，每次行动最多一次；DoT满层系数${Number((target.dot * 100).toFixed(4))}%，每轮一层、最多三层（跨体系按实际面板结算）。${path.id === 'memory' ? '追击前两轮按1/3、2/3系数启动。' : ''}${path.id === 'end' ? '目标行动前生命≤30%时直接伤害加算25%。' : ''}${path.id === 'time' ? '每第三轮直接伤害加算45%。' : ''}`
  return {
    id, rarity: 4, slot, specialties, compatible, mechanicPath: path.id, progression: null, baseStats,
    weapon: equipment('weapon', 0), rings: [equipment('ring', 1), equipment('ring', 2), equipment('ring', 3)],
    skills: [
      { id: `${id}-S1`, kind: 'normal', target: 'oneBoss', directCoefficient: coefficients[0], description: '第1、4、7…回合使用；一次直接攻击，可暴击。' },
      { id: `${id}-S2`, kind: 'skill', target: 'oneBoss', directCoefficient: coefficients[1], description: '第2、5、8…回合使用；替代普攻，一次直接攻击，可暴击。' },
      { id: `${id}-S3`, kind: 'burst', target: 'oneBoss', directCoefficient: coefficients[2], description: '第3、6、9…回合使用；替代普攻，一次直接攻击，可暴击。不另设能量或额外行动。' },
      { id: `${id}-S4`, kind: 'passive', target: slot === 'healer' ? 'allLivingAllies' : slot === 'tank' ? 'self' : 'bothCarries', directCoefficient: 0, description: passive },
    ],
    exclusiveBuff: { id: `${id}-B`, link: carry ? .1 : slot === 'specialist' ? .2 : .06, description: roleDescription + (id === 'R4-025' ? '仅逆道阵法内自身反伤增加30个百分点，其他阵法不生效。' : ''), statBonus: id === 'R4-025' ? { path: 'inverse', stat: 'reflect', amount: .30 } : null },
    constellations: Array.from({ length: 6 }, (_, i) => {
      const rank = i + 1
      const personalBonus = carry ? CHARACTER_PERSONAL_BONUSES[rank] : SUPPORT_CONSTELLATION[rank]
      const supportBonus = carry ? 0 : SUPPORT_CONSTELLATION[rank]
      const delta = personalBonus - (carry ? CHARACTER_PERSONAL_BONUSES[i] : SUPPORT_CONSTELLATION[i])
      return { rank, personalBonus, supportBonus, effect: carry ? `自身直接/追击/DoT加算池累计+${Math.round(personalBonus * 100)}%（本命+${Math.round(delta * 100)}个百分点）。${rank === 2 ? '关键数值节点。' : ''}${rank === 6 ? '仅首轮直接攻击改用本角色爆发系数；DoT与记忆追击开场即满层，此后仍最多三层。不增加行动、不重置全队时序。' : ''}` : `自身直接/追击/DoT加算池累计+${Math.round(personalBonus * 100)}%；${slot === 'tank' ? '全队减伤及6%联动' : slot === 'healer' ? '3%治疗及6%联动' : '20%联动及本角色专属Buff'}效能累计提高${Math.round(supportBonus * 100)}%（本命+${Math.round(delta * 100)}个百分点）。仍受联动池45%上限约束。` }
    }),
  }
}

export const FOUR_STAR_CHARACTERS = SEEDS.map(buildCharacter)

export const FOUR_STAR_TEAMS: Record<PathId, [string, string, string, string, string]> = {
  inverse: ['R4-025', 'R4-028', 'R4-001', 'R4-009', 'R4-017'],
  mortal: ['R4-025', 'R4-028', 'R4-002', 'R4-010', 'R4-018'],
  desire: ['R4-025', 'R4-028', 'R4-003', 'R4-011', 'R4-019'],
  flame: ['R4-026', 'R4-029', 'R4-004', 'R4-012', 'R4-020'],
  dream: ['R4-027', 'R4-029', 'R4-005', 'R4-013', 'R4-021'],
  memory: ['R4-027', 'R4-029', 'R4-006', 'R4-014', 'R4-022'],
  end: ['R4-026', 'R4-030', 'R4-007', 'R4-015', 'R4-023'],
  time: ['R4-027', 'R4-030', 'R4-008', 'R4-016', 'R4-024'],
}
