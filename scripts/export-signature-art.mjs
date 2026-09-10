import { rolldown } from 'rolldown';
import { mkdirSync, writeFileSync } from 'node:fs';

const bundle = await rolldown({ input: ['src/data/catalog.ts', 'src/data/fgoCollab.ts', 'src/data/wuwaCollab.ts'], platform: 'node' });
await bundle.write({ dir: 'node_modules/.cache/signature-art', format: 'esm' });
const { companionCatalog, weaponCatalog } = await import('../node_modules/.cache/signature-art/catalog.js');
const { FGO_HERO_LORE } = await import('../node_modules/.cache/signature-art/fgoCollab.js');
const { WUWA_HERO_LORE } = await import('../node_modules/.cache/signature-art/wuwaCollab.js');
const roster = companionCatalog.slice(0, 10).map(c => ({ id: c.id, name: c.name, title: c.title, soulName: c.soulName, gender: c.gender, accent: c.accent, persona: c.persona, biography: c.biography, weapon: weaponCatalog.find(w => w.signatureFor === c.id)?.name, weaponModelDesc: (FGO_HERO_LORE[c.id] ?? WUWA_HERO_LORE[c.id])?.weaponModelDesc ?? null }));
mkdirSync('docs/signature-art', { recursive: true });
writeFileSync('docs/signature-art/roster.json', JSON.stringify(roster, null, 2));
console.log(`Exported ${roster.length} characters / ${roster.length * 4} assets`);

