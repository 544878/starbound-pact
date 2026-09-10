import type { DropItem } from '../domain/types'

export const ALLY_ACTIONS_PER_ROUND = 5
export const ENEMY_COUNT = 5

const PLACEHOLDER_DAMAGE = 40

export interface BattleSnapshot {
  round: number
  activeAllyIndex: number
  actionCount: number
  enemyHp: number[]
  log: string[]
  finished: boolean
  lastTargetIndex: number | null
}

export function createBattle(): BattleSnapshot {
  return {
    round: 1,
    activeAllyIndex: 0,
    actionCount: 0,
    enemyHp: Array.from({ length: ENEMY_COUNT }, () => 100),
    log: ['战斗开始 · 请选择第一位角色的攻击目标'],
    finished: false,
    lastTargetIndex: null,
  }
}

export function attackEnemy(
  snapshot: BattleSnapshot,
  targetIndex: number,
  allyName = '角色',
): BattleSnapshot {
  if (snapshot.finished || snapshot.enemyHp[targetIndex] === undefined || snapshot.enemyHp[targetIndex] <= 0) {
    return snapshot
  }

  const enemyHp = snapshot.enemyHp.map((hp, index) => (
    index === targetIndex ? Math.max(0, hp - PLACEHOLDER_DAMAGE) : hp
  ))
  const defeated = enemyHp.every((hp) => hp === 0)
  const completedRound = snapshot.activeAllyIndex === ALLY_ACTIONS_PER_ROUND - 1
  const nextRound = completedRound && !defeated ? snapshot.round + 1 : snapshot.round
  const nextAllyIndex = completedRound ? 0 : snapshot.activeAllyIndex + 1
  const targetDefeated = enemyHp[targetIndex] === 0
  const roundNotice = completedRound && !defeated ? `第 ${nextRound} 回合开始` : null
  const actionLog = `${allyName} 攻击了敌方 ${targetIndex + 1} 号${targetDefeated ? '并将其击败' : ''}`

  return {
    round: nextRound,
    activeAllyIndex: nextAllyIndex,
    actionCount: snapshot.actionCount + 1,
    enemyHp,
    finished: defeated,
    lastTargetIndex: targetIndex,
    log: [roundNotice, actionLog, ...snapshot.log].filter((entry): entry is string => Boolean(entry)).slice(0, 5),
  }
}

export function generateBattleDrops(seed: number): DropItem[] {
  const possibleDrops: DropItem[] = [
    { id: 'drop-1', name: '风灵花蜜', count: 2 + (seed % 3), rarity: '4星', icon: '❀', description: '击败风蚀魔物掉落的灵质精华' },
    { id: 'drop-2', name: '战术经验书', count: 1 + ((seed >> 1) % 3), rarity: '4星', icon: '📜', description: '战斗实录，蕴含丰富的角色战术经验' },
    { id: 'drop-3', name: '折光棱晶', count: 1 + ((seed >> 2) % 2), rarity: '4星', icon: '✵', description: '高阶构造体核心崩解析出的棱晶' },
    { id: 'drop-4', name: '曜金碎屑', count: 2 + ((seed >> 3) % 3), rarity: '4星', icon: '✦', description: '圣堂傀儡甲胄掉落的圣金碎屑' },
    { id: 'drop-5', name: '纯净星核', count: 1, rarity: '5星', icon: '◈', description: '极其稀有的极星源核，蕴含极高能量' },
  ]

  const drops: DropItem[] = [
    possibleDrops[seed % 2],
    possibleDrops[1 + ((seed + 1) % 3)],
  ]

  // 30% chance for 5星 rare core drop
  if (seed % 3 === 0) {
    drops.push(possibleDrops[4])
  } else {
    drops.push(possibleDrops[3])
  }

  // Multiple rolls may select the same material; present and award one summed entry.
  const combined = new Map<string, DropItem>()
  for (const drop of drops) {
    const existing = combined.get(drop.id)
    combined.set(drop.id, { ...drop, count: drop.count + (existing?.count ?? 0) })
  }
  return [...combined.values()]
}
