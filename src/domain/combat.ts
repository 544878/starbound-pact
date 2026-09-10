export type PathId = 'inverse' | 'mortal' | 'desire' | 'flame' | 'dream' | 'memory' | 'end' | 'time'

/** All rates use fractions: 0.25 = 25%. critDamage is the total multiplier. */
export interface CombatStats {
  attack: number
  hp: number
  defense: number
  crit: number
  critDamage: number
  pursuit: number
  dot: number
  vulnerability: number
  reflect: number
  lifesteal: number
}

export interface CombatPath {
  id: PathId
  name: string
  strengths: string
  weaknesses: string
  stats: CombatStats
}

export interface BossRule {
  id: PathId
  name: string
  hp: number
  attack: number
  defense: number
  directResistance: number
  pursuitResistance: number
  dotResistance: number
  reflectResistance: number
  critSuppression: number
  vulnerabilityResistance: number
  healingSuppression: number
  pattern: 'steady' | 'burst' | 'ramp'
}
