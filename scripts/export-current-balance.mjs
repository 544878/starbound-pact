import { createServer } from 'vite';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const load = p => server.ssrLoadModule(`/src/${p}.ts`);
const fmt = n => typeof n === 'number' ? Number(n.toFixed(4)).toLocaleString('en-US', { maximumFractionDigits: 4 }) : String(n ?? '—');
const pct = n => `${fmt(n * 100)}%`;
const esc = s => String(s ?? '—').replaceAll('|', '／').replaceAll('\n', '<br>');
const lines = [];
const para = s => lines.push(s, '');
const heading = (n, s) => para(`${'#'.repeat(n)} ${s}`);
const table = (head, rows) => { lines.push(`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.map(esc).join(' | ')} |`), ''); };
const labels = { attack: '攻击', hp: '生命', defense: '防御', crit: '暴击率', critDamage: '暴击总倍率', pursuit: '追击系数', dot: 'DoT满层系数', vulnerability: '易伤', reflect: '反伤', lifesteal: '吸血' };
const roles = { tank: '抗伤', healer: '治疗', carry1: '主C', carry2: '副C', specialist: '专辅' };
const val = (k, n) => ['attack', 'hp', 'defense'].includes(k) ? fmt(n) : pct(n);
try {
  const catalog = await load('data/catalog');
  const roster = await load('systems/rosterCombat');
  const numeric = await load('systems/fourStarCharacters');
  const rings = await load('systems/ringAffixes');
  const growth = await load('systems/growth');
  const combat = await load('data/combat');
  const formation = await load('data/formationMath');
  const encounters = await load('data/encounters');
  const skills = await load('data/skillNames');
  const rules = await load('data/advancedRules');
  const rawFour = await load('data/fourStarCharacters');
  const fgo = await load('data/fgoCollab');
  const wuwa = await load('data/wuwaCollab');
  const paths = Object.fromEntries(combat.COMBAT_PATHS.map(p => [p.id, p.name]));
  const pn = p => paths[p] ?? p;
  const records = catalog.companionCatalog.map(c => {
    const kit = roster.numericKit(c);
    const path = kit.mechanicPath;
    const w = catalog.weaponCatalog.find(w => w.signatureFor === c.id);
    if (!w || kit.constellations.length !== 6 || kit.skills.length !== 4) throw new Error(`不完整配置 ${c.id}`);
    const maxC = { ...c, level: 90, constellation: 0, path, rings: ['exclusive-7', 'exclusive-8', 'exclusive-9'], ringLevels: Array(9).fill(12) };
    const maxW = { ...w, ownerId: c.id, level: 90, refinement: 5 };
    const panel = roster.combatPanel(maxC, [maxW]);
    return { character: c, kit, skillNames: skills.skillNames(c), weapon: w, path, maxC, maxW, panel,
      initialPanel: roster.combatPanel(c, catalog.weapons),
      simulatorPanel: numeric.equippedStats(kit, path),
      ringSlots: Array.from({ length: 9 }, (_, slot) => ({ slot: slot + 1, name: rings.RING_NAMES[slot], age: growth.RING_AGES[slot], level0: rings.ringAffixes({ ...maxC, ringLevels: Array(9).fill(0) }, slot), level12: rings.ringAffixes(maxC, slot) })),
      ranks: Array.from({ length: 7 }, (_, rank) => {
        const cc = { ...maxC, constellation: rank };
        const member = roster.combatMember(cc, [maxW], path);
        return { rank, engineStats: member.combatKit.stats, panel: roster.combatPanel(cc, [maxW]), activityPanel: growth.stats(cc, [maxW]), personalBonus: member.combatKit.personalBonuses[rank], supportBonus: member.combatKit.supportBonuses[rank], opening: rank === 6 && member.combatKit.openingAtC6,
          unmitigatedDirect: member.combatKit.actionCoefficients.map(k => panel.attack * k * (1 + member.combatKit.personalBonuses[rank])) };
      }),
    };
  });
  const allEncounters = [ { kind: 'free', id: 'default', ...encounters.getEncounter() },
    ...catalog.initialStoryChapters.flatMap(ch => ch.stages.map(s => ({ kind: 'story', id: s.id, ...encounters.getEncounter({ kind: 'story', id: s.id }) }))),
    ...catalog.towerFloors.map(f => ({ kind: 'tower', id: String(f.floor), floor: f, ...encounters.getEncounter({ kind: 'tower', id: String(f.floor) }) })) ];
  const enemyRows = [];
  function addBoss(e, b, position) {
    enemyRows.push({ encounter: `${e.kind}:${e.id}`, title: e.title, position, ...Object.fromEntries(Object.entries(b).filter(([k]) => !['bossWave', 'dualBoss', 'minions'].includes(k))) });
    for (const m of b.minions ?? []) enemyRows.push({ encounter: `${e.kind}:${e.id}`, title: e.title, position: `${position} 小怪`, ...m, defense: b.defense * .65, directResistance: 0, pursuitResistance: 0, dotResistance: 0, critSuppression: 0, vulnerabilityResistance: b.vulnerabilityResistance, healingSuppression: b.healingSuppression });
    if (b.dualBoss) addBoss(e, b.dualBoss, `${position} 双Boss副体`);
  }
  for (const e of allEncounters) {
    if (e.boss.bossWave?.length) e.boss.bossWave.forEach((b, i) => addBoss(e, b, `连战${i + 1}`));
    else addBoss(e, e.boss, e.floor?.enemyType === 'mob' ? '主敌 小怪关' : '主敌');
  }
  const sources = ['src/data/catalog.ts','src/data/epic.ts','src/data/expansion.ts','src/data/fourStarCharacters.ts','src/data/fgoCollab.ts','src/data/wuwaCollab.ts','src/data/skillNames.ts','src/data/combat.ts','src/data/combatScale.ts','src/data/formationMath.ts','src/data/advancedRules.ts','src/data/encounters.ts','src/systems/rosterCombat.ts','src/systems/fourStarCharacters.ts','src/systems/ringAffixes.ts','src/systems/growth.ts','src/systems/combatMath.ts','src/systems/astralBattle.ts','src/systems/formationMath.ts','src/systems/defense.ts','src/systems/currencyWar.ts','src/systems/duel.ts','src/systems/battle.ts','src/state/gameState.ts'];
  const sourceContents = Object.fromEntries(await Promise.all(sources.map(async p => [p, await readFile(p, 'utf8')])));
  const sourceHashes = Object.fromEntries(Object.entries(sourceContents).map(([p, s]) => [p, createHash('sha256').update(s).digest('hex')]));
  heading(1, '星契 全角色与敌人数值现状记录');
  para(`记录日期：2026年9月11日。范围：当前 Web 源码完整角色目录，共 ${records.length} 名角色、${catalog.weaponCatalog.length} 件专武、${allEncounters.length} 个可解析遭遇、${enemyRows.length} 条敌方实例。本文是改动前基线；不修改游戏数值。`);
  para('目录：一 口径与结算；二 全角色总览及同化映射；三 逐角色完整记录；四 武器与星魂规则；五 Boss和小怪；六 活动玩法；七 未单独上架模板；八 实现差异与源码快照。HTML版本支持左侧目录、全文查找及打印。');
  heading(2, '一 口径与结算');
  para('本记录读取 companionCatalog 全角色目录，不只读取初始持有角色。初始面板来自源码默认角色与默认武器，不代表浏览器里的个人存档。统一满配基准为角色90级、专武90级精炼5、9槽魂环全部专属可用且强化12级、角色原生体系、C0；C1至C6另列。');
  para('角色攻击和生命表采用面板点数；星阵引擎内部攻击与生命为面板点数÷250，防御与百分比不缩放。敌人表同时列引擎生命／攻击和×250的对照数；×250列仅用于同口径比较。暴击伤害150%表示暴击后的总倍率1.5倍。面板百分比以小数存储。');
  para('角色等级成长 g=0.35+0.65×(等级−1)/89，等级截断在1～90。武器完成度 p=(0.5+0.5×(武器等级−1)/89)×(0.9+0.1×(精炼−1)/4)×本命系数；本命系数为1、异主为0.85、未装备时p=0。实际取持有者数值模板的武器预算，而不是异主武器自己的模板预算。');
  para('星阵面板：攻击=(裸装攻击+武器平面攻击×p+裸装攻击×魂环攻击百分比)×g；生命同式；防御=(裸装防御+武器平面防御×p+裸装防御×魂环防御百分比)×(0.65+0.35g)。武器专属属性另加词条值×p×适配；专属statBonus满足体系条件时加入；最后执行属性上限。');
  table(['项目', '规则'], [ ['适配','专精1；兼容0.65；其他0。入战攻击再乘0.65+0.35×适配；治疗职责乘0.75+0.25×适配。'], ['上限','暴击80%；爆伤250%；追击80%；DoT80%；易伤50%；反伤50%；吸血25%；防御9000；引擎攻击100000；引擎生命1000000。'], ['普攻','单体；战技点+1，上限5；能量+25×回复效率。'], ['战技','消耗1战技点；能量+35×回复效率；替代本次普攻。'], ['大招','能量至少100才能使用；使用后清零；替代本次行动。'], ['初始资源','初始3战技点，每人50能量；受击回复12×回复效率（塔层额外规则见附录）。'], ['群攻','战技／大招且模板为副C或角色职业为mystic时，命中所有存活敌人；普攻始终单体。'], ['抗伤','正确抗伤位存活承担攻击包65%，其余存活角色平分35%；基础全队减伤8%×适配职责×命座效能；战技和大招护阵额外减伤15%。'], ['治疗','正确治疗位每敌方回合前回复各存活角色3%最大生命×治疗效能；战技6%，大招12%；受敌方禁疗影响。'], ['专辅','战技／大招自身本次加算6%×支援效能，并强化下一组双C；体系Buff另按触发条件计算。'], ['C6开场','模板为主C／副C时，第一次行动直接伤害使用大招系数；不增加行动，资源仍按选择的指令消耗／恢复；DoT及记忆追击前两轮直接满层。'] ]);
  para('直接伤害基础=攻击×1000/(1000+敌方防御)×(1+有效易伤)×[1+有效暴击率×(暴击总倍率−1)]×(1−直接抗性)。再乘动作系数、统一加算池、破盾与关卡乘区。追击和DoT不暴击；每次攻击按当前回合层数结算（DoT最多3层、记忆追击前三轮逐步启动）。时序第3倍数回合直接加算45%，终末目标回合初生命≤30%直接加算25%。');
  para('C0至C6参考直接量只计算面板攻击×动作系数×(1+当前命座自身加算)，使用未四舍五入的面板攻击应以JSON内引擎值为准；这里采用显示面板整数。它用于比较倍率，不含防御、暴击、易伤、追击、DoT、队伍联动、体系周期、群攻目标数、护盾和关卡效果，因此不是实战最终伤害。');
  table(['体系','专辅机制'], Object.entries(formation.PATH_BUFFS).map(([id,b]) => [pn(id), `${b.name}：${b.description}`]));
  heading(2, '二 全角色总览及同化映射');
  table(['角色','ID','稀有度','模板','职责','原生体系','攻击','生命','防御','普攻／战技／大招'], records.map(r => [r.character.name,r.character.id,r.character.rarity,r.kit.id,roles[r.kit.slot],pn(r.path),fmt(r.panel.attack),fmt(r.panel.hp),fmt(r.panel.defense),r.kit.skills.slice(0,3).map(s=>pct(s.directCoefficient)).join('／')]));
  const group = fn => { const m = new Map(); for (const r of records) { const k = fn(r); m.set(k,[...(m.get(k)??[]),r.character.name]); } return [...m].filter(([,v])=>v.length>1); };
  heading(3, '共用数值模板的角色');
  table(['模板','共用角色'], group(r => r.kit.id).map(([k,v])=>[k,v.join('、')]));
  heading(3, '完全相同的三动作倍率');
  table(['普攻／战技／大招','角色'],group(r=>r.kit.skills.slice(0,3).map(s=>pct(s.directCoefficient)).join('／')).map(([k,v])=>[k,v.join('、')]));
  heading(3, '完全相同的命座数值曲线');
  table(['C1至C6 自身加算；支援效能','角色'],group(r=>`自身 ${r.kit.constellations.map(n=>pct(n.personalBonus)).join('／')}；支援 ${r.kit.constellations.map(n=>pct(n.supportBonus)).join('／')}`).map(([k,v])=>[k,v.join('、')]));
  heading(2, '三 逐角色完整记录');
  for (const r of records) {
    const {character:c,kit:k} = r;
    heading(3, `${c.name} ${c.id}`);
    para(`${c.rarity}｜${roles[k.slot]}｜模板 ${k.id}｜原生 ${pn(k.mechanicPath)}｜专精 ${k.specialties.map(pn).join('、')}｜兼容 ${k.compatible.map(pn).join('、')||'无'}｜元素 ${catalog.elementLabels[c.element]??c.element}｜星魂名 ${c.soulName??'未配置'}。源码默认等级${c.level}、C${c.constellation}、展示战力${c.power}；战力字段不是伤害计算输入。`);
    table(['属性','满级裸装模板','源码默认面板','统一满配星阵C0','三红环旧模拟满配C0'],Object.keys(labels).map(key=>[labels[key],val(key,k.baseStats[key]),val(key,r.initialPanel[key]),val(key,r.panel[key]),val(key,r.simulatorPanel[key])]));
    heading(4, '武器');
    para(`专武：${r.weapon.name}（${r.weapon.id}）；${r.weapon.rarity}；目录初始等级${r.weapon.level}／精炼${r.weapon.refinement}。模板武器 ${k.weapon.id}。`);
    table(['满预算攻击','生命','防御','体系属性'],[[fmt(k.weapon.flat.attack),fmt(k.weapon.flat.hp),fmt(k.weapon.flat.defense),`${labels[k.weapon.buff.stat]} +${pct(k.weapon.buff.amount)}；专精100%、兼容65%、其他0%`]]);
    para(`武器原文：${r.weapon.passive} 实际结算以第一节与第八节为准。`);
    heading(4, 'C0至C6 与星魂');
    para(`角色星魂材料 soul:${c.id}；每激活一命消耗1个，C0→C6共6个；单个兑换价${roster.soulPrice(c)}星晶。`);
    table(['命座','自身加算累计','支援效能累计','普攻参考量','战技参考量','大招参考量','首击用大招'],r.ranks.map(n=>[`C${n.rank}`,pct(n.personalBonus),pct(n.supportBonus),...n.unmitigatedDirect.map(fmt),n.opening?'是':'否']));
    para('本基准下C0～C6星阵攻击／生命／防御与上方满配C0相同；命座改变加算池与职责效能，不再重复叠加低命累计值。');
    table(['命座','配置效果原文'],[['C0','无额外命座增益'],...k.constellations.map(n=>[`C${n.rank}`,n.effect])]);
    heading(4, '普攻 战技 大招与被动');
    table(['动作','界面名称','系数','实际目标','配置原文'],k.skills.map((s,i)=>[['普攻','战技','大招','被动'][i],r.skillNames[i]??'职责被动',pct(s.directCoefficient),i===3?s.target:i===0?'单体':(k.slot==='carry2'||c.role==='mystic')?'所有存活敌人':'单体',s.description]));
    para(`专属Buff ${k.exclusiveBuff.id}：${k.exclusiveBuff.description} 联动配置${pct(k.exclusiveBuff.link)}；条件属性：${k.exclusiveBuff.statBonus?`${pn(k.exclusiveBuff.statBonus.path)}体系 ${labels[k.exclusiveBuff.statBonus.stat]}+${pct(k.exclusiveBuff.statBonus.amount)}`:'无'}。主动治疗、护阵与专辅效果按第一节职责规则生效，配置中固定轮转文字是模拟器口径。`);
    heading(4, '九槽魂环词条');
    table(['槽位','名称／年限','主词条 0级→12级','副词条1 4级解锁→12级','副词条2 8级解锁→12级'],r.ringSlots.map(s=>[s.slot,`${s.name}／${s.age}年`,...s.level12.map((a,i)=>`${a.label} ${pct(s.level0[i].value)}→${pct(a.value)}`)]));
    para('表中0级副词条数值表示未激活的基础值，实际需4／8级解锁；后3槽按专属魂环记录。');
    heading(4, '旧模拟器三红环预算');
    table(['编号','攻击','生命','防御','属性'],k.rings.map(item=>[item.id,fmt(item.flat.attack),fmt(item.flat.hp),fmt(item.flat.defense),`${labels[item.buff.stat]}+${pct(item.buff.amount)}`]));
    heading(4, '活动玩法C0至C6面板');
    table(['命座','攻击','生命','防御','攻击间隔','回复效率','治疗倍率'],r.ranks.map(n=>[`C${n.rank}`,fmt(n.activityPanel.attack),fmt(n.activityPanel.hp),fmt(n.activityPanel.defense),fmt(n.activityPanel.interval),fmt(n.activityPanel.energyEfficiency),fmt(n.activityPanel.healing)]));
  }
  heading(2, '四 武器与星魂规则');
  table(['精炼','90级本命预算','1级本命预算','90级异主预算'],[1,2,3,4,5].map(n=>[n,pct(.9+.1*(n-1)/4),pct(.5*(.9+.1*(n-1)/4)),pct(.85*(.9+.1*(n-1)/4))]));
  para('星魂是角色专用命座材料，未配置一套独立于命座的星魂属性树。五星兑换1600星晶，四星480；角色名下“星魂名”本身不额外增加独立数值。魂环是另一套9槽装备系统，前6槽角色等级1／10／20／30／40／50解锁，后3槽需装备对应普通或专属环。强化等级0～12；主词条随等级线性乘1+等级/24；副词条4级、8级解锁，12级变为基础值的1.5倍；后3槽普通环词条为专属的75%。');
  table(['词条','权重','主词条基础','副词条基础'],rings.AFFIXES.map(a=>[a.label,a.weight,pct(a.main),pct(a.sub)]));
  table(['旧魂环ID','名称','旧平面值','旧描述（现行已替换）'],rules.RINGS.map(r=>[r.id,r.name,`${r.stat}+${r.value}`,r.description]));
  para('现行ringAt把上述旧环value统一设为0、effect统一设为affix，实际收益来自词条。旧描述里的斩杀、再生、吸血、无视防御等不能直接当作当前已生效能力。');
  heading(2, '五 Boss和小怪');
  heading(3, '八类法则与标准木桩 原始模板');
  const resistHead=['直抗','追抗','持续抗','反抗','暴击压制','易伤抗','治疗压制'];
  const rk=['directResistance','pursuitResistance','dotResistance','reflectResistance','critSuppression','vulnerabilityResistance','healingSuppression'];
  table(['名称','HP内部','攻击内部','防御',...resistHead,'攻击模式'],[combat.NEUTRAL_BOSS,...combat.BOSSES].map(b=>[b.name,fmt(b.hp),fmt(b.attack),fmt(b.defense),...rk.map(k=>pct(b[k])),b.pattern]));
  para('steady每轮1倍攻击；burst第3倍数轮2倍，其余0.5倍；ramp第1轮0.7倍、每轮+0.1倍、最高1.5倍。负抗性表示增伤。直接／追击／DoT抗性在伤害函数内截断到−50%～75%；星阵反伤直接使用敌人配置反抗，因此深塔15层−80%反抗会按1.8倍计算。');
  heading(3, '全部实际遭遇与敌方实例');
  for (const e of allEncounters) {
    heading(4, `${e.title} ${e.kind}:${e.id}`);
    para(`推荐体系 ${pn(e.path)}；体力${e.cost}。${e.floor?`楼层类型 ${e.floor.enemyType}；祝福：${e.floor.modifierDesc}`:''}`);
    const rows=enemyRows.filter(r=>r.encounter===`${e.kind}:${e.id}`);
    table(['位置／名称','生命内部','生命×250','攻击内部','攻击×250','防御','盾层','半血攻击倍率','弱点','模式'],rows.map(b=>[`${b.position} ${b.name}`,fmt(b.hp),fmt(b.hp*250),fmt(b.attack),fmt(b.attack*250),fmt(b.defense),b.shield??0,b.phaseAttack??'不适用',b.weakness??'继承主敌判定',b.pattern??'随主敌攻击包']));
    table(['敌人',...resistHead],rows.map(b=>[b.name,...rk.map(k=>b[k]===undefined?'无独立字段':pct(b[k]))]));
    for(const b of rows.filter(b=>b.hint)) para(`${b.name}：${b.hint}`);
  }
  heading(3, '敌方通用机制与逐层修正');
  para('附属小怪防御=主敌防御×65%；直接、追击、DoT抗性和暴击压制归零，易伤抗与治疗压制继承主敌。攻击加入主敌攻击包后统一分担。主敌半血进入二阶段，攻击乘phaseAttack；战技／大招破盾1层，元素命中弱点2层；破盾后非塔伤害×1.08，塔内通常×1.2。连战每波读取自己的生命、攻击、盾和小怪。双Boss同时存活时双方攻击各取55%；一方倒下后适用1.25倍狂暴。');
  table(['深塔层','代码中额外战斗修正'],[
    [1,'群攻直接×1.3；追击×1.3；3个小怪分摊模板总生命与攻击'],[2,'追击×1.35；3个小怪'],[3,'小怪攻击×5；敌方回合后小怪清零并在主敌存活时重生'],[4,'每个存活小怪让主敌受到伤害−25%，最高−75%'],[5,'风／影角色加算35%；暴击+15个百分点；破盾追击×1.4；每3轮重生小怪'],[6,'连战；主Boss破盾量×2'],[7,'暴击+15个百分点；单体直接×1.3，破盾再×1.2'],[8,'主C战技或大招打主敌打断蓄力，第3倍数轮攻击包×0.5'],[9,'单体直接×1.35；第3倍数轮主C再×1.5'],[10,'有盾全伤×0.5；破盾全伤×2'],[11,'目标防御×0.8；破盾爆伤+50个百分点；我方承伤×1.15'],[12,'连战；主Boss弱点破盾再×1.5'],[13,'光／水角色加算25%；每次敌方攻击额外扣当前生命5%'],[14,'我方防御×1.4；护阵承伤×0.79；护阵追加全队实际承伤40%反击'],[15,'治疗压制50%；反伤抗性−80%'],[16,'暴击压制30%；追击×1.45；我方承伤×0.85'],[17,'ramp递增攻击；抗伤受击能量×1.5；护阵追加全队实际承伤100%反击'],[18,'双Boss；mortal实体有盾时反震该目标本次累计伤害8%']
  ]);
  heading(2, '六 活动玩法');
  para('保卫战、货币战争、对决读取growth.stats，数值口径独立于星阵。活动生命=round((600+等级×12+守护职业350)×(1+魂环生命))；攻击=round((55+等级×2+命座×7+(55+等级×2)×魂环攻击+装备时的武器等级+精炼×5)×本命1.18)；防御=(18+守护职业25)×(1+魂环防御)。伤害=max(1,round(攻击×动作倍率×(1+本命0.08)−目标防御))，再由各玩法修正。');
  table(['保卫战波次','普通数量','普通HP','末只精英HP','攻击','防御','普通／精英速度'],Array.from({length:rules.RULES.defense.waves},(_,i)=>{const w=i+1;return[w,3+w*2,220+w*85,440+w*85,30+w*14,10+w*3,'0.5／0.35'];}));
  para('每波总数4+2×波次，其中末只为精英；每2秒生成一只；被阻挡时每1秒攻击一次。保卫战技能20秒冷却，持续6秒；输出／治疗技能倍率2，守护技能承伤×0.5，法术职业技能对其他目标溅射50%。');
  table(['货币战争轮次','敌方HP','攻击','防御'],Array.from({length:rules.RULES.currency.rounds},(_,i)=>[i+1,800+(i+1)*300,75+(i+1)*22,20+(i+1)*3]));
  para('货币战争每场最多36个tick；己方升星攻击乘1+0.7×(星级−1)，生命乘星级；突击策略攻击×1.15；每种已触发羁绊伤害+12%；后排每3tick攻击且伤害×0.65。对决使用玩家角色作为敌方，没有独立Boss表：普攻1倍，战技1.35倍；辅助战技治疗round(攻击×2×治疗倍率)，未实现独立能量大招。旧battle.ts占位战斗为5敌人各100HP，每次固定40伤害。');
  heading(2, '七 未单独上架模板');
  const used = new Set(records.map(r=>r.kit.id));
  const unused = rawFour.FOUR_STAR_CHARACTERS.filter(k=>!used.has(k.id));
  para(`30份基础数值模板中，有${unused.length}份未被当前目录角色映射；完整配置仍存于JSON。`);
  for(const k of unused) { heading(3,k.id); table(['属性','裸装值'],Object.keys(labels).map(key=>[labels[key],val(key,k.baseStats[key])])); table(['动作','倍率','效果'],k.skills.map(s=>[s.kind,pct(s.directCoefficient),s.description])); table(['命座','效果'],k.constellations.map(n=>[n.rank,n.effect])); table(['装备','攻击','生命','防御','词条'],[k.weapon,...k.rings].map(w=>[w.id,fmt(w.flat.attack),fmt(w.flat.hp),fmt(w.flat.defense),`${w.buff.stat} ${pct(w.buff.amount)}`])); }
  heading(2, '八 实现差异与源码快照');
  para('1. 实际九槽魂环面板与旧模拟三红环预算不同，已逐角色并列，禁止重复叠加。2. C6旧匿名阵法预算为58%，基础角色模板为54%并带开场机制；联动角色按各自节点配置。3. 联动角色命座描述中的独特效果，星阵通过通用personalBonuses、supportBonuses及按职责生成的openingAtC6结算；不能仅凭文案认定额外机制已实现。4. 模板中rarity:4是结构字段，真实角色星级以角色目录为准。5. 技能配置的固定三轮循环是模拟口径，实际星阵允许按战技点与能量选择。6. 技能界面名称由skillNames生成，可能与配置描述内名称不同，两者均保留。7. 本记录以Web实现为主，Unity目录为独立移植版本，未将它混入同一面板。');
  para('源文件SHA256用于确认记录对应版本。下方附核心结算源码，完整保存特殊阈值、条件顺序与未展开分支；这是补充审计记录，阅读数值优先使用前面的表格。机器配置另存同名JSON，可重新运行导出脚本更新三份文档。');
  table(['来源文件','SHA256'],Object.entries(sourceHashes));
  for(const p of ['src/systems/astralBattle.ts','src/systems/rosterCombat.ts','src/systems/ringAffixes.ts','src/systems/growth.ts','src/systems/combatMath.ts','src/systems/defense.ts','src/systems/currencyWar.ts','src/systems/duel.ts']) {
    heading(3,`源码 ${p}`); para('```typescript\n'+sourceContents[p]+'\n```');
  }
  const snapshot={date:'2026-09-11',scope:'Web source catalog; not personal browser save',pointScale:250,sourceHashes,records,encounters:allEncounters,enemyRows,rawFourStarTemplates:rawFour.FOUR_STAR_CHARACTERS,fgoRawKits:fgo.FGO_COMBAT_KITS,wuwaRawKits:wuwa.WUWA_COMBAT_KITS,neutralBoss:combat.NEUTRAL_BOSS,bossTemplates:combat.BOSSES,paths:combat.COMBAT_PATHS,formationBuffs:formation.PATH_BUFFS,affixes:rings.AFFIXES,legacyRings:rules.RINGS,rules:rules.RULES};
  const json=JSON.stringify(snapshot,(_,v)=>{if(typeof v==='number'&&!Number.isFinite(v))throw new Error('发现非有限数值');return v;},2);
  if(new Set(records.map(r=>r.character.id)).size!==records.length)throw new Error('重复角色ID');
  if(records.some(r=>r.ranks.length!==7||r.ringSlots.length!==9))throw new Error('缺少命座或魂环');
  const md=lines.join('\n');
  // Small, dependency-free renderer for this export's headings, paragraphs, tables and fenced source.
  const he=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  let body='',toc='',inCode=false,inTable=false,headIndex=0;
  for(const line of lines.join('\n').split('\n')) {
    if(line.startsWith('```')){ if(inTable){body+='</tbody></table></div>';inTable=false;} body+=inCode?'</code></pre></details>':'<details class="source"><summary>展开结算源码</summary><pre><code>';inCode=!inCode;continue; }
    if(inCode){body+=he(line)+'\n';continue;}
    if(!line.startsWith('|')&&inTable){body+='</tbody></table></div>';inTable=false;}
    const m=line.match(/^(#{1,4}) (.*)$/);
    if(m){const id=`s${headIndex++}`,n=m[1].length;body+=`<h${n} id="${id}">${he(m[2])}</h${n}>`;if(n===2||n===3)toc+=`<a class="depth${n}" href="#${id}">${he(m[2])}</a>`;continue;}
    if(line.startsWith('|')){const cells=line.split('|').slice(1,-1).map(s=>s.trim());if(cells.every(s=>/^---$/.test(s)))continue; const tag=inTable?'td':'th';if(!inTable)body+='<div class="table-wrap"><table><tbody>';body+='<tr>'+cells.map(s=>`<${tag}>${he(s).replaceAll('&lt;br&gt;','<br>')}</${tag}>`).join('')+'</tr>';inTable=true;continue;}
    if(line.trim())body+=`<p>${he(line)}</p>`;
  }
  const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>星契全角色与敌人数值现状记录</title><style>body{margin:0;background:#f5f6f8;color:#18202b;font:15px/1.8 "Microsoft YaHei",sans-serif}nav{position:fixed;width:250px;inset:0 auto 0 0;overflow:auto;padding:24px;background:#edf0f4;box-sizing:border-box}nav a{display:block;color:#31465d;text-decoration:none;line-height:1.5;padding:5px 0}.depth2{font-weight:bold;margin-top:14px}.depth3{font-size:12px;padding-left:8px}main{margin-left:250px;padding:36px 42px;max-width:1450px;background:white}h1{font-size:30px}h2{font-size:25px;margin-top:55px}h3{font-size:21px;margin-top:36px}h4{font-size:16px;margin-top:24px}h1,h2,h3,h4{color:black;scroll-margin-top:20px}.table-wrap{overflow:auto;margin:18px 0}table{border-collapse:collapse;width:100%;font-size:13px}th{background:#e8edf3;text-align:left}td,th{border:1px solid #d5dce5;padding:9px 11px;vertical-align:top}tbody tr:nth-child(odd){background:#f8fafc}p{max-width:1150px}pre{overflow:auto;background:#f4f6f9;padding:20px;font:12px/1.6 Consolas,monospace}.source{margin:20px 0}summary{cursor:pointer;color:#365474}@media(max-width:850px){nav{position:static;width:auto;max-height:220px}main{margin:0;padding:20px}}@media print{nav{display:none}main{margin:0;padding:0;max-width:none}body{font-size:10px}table{font-size:8px}h2,h3,h4{break-after:avoid}tr{break-inside:avoid}.source{display:none}.table-wrap{overflow:visible}a{color:black}}</style><nav><strong>数值基线 · 2026.09.11</strong>${toc}</nav><main>${body}</main></html>`;
  await mkdir('docs',{recursive:true});
  for(const [ext,content] of [['md',md],['json',json],['html',html]]) await writeFile(`docs/全角色与敌人数值现状记录.${ext}`,content,'utf8');
  console.log(JSON.stringify({characters:records.length,weapons:catalog.weaponCatalog.length,rankRows:records.length*7,skills:records.length*4,ringSlots:records.length*9,encounters:allEncounters.length,enemyInstances:enemyRows.length,unusedTemplates:unused.map(k=>k.id),markdownLines:md.split('\n').length},null,2));
} finally { await server.close(); }

