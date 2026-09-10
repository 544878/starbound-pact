import { FOUR_STAR_CHARACTERS, FOUR_STAR_TEAMS } from '../data/fourStarCharacters'
import { FGO_CHARACTERS_MAP } from '../data/fgoCollab'
import { WUWA_CHARACTERS_MAP } from '../data/wuwaCollab'
import { COMBAT_POINT_SCALE } from '../data/combatScale'
import type { CombatStats, PathId } from '../domain/combat'
import type { FourStarCharacter } from '../domain/fourStar'
import type { InvestmentPlan, NumericFormation, RoleTemplate } from '../domain/formationMath'
import { normalizeStats } from './combatMath'
import { validateFormation } from './formationMath'

export function equippedStats(character: FourStarCharacter, path: PathId): CombatStats {
  const stats = { ...character.baseStats }
  for (const item of [character.weapon, ...character.rings]) {
    stats.attack += item.flat.attack
    stats.hp += item.flat.hp
    stats.defense += item.flat.defense
    const a = item.buff.specialties.includes(path) ? 1 : item.buff.compatible.includes(path) ? .65 : 0
    stats[item.buff.stat] += item.buff.amount * a
  }
  const bonus = character.exclusiveBuff.statBonus
  if (bonus?.path === path) stats[bonus.stat] += bonus.amount
  // Attribute caps are still expressed in original balance units, including HP and attack.
  const normalized = normalizeStats({ ...stats, attack: stats.attack / COMBAT_POINT_SCALE, hp: stats.hp / COMBAT_POINT_SCALE })
  return { ...normalized, attack: normalized.attack * COMBAT_POINT_SCALE, hp: normalized.hp * COMBAT_POINT_SCALE }
}

export function characterMember(id: string, path: PathId, constellation = 0): RoleTemplate {
  const character = WUWA_CHARACTERS_MAP[id] ?? FGO_CHARACTERS_MAP[id] ?? FOUR_STAR_CHARACTERS.find(c => c.id === id)
  if (!character) throw new Error(`未找到角色编号 ${id}`)
  if (!Number.isInteger(constellation) || constellation < 0 || constellation > 6) throw new Error('命座必须为0至6的整数')
  const stats = equippedStats(character, path)
  return {
    slot: character.slot, kind: 'premium', constellation, specialties: [...character.specialties], compatible: [...character.compatible],
    combatKit: {
      stats: { ...stats, attack: stats.attack / COMBAT_POINT_SCALE, hp: stats.hp / COMBAT_POINT_SCALE },
      mechanicPath: character.mechanicPath,
      actionCoefficients: [character.skills[0].directCoefficient, character.skills[1].directCoefficient, character.skills[2].directCoefficient],
      personalBonuses: [0, ...character.constellations.map(c => c.personalBonus)] as [number, number, number, number, number, number, number],
      supportBonuses: [0, ...character.constellations.map(c => c.supportBonus)] as [number, number, number, number, number, number, number],
      openingAtC6: character.slot === 'carry1' || character.slot === 'carry2',
      linkCoefficient: character.exclusiveBuff.link,
    },
  }
}

export function characterFormation(path: PathId, ids: string[], ranks: number[] = [0, 0, 0, 0, 0]): NumericFormation {
  if (ids.length !== 5 || new Set(ids).size !== 5 || ranks.length !== 5) throw new Error('阵法需要五个不同角色和五个命座值')
  const team = { path, members: ids.map((id, index) => characterMember(id, path, ranks[index])) }
  validateFormation(team)
  return team
}

export function fourStarFixture(path: PathId, plan: InvestmentPlan): NumericFormation {
  const ranks = plan === 'maxed' ? [6, 6, 6, 6, 6] : plan === 'focused' ? [0, 0, 2, 0, 0] : [0, 0, 0, 0, 0]
  const team = characterFormation(path, FOUR_STAR_TEAMS[path], ranks)
  if (plan === 'focused') {
    team.members[0] = { slot: 'tank', kind: 'starter', constellation: 0, specialties: [], compatible: [] }
    team.members[1] = { slot: 'healer', kind: 'starter', constellation: 0, specialties: [], compatible: [] }
  }
  return team
}
