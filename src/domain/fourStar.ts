import type { CombatStats, PathId } from './combat'
import type { FormationSlot } from './formationMath'

export interface EquippedCombatKit {
  /** Original balance units; the formation API scales outputs by 250. */
  stats: CombatStats
  mechanicPath: PathId
  actionCoefficients: [number, number, number]
  personalBonuses: [number, number, number, number, number, number, number]
  supportBonuses: [number, number, number, number, number, number, number]
  openingAtC6: boolean
  linkCoefficient: number
}
export interface NumericEquipment {
  id: string
  type: 'weapon' | 'ring'
  slot: number
  maxed: true
  age: 100000 | null
  color: 'red' | null
  flat: Pick<CombatStats, 'attack' | 'hp' | 'defense'>
  buff: { id: string; stat: keyof CombatStats; amount: number; specialties: PathId[]; compatible: PathId[] }
}
export interface NumericSkill {
  id: string
  kind: 'normal' | 'skill' | 'burst' | 'passive'
  target: 'oneBoss' | 'self' | 'allLivingAllies' | 'bothCarries'
  directCoefficient: number
  description: string
}
export interface NumericConstellation {
  rank: number
  personalBonus: number
  supportBonus: number
  effect: string
}
export interface FourStarCharacter {
  id: string
  rarity: 4
  slot: FormationSlot
  specialties: PathId[]
  compatible: PathId[]
  mechanicPath: PathId
  progression: null
  /** Max-level C0, no equipment. Attack/HP use current combat points, defense is unscaled. */
  baseStats: CombatStats
  weapon: NumericEquipment
  rings: [NumericEquipment, NumericEquipment, NumericEquipment]
  skills: [NumericSkill, NumericSkill, NumericSkill, NumericSkill]
  exclusiveBuff: { id: string; link: number; description: string; statBonus: { path: PathId; stat: keyof CombatStats; amount: number } | null }
  constellations: NumericConstellation[]
}
