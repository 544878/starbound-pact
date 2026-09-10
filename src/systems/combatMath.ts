import type { BossRule, CombatPath, CombatStats } from '../domain/combat'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
export function normalizeStats(s: CombatStats): CombatStats {
  return {
    attack: clamp(s.attack, 0, 100000), hp: clamp(s.hp, 1, 1000000), defense: clamp(s.defense, 0, 9000),
    crit: clamp(s.crit, 0, .8), critDamage: clamp(s.critDamage, 1, 2.5), pursuit: clamp(s.pursuit, 0, .8),
    dot: clamp(s.dot, 0, .8), vulnerability: clamp(s.vulnerability, 0, .5), reflect: clamp(s.reflect, 0, .5), lifesteal: clamp(s.lifesteal, 0, .25),
  }
}
export const defenseMultiplier = (defense: number) => 1000 / (1000 + clamp(defense, 0, 9000))
const resistanceMultiplier = (resistance: number) => 1 - clamp(resistance, -.5, .75)

export interface DamageChannels { direct: number; pursuit: number; dot: number }
/** Expected-value calculation; no random critical rolls, recursive triggers or intermediate rounding. */
export function damageChannels(path: CombatPath, boss: BossRule, round: number, bossHpRatio = 1): DamageChannels {
  const s = normalizeStats(path.stats)
  const turn = Math.floor(clamp(round, 1, 10000))
  const crit = clamp(s.crit - clamp(boss.critSuppression, 0, .8), 0, .8)
  const vulnerable = 1 + clamp(s.vulnerability * (1 - clamp(boss.vulnerabilityResistance, -.5, 1)), 0, .5)
  const base = s.attack * defenseMultiplier(boss.defense) * vulnerable
  const phase = path.id === 'time' && turn % 3 === 0 ? 1.45 : path.id === 'end' && bossHpRatio <= .3 ? 1.25 : 1
  const pursuitRamp = path.id === 'memory' ? Math.min(turn / 3, 1) : 1
  return {
    direct: base * (1 + crit * (s.critDamage - 1)) * phase * resistanceMultiplier(boss.directResistance),
    pursuit: base * s.pursuit * pursuitRamp * resistanceMultiplier(boss.pursuitResistance),
    dot: base * s.dot * Math.min(turn / 3, 1) * resistanceMultiplier(boss.dotResistance),
  }
}

export function resolveHit(hp: number, damage: number) {
  const health = clamp(hp, 0, 1000000)
  const loss = Math.min(health, clamp(damage, 0, 1000000000))
  return { hp: health - loss, loss }
}

export function bossAttack(boss: BossRule, round: number) {
  const pattern = boss.pattern === 'burst' ? (round % 3 === 0 ? 2 : 0.5) : boss.pattern === 'ramp' ? Math.min(1.5, 0.7 + 0.1 * (round - 1)) : 1
  return boss.attack * pattern
}

export function simulateCombat(path: CombatPath, boss: BossRule, rounds = 12) {
  const s = normalizeStats(path.stats)
  let hp = s.hp
  let bossHp = clamp(boss.hp, 1, 1000000)
  const log: Array<DamageChannels & { round: number; reflected: number; healed: number; incoming: number; hp: number; bossHp: number; damage: number }> = []
  for (let round = 1; round <= Math.floor(clamp(rounds, 1, 1000)) && hp > 0 && bossHp > 0; round++) {
    const channels = damageChannels(path, boss, round, bossHp / boss.hp)
    // Direct -> pursuit -> DoT. Only actual direct/pursuit HP loss can heal.
    let stealable = 0
    let damage = 0
    for (const key of ['direct', 'pursuit', 'dot'] as const) {
      const hit = resolveHit(bossHp, channels[key])
      bossHp = hit.hp
      damage += hit.loss
      if (key !== 'dot') stealable += hit.loss
    }
    const healed = Math.min(s.hp - hp, stealable * s.lifesteal * (1 - clamp(boss.healingSuppression, 0, 1)), s.hp * .08)
    hp += healed
    const pattern = boss.pattern === 'burst' ? (round % 3 === 0 ? 2 : .5) : boss.pattern === 'ramp' ? Math.min(1.5, .7 + .1 * (round - 1)) : 1
    const hit = resolveHit(hp, bossHp > 0 ? clamp(boss.attack, 0, 100000) * pattern * defenseMultiplier(s.defense) : 0)
    hp = hit.hp
    // Lethal hits cannot reflect; reflected damage never triggers effects or heals.
    const reflected = hp > 0 ? Math.min(bossHp, hit.loss * s.reflect * resistanceMultiplier(boss.reflectResistance)) : 0
    bossHp -= reflected
    damage += reflected
    log.push({ ...channels, round, reflected, healed, incoming: hit.loss, hp, bossHp, damage })
  }
  return { damage: log.reduce((sum, row) => sum + row.damage, 0), hp, bossHp, rounds: log.length, outcome: bossHp <= 0 ? 'win' : hp <= 0 ? 'loss' : 'timeout', log }
}
