import { rolldown } from 'rolldown';
import { writeFileSync, mkdirSync } from 'node:fs';
const bundle = await rolldown({input:'src/data/catalog.ts',platform:'node'});
await bundle.write({file:'node_modules/.cache/art-roster.mjs',format:'esm'});
const { companionCatalog } = await import('../node_modules/.cache/art-roster.mjs');
mkdirSync('docs', {recursive:true});
writeFileSync('docs/art-roster.json', JSON.stringify(companionCatalog.map(({id,name,title,gender,persona,biography,accent})=>({id,name,title,gender,persona,biography,accent})),null,2));
