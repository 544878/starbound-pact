import { COMBAT_PATHS, NEUTRAL_BOSS } from '../data/combat'
import { COMBAT_POINT_SCALE } from '../data/combatScale'
import { PERSONAL_CONSTELLATION, ROLE_BUDGET, SUPPORT_CONSTELLATION } from '../data/formationMath'
import type { BossRule, PathId } from '../domain/combat'
import { FORMATION_SLOTS, type NumericFormation, type RoleTemplate } from '../domain/formationMath'
import { damageChannels, defenseMultiplier, normalizeStats, resolveHit } from './combatMath'

const pathIds = new Set(COMBAT_PATHS.map(p => p.id))
export function validateFormation(team: NumericFormation): void {
  if (!pathIds.has(team.path) || team.members.length !== 5 || new Set(team.members.map(m => m.slot)).size !== 5) throw new Error('阵法必须恰好包含五种指定位置')
  for (const m of team.members) {
    const tags = [...m.specialties, ...m.compatible]
    if (!FORMATION_SLOTS.includes(m.slot) || !['starter', 'premium'].includes(m.kind) || !Number.isInteger(m.constellation) || m.constellation < 0 || m.constellation > 6) throw new Error('无效位置或命座')
    if (tags.some(p => !pathIds.has(p)) || new Set(tags).size !== tags.length || tags.length > 3 || m.specialties.length > 2) throw new Error('最多适配三个体系，专精一至两个，不可重复')
    if (m.kind === 'premium' && m.specialties.length < 1) throw new Error('正式模板至少专精一个体系')
    if (m.kind === 'starter' && (tags.length > 0 || m.constellation !== 0 || !['tank', 'healer'].includes(m.slot))) throw new Error('基础替补只提供零命抗伤或治疗，不提供体系标签')
    if (m.combatKit && (!pathIds.has(m.combatKit.mechanicPath) || m.combatKit.actionCoefficients.length !== 3 || m.combatKit.personalBonuses.length !== 7 || m.combatKit.supportBonuses.length !== 7 || [...Object.values(m.combatKit.stats), ...m.combatKit.actionCoefficients, ...m.combatKit.personalBonuses, ...m.combatKit.supportBonuses, m.combatKit.linkCoefficient].some(v => !Number.isFinite(v) || v < 0))) throw new Error('角色战斗配置无效')
  }
}

export function affinity(member: RoleTemplate, path: PathId): number {
  return member.specialties.includes(path) ? 1 : member.compatible.includes(path) ? .65 : 0
}
export function acquisitionCopies(team: NumericFormation): number {
  validateFormation(team)
  return team.members.reduce((n, m) => n + (m.kind === 'starter' ? 0 : m.constellation + 1), 0)
}
export function teamBoss(boss: BossRule = NEUTRAL_BOSS): BossRule {
  return { ...boss, hp: 65000 * COMBAT_POINT_SCALE, attack: boss.attack * (4200 / 900) * COMBAT_POINT_SCALE }
}

/** Public combat-point API. Keep the original balance-unit calculation exact. */
export function simulateFormation(team: NumericFormation, boss: BossRule = teamBoss(), rounds = 12) {
  const result = simulateFormationUnits(team, { ...boss, hp: boss.hp / COMBAT_POINT_SCALE, attack: boss.attack / COMBAT_POINT_SCALE }, rounds)
  return {
    ...result,
    damage: result.damage * COMBAT_POINT_SCALE,
    logs: result.logs.map(row => ({
      ...row,
      damage: row.damage * COMBAT_POINT_SCALE,
      healing: row.healing * COMBAT_POINT_SCALE,
      incoming: row.incoming * COMBAT_POINT_SCALE,
      hp: row.hp.map(hp => hp * COMBAT_POINT_SCALE),
      bossHp: row.bossHp * COMBAT_POINT_SCALE,
    })),
  }
}

/** Internal balance units retain all original formulas, thresholds and caps. */
function simulateFormationUnits(team: NumericFormation, boss: BossRule, rounds: number) {
  validateFormation(team)
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 1000) throw new Error('回合数必须为1至1000的整数')
  if (!Number.isFinite(boss.hp) || boss.hp <= 0 || boss.hp > 1000000 || !Number.isFinite(boss.attack) || boss.attack < 0) throw new Error('Boss生命或攻击无效')
  const base = COMBAT_PATHS.find(p => p.id === team.path)!
  const units = FORMATION_SLOTS.map(slot => {
    const member = team.members.find(m => m.slot === slot)!
    const budget = ROLE_BUDGET[slot]
    const a = affinity(member, team.path)
    const stats = member.combatKit
      ? normalizeStats({ ...member.combatKit.stats, attack: member.combatKit.stats.attack * (.65 + .35 * a) })
      : normalizeStats({ ...base.stats, attack: base.stats.attack * budget.attack * (.65 + .35 * a), hp: base.stats.hp * budget.hp, defense: base.stats.defense * budget.defense })
    return { member, a, stats, hp: stats.hp }
  })
  let bossHp = boss.hp
  let previousHealing = false
  let previousHit = false
  const logs: Array<{ round: number; damage: number; healing: number; incoming: number; hp: number[]; bossHp: number }> = []
  for (let round = 1; round <= rounds && bossHp > 0 && units.some(u => u.hp > 0); round++) {
    const aliveAffinity = (index: number) => units[index].hp > 0 ? units[index].a : 0
    const supportPower = (index: number) => 1 + (units[index].member.combatKit?.supportBonuses ?? SUPPORT_CONSTELLATION)[units[index].member.constellation]
    const specialist = aliveAffinity(4) * supportPower(4)
    const signature = units[4].member.combatKit && units[4].member.combatKit.mechanicPath !== team.path ? 0 : specialist
    // All relationship bonuses add in one pool; dead providers immediately stop providing them.
    const link = (index: number, fallback: number) => units[index].member.combatKit?.linkCoefficient ?? fallback
    const links = Math.min(.45, link(0, .06) * aliveAffinity(0) * supportPower(0) + link(1, .06) * aliveAffinity(1) * supportPower(1) + Math.min(link(2, .1), link(3, .1)) * Math.min(aliveAffinity(2), aliveAffinity(3)) + link(4, .2) * specialist)
    const bossRatio = bossHp / boss.hp
    let damage = 0
    let healing = 0
    const heal = (index: number, amount: number) => {
      const u = units[index]
      if (u.hp <= 0) return
      const actual = Math.max(0, Math.min(u.stats.hp - u.hp, amount * (1 - Math.max(0, Math.min(1, boss.healingSuppression)))))
      u.hp += actual
      healing += actual
    }
    for (const [index, u] of units.entries()) {
      if (u.hp <= 0 || bossHp <= 0) continue
      const isCarry = index === 2 || index === 3
      const kit = u.member.combatKit
      const constellation = (kit?.personalBonuses ?? (isCarry ? PERSONAL_CONSTELLATION : SUPPORT_CONSTELLATION))[u.member.constellation]
      const mechanicPath = kit?.mechanicPath ?? team.path
      const channels = damageChannels({ ...base, id: mechanicPath, stats: u.stats }, boss, round, bossRatio)
      const ownPhase = mechanicPath === 'end' && bossRatio <= .3 ? .25 : mechanicPath === 'time' && round % 3 === 0 ? .45 : 0
      const opening = kit?.openingAtC6 && u.member.constellation === 6
      const action = kit ? kit.actionCoefficients[opening && round === 1 ? 2 : (round - 1) % 3] : 1
      if (opening && round < 3) {
        channels.dot /= Math.min(round / 3, 1)
        if (mechanicPath === 'memory') channels.pursuit /= Math.min(round / 3, 1)
      }
      const directBuff = team.path === 'mortal' && aliveAffinity(0) > 0 && aliveAffinity(1) > 0 ? .08 : team.path === 'desire' && previousHealing ? .12 : team.path === 'dream' && u.stats.crit - boss.critSuppression >= .4 ? .12 : team.path === 'end' && bossRatio <= .5 ? .2 : 0
      const pursuitBuff = team.path === 'mortal' && aliveAffinity(0) > 0 && aliveAffinity(1) > 0 ? .12 : team.path === 'memory' && round >= 3 && aliveAffinity(2) > 0 && aliveAffinity(3) > 0 ? .3 : team.path === 'time' && round % 3 === 0 ? .45 : 0
      const dotBuff = team.path === 'flame' && round >= 3 ? .3 : 0
      // Phase + personal nodes + team links + signature all ADD, preventing multiplying support chains.
      const common = constellation + (isCarry ? links * u.a : 0)
      channels.direct = channels.direct / (1 + ownPhase) * action * (1 + ownPhase + common + directBuff * signature * u.a)
      channels.pursuit *= 1 + common + pursuitBuff * signature * u.a
      channels.dot *= 1 + common + dotBuff * signature * u.a
      let stealable = 0
      for (const channel of ['direct', 'pursuit', 'dot'] as const) {
        const hit = resolveHit(bossHp, channels[channel])
        bossHp = hit.hp
        damage += hit.loss
        if (channel !== 'dot') stealable += hit.loss
      }
      heal(index, Math.min(u.stats.hp * .08, stealable * u.stats.lifesteal))
    }
    // Dedicated healer heals living allies once per round; no overheal, revival or heal-trigger recursion.
    if (units[1].hp > 0 && bossHp > 0) {
      const potency = (.75 + .25 * units[1].a) * supportPower(1)
      units.forEach((u, i) => heal(i, u.stats.hp * .03 * potency))
    }
    let incoming = 0
    if (bossHp > 0) {
      const pattern = boss.pattern === 'burst' ? (round % 3 === 0 ? 2 : .5) : boss.pattern === 'ramp' ? Math.min(1.5, .7 + .1 * (round - 1)) : 1
      const alive = units.map((u, i) => ({ u, i })).filter(({ u }) => u.hp > 0)
      const tankAlive = units[0].hp > 0
      // Boss attack is one simultaneous package. Retaliation resolves after all allocated hits.
      let reflected = 0
      const tankProtection = tankAlive ? .08 * (.75 + .25 * units[0].a) * supportPower(0) : 0
      for (const { u, i } of alive) {
        const share = tankAlive && alive.length > 1 ? (i === 0 ? .65 : .35 / (alive.length - 1)) : 1 / alive.length
        const hit = resolveHit(u.hp, boss.attack * pattern * share * defenseMultiplier(u.stats.defense) * (1 - tankProtection))
        u.hp = hit.hp
        incoming += hit.loss
        if (u.hp > 0) reflected += hit.loss * u.stats.reflect * (1 - Math.max(-.5, Math.min(.75, boss.reflectResistance))) * (1 + (team.path === 'inverse' && previousHit ? .4 * signature * u.a : 0))
      }
      const hit = resolveHit(bossHp, reflected)
      bossHp = hit.hp
      damage += hit.loss
    }
    previousHit = incoming > 0
    previousHealing = healing > 0
    logs.push({ round, damage, healing, incoming, hp: units.map(u => u.hp), bossHp })
  }
  return { damage: logs.reduce((sum, r) => sum + r.damage, 0), hpRatio: units.reduce((sum, u) => sum + u.hp, 0) / units.reduce((sum, u) => sum + u.stats.hp, 0), survivors: units.filter(u => u.hp > 0).length, rounds: logs.length, outcome: bossHp <= 0 ? 'win' : units.every(u => u.hp <= 0) ? 'loss' : 'timeout', logs }
}
