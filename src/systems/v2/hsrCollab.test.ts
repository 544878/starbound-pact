import { describe, expect, it } from 'vitest';
import { companionCatalog } from '../../data/catalog';
import { CHARACTERS } from './catalog';
import { act, actionError, createV2Battle } from './battle';

const make = (id: string, constellation = 0) => {
  const companion = companionCatalog.find(c => c.id === id);
  if (!companion) throw new Error(`Catalog ID missing: ${id}`);
  return { ...companion, level: 90, constellation };
};

describe('HSR Collab V2: Robin Love Song & Aventurine Splashing Waves', () => {
  it('registers both characters into catalog and V2 design catalog', () => {
    expect(companionCatalog.some(c => c.id === 'robin_lovesong')).toBe(true);
    expect(companionCatalog.some(c => c.id === 'aventurine_waves')).toBe(true);
    expect(CHARACTERS.some(c => c.id === 'robin_lovesong')).toBe(true);
    expect(CHARACTERS.some(c => c.id === 'aventurine_waves')).toBe(true);

    const robin = CHARACTERS.find(c => c.id === 'robin_lovesong')!;
    expect(robin.rarity).toBe(5);
    expect(robin.element).toBe('光');
    expect(robin.role).toBe('专辅');
    expect(robin.base.speed).toBe(106);

    const aventurine = CHARACTERS.find(c => c.id === 'aventurine_waves')!;
    expect(aventurine.rarity).toBe(5);
    expect(aventurine.element).toBe('水');
    expect(aventurine.role).toBe('抗伤');
    expect(aventurine.base.defense).toBe(880);
  });

  it('Robin Love Song executes basic, skill, and ultimate with singing and elation buffs', () => {
    const party = ['robin_lovesong', 'xuanzhao', 'mira', 'astra', 'noctis'].map(id => make(id));
    const b = createV2Battle(party, []);
    b.active = 'robin_lovesong';
    b.av = 100;
    const robin = b.units.find(u => u.id === 'robin_lovesong')!;
    robin.resource.value = 100;

    // 1. Skill
    const nextSkill = act(b, {
      actor: 'robin_lovesong',
      command: 'skill',
      enemy: b.enemies[0].id,
      ally: b.units[1].id,
    });
    expect(nextSkill.units.filter(u => u.id !== 'robin_lovesong').every(u => u.statuses.some(s => s.key === 'damageBonus'))).toBe(true);
    expect(nextSkill.units.find(u => u.id === b.units[1].id)!.statuses.some(s => s.key === 'chord')).toBe(true);

    // 2. Ultimate
    const nextUlt = act(b, {
      actor: 'robin_lovesong',
      command: 'ultimate',
      enemy: b.enemies[0].id,
      ally: robin.id,
    });
    const updatedRobin = nextUlt.units.find(u => u.id === 'robin_lovesong')!;
    expect(updatedRobin.resource.locked).toBe(true);
    expect(updatedRobin.statuses.some(s => s.key === 'singing')).toBe(true);

    // Allies gain Elation buffs
    for (const u of nextUlt.units) {
      expect(u.statuses.some(s => s.key === 'elation')).toBe(true);
      expect(u.statuses.some(s => s.key === 'critDamageBonus')).toBe(true);
    }

    // Enemies gain slow, action delay, and vulnerability
    for (const e of nextUlt.enemies) {
      expect(e.statuses.some(s => s.key === 'slow')).toBe(true);
      expect(e.statuses.some(s => s.key === 'vulnerability')).toBe(true);
      expect(e.clock.due).toBeGreaterThanOrEqual(115);
    }
  });

  it('Water Aventurine provides shields and accumulates wave chips', () => {
    const party = ['aventurine_waves', 'xuanzhao', 'mira', 'astra', 'noctis'].map(id => make(id));
    const b = createV2Battle(party, []);
    b.active = 'aventurine_waves';
    b.av = 100;

    // 1. Skill adds shields to all allies and grants 2 chips
    const nextSkill = act(b, {
      actor: 'aventurine_waves',
      command: 'skill',
      enemy: b.enemies[0].id,
      ally: b.units[0].id,
    });
    const updatedAve = nextSkill.units.find(u => u.id === 'aventurine_waves')!;
    expect(nextSkill.units.every(u => u.shields.length > 0)).toBe(true);
    expect(updatedAve.counters.chips).toBeGreaterThanOrEqual(2);
  });

  it('triggers linked skill "人来疯：这个炎热的夏天" when both are present, Robin is singing, and Aventurine attacks', () => {
    const party = ['robin_lovesong', 'aventurine_waves', 'mira', 'astra', 'noctis'].map(id => make(id));
    let b = createV2Battle(party, []);
    b.av = 100;

    // Phase 1: Robin is not singing yet. Aventurine attacks -> NO linked attack
    b.active = 'aventurine_waves';
    const noDuo = act(b, {
      actor: 'aventurine_waves',
      command: 'basic',
      enemy: b.enemies[0].id,
      ally: b.units[0].id,
    });
    expect(noDuo.log.some(e => e.detail.includes('【联动·人来疯】'))).toBe(false);

    // Phase 2: Robin casts Ultimate to sing
    b.active = 'robin_lovesong';
    const robin = b.units.find(u => u.id === 'robin_lovesong')!;
    robin.resource.value = 100;
    b = act(b, {
      actor: 'robin_lovesong',
      command: 'ultimate',
      enemy: b.enemies[0].id,
      ally: robin.id,
    });
    expect(b.units.find(u => u.id === 'robin_lovesong')!.statuses.some(s => s.key === 'singing')).toBe(true);

    // Phase 3: With Robin singing, Aventurine performs an attack -> AUTO triggers "人来疯"
    b.active = 'aventurine_waves';
    const duoBattle = act(b, {
      actor: 'aventurine_waves',
      command: 'basic',
      enemy: b.enemies[0].id,
      ally: b.units[1].id,
    });

    const duoLog = duoBattle.log.find(e => e.detail.includes('【联动·人来疯】'));
    expect(duoLog).toBeDefined();
    expect(duoLog?.detail).toContain('这个炎热的夏天');
    expect(duoLog?.detail).toContain('知更鸟补击音波轰击');
    expect(duoLog?.source_actor).toBe('robin_lovesong');
  });

  it('does NOT trigger linked skill if Robin is fallen or absent', () => {
    const party = ['aventurine_waves', 'xuanzhao', 'mira', 'astra', 'noctis'].map(id => make(id));
    const b = createV2Battle(party, []);
    b.active = 'aventurine_waves';
    b.av = 100;
    const next = act(b, {
      actor: 'aventurine_waves',
      command: 'basic',
      enemy: b.enemies[0].id,
      ally: b.units[0].id,
    });
    expect(next.log.some(e => e.detail.includes('【联动·人来疯】'))).toBe(false);
  });
});
