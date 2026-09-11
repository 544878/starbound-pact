import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Reading editions are derived from the authoritative design, not hand-edited copies.
const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const source = read('星契V2_完整重构设计.md');
const data = JSON.parse(read('src/data/v2/design.json'));
const hash = createHash('sha256').update(source).digest('hex');
if (hash !== data.sourceSha256) throw new Error('Run node scripts/export-v2-design.mjs first: V2 source hash differs.');
const markers = ['# 八体系编队总表', '# 51名角色完整技能、能量、命座与专武', '# Boss、小怪、18层深塔与全部51个遭遇', '# 验证结果、已知边界与实现验收'];
const positions = markers.map(m => source.indexOf(m));
if (positions.some((p, i) => p < 0 || (i > 0 && p <= positions[i - 1]))) throw new Error('Design section structure changed.');
const out = new URL('docs/当前版本/', root);
mkdirSync(out, { recursive: true });
const banner = '> 当前V2设计分类阅读版。由 `node scripts/export-current-docs.mjs` 生成，请修改根目录设计源后重新导出。设计数值不代表全部实战效果已验收。\n\n[返回分类目录](../README.md)\n\n';
const write = (name, body) => writeFileSync(new URL(name, out), body, 'utf8');
write('02_数值与体系.md', '# 数值规划与八大体系\n\n' + banner + source.slice(0, positions[1]));
const table = (heads, rows) => ['| ' + heads.join(' | ') + ' |', '| ' + heads.map(() => '---').join(' | ') + ' |', ...rows.map(row => '| ' + row.map(v => String(v).replaceAll('|', '／')).join(' | ') + ' |')].join('\n');
let index = '# 角色分类与完整设定\n\n' + banner;
index += `共${data.characters.length}名角色。裸装为90级基值，参考成装是设计指定配装，不代表个人存档面板。\n\n`;
for (const [key, title] of [['path','体系'], ['role','职责'], ['rarity','星级'], ['element','元素']]) {
  const groups = new Map();
  for (const c of data.characters) groups.set(c[key], [...(groups.get(c[key]) ?? []), c]);
  index += `## 按${title}分类\n\n` + table([title, '人数', '角色'], [...groups].map(([k, cs]) => [k, cs.length, cs.map(c => `[${c.name}](#character-${c.id})`).join('、')])) + '\n\n';
}
index += '## 角色速查\n\n' + table(['角色 / ID', '星级', '职责', '体系', '元素', '攻击 / 生命 / 防御 / 速度', '专武'], data.characters.map(c => [`[${c.name}](#character-${c.id}) / ${c.id}`, c.rarity, c.role, c.path, c.element, `${c.base.attack} / ${c.base.hp} / ${c.base.defense} / ${c.base.speed}`, c.weapon.name])) + '\n\n';
for (const c of data.characters) index += `<a id="character-${c.id}"></a>\n\n## ${String(c.index).padStart(2,'0')} · ${c.name}（${c.id}）\n\n${c.source}\n\n`;
write('03_角色图鉴.md', index);
write('04_敌人与关卡.md', '# 敌人与关卡\n\n' + banner + source.slice(positions[2], positions[3]));
console.log(`Generated: ${data.characters.length} characters, ${data.bosses.length} bosses, ${data.encounters.length} encounters. SHA256 ${hash}`);
