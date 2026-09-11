import { useState } from 'react';
import { FUNCTIONAL_SOULS, functionalSoulUnlocked, type FunctionalSoulChoice } from '../systems/v2/functionalSouls';
import type { Companion } from '../domain/types';
import { useGame } from '../state/GameContext';
import {
  SOUL_LABELS,
  SOUL_MAINS,
  SUBSTATS,
  soulFor,
  soulMainValue,
  soulAffixValue,
  type SoulStat,
  type Soul,
} from '../systems/v2/souls';
import { signatureArt, getSignatureMetadata, type SignatureArtKind } from '../data/signatureArt';
import { ArtInspectModal, type ArtInspectData } from './ArtInspectModal';

const FUNCTIONAL_CHOICE_INFO: Record<
  FunctionalSoulChoice,
  { title: string; desc: string; tag: string }
> = {
  resist: {
    title: '坚毅结界',
    desc: '开场100AV内全队效果抵抗+20个百分点，抵御初期异常。',
    tag: '抗性结界',
  },
  rescue: {
    title: '绝境救赎',
    desc: '首次受伤后存活且生命低于35%，获得8%自身最大生命护盾。',
    tag: '危局护佑',
  },
  reserve: {
    title: '星能蓄转',
    desc: '跨波额外保留至多10%门槛已有能量（不超过能量上限）。',
    tag: '跨波转能',
  },
  point: {
    title: '先攻战律',
    desc: '开场全队共同获得1战技点（同类技能不叠加）。',
    tag: '开局提速',
  },
  break: {
    title: '破势轰鸣',
    desc: '首次本人击破韧性后，下一主动主技能增伤提高8%。',
    tag: '破韧强袭',
  },
  opening: {
    title: '碎芒先锋',
    desc: '每波次首次主动技能命中敌方时，额外削减10点韧性。',
    tag: '首击破韧',
  },
};

const SOUL_KIND_MAP: Record<6 | 7 | 8, { kind: SignatureArtKind; typeName: string }> = {
  6: { kind: 'true-form', typeName: '守护真身' },
  7: { kind: 'vessel', typeName: '策应化器' },
  8: { kind: 'origin', typeName: '破军本源' },
};

export function V2SoulPanel({ companion: c }: { companion: Companion }) {
  const { state, dispatch } = useGame();
  const [activeTab, setActiveTab] = useState<'rear' | 'front'>('rear');
  const [slot, setSlot] = useState(0);
  const [chosen, setChosen] = useState<SoulStat | ''>('');
  const [inspectModal, setInspectModal] = useState<ArtInspectData | null>(null);

  const soul = soulFor(c, slot);
  const unlocked = c.level >= [1, 10, 20, 30, 40, 50][slot];
  const cost = 200 + soul.level * 50;
  const voucher = state.materials[`V2魂转换券:${c.id}:${slot}`] ?? 0;
  const meta = getSignatureMetadata(c.id);

  // Calculate unlocked rear soul count
  const unlockedRearCount = FUNCTIONAL_SOULS.filter((s) => functionalSoulUnlocked(c, s.slot)).length;

  return (
    <section className="soul-constellation v2-astral-constellation" aria-label="V2星魂养成">
      {/* Subtab Switcher */}
      <nav className="astral-tab-switcher" role="tablist" aria-label="星魂分部切换">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'rear'}
          className={`astral-tab-btn ${activeTab === 'rear' ? 'active' : ''}`}
          onClick={() => setActiveTab('rear')}
        >
          <span className="tab-icon">✦</span>
          <span className="tab-text">天命星魂 · 灵契神座</span>
          <span className="tab-badge">{unlockedRearCount}/3</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'front'}
          className={`astral-tab-btn ${activeTab === 'front' ? 'active' : ''}`}
          onClick={() => setActiveTab('front')}
        >
          <span className="tab-icon">✧</span>
          <span className="tab-text">前六魂 · 命星词条</span>
          <span className="tab-badge">Lv.1~50</span>
        </button>
      </nav>

      {/* VIEW 1: 天命星魂 · 灵契神座 (Trinity Astral Altar) */}
      {activeTab === 'rear' && (
        <div className="astral-altar-workspace">
          <div className="astral-altar-header">
            <div className="altar-title-group">
              <h3>天命星魂 · 灵契神座</h3>
              <p>
                凝聚真身、化器与本源天命，唤醒角色专属星魂立绘法则。自由随时切换共鸣效果。
              </p>
            </div>
            {meta?.quote && (
              <aside className="altar-character-lore">
                <span className="lore-mark">“</span>
                {meta.quote}
                <span className="lore-mark">”</span>
              </aside>
            )}
          </div>

          <div className="astral-pedestal-grid">
            {FUNCTIONAL_SOULS.map((rule) => {
              const slotKey = rule.slot as 6 | 7 | 8;
              const { kind, typeName } = SOUL_KIND_MAP[slotKey];
              const isLevelMet = c.level >= rule.level;
              const isUnlocked = functionalSoulUnlocked(c, rule.slot);
              const ringVal = c.rings?.[rule.slot - 6];
              const isExclusive = ringVal === `exclusive-${rule.slot + 1}`;
              const hasExclusiveInBag = (state.materials[`ring:${c.id}:${rule.slot - 6}`] ?? 0) > 0;
              const currentChoice = c.v2FunctionalSouls?.[rule.slot];

              const soulSpecificName =
                kind === 'true-form'
                  ? meta?.trueForm ?? '真身显化'
                  : kind === 'vessel'
                    ? meta?.vessel ?? '化器共鸣'
                    : meta?.origin ?? '本源归一';

              const imageUrl = signatureArt(c.id, kind);

              return (
                <article
                  key={rule.slot}
                  className={`astral-soul-card ${isUnlocked ? 'unlocked' : 'locked'} ${
                    isExclusive ? 'exclusive-awakened' : ''
                  }`}
                >
                  {/* Top Bar with Slot Info & Status */}
                  <header className="astral-card-header">
                    <div className="card-slot-badge">
                      <span className="slot-num">第{rule.slot + 1}魂</span>
                      <span className="slot-type">{typeName}</span>
                    </div>
                    <div className="card-status-indicator">
                      {!isLevelMet ? (
                        <span className="status-pill locked">需Lv.{rule.level}</span>
                      ) : !isUnlocked ? (
                        <span className="status-pill pending">待装配</span>
                      ) : isExclusive ? (
                        <span className="status-pill exclusive">★ 专属觉醒</span>
                      ) : (
                        <span className="status-pill common">✦ 灵契共鸣</span>
                      )}
                    </div>
                  </header>

                  {/* Altar Pedestal with Art & Magnifier */}
                  <div className="astral-pedestal-stage">
                    <div className="pedestal-aurora" />
                    <div className="pedestal-plinth" />

                    <div
                      className="astral-art-wrapper"
                      role="button"
                      tabIndex={0}
                      title={`点击放大鉴赏 ${soulSpecificName}`}
                      onClick={() =>
                        setInspectModal({
                          title: `${c.name} · ${soulSpecificName}`,
                          subtitle: `${rule.name}（${typeName}）`,
                          imageUrl,
                          quote: meta?.quote,
                          tag: `第${rule.slot + 1}魂 · Lv.${rule.level}阶位`,
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setInspectModal({
                            title: `${c.name} · ${soulSpecificName}`,
                            subtitle: `${rule.name}（${typeName}）`,
                            imageUrl,
                            quote: meta?.quote,
                            tag: `第${rule.slot + 1}魂 · Lv.${rule.level}阶位`,
                          });
                        }
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt={`${c.name} - ${soulSpecificName}`}
                        className="astral-soul-image"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="art-magnify-hint">
                        <span>🔍 鉴赏立绘</span>
                      </div>
                    </div>

                    <div className="astral-soul-names">
                      <h4 className="soul-title">{soulSpecificName}</h4>
                      <small className="soul-category">
                        {rule.name} · {typeName}
                      </small>
                    </div>

                    {/* Activation / Awaken Actions */}
                    <div className="astral-awaken-controls">
                      {!isLevelMet ? (
                        <p className="level-hint">角色需升级至 Lv.{rule.level} 方可激活</p>
                      ) : !isUnlocked ? (
                        <div className="awaken-action-box">
                          {hasExclusiveInBag ? (
                            <button
                              type="button"
                              className="astral-btn-awaken exclusive"
                              onClick={() =>
                                dispatch({
                                  type: 'EQUIP_RING',
                                  id: c.id,
                                  slot: rule.slot - 6,
                                  exclusive: true,
                                })
                              }
                            >
                              ★ 消耗专属魂石觉醒
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="astral-btn-awaken common"
                              onClick={() =>
                                dispatch({
                                  type: 'EQUIP_RING',
                                  id: c.id,
                                  slot: rule.slot - 6,
                                  exclusive: false,
                                })
                              }
                            >
                              ✦ 唤醒并装配灵契 (免费)
                            </button>
                          )}
                        </div>
                      ) : (
                        !isExclusive &&
                        hasExclusiveInBag && (
                          <button
                            type="button"
                            className="astral-btn-upgrade-exclusive"
                            onClick={() =>
                              dispatch({
                                type: 'EQUIP_RING',
                                id: c.id,
                                slot: rule.slot - 6,
                                exclusive: true,
                              })
                            }
                          >
                            ★ 升华至专属星魂
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Dual Functional Choice Options */}
                  <div className="astral-choices-section">
                    <div className="choices-label">
                      <span>天命法则选择（二选一 · 随时免费切换）</span>
                    </div>

                    <div className="choices-grid">
                      {rule.options.map(([choice, defaultDesc]) => {
                        const isSelected = currentChoice === choice;
                        const info = FUNCTIONAL_CHOICE_INFO[choice as FunctionalSoulChoice];
                        const displayTitle = info?.title ?? '天命共鸣';
                        const displayDesc = info?.desc ?? defaultDesc;
                        const displayTag = info?.tag ?? '法则';

                        return (
                          <button
                            key={choice}
                            type="button"
                            disabled={!isUnlocked}
                            className={`astral-choice-card ${isSelected ? 'selected' : ''}`}
                            onClick={() =>
                              dispatch({
                                type: 'SET_V2_FUNCTIONAL_SOUL',
                                id: c.id,
                                slot: rule.slot,
                                choice: choice as FunctionalSoulChoice,
                              })
                            }
                          >
                            <div className="choice-header">
                              <span className="choice-tag">{displayTag}</span>
                              <span className="choice-status">
                                {isSelected ? '✓ 已共鸣' : isUnlocked ? '装配' : '未解锁'}
                              </span>
                            </div>
                            <strong className="choice-title">{displayTitle}</strong>
                            <p className="choice-desc">{displayDesc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: 前六魂 · 命星词条 (Front 6 Souls Enhancement) */}
      {activeTab === 'front' && (
        <div className="soul-front-workspace">
          <div className="section-label">
            <h3>六魂 · 自选方向</h3>
            <span>1主词条 · 5副词条</span>
          </div>
          <div className="skill-selector">
            {SOUL_MAINS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setSlot(i);
                  setChosen('');
                }}
                aria-pressed={i === slot}
              >
                <b>第{i + 1}魂</b>
                <small> +{soulFor(c, i).level}</small>
              </button>
            ))}
          </div>
          <div className="ring-inspector">
            <h3>
              第{slot + 1}魂 · +{soul.level} / 20
            </h3>
            <progress value={soul.level} max={20} />
            <div className="soul-affixes">
              <div className="main-affix">
                <span>主词条 · {SOUL_LABELS[soul.main]}</span>
                <b>{soulAffixValue(soul.main, soulMainValue(soul))}</b>
              </div>
              {soul.subs.map((s) => (
                <div key={s.key}>
                  <span>
                    {SOUL_LABELS[s.key]} · {s.rolls}份
                  </span>
                  <b>{soulAffixValue(s.key, SUBSTATS[s.key] * s.rolls)}</b>
                </div>
              ))}
            </div>
            <label>
              定向强化{' '}
              <select
                value={soul.focus ?? ''}
                onChange={(e) =>
                  dispatch({
                    type: 'FOCUS_V2_SOUL',
                    id: c.id,
                    slot,
                    focus: (e.target.value || undefined) as Soul['focus'],
                  })
                }
              >
                <option value="">不定向</option>
                {soul.subs.map((s) => (
                  <option key={s.key} value={s.key}>
                    {SOUL_LABELS[s.key]}
                  </option>
                ))}
              </select>
            </label>
            <p>+4 / +8 / +12 / +16 / +20各强化一条副词条。定向连续两次未命中，第三次必定命中。</p>
            <button
              className="primary-button wide"
              disabled={!unlocked || soul.level >= 20 || state.gold < cost}
              onClick={() => dispatch({ type: 'UPGRADE_V2_SOUL', id: c.id, slot })}
            >
              {!unlocked
                ? `角色${[1, 10, 20, 30, 40, 50][slot]}级解锁`
                : soul.level >= 20
                  ? '已满级'
                  : `强化 · ${cost}金币`}
            </button>
            {SOUL_MAINS[slot].length > 1 && (
              <div className="soul-actions">
                <select
                  value={chosen || soul.main}
                  onChange={(e) => setChosen(e.target.value as SoulStat)}
                >
                  {SOUL_MAINS[slot].map((main) => (
                    <option key={main} value={main}>
                      {SOUL_LABELS[main]}
                    </option>
                  ))}
                </select>
                <button
                  disabled={
                    !unlocked ||
                    !chosen ||
                    chosen === soul.main ||
                    (voucher < 1 && (state.materials['魂片'] ?? 0) < 60)
                  }
                  onClick={() => {
                    if (chosen) dispatch({ type: 'SET_V2_SOUL_MAIN', id: c.id, slot, main: chosen });
                  }}
                >
                  {voucher > 0 ? `转换券更换 · 剩余${voucher}` : '更换 · 60魂片'}
                </button>
              </div>
            )}
            <p className="panel-note">
              更换魂返还90%已付强化金币。旧魂迁移已全额返还原强化金币；角色、武器、命座保留。
            </p>
          </div>
        </div>
      )}

      {/* Art Inspection Modal */}
      <ArtInspectModal data={inspectModal} onClose={() => setInspectModal(null)} />
    </section>
  );
}
