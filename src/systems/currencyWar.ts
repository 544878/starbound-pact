import { companionCatalog as companions } from '../data/catalog'
import { RULES } from '../data/advancedRules'
import { stats, damage } from './growth'
import type { Companion, Weapon } from '../domain/types'
const C = RULES.currency
export interface Recruit {
  uid: number
  id: string
  rank: number
  zone: 'bench' | 'front' | 'back'
}
export interface War {
  round: number
  gold: number
  health: number
  level: number
  shop: (string | null)[]
  roster: Recruit[]
  nextId: number
  locked: boolean
  streak: number
  phase: 'prepare' | 'result' | 'finished'
  log: string[]
  strategy: 'income' | 'assault' | 'reserve'
}
export const cost = (id: string) =>
  companions.find((c) => c.id === id)?.rarity === '5星' ? 3 : 2
export function offers(random = Math.random) {
  return Array.from(
    { length: 5 },
    () =>
      companions[
        Math.min(
          companions.length - 1,
          Math.floor(random() * companions.length),
        )
      ].id,
  )
}
export function createWar(random = Math.random): War {
  return {
    round: 1,
    gold: C.gold,
    health: C.health,
    level: 4,
    shop: offers(random),
    roster: [],
    nextId: 1,
    locked: false,
    streak: 0,
    phase: 'prepare',
    log: [],
    strategy: 'income',
  }
}
export function buy(s: War, index: number): War {
  const id = s.shop[index]
  if (s.phase !== 'prepare' || !id || s.gold < cost(id)) return s
  let roster = [
    ...s.roster,
    { uid: s.nextId, id, rank: 1, zone: 'bench' as const },
  ]
  for (let rank = 1; rank < 3; rank++) {
    const same = roster.filter((u) => u.id === id && u.rank === rank)
    if (same.length >= 3) {
      const ids = same.slice(0, 3).map((u) => u.uid)
      const first = same.find((u) => u.zone !== 'bench') ?? same[0]
      roster = roster.filter((u) => !ids.includes(u.uid))
      roster.push({ ...first, rank: rank + 1 })
    }
  }
  if (roster.filter((u) => u.zone === 'bench').length > C.bench) return s
  return {
    ...s,
    gold: s.gold - cost(id),
    roster,
    nextId: s.nextId + 1,
    shop: s.shop.map((v, i) => (i === index ? null : v)),
  }
}
export function position(s: War, uid: number, zone: Recruit['zone']): War {
  const u = s.roster.find((u) => u.uid === uid)
  if (s.phase !== 'prepare' || !u) return s
  const others = s.roster.filter((u) => u.uid !== uid)
  if (
    zone === 'bench' &&
    others.filter((u) => u.zone === 'bench').length >= C.bench
  )
    return s
  if (
    zone !== 'bench' &&
    others.filter((u) => u.zone !== 'bench').length >= s.level
  )
    return s
  if (zone === 'front' && others.filter((u) => u.zone === 'front').length >= 4)
    return s
  return {
    ...s,
    roster: s.roster.map((u) => (u.uid === uid ? { ...u, zone } : u)),
  }
}
export function bonds(s: War) {
  const unique = [
    ...new Set(s.roster.filter((u) => u.zone !== 'bench').map((u) => u.id)),
  ].map((id) => companions.find((c) => c.id === id)!)
  return ['guardian', 'striker', 'mystic', 'support'].map((role) => ({
    role,
    count: unique.filter((c) => c.role === role).length,
  }))
}
export function fightWar(s: War, owned: Companion[], weapons: Weapon[] = []): War {
  if (s.phase !== 'prepare' || !s.roster.some((u) => u.zone === 'front'))
    return s
  const units = s.roster
    .filter((u) => u.zone !== 'bench')
    .map((u) => {
      const c =
        owned.find((c) => c.id === u.id) ??
        companions.find((c) => c.id === u.id)!
      const v = stats(c, weapons)
      if (v.effects.includes('haste')) v.attack *= 1.1
      return {
        ...u,
        c,
        stats: {
          ...v,
          attack:
            v.attack *
            (1 + (u.rank - 1) * 0.7) *
            (s.strategy === 'assault' ? 1.15 : 1),
          hp: v.hp * u.rank,
        },
        hp: v.hp * u.rank,
      }
    })
  let enemyHp = 800 + s.round * 300,
    enemyAttack = 75 + s.round * 22
  const log: string[] = []
  const synergy = bonds(s).filter((b) => b.count >= 2).length
  for (
    let tick = 1;
    tick <= 36 &&
    enemyHp > 0 &&
    units.some((u) => u.zone === 'front' && u.hp > 0);
    tick++
  ) {
    for (const u of units.filter((u) => u.hp > 0)) {
      if (u.zone === 'back' && tick % 3 !== 0) continue
      const front = units.filter((u) => u.zone === 'front' && u.hp > 0)
      if (u.c.role === 'support') {
        const t = front.sort((a, b) => a.hp / a.stats.hp - b.hp / b.stats.hp)[0]
        if (t)
          t.hp = Math.min(t.stats.hp, t.hp + u.stats.attack * u.stats.healing)
      }
      const hit =
        damage(
          u.stats,
          {
            ...u.stats,
            hp: 800 + s.round * 300,
            defense: 20 + s.round * 3,
            effects: [],
          },
          enemyHp,
          tick,
        ) *
        (1 + synergy * 0.12) *
        (u.zone === 'back' ? 0.65 : 1)
      enemyHp -= hit
      if (u.stats.effects.includes('regeneration'))
        u.hp = Math.min(u.stats.hp, u.hp + u.stats.hp * 0.02)
      if (u.stats.effects.includes('leech'))
        u.hp = Math.min(u.stats.hp, u.hp + hit * 0.15)
    }
    if (enemyHp <= 0) break
    const target = units.find((u) => u.zone === 'front' && u.hp > 0)
    if (target)
      target.hp -=
        Math.max(1, enemyAttack - target.stats.defense) *
        (target.stats.effects.includes('guard') ? 0.92 : 1)
    if (tick % 3 === 0)
      log.unshift(
        `行动 ${tick} · 敌方生命 ${Math.max(0, Math.round(enemyHp))} · 我方前台 ${units.filter((u) => u.zone === 'front' && u.hp > 0).length} 人`,
      )
  }
  const won = enemyHp <= 0,
    streak = won ? s.streak + 1 : 0,
    interest = Math.min(C.interestCap, Math.floor(s.gold / C.interestStep)),
    income =
      C.income +
      interest +
      Math.min(3, streak) +
      (s.strategy === 'income' ? 2 : 0) +
      (s.strategy === 'reserve'
        ? units.filter((u) => u.zone === 'back').length
        : 0),
    health = s.health - (won ? 0 : 5 + s.round)
  return {
    ...s,
    health: Math.max(0, health),
    gold: s.gold + income,
    streak,
    phase: health <= 0 || s.round === C.rounds ? 'finished' : 'result',
    log: [
      `${won ? '胜利' : '失利'} · 基础 ${C.income} + 利息 ${interest} + 策略/连胜 ${income - C.income - interest} = ${income} 金币`,
      ...log,
    ],
  }
}
export function nextWar(s: War, random = Math.random): War {
  return s.phase === 'result'
    ? {
        ...s,
        round: s.round + 1,
        phase: 'prepare',
        shop: s.locked ? s.shop : offers(random),
      }
    : s
}
