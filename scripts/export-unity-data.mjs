import { stripTypeScriptTypes } from 'node:module';
import { mkdir, writeFile, copyFile, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('unity/StarboundPact');
await mkdir('tmp/unity-export', { recursive: true });
async function compile(dir) {
 for (const entry of await readdir(dir,{withFileTypes:true})) {
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()) await compile(file);
  else if(file.endsWith('.ts')&&!file.endsWith('.test.ts')&&!file.endsWith('.d.ts')) {
   const dest=path.join('tmp/unity-export',file.replace(/\.ts$/,'.js'));
   await mkdir(path.dirname(dest),{recursive:true});
   const js=stripTypeScriptTypes(await readFile(file,'utf8'),{mode:'strip'}).replace(/(from\s+['"])(\.[^'"]+)(['"])/g,'$1$2.js$3');
   await writeFile(dest,js);
  }
 }
}
await compile('src');
await writeFile('tmp/unity-export/data.mjs',`export * from './src/data/catalog.js'; export * from './src/data/advancedRules.js'; export * from './src/data/combat.js'; export { createInitialState } from './src/state/gameState.js';`);
const data = await import('../tmp/unity-export/data.mjs?' + Date.now());
for (const p of ['Assets/Resources/Data', 'Assets/Resources/Art', 'Assets/Resources/Models', 'Assets/Scripts', 'Assets/Editor', 'Assets/Scenes', 'Packages', 'ProjectSettings']) await mkdir(path.join(root,p), {recursive:true});
await writeFile(path.join(root,'Assets/Resources/Data/catalog.json'), JSON.stringify({ companions:data.companions, weapons:data.weapons, rings:data.RINGS, chapters:data.initialStoryChapters, floors:data.towerFloors, milestones:data.activityMilestones, paths:data.COMBAT_PATHS, materialCatalog:data.materialCatalog }, null,2));
await writeFile(path.join(root,'Assets/Resources/Data/initial-save.json'), JSON.stringify(data.createInitialState(),null,2));
for (const name of ['roster-v5.png','defense-garden-v4.png','defense-characters-v4.png','defense-enemies-v4.png','defense-props-v4.png','astral-sky.png','astral-marble.png','academy-garden.png','enemy-atlas.png']) await copyFile(path.join('public/assets',name),path.join(root,'Assets/Resources/Art',name));
for (const name of await readdir('public/assets/models')) if(name.endsWith('.glb')) await copyFile(path.join('public/assets/models',name),path.join(root,'Assets/Resources/Models',name));
console.log('Unity catalog, initial save, artwork and GLB models exported to '+root);
