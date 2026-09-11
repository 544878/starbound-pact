import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Fail closed when the source format changes: never silently invent a combat kit.
const markdown = readFileSync(new URL('../星契V2_完整重构设计.md', import.meta.url), 'utf8');
const html = readFileSync(new URL('../星契V2_完整重构设计.html', import.meta.url), 'utf8');
const number = s => Number(s.replaceAll(',', ''));
const need = (text, regex, label) => {
  const match = text.match(regex);
  if (!match) throw new Error(`Missing ${label}`);
  return match;
};
const sections = [...markdown.matchAll(/^## (\d\d) · (.+?)（([^）]+)）\r?\n([\s\S]*?)(?=^## \d\d · |^# Boss)/gm)];
const characters = sections.map(([, index, name, id, source]) => {
  const identity = need(source, /([45])星 · (.+?) · (.+?) · (.+?)元素/, id);
  const base = need(source, /90级裸装：攻击([\d,.]+)，生命([\d,.]+)，防御([\d,.]+)，速度([\d,.]+)/, `${id} base`);
  const reference = need(source, /参考成装：攻击([\d,.]+)，生命([\d,.]+)，防御([\d,.]+)，速度([\d,.]+)；暴击([\d.]+)%，额外暴伤([\d.]+)%，充能效率([\d.]+)%，专精([\d.]+)/, `${id} reference`);
  const energy = need(source, /### 能量条\r?\n(.+?)：上限([\d.]+)，最低大招费用([\d.]+)，初始([\d.]+)；普攻基础\+([\d.]+)，战技基础\+([\d.]+)/, `${id} energy`);
  const weapon = need(source, /\*\*(.+?)\*\*，([45])星，90级R1：攻击([\d,.]+)、生命([\d,.]+)、防御([\d,.]+)；副属性(.+?)\+([\d.]+)(%|点)/, `${id} weapon`);
  const skills = Object.fromEntries(['普攻', '战技', '大招', '被动与边界'].map(key => [key, need(source, new RegExp(`\\*\\*${key}：\\*\\* (.+)`), `${id} ${key}`)[1].trim()]));
  const constellations = [...source.matchAll(/^\| C([1-6]) \| (.+?) \|/gm)].map(([, node, text]) => ({ node: Number(node), text }));
  if (constellations.length !== 6) throw new Error(`${id}: missing constellation`);
  for (const text of [name, skills.普攻, skills.战技, skills.大招]) {
    // Both supplied artifacts must actually contain the same skill text.
    const plain = html.replace(/<[^>]*>/g, '').replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');
    if (!plain.includes(text)) throw new Error(`Markdown/HTML disagreement: ${id}: ${text}`);
  }
  return {
    index: Number(index), id, name, rarity: Number(identity[1]), role: identity[2], path: identity[3], element: identity[4],
    base: { attack: number(base[1]), hp: number(base[2]), defense: number(base[3]), speed: number(base[4]) },
    reference: { attack: number(reference[1]), hp: number(reference[2]), defense: number(reference[3]), speed: number(reference[4]), crit: number(reference[5]) / 100, critDamage: number(reference[6]) / 100, energyEfficiency: number(reference[7]) / 100, mastery: number(reference[8]) },
    energy: { name: energy[1], capacity: number(energy[2]), cost: number(energy[3]), initial: number(energy[4]), basic: number(energy[5]), skill: number(energy[6]) },
    skills, constellations,
    weapon: { name: weapon[1], rarity: Number(weapon[2]), attack: number(weapon[3]), hp: number(weapon[4]), defense: number(weapon[5]), stat: weapon[6], amount: number(weapon[7]) / (weapon[8] === '%' ? 100 : 1), passive: need(source, /R1被动：(.+)/, `${id} passive`)[1].trim() },
    source: source.trim(),
  };
});
const bosses = [...markdown.matchAll(/^\| (.+?) \/ (.+?) \| ([\d,]+) \| ([\d,]+) \| ([\d,]+) \| (\d+) \| (\d+) \| (.+?) \|/gm)].map(([, name, label, hp, attack, defense, speed, toughness, weaknesses]) => ({ name, label, hp: number(hp), attack: number(attack), defense: number(defense), speed: number(speed), toughness: number(toughness), weaknesses: weaknesses.split('、') }));
const encounters = [...markdown.matchAll(/^\| ((?:free|story|tower):[^ ]+) \| (.+?) \| (.+?) \| (\w+) \|/gm)].map(([, id, name, enemies, mode]) => ({ id, name, mode, enemies: [...enemies.matchAll(/([^；]+?)（([\d,]+)）/g)].map(([, name, hp]) => ({ name, hp: number(hp) })) }));
if (characters.length !== 51 || new Set(characters.map(c => c.id)).size !== 51 || bosses.length !== 8 || encounters.length !== 51 || encounters.some(e => !e.enemies.length)) throw new Error('V2 coverage mismatch');
const output = { schemaVersion: 2, sourceSha256: createHash('sha256').update(markdown).digest('hex'), characters, bosses, encounters };
const directory = new URL('../src/data/v2/', import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(new URL('design.json', directory), JSON.stringify(output, null, 2) + '\n');
console.log(`V2: ${characters.length} characters, ${bosses.length} bosses, ${encounters.length} encounters; Markdown/HTML skill parity checked.`);
