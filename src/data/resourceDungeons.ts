import type { DropItem } from '../domain/types'
export const RESOURCE_DUNGEONS = [
  { id: 'gold', title: '金币副本', name: '日曜金库', desc: '拾取失落的辉光，积蓄下一程的力量。', cost: 20, gold: 18000, boss: 0, reward: '金币 ×18,000', items: [] },
  { id: 'ascension', title: '角色突破副本', name: '星核圣所', desc: '星核共鸣，唤醒角色与武器的全新境界。', cost: 20, gold: 2000, boss: 3, reward: '纯净星核 ×4 · 全元素技能材料', items: [['纯净星核', 4], ['战术经验书', 6], ['风灵花蜜', 3], ['潮汐结晶', 3], ['曜金碎屑', 3], ['森语种子', 3], ['影蚀粉尘', 3], ['赤焰芯核', 3]] },
  { id: 'weapon', title: '武器升级副本', name: '熔星工坊', desc: '在星火中淬炼锋芒，让神兵再度苏醒。', cost: 20, gold: 4000, boss: 2, reward: '折光棱晶 ×12 · 纯净星核 ×2', items: [['折光棱晶', 12], ['纯净星核', 2]] },
] as const
export const resourceDungeon = (id?: string) => RESOURCE_DUNGEONS.find(d => d.id === id)
export function resourceDrops(id?: string): DropItem[] {
  return (resourceDungeon(id)?.items ?? []).map(([name, count]) => ({ id: `resource-${name}`, name, count, rarity: name === '纯净星核' ? '5星' : '4星', icon: '◈' }))
}
