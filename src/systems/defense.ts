import type { Companion, Weapon } from '../domain/types'
import { RULES } from '../data/advancedRules'
import { stats, damage, type UnitStats } from './growth'
export const PATH = [
  [0, 2],
  [1, 2],
  [2, 2],
  [2, 1],
  [3, 1],
  [4, 1],
  [5, 1],
  [5, 2],
  [5, 3],
  [6, 3],
  [7, 3],
  [8, 3],
] as const
export const isGround = (x: number, y: number) =>
  PATH.some((p) => p[0] === x && p[1] === y)
export const defenseCost = (c: Companion) =>
  c.role === 'guardian' ? 16 : c.role === 'support' ? 12 : 18
export interface Operator {
  id: string
  x: number
  y: number
  direction: number
  hp: number
  stats: UnitStats
  role: Companion['role']
  timer: number
  cooldown: number
  skill: number
  hits: number
}
export interface Invader {
  id: number
  progress: number
  hp: number
  maxHp: number
  speed: number
  attack: number
  defense: number
  timer: number
}
export interface Defense {
  dp: number
  health: number
  wave: number
  spawned: number
  spawnTimer: number
  enemies: Invader[]
  operators: Operator[]
  redeploy: Record<string, number>
  phase: 'prepare' | 'running' | 'between' | 'won' | 'lost'
  time: number
  kills: number
  nextId: number
}
export function createDefense(): Defense {
  return {
    dp: RULES.defense.dp,
    health: RULES.defense.health,
    wave: 1,
    spawned: 0,
    spawnTimer: 0,
    enemies: [],
    operators: [],
    redeploy: {},
    phase: 'prepare',
    time: 0,
    kills: 0,
    nextId: 1,
  }
}
export function enemyPosition(e: Invader) {
  const i = Math.min(PATH.length - 1, Math.floor(e.progress)),
    p = PATH[i],
    q = PATH[Math.min(i + 1, PATH.length - 1)],
    t = e.progress - i
  return { x: p[0] + (q[0] - p[0]) * t, y: p[1] + (q[1] - p[1]) * t }
}
export function inRange(o: Operator, x: number, y: number) {
  const dx = x - o.x,
    dy = y - o.y
  const facing = [dx, dy, -dx, -dy][o.direction]
  return (
    Math.abs(dx) + Math.abs(dy) <= (o.role === 'guardian' ? 1.25 : 3.25) &&
    facing >= -0.4
  )
}
export function deploy(
  s: Defense,
  c: Companion,
  x: number,
  y: number,
  direction: number,
  weapons: Weapon[] = [],
): Defense {
  if (
    s.phase === 'won' ||
    s.phase === 'lost' ||
    x < 0 ||
    x > 8 ||
    y < 0 ||
    y > 4 ||
    (x === 0 && y === 2) ||
    (x === 8 && y === 3) ||
    s.dp < defenseCost(c) ||
    s.operators.some((o) => o.id === c.id || (o.x === x && o.y === y)) ||
    (s.redeploy[c.id] ?? 0) > 0
  )
    return s
  if ((c.role === 'guardian' || c.role === 'striker') !== isGround(x, y))
    return s
  const v = stats(c, weapons)
  return {
    ...s,
    dp: s.dp - defenseCost(c),
    operators: [
      ...s.operators,
      {
        id: c.id,
        x,
        y,
        direction,
        hp: v.hp,
        stats: v,
        role: c.role,
        timer: 0,
        cooldown: 0,
        skill: 0,
        hits: 0,
      },
    ],
  }
}
export function retreat(s: Defense, id: string): Defense {
  if (
    !s.operators.some((o) => o.id === id) ||
    s.phase === 'won' ||
    s.phase === 'lost'
  )
    return s
  const o = s.operators.find((o) => o.id === id)!
  return {
    ...s,
    dp: Math.min(
      RULES.defense.maxDp,
      s.dp + (o.role === 'guardian' ? 8 : o.role === 'support' ? 6 : 9),
    ),
    operators: s.operators.filter((o) => o.id !== id),
    redeploy: { ...s.redeploy, [id]: RULES.defense.redeploy },
  }
}
export function activateSkill(s: Defense, id: string): Defense {
  if (s.phase !== 'running') return s
  return {
    ...s,
    operators: s.operators.map((o) =>
      o.id === id && o.cooldown <= 0
        ? { ...o, skill: 6, cooldown: RULES.defense.skillCooldown }
        : o,
    ),
  }
}
export function startWave(s: Defense): Defense {
  return s.phase === 'prepare' || s.phase === 'between'
    ? { ...s, phase: 'running', spawned: 0, spawnTimer: 0 }
    : s
}
export function tickDefense(s: Defense, dt: number): Defense {
  if (s.phase !== 'running') return s
  const n: Defense = {
    ...s,
    dp: Math.min(RULES.defense.maxDp, s.dp + dt),
    time: s.time + dt,
    spawnTimer: s.spawnTimer - dt,
    enemies: s.enemies.map((e) => ({ ...e })),
    operators: s.operators.map((o) => ({
      ...o,
      timer: o.timer - dt,
      cooldown: Math.max(0, o.cooldown - dt),
      skill: Math.max(0, o.skill - dt),
    })),
    redeploy: Object.fromEntries(
      Object.entries(s.redeploy).map(([k, v]) => [k, Math.max(0, v - dt)]),
    ),
  }
  const total = 4 + s.wave * 2
  if (n.spawnTimer <= 0 && n.spawned < total) {
    const elite = n.spawned === total - 1
    const hp = 1000 + s.wave * 200 + (elite ? 1000 : 0)
    n.enemies.push({
      id: n.nextId++,
      progress: 0,
      hp,
      maxHp: hp,
      speed: elite ? 0.35 : 0.5,
      attack: 200 + s.wave * 50,
      defense: 300 + s.wave * 30,
      timer: 0,
    })
    n.spawned++
    n.spawnTimer = 2
  }
  const blocked = new Map<string, number>()
  for (const e of n.enemies) {
    const at = enemyPosition(e)
    const blocker = n.operators.find(
      (o) =>
        o.hp > 0 &&
        isGround(o.x, o.y) &&
        Math.abs(o.x - at.x) + Math.abs(o.y - at.y) < 0.65 &&
        (blocked.get(o.id) ?? 0) < (o.role === 'guardian' ? 3 : 1),
    )
    if (blocker) {
      blocked.set(blocker.id, (blocked.get(blocker.id) ?? 0) + 1)
      e.timer -= dt
      if (e.timer <= 0) {
        blocker.hp -=
          damage({ ...blocker.stats, attack: e.attack, crit: 0, effects: [], soulBonus: 0 }, blocker.stats, blocker.hp, 0) *
          (blocker.skill > 0 ? 0.5 : 1) *
          (blocker.stats.effects.includes('guard') ? 0.92 : 1)
        e.timer = 1
      }
    } else e.progress += e.speed * dt
  }
  for (const o of n.operators.filter((o) => o.hp > 0 && o.timer <= 0)) {
    const targets = n.enemies
      .filter(
        (e) => e.hp > 0 && inRange(o, enemyPosition(e).x, enemyPosition(e).y),
      )
      .sort((a, b) => b.progress - a.progress)
    if (o.role === 'support') {
      const target = n.operators
        .filter((t) => t.hp > 0 && t.hp < t.stats.hp && inRange(o, t.x, t.y))
        .sort((a, b) => a.hp / a.stats.hp - b.hp / b.stats.hp)[0]
      if (target) {
        target.hp = Math.min(
          target.stats.hp,
          target.hp + o.stats.attack * o.stats.healing * (o.skill > 0 ? 2 : 1),
        )
        o.timer = o.stats.interval
      }
    } else if (targets.length) {
      o.hits++
      const victim = targets[0]
      const value = damage(
        o.stats,
        { ...o.stats, hp: victim.maxHp, defense: victim.defense, effects: [] },
        victim.hp,
        o.hits,
        o.skill > 0 ? 2 : 1,
      )
      victim.hp -= value
      if (o.stats.effects.includes('leech'))
        o.hp = Math.min(o.stats.hp, o.hp + value * 0.15)
      o.timer = o.stats.interval
      if (o.role === 'mystic' && o.skill > 0)
        targets.slice(1).forEach((e) => (e.hp -= value * 0.5))
    }
    if (o.timer > 0 && o.stats.effects.includes('regeneration'))
      o.hp = Math.min(o.stats.hp, o.hp + o.stats.hp * 0.02)
  }
  n.kills += n.enemies.filter((e) => e.hp <= 0).length
  n.health -= n.enemies.filter(
    (e) => e.hp > 0 && e.progress >= PATH.length - 1,
  ).length
  n.enemies = n.enemies.filter((e) => e.hp > 0 && e.progress < PATH.length - 1)
  for (const o of n.operators.filter((o) => o.hp <= 0))
    n.redeploy[o.id] = RULES.defense.redeploy
  n.operators = n.operators.filter((o) => o.hp > 0)
  if (n.health <= 0) {
    n.health = 0
    n.phase = 'lost'
  } else if (n.spawned === total && !n.enemies.length) {
    if (n.wave === RULES.defense.waves) n.phase = 'won'
    else {
      n.wave++
      n.phase = 'between'
      n.dp = Math.min(RULES.defense.maxDp, n.dp + 10)
    }
  }
  return n
}
