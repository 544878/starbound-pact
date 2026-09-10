import fs from 'node:fs';
const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
const details=[
 ['lumi','露弥','逐风信使','female','5星','灵动精灵 · 可靠游侠','替失联者送信的边境游侠。笑着谈天气，却从不把任何一封求救信留到明天。'],
 ['alden','艾尔登','白昼誓盾','male','4星','克制绅士 · 守护骑士','卸下贵族姓氏的前近卫长。习惯先替队友整理披风，再独自站上最危险的位置。'],
 ['selene','瑟琳','溯海观测者','female','5星','冷感学者 · 深海神秘','保管沉没文明记忆的海洋学者。对万事保持精确距离，唯独会为同伴打破自己的计算。'],
 ['mira','米菈','蔷薇处方','female','5星','知性眼镜 · 理性医师','擅长毒理的花庭医生，温柔从不等于纵容。会用最平静的语气制止冒险，也会第一个奔向伤员。'],
 ['noctis','诺克缇娅','缄夜执政官','female','5星','成熟御姐 · 夜鸦谋略','夜鸦情报网的掌舵者。优雅、从容，习惯替所有人预留退路，却不愿让任何人看见自己的疲惫。'],
 ['kael','凯尔','逆焰猎手','male','4星','桀骜搭档 · 热血行动派','嘴上只谈报酬的年轻猎手，总会把最后一份口粮留给别人。越危险的委托，越能看见他的笑意。'],
 ['astra','星璃','白星余响','female','5星','温柔反差 · 机甲驾驶员','离开量产计划的星骸驾驶员，正在学习如何为自己做选择。喜欢收集日常的小物件，战斗时却有不容动摇的决断。'],
];
edit('src/data/catalog.ts',s=>{
 const start=s.indexOf('export const companions:'); const end=s.indexOf('export const companionCatalog');
 const old=s.slice(start,end); const blocks=[...old.matchAll(/\{\s*id: '([^']+)'[\s\S]*?\n  \},/g)].map(x=>x[0]);
 const rows=details.map((d,i)=>{
  let b=blocks[i]??`{ id: 'astra', name: '星璃', title: '白星余响', element: 'light', role: 'striker', rarity: '5星', level: 20, power: 4010, constellation: 0, accent: '#b7b5ee', artPosition: '0% 0%', skills: ['轨刃协同', '白星解放'], gender: 'female', quotes: ['“这一次，我想为自己选择要守护的人。”', '“等战斗结束，一起去看真正的流星吧。”'], },`;
  b=b.replace(/name: '[^']*'/,`name: '${d[1]}'`).replace(/title: '[^']*'/,`title: '${d[2]}'`).replace(/gender: '[^']*'/,`gender: '${d[3]}'`).replace(/rarity: '[^']*'/,`rarity: '${d[4]}'`).replace(/artPosition: '[^']*'/,`artPosition: '${i*100/6}% 0%'`);
  b=b.replace(/gender: '[^']*',/,`gender: '${d[3]}', persona: '${d[5]}', biography: '${d[6]}',`);return b;
 });return s.slice(0,start)+'export const companions: Companion[] = [\n'+rows.join('\n')+'\n]\n\n'+s.slice(end).replaceAll('艾尔妲','艾尔登');
});
edit('src/state/gameState.ts',s=>s.replace('SAVE_VERSION = 4','SAVE_VERSION = 5').replace("kind: 'companion' | 'weapon'\n      count", "kind: 'companion' | 'weapon'\n      pool?: 'standard' | 'limited'\n      guaranteed?: boolean\n      time?: string\n      count").replace('pityCharacter: 34,','pityCharacter: 34,\n    pityLimited: 0,\n    limitedGuaranteed: false,\n    pullHistory: [],').replace('if (!saved) return []',"if (!saved) return definition.id === 'astra' ? [{ ...definition }] : []").replace('pityCharacter: action.pity,',"pityCharacter: action.pool === 'limited' ? state.pityCharacter : action.pity,\n          pityLimited: action.pool === 'limited' ? action.pity : state.pityLimited,\n          limitedGuaranteed: action.pool === 'limited' ? Boolean(action.guaranteed) : state.limitedGuaranteed,\n          pullHistory: [...action.results.map(r => ({ ...r, pool: action.pool ?? 'standard', time: action.time ?? '' })).reverse(), ...state.pullHistory].slice(0, 100),").replace('pityWeapon: action.pity,',"pityWeapon: action.pity,\n        pullHistory: [...action.results.map(r => ({ ...r, pool: 'weapon', time: action.time ?? '' })).reverse(), ...state.pullHistory].slice(0, 100),").replace('pityWeapon: finiteNumber(candidate.pityWeapon, initial.pityWeapon),',`pityWeapon: finiteNumber(candidate.pityWeapon, initial.pityWeapon),
    pityLimited: Math.max(0, Math.min(79, Math.floor(finiteNumber(candidate.pityLimited, 0)))),
    limitedGuaranteed: candidate.limitedGuaranteed === true,
    pullHistory: Array.isArray(candidate.pullHistory) ? candidate.pullHistory.filter((r): r is GameState['pullHistory'][number] => isRecord(r) && typeof r.id === 'string' && (r.kind === 'companion' || r.kind === 'weapon') && (r.rarity === '4星' || r.rarity === '5星') && typeof r.pool === 'string' && typeof r.time === 'string').slice(0, 100) : [],`).replace('value.version === 4','Number(value.version) >= 4'));
edit('src/state/GameContext.tsx',s=>s.replace("import { performPulls }", "import { performCharacterPulls, performPulls }").replace("count: 1 | 10) => PullResult[]", "count: 1 | 10, pool?: 'standard' | 'limited') => PullResult[]").replace('summon: (kind, count) => {',"summon: (kind, count, pool = 'standard') => {").replace("kind === 'companion' ? state.pityCharacter : state.pityWeapon", "kind === 'companion' ? (pool === 'limited' ? state.pityLimited : state.pityCharacter) : state.pityWeapon").replace('const outcome = performPulls(',"const outcome = kind === 'companion' ? performCharacterPulls(pool, count, pity, state.limitedGuaranteed, state.companions) : performPulls(").replace("type: 'APPLY_PULLS',\n          kind,", "type: 'APPLY_PULLS',\n          pool,\n          guaranteed: 'guaranteed' in outcome ? outcome.guaranteed : false,\n          time: new Date().toISOString(),\n          kind,"));
edit('src/screens/CompanionsScreen.tsx',s=>s.replace('<p>{c.title}</p>', '<p>{c.title}</p><small>{c.persona}</small>').replace('<div className="growth-statline">','<p className="character-biography">{c.biography}</p>\n        <div className="growth-statline">'));
edit('src/state/gameState.test.ts',s=>s.replace("expect(companions.every((companion) => companion.gender === 'female')).toBe(true)","expect(companions.filter(c => c.gender === 'female')).toHaveLength(5)\n      expect(companions.filter(c => c.gender === 'male')).toHaveLength(2)"));
