import type { BossRule, CombatPath, CombatStats } from '../domain/combat'

const stats = (attack: number, hp: number, defense: number, crit: number, critDamage: number, pursuit: number, dot: number, vulnerability: number, reflect: number, lifesteal: number): CombatStats =>
  ({ attack, hp, defense, crit, critDamage, pursuit, dot, vulnerability, reflect, lifesteal })

export const COMBAT_PATHS: CombatPath[] = [
  { id: 'inverse', name: '逆道', strengths: '反伤、防御；承受直接攻击后反击', weaknesses: '低暴击、低主动爆发；敌方低频攻击时收益低', stats: stats(880, 12000, 650, .1, 1.5, .12, .04, .05, .45, .02) },
  { id: 'mortal', name: '红尘', strengths: '生命、稳定输出、均衡续航', weaknesses: '爆发和单一伤害通道上限低', stats: stats(900, 13000, 450, .25, 1.65, .2, .14, .1, .08, .1) },
  { id: 'desire', name: '色欲', strengths: '易伤、吸血；依靠主动攻击续航', weaknesses: '低生命防御；惧怕禁疗与瞬间爆发', stats: stats(840, 9500, 300, .2, 1.7, .16, .12, .35, .02, .25) },
  { id: 'flame', name: '极炎', strengths: '持续伤害；三层灼烧后持续输出高', weaknesses: '启动慢、暴击收益低；惧怕持续伤害抗性', stats: stats(900, 10500, 350, .1, 1.5, .05, .65, .05, .02, .03) },
  { id: 'dream', name: '梦境', strengths: '暴击率与爆伤；直接伤害强', weaknesses: '持续伤害弱、身板脆；惧怕暴击压制', stats: stats(760, 10000, 300, .6, 2.2, .12, .04, .12, 0, .05) },
  { id: 'memory', name: '记忆', strengths: '追击；行动积累三层回响', weaknesses: '首轮弱；惧怕追击抗性', stats: stats(820, 11000, 400, .2, 1.65, .65, .08, .08, .04, .05) },
  { id: 'end', name: '终末', strengths: '高攻击爆伤；目标生命低于30%时直接伤害提高25%', weaknesses: '低暴击率、低续航；斩杀阶段之前效率低', stats: stats(1040, 10000, 300, .25, 2.1, .08, .08, .04, .02, .02) },
  { id: 'time', name: '时序', strengths: '追击与周期爆发；每三轮直接伤害提高45%', weaknesses: '普通轮输出低；伤害依赖周期', stats: stats(800, 10500, 400, .25, 1.7, .4, .14, .08, .02, .05) },
]

export const NEUTRAL_BOSS: BossRule = {
  id: 'mortal', name: '标准木桩', hp: 24000, attack: 900, defense: 500,
  directResistance: 0, pursuitResistance: 0, dotResistance: 0, reflectResistance: 0,
  critSuppression: 0, vulnerabilityResistance: 0, healingSuppression: 0, pattern: 'steady',
}

export const BOSSES: BossRule[] = [
  { ...NEUTRAL_BOSS, id: 'inverse', name: '逆道·折锋法则', directResistance: .3, dotResistance: -.15, pattern: 'burst' },
  { ...NEUTRAL_BOSS, id: 'mortal', name: '红尘·厚土法则', defense: 700, vulnerabilityResistance: -.5, reflectResistance: -.2 },
  { ...NEUTRAL_BOSS, id: 'desire', name: '色欲·枯荣法则', healingSuppression: .7, reflectResistance: -.35, attack: 980 },
  { ...NEUTRAL_BOSS, id: 'flame', name: '极炎·焚界法则', dotResistance: .5, directResistance: -.1, pattern: 'ramp' },
  { ...NEUTRAL_BOSS, id: 'dream', name: '梦境·无相法则', critSuppression: .4, pursuitResistance: -.2 },
  { ...NEUTRAL_BOSS, id: 'memory', name: '记忆·断响法则', pursuitResistance: .5, dotResistance: -.15 },
  { ...NEUTRAL_BOSS, id: 'end', name: '终末·残照法则', directResistance: -.12, dotResistance: .15, pattern: 'burst' },
  { ...NEUTRAL_BOSS, id: 'time', name: '时序·迟滞法则', pursuitResistance: .25, vulnerabilityResistance: .5, reflectResistance: -.4, pattern: 'ramp' },
]

