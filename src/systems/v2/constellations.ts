import type { Coefficients } from './math';
import type { Command, SkillContext } from './model';

type Effect = 'hit' | 'heal' | 'shield' | 'dot' | 'schedule';
type Change = [id: string, node: number, command: Command, effect: Effect, stat: keyof Coefficients, from: number, to: number];
// Explicit coefficient changes from the per-character C3/C5 nodes, not a rarity multiplier.
const changes: Change[] = [
  ['noctis',3,'skill','hit','attack',2,2.4], ['noctis',5,'ultimate','hit','attack',4.3,4.9],
  ['kael',3,'skill','dot','attack',.45,.6], ['kael',3,'ultimate','dot','attack',.45,.6], ['kael',5,'ultimate','hit','attack',2.6,3.3],
  ['astra',3,'skill','hit','attack',1.7,2.05],
  ['xuanzhao',3,'skill','shield','defense',1.4,1.7], ['xuanzhao',3,'skill','shield','flat',500,600], ['xuanzhao',5,'ultimate','hit','defense',3.4,4.1],
  ['canglan',3,'skill','hit','attack',1.8,2.15], ['canglan',5,'ultimate','hit','attack',3.9,4.6],
  ['yanhuang',3,'skill','hit','attack',2.6,3], ['yanhuang',5,'ultimate','hit','attack',1.6,2.2],
  ['jingxuan',3,'skill','hit','attack',1.8,2.25], ['jingxuan',5,'ultimate','hit','attack',4.2,4.9],
  ['siming',3,'ultimate','hit','attack',1,1.5],
  ['yueheng',3,'ultimate','shield','hp',.09,.11], ['yueheng',3,'ultimate','shield','flat',450,550], ['yueheng',5,'basic','hit','hp',.02,.04],
  ['R4-009',5,'ultimate','hit','attack',2.7,3.25],
  ['R4-010',3,'skill','hit','attack',1.2,1.55], ['R4-010',5,'ultimate','hit','attack',2.4,2.9],
  ['R4-011',3,'skill','hit','attack',1.8,2.25], ['R4-011',5,'ultimate','hit','attack',2.8,3.4],
  ['R4-012',3,'skill','dot','attack',.4,.52], ['R4-012',5,'ultimate','hit','attack',2.3,2.8],
  ['R4-013',5,'ultimate','hit','attack',2.5,3.1],
  ['R4-014',3,'skill','hit','attack',1.4,1.75], ['R4-014',5,'ultimate','hit','attack',2.4,2.9],
  ['R4-015',3,'skill','hit','attack',1.7,2.05], ['R4-015',5,'ultimate','hit','attack',3.4,4.05],
  ['R4-016',3,'skill','schedule','attack',.9,1.15], ['R4-016',5,'ultimate','hit','attack',2.8,3.35],
  ['R4-017',5,'skill','hit','attack',1,1.55],
  ['R4-018',3,'skill','shield','hp',.07,.09], ['R4-018',3,'skill','shield','flat',350,450], ['R4-018',5,'ultimate','heal','hp',.06,.08], ['R4-018',5,'ultimate','heal','flat',300,400],
  ['R4-019',3,'skill','shield','hp',.1,.12], ['R4-019',5,'ultimate','heal','hp',.08,.1], ['R4-019',5,'ultimate','heal','flat',450,550],
  ['R4-020',3,'skill','dot','attack',.35,.48], ['R4-020',5,'ultimate','hit','attack',1.7,2.25],
  ['R4-021',3,'ultimate','hit','attack',1.4,1.9], ['R4-022',3,'ultimate','hit','attack',1.5,2.1],
  ['R4-025',3,'skill','shield','defense',1.4,1.75], ['R4-025',3,'skill','shield','flat',450,500], ['R4-025',5,'ultimate','shield','defense',1.6,2],
  ['R4-026',3,'skill','shield','defense',1.2,1.5], ['R4-026',3,'skill','shield','flat',450,500],
  ['R4-027',5,'ultimate','shield','hp',.08,.1], ['R4-027',5,'ultimate','shield','flat',500,650],
  ['R4-028',3,'skill','heal','hp',.08,.1], ['R4-028',3,'skill','heal','flat',500,650], ['R4-028',5,'ultimate','heal','hp',.11,.14], ['R4-028',5,'ultimate','heal','flat',650,750],
  ['R4-029',5,'ultimate','heal','hp',.1,.12], ['R4-029',5,'ultimate','heal','flat',600,750],
  ['R4-030',3,'skill','heal','hp',.15,.18], ['R4-030',3,'skill','heal','flat',650,750], ['R4-030',5,'ultimate','heal','hp',.1,.13], ['R4-030',5,'ultimate','heal','flat',650,750],
  ['R5-001',3,'skill','hit','attack',1.9,2.3], ['R5-001',5,'ultimate','hit','attack',4,4.7],
  ['R5-002',3,'skill','hit','attack',1.45,1.8], ['R5-002',5,'ultimate','hit','attack',2.9,3.45],
  ['R5-004',3,'skill','dot','attack',.65,.76], ['R5-004',5,'ultimate','hit','attack',3.3,3.9],
  ['R5-005',3,'skill','hit','attack',1.6,1.95], ['R5-005',5,'ultimate','hit','attack',3,3.5], ['R5-005',5,'ultimate','hit','attack',4.7,5.3],
  ['R5-006',3,'skill','hit','attack',1.8,2.2], ['R5-006',5,'ultimate','hit','attack',4.3,4.95],
  ['R5-007',5,'ultimate','hit','attack',1.8,2.35], ['R5-008',3,'skill','hit','attack',1.9,2.35], ['R5-008',5,'ultimate','schedule','attack',4.6,5.3],
  ['saber',3,'skill','shield','defense',1.35,1.65], ['saber',3,'skill','shield','flat',500,600], ['saber',5,'ultimate','shield','defense',1.9,2.25], ['saber',5,'ultimate','shield','flat',650,750],
  ['sakura',3,'skill','heal','hp',.13,.16], ['sakura',3,'skill','heal','flat',700,800], ['sakura',5,'ultimate','heal','hp',.11,.14], ['sakura',5,'ultimate','heal','flat',700,850],
  ['rin',3,'skill','shield','hp',.08,.1], ['rin',3,'skill','shield','flat',350,450], ['rin',3,'skill','heal','hp',.09,.11], ['rin',3,'skill','heal','flat',450,550], ['rin',5,'ultimate','hit','attack',3,3.5], ['rin',5,'ultimate','hit','attack',2.2,2.7],
  ['archer',3,'skill','hit','attack',1.75,2.15], ['archer',5,'ultimate','hit','attack',1.4,1.65], ['archer',5,'ultimate','hit','attack',.8,.95], ['archer',5,'ultimate','hit','attack',1,1.2],
  ['gilgamesh',3,'skill','hit','attack',1.8,2.2],
  ['yuno',3,'skill','shield','hp',.13,.15], ['yuno',3,'skill','shield','flat',600,700], ['yuno',5,'ultimate','shield','hp',.09,.11], ['yuno',5,'ultimate','shield','flat',500,600],
  ['shorekeeper',3,'skill','heal','hp',.14,.17], ['shorekeeper',3,'skill','heal','flat',700,850], ['shorekeeper',5,'ultimate','schedule','hp',.06,.08], ['shorekeeper',5,'ultimate','schedule','flat',350,450],
  ['phrolova',3,'skill','hit','attack',1.75,2.15], ['cantarella',3,'skill','dot','attack',.55,.66], ['cantarella',5,'ultimate','hit','attack',2.7,3.25], ['xinyuehu',5,'ultimate','hit','attack',1.8,2.35],
  ['robin_lovesong',3,'basic','hit','attack',.7,.85],
  ['aventurine_waves',3,'skill','shield','defense',.18,.22], ['aventurine_waves',3,'skill','shield','flat',650,800], ['aventurine_waves',5,'ultimate','hit','defense',2.8,3.4],
];
export function withConstellations(c: SkillContext): SkillContext {
  const applicable = changes.filter(([id, node, command]) => id === c.u.id && c.u.companion.constellation >= node && c.action.command === command);
  const tune = (effect: Effect, original: Coefficients) => {
    const next = { ...original };
    for (const [, , , e, stat, from, to] of applicable) if (e === effect && Math.abs((next[stat] ?? 0) - from) < 1e-8) next[stat] = to;
    return next;
  };
  return { ...c, hit: (v, ...args) => c.hit(tune('hit', v), ...args), heal: (v, ...args) => c.heal(tune('heal', v), ...args), shield: (v, ...args) => c.shield(tune('shield', v), ...args), dot: (v, ...args) => c.dot(tune('dot', v), ...args), schedule: (delay, v, ...args) => c.schedule(delay, tune('schedule', v), ...args) };
}
