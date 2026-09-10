import fs from 'node:fs/promises';
import { companions, weapons } from '../tmp/unity-export/src/data/catalog.js';
import { createAstralBattle, resolveAstralAction, canCommand } from '../tmp/unity-export/src/systems/astralBattle.js';
import { createDefense, deploy, startWave, tickDefense } from '../tmp/unity-export/src/systems/defense.js';
import { createWar, buy, position, fightWar } from '../tmp/unity-export/src/systems/currencyWar.js';
import { createDuel, duelAction } from '../tmp/unity-export/src/systems/duel.js';
import { stats } from '../tmp/unity-export/src/systems/growth.js';
const paths=['inverse','mortal','desire','flame','dream','memory','end','time'];
const astral=paths.map(path=>{
 let b=createAstralBattle(companions.slice(0,5),weapons,path);const steps=[];
 while(b.outcome==='playing'&&steps.length<200){const command=canCommand(b,'ultimate')?'ultimate':canCommand(b,'skill')?'skill':'basic';const r=resolveAstralAction(b,command);b=r.battle;steps.push({command,active:b.active,round:b.round,bossHp:b.bossHp,points:b.points,hp:b.units.map(u=>u.hp),energy:b.units.map(u=>u.energy),damage:r.event.damage,pursuit:r.event.pursuit,dot:r.event.dot,healing:r.event.healing});}
 return {path,outcome:b.outcome,steps};
});
let d=createDefense();for(const [id,x,y,direction] of [['alden',2,2,3],['selene',3,2,3]])d=deploy(d,companions.find(c=>c.id===id),x,y,direction,weapons);
d=startWave(d);const defense=[];for(let i=0;i<1800;i++){d=tickDefense(d,1/30);if(i%30===29)defense.push({health:d.health,wave:d.wave,phase:d.phase,kills:d.kills,dp:d.dp,ops:d.operators.map(o=>({id:o.id,hp:o.hp})),enemies:d.enemies.map(e=>({id:e.id,hp:e.hp,progress:e.progress}))});if(d.phase!=='running')break;}
let w=createWar(()=>.2);w=buy(w,0);w=buy(w,1);w=buy(w,2);w=position(w,w.roster[0].uid,'front');w=fightWar(w,companions);
let duel=createDuel(companions.slice(0,5),companions.slice(1,6),weapons);const duelSteps=[];for(let i=0;i<12;i++){const a=duel.fighters.find(f=>f.team===duel.team&&f.hp>0&&!duel.used.includes(f.id));const t=duel.fighters.find(f=>f.team!==duel.team&&f.hp>0);duel=duelAction(duel,a.id,t.id,true);duelSteps.push({actor:a.id,target:t.id,team:duel.team,round:duel.round,hp:duel.fighters.map(f=>f.hp)});if(duelSteps.length&&a.character.role==='support')break;}
await fs.mkdir('unity/tests',{recursive:true});await fs.writeFile('unity/tests/web-rule-fixtures.json',JSON.stringify({stats:companions.map(c=>stats(c,weapons)),astral,defense,war:{round:w.round,gold:w.gold,health:w.health,rank:w.roster[0].rank,phase:w.phase},duel:duelSteps},null,2));
console.log('Recorded web rule fixtures for growth, 8 battle paths, defense, war and duel.');
