import type { Companion, Weapon } from '../domain/types'
import { damage, stats, type UnitStats } from './growth'
export interface Fighter {
  id: string
  character: Companion
  team: 0 | 1
  hp: number
  stats: UnitStats
  hits: number
}
export interface Duel {
  fighters: Fighter[]
  team: 0 | 1
  used: string[]
  round: number
  log: string[]
  winner: 0 | 1 | null
}
export function createDuel(
  a: Companion[],
  b: Companion[],
  weapons: Weapon[] = [],
): Duel {
  if (
    a.length !== 5 ||
    b.length !== 5 ||
    new Set(a.map((c) => c.id)).size !== 5 ||
    new Set(b.map((c) => c.id)).size !== 5
  )
    throw new Error('双方必须各选择五名不同角色')
  return {
    fighters: [a, b].flatMap((party, t) =>
      party.map((c) => {
        const v = stats(c, weapons)
        return {
          id: `${t}:${c.id}`,
          character: c,
          team: t as 0 | 1,
          hp: v.hp,
          stats: v,
          hits: 0,
        }
      }),
    ),
    team: 0,
    used: [],
    round: 1,
    log: ['玩家一行动：选择角色，再选择目标'],
    winner: null,
  }
}
export function duelAction(
  s: Duel,
  actorId: string,
  targetId: string,
  skill = false,
): Duel {
  if (s.winner !== null) return s
  const f = s.fighters.map((f) => ({ ...f })),
    a = f.find((f) => f.id === actorId),
    t = f.find((f) => f.id === targetId)
  if (
    !a ||
    !t ||
    a.hp <= 0 ||
    t.hp <= 0 ||
    a.team !== s.team ||
    s.used.includes(a.id)
  )
    return s
  const heal = skill && a.character.role === 'support'
  if (heal ? a.team !== t.team : a.team === t.team) return s
  a.hits++
  let value = 0
  if (heal) {
    value = Math.round(a.stats.attack * 2 * a.stats.healing)
    t.hp = Math.min(t.stats.hp, t.hp + value)
  } else {
    value = damage(
      a.stats,
      t.stats,
      t.hp,
      a.hits,
      (skill ? 1.35 : 1) * (a.stats.effects.includes('haste') ? 1.1 : 1),
    )
    t.hp = Math.max(0, t.hp - value)
    if (a.stats.effects.includes('leech'))
      a.hp = Math.min(a.stats.hp, a.hp + Math.round(value * 0.15))
  }
  if (a.stats.effects.includes('regeneration'))
    a.hp = Math.min(a.stats.hp, a.hp + Math.round(a.stats.hp * 0.02))
  let used = [...s.used, a.id],
    team = (1 - s.team) as 0 | 1,
    round = s.round
  const available = (side: number) =>
    f.some((f) => f.team === side && f.hp > 0 && !used.includes(f.id))
  if (!available(team)) team = s.team
  if (!available(team)) {
    used = []
    round++
    team = round % 2 === 1 ? 0 : 1
  }
  const winner =
    ([0, 1] as const).find(
      (side) => !f.some((f) => f.team !== side && f.hp > 0),
    ) ?? null
  return {
    ...s,
    fighters: f,
    team,
    round,
    used,
    winner,
    log: [
      `${a.character.name}${heal ? '治疗' : '攻击'}${t.character.name} · ${value}`,
      ...s.log,
    ].slice(0, 8),
  }
}
