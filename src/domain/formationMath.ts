import type { PathId } from './combat'
import type { EquippedCombatKit } from './fourStar'

export const FORMATION_SLOTS = ['tank', 'healer', 'carry1', 'carry2', 'specialist'] as const
export type FormationSlot = typeof FORMATION_SLOTS[number]
/** Anonymous balance fixture, not a collectible character. */
export interface RoleTemplate {
  slot: FormationSlot
  kind: 'premium' | 'starter'
  constellation: number
  specialties: PathId[]
  compatible: PathId[]
  combatKit?: EquippedCombatKit
}
export interface NumericFormation { path: PathId; members: RoleTemplate[] }
export type InvestmentPlan = 'complete' | 'focused' | 'maxed'
