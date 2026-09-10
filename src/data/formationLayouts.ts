import type { PathId } from '../domain/combat';

// Coordinates use the same 120 × 100 space in the diagram and on the battlefield.
export const FORMATION_LAYOUTS: Record<PathId, { name: string; description: string; points: [number, number][] }> = {
  inverse: { name: '逆鳞锋阵', description: '抗伤突前 · 双攻左右策应', points: [[104,48],[14,48],[67,18],[67,80],[40,48]] },
  mortal: { name: '同心雁阵', description: '五位相护 · 治疗居后', points: [[104,48],[12,48],[77,18],[77,80],[42,48]] },
  desire: { name: '花庭环阵', description: '治疗居中 · 四位环护', points: [[104,48],[57,48],[66,12],[66,86],[12,48]] },
  flame: { name: '燎原楔阵', description: '双攻前压 · 辅助后援', points: [[105,48],[12,25],[84,12],[84,86],[12,73]] },
  dream: { name: '幻镜错阵', description: '上下错位 · 双攻分翼', points: [[103,30],[12,68],[72,8],[73,90],[42,40]] },
  memory: { name: '回潮叠阵', description: '三列递进 · 双攻并列', points: [[104,48],[12,22],[66,24],[66,74],[12,76]] },
  end: { name: '终夜镰阵', description: '单翼包围 · 后排护持', points: [[103,15],[12,48],[93,48],[70,82],[37,82]] },
  time: { name: '时轮星阵', description: '五点成星 · 首尾呼应', points: [[104,48],[27,83],[77,9],[77,89],[27,13]] },
};
