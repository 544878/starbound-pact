import type { Companion, Element } from '../domain/types'

export const ELEMENT_MATERIAL: Record<Element, string> = { wind: '风灵花蜜', water: '潮汐结晶', light: '曜金碎屑', flora: '森语种子', shadow: '影蚀粉尘', fire: '赤焰芯核' }
export function ascensionStage(unit: { level: number; ascension?: number }) {
  return Math.max(Math.ceil(unit.level / 10) - 1, Math.min(8, Math.max(0, Math.floor(unit.ascension ?? 0))))
}
export const levelCap = (unit: { level: number; ascension?: number }) => Math.min(90, (ascensionStage(unit) + 1) * 10)
export const ascensionCost = (unit: { level: number; ascension?: number }) => (ascensionStage(unit) + 1) * 2
export const skillLevel = (c: Companion, slot: number) => Math.max(1, Math.min(10, c.skillLevels?.[slot] ?? 1))
export const skillMultiplier = (c: Companion, slot: number) => 1 + (skillLevel(c, slot) - 1) * 0.08
export function skillCost(c: Companion, slot: number) {
  const level = skillLevel(c, slot)
  return { level, cap: Math.min(10, ascensionStage(c) + 2), gold: level * 500, book: level * 2, material: ELEMENT_MATERIAL[c.element], count: level }
}
