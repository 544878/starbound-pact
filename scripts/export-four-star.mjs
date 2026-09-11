import { createServer } from 'vite'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' })
try {
  const { FOUR_STAR_CHARACTERS: characters, FOUR_STAR_TEAMS: teams } = await server.ssrLoadModule('/src/data/fourStarCharacters.ts')
  const { equippedStats, fourStarFixture } = await server.ssrLoadModule('/src/systems/fourStarCharacters.ts')
  const { simulateFormation, teamBoss } = await server.ssrLoadModule('/src/systems/formationMath.ts')
  const { COMBAT_PATHS: paths, BOSSES: bosses } = await server.ssrLoadModule('/src/data/combat.ts')
  const pathName = Object.fromEntries(paths.map(p => [p.id, p.name]))
  const roles = { tank: '抗伤辅助', healer: '回血辅助', carry1: '主C', carry2: '副C', specialist: '专属辅助' }
  const labels = { attack: '攻击', hp: '生命', defense: '防御', crit: '暴击率', critDamage: '爆伤总倍率', pursuit: '追击系数', dot: 'DoT满层系数', vulnerability: '易伤', reflect: '反伤', lifesteal: '吸血' }
  const number = value => Number(value.toFixed(4)).toString()
  const percent = value => `${number(value * 100)}%`
  const prettyStat = (key, value) => ['attack', 'hp', 'defense'].includes(key) ? number(value) : percent(value)
  const report = paths.map(p => ({
    path: p.id,
    plans: Object.fromEntries(['complete', 'focused', 'maxed'].map(plan => {
      const team = fourStarFixture(p.id, plan)
      const sample = simulateFormation(team)
      const clear = simulateFormation(team, teamBoss(), 100)
      return [plan, { damage12: sample.damage, hpRatio12: sample.hpRatio, survivors12: sample.survivors, clearRounds: clear.rounds, outcome: clear.outcome }]
    })),
    bosses: bosses.map(b => {
      const a = simulateFormation(fourStarFixture(p.id, 'complete'), teamBoss(b))
      const f = simulateFormation(fourStarFixture(p.id, 'focused'), teamBoss(b))
      return { id: b.id, completeDamage: a.damage, focusedDamage: f.damage, ratio: f.damage / a.damage, completeSurvivors: a.survivors, focusedSurvivors: f.survivors }
    }),
  }))
  const ratios = report.flatMap(r => r.bosses.map(b => b.ratio))
  const budgetSweep = []
  for (const rank of [2, 3, 4, 5, 6]) for (const p of paths) for (const b of bosses) {
    const broad = fourStarFixture(p.id, 'complete')
    broad.members[2].constellation = Math.ceil((rank - 2) / 2)
    broad.members[3].constellation = Math.floor((rank - 2) / 2)
    const focused = fourStarFixture(p.id, 'focused')
    focused.members[2].constellation = rank
    budgetSweep.push({ rank, path: p.id, boss: b.id, ratio: simulateFormation(focused, teamBoss(b)).damage / simulateFormation(broad, teamBoss(b)).damage })
  }
  const out = path.join(root, 'docs', '历史档案')
  await mkdir(out, { recursive: true })
  const exported = { version: '0.3', combatPointScale: 250, levelProgression: null, baseline: '满级C0，武器满配，三个十万年红色魂环满配；六命另列', characters: characters.map(c => ({ ...c, equippedC0: equippedStats(c, c.specialties[0]) })), teams, verification: report, budgetSweep }
  await writeFile(path.join(out, '四星角色数值配置.json'), JSON.stringify(exported, (_, value) => typeof value === 'number' ? Number(value.toFixed(8)) : value, 2) + '\n', 'utf8')
  const lines = [
    '# 30个四星角色数值、技能、命座与满配装备 v0.3',
    '',
    '只使用R4-001至R4-030编号；不定义姓名、外观、性格、背景或等级成长。全部为四星。完全体口径：满级基准、武器满配、三个最高级十万年红色魂环；面板以C0记录，C1～C6独立列出。C6是满命终态，不能再把各命座的累计值相加。',
    '',
    '攻击、生命、伤害与治疗使用250倍后的战斗数值，防御和百分比保持原单位。角色表的“满配C0”已经包含武器、三个魂环的平面加成和满足条件的专属词条，不可二次叠加。命座增加伤害或职责效能，不直接改变这张面板。',
    '',
    '本轮新增独立角色配置和实际配置模拟，未将角色加入原有抽卡池、图鉴或战斗界面。既有匿名预算与数值量级保持不变。',
    '',
    '## 统一结算约定',
    '',
    '- 每轮一次行动：第1/2/3轮依次普攻、技能、爆发，三轮循环。技能替代普攻；不额外叠放三个动作。不设计能量、技能等级或升级成本。',
    '- 直接伤害=攻击×技能系数×1000/(1000+目标防御)×有效易伤乘区×暴击期望×统一加算池×直接抗性乘区。爆伤为暴击后的总倍率。',
    '- 技能系数只改变直接伤害；追击按面板系数每行动最多一次；DoT每行动施加一层、最多三层，每次行动后结算一次该角色DoT。两者不能暴击、不能递归触发攻击。',
    '- 吸血仅取直接与追击实际扣血量，单人每轮最多自身最大生命8%；主动治疗另计，过量治疗不触发有效治疗，死亡不复活。易伤为本角色伤害使用的有效值，不向队友重复传播。',
    '- 抗伤65%分摊、基础全队减伤8%、治疗位每轮各目标最大生命3%、角色间6%/6%/10%/20%联动及45%联动池上限沿用原规则。反伤取实际承伤，致命不反伤，不吸血。',
    '- 角色被动与“专属Buff”栏是同一效果的两个记录入口，只结算一次。双C的10%关系全队只计一份。',
    '- 角色最多专精2个体系，全部适配不超过3个。专精系数1，兼容0.65，无适配0；基础攻击按0.65+0.35×适配系数折算，基础治疗/减伤按0.75+0.25×适配系数折算。',
    '- 跨体系保留本角色面板与原生机制。专辅只有在自身原生体系才激活该体系专属Buff；兼容队可获得折算的基础联动，不能把专属Buff转化为另一体系的Buff。',
    '- 武器与魂环的平面加成常驻；专属词条按专精100%、兼容65%、无适配0%生效，同项加算后受原上限约束。三个魂环是不同槽位，可以同时生效；本稿只给默认绑定配装，不开放借装、重铸或随机词条。',
    '- C位C1～C5累计加算增伤依次4%、22%、26%、30%、39%；C6累计54%，另获得首轮爆发与开场满层机制。用部分原58%预算换取开场机制，不在原58%上额外叠放。',
    '- C6首轮直接攻击改用本角色爆发系数，DoT与记忆追击从开场即满层。全队时序仍按真实第三轮触发；C6不直接触发时序、炎印或共鸣的第三轮专属Buff，不增加行动数。',
    '- 辅助命座累计效能2%、6%、8%、10%、12%、18%；例如C6治疗为3%×1.18，C6抗伤减伤为8%×1.18，再乘适配职责效能。专辅Buff提高18%是效能乘1.18，不是增加18个百分点。',
    '',
    '## 满配C0面板总表',
    '',
    '| 编号 | 位置 | 专精 | 兼容 | 攻击 | 生命 | 防御 | 暴击 | 爆伤 | 追击 | DoT | 易伤 | 反伤 | 吸血 |',
    '|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
  ]
  for (const c of characters) {
    const s = equippedStats(c, c.specialties[0])
    lines.push(`| ${c.id} | ${roles[c.slot]} | ${c.specialties.map(p => pathName[p]).join('、')} | ${c.compatible.map(p => pathName[p]).join('、') || '—'} | ${Object.entries(s).map(([key, value]) => prettyStat(key, value)).join(' | ')} |`)
  }
  lines.push('', '总表按第一专精体系触发条件记录。R4-025在逆道反伤44%，在红尘反伤14%，在色欲兼容时反伤11.9%；不会把逆道的专属30个百分点带入其他队伍。', '', '## 八套阵法与验证结果', '', '| 体系 | 抗伤 / 治疗 / 主C / 副C / 专辅 | C0完整12轮伤害 | C2集中12轮伤害 | C6完整12轮伤害 | 击杀回合：完整/集中/满命 |', '|---|---|---:|---:|---:|---|')
  for (const r of report) {
    const values = Object.values(r.plans)
    lines.push(`| ${pathName[r.path]} | ${teams[r.path].map(id => id.replace('R4-', '')).join(' / ')} | ${values.map(v => Math.round(v.damage12)).join(' | ')} | ${values.map(v => v.clearRounds).join(' / ')} |`)
  }
  lines.push('', `八体系×八Boss共64组12轮比较：C2集中投资方案为C0完整方案的${percent(Math.min(...ratios))}～${percent(Math.max(...ratios))}。投资口径仍为5份本体：完整队5个C0；集中队C2主C+C0副C+C0专辅+两个基础替补。满命完整为35份本体。`, '', '中性Boss生命1625万、攻击包105万、防御500。上表为固定期望值自动轮转；完整击杀包含终末阈值。共享抗伤/治疗用于不同阵法的备选搭配，不代表同一角色能在同时出战的两队重复使用。30个角色覆盖八套方案并不要求一个玩家抽齐30个。', '', '同预算抽取份数不是实际付费或抽数；具体四星卡池概率、武器与魂环获取成本尚未设计。未测试的手动轮转、控制、驱散、多目标与随机暴击不能套用这些结论。', '', '## 逐角色完整记录')
  lines.splice(lines.length - 2, 0, '', `追加C2～C6同预算扫描共320组：集中路线为完整路线的${percent(Math.min(...budgetSweep.map(r => r.ratio)))}～${percent(Math.max(...budgetSweep.map(r => r.ratio)))}。集中主C为C2/C3/C4/C5/C6时，完整队双C分别为C0+C0、C1+C0、C1+C1、C2+C1、C2+C2，其余角色C0；只比较这些指定组合。`)
  for (const c of characters) {
    const final = equippedStats(c, c.specialties[0])
    lines.push('', `### ${c.id}`, '', `四星｜${roles[c.slot]}｜专精：${c.specialties.map(p => pathName[p]).join('、')}｜兼容：${c.compatible.map(p => pathName[p]).join('、') || '无'}｜等级成长：留空。`, '', '| 数值 | 满级裸装C0 | 满配C0 |', '|---|---:|---:|')
    for (const key of Object.keys(labels)) lines.push(`| ${labels[key]} | ${prettyStat(key, c.baseStats[key])} | ${prettyStat(key, final[key])} |`)
    lines.push('', '装备均已满配；下表加成已经计入上方满配面板。', '', '| 配置编号 | 类型 | 攻击加成 | 生命加成 | 防御加成 | 专属Buff（专精值） |', '|---|---|---:|---:|---:|---|')
    for (const item of [c.weapon, ...c.rings]) lines.push(`| ${item.id} | ${item.type === 'weapon' ? '武器' : `魂环${item.slot}·十万年·红色·最高级`} | ${number(item.flat.attack)} | ${number(item.flat.hp)} | ${number(item.flat.defense)} | ${item.buff.id}：${labels[item.buff.stat]}+${number(item.buff.amount * 100)}个百分点 |`)
    lines.push('', '| 技能编号 | 动作 | 目标 | 直接攻击系数 | 效果 |', '|---|---|---|---:|---|')
    for (const s of c.skills) lines.push(`| ${s.id} | ${{ normal: '普攻', skill: '技能', burst: '爆发', passive: '被动' }[s.kind]} | ${{ oneBoss: '单体Boss', self: '自身/阵法', allLivingAllies: '存活队友', bothCarries: '双C/自身' }[s.target]} | ${s.kind === 'passive' ? '—' : percent(s.directCoefficient)} | ${s.description} |`)
    lines.push('', `专属Buff ${c.exclusiveBuff.id}：${c.exclusiveBuff.description}`, '', '| 命座 | 数值与效果（累计值） |', '|---|---|')
    for (const n of c.constellations) lines.push(`| C${n.rank} | ${n.effect} |`)
  }
  lines.push('', '## 数据文件与复核', '', '- 完整机器可读配置：同目录“四星角色数值配置.json”，包含30份角色、30件武器、90个魂环、120条技能记录、180条命座记录、八套编队与64组Boss对比。', '- 可编辑源配置：src/data/fourStarCharacters.ts。实际角色配装与阵法转换：src/systems/fourStarCharacters.ts。', '- 导出：node scripts/export-four-star.mjs。验证：npm test、npm run build。', '- 本文与JSON由同一份配置生成。后续调参应修改源配置后重新导出，避免表格与计算器出现不同版本。', '')
  await writeFile(path.join(out, '30个四星角色数值设计.md'), lines.join('\n'), 'utf8')
  console.log(`Exported ${characters.length} characters, ${characters.length * 3} rings and ${characters.length * 6} constellation nodes.`)
} finally {
  await server.close()
}
