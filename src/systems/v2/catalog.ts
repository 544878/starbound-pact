import design from '../../data/v2/design.json';
import type { Companion, Weapon } from '../../domain/types';
import { panel, type Bonuses } from './math';
import { soulBonuses } from './souls';
import { resourceDungeon } from '../../data/resourceDungeons';
import type { GameState } from '../../domain/types';
export type CharacterDesign = typeof design.characters[number];
export const CHARACTERS = design.characters;
export const V2_BOSSES = design.bosses;
export const V2_ENCOUNTERS = design.encounters;
export const PATH_SUBTITLES = { inverse: '盾反', mortal: '接力', desire: '换血', flame: '燃烧', dream: '识破', memory: '回放', end: '攻坚', time: '调度' };
export function encounterKey(encounter?: GameState['encounter']) { return encounter?.kind === 'story' ? `story:${encounter.id}` : encounter?.kind === 'tower' ? `tower:${encounter.id}` : encounter?.kind === 'resource' ? `resource:${encounter.id}` : 'free:default'; }
export function encounterDesign(id: string) {
  const stored = V2_ENCOUNTERS.find(e => e.id === id);
  if (stored) return stored;
  if (id.startsWith('resource:')) {
    const dungeon = resourceDungeon(id.split(':')[1]);
    if (dungeon) return { id, name: `${dungeon.title} · ${dungeon.name}`, mode: 'resource', enemies: [{ name: V2_BOSSES[dungeon.boss].name, hp: Math.round(V2_BOSSES[dungeon.boss].hp * .35) }] };
  }
  throw new Error(`V2 unknown encounter ${id}`);
}
export function characterDesign(id: string) {
  const c = CHARACTERS.find(c => c.id === id);
  if (!c) throw new Error(`V2 missing character: ${id}`);
  return c;
}
const weaponStats: Record<string, keyof Bonuses> = { '攻击百分比': 'attack', '生命百分比': 'hp', '防御百分比': 'defense', '暴击率': 'crit', '充能效率': 'energy', '治疗加成': 'healing', '专精': 'mastery' };
export function characterPanel(c: Companion, weapons: Weapon[], soul: Bonuses = soulBonuses(c)) {
  const design = characterDesign(c.id);
  const equipped = weapons.find(w => w.ownerId === c.id);
  // Resolve the equipped item's definition, never the holder's signature budget.
  const item = equipped ? CHARACTERS.find(d => d.weapon.name === equipped.name || d.id === equipped.signatureFor)?.weapon : undefined;
  const b = { ...soul };
  if (item) {
    const key = weaponStats[item.stat];
    if (key) b[key] = (b[key] ?? 0) + item.amount;
  }
  return { stats: panel(design.base, c.level, item, equipped?.level ?? 90, b), bonuses: b, weapon: item, refinement: equipped?.refinement ?? 1 };
}
