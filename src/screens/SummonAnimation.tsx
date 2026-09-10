import { EquipmentArt } from "../components/EquipmentArt";
import { companionCatalog, weaponCatalog } from "../data/catalog";
import { useEffect, useMemo, useState } from "react";
import type { PullResult, Rarity } from "../domain/types";
import { Icon } from "../components/Icon";
import { CharacterArt } from "../components/CharacterArt";
import { Portrait } from "../components/Portrait";
import { useGame } from "../state/GameContext";

import { wishPayment, type WishPool } from "../systems/wishCurrency";

interface SummonAnimationProps {
  pool?: WishPool;
  results: PullResult[];
  kind: "companion" | "weapon";
  onClose: () => void;
  onRePull: (count: 1 | 10) => void;
}

type AnimationPhase = "starfall" | "reveal" | "summary";

const characterQuotes: Record<string, string> = {
  lumi: "「风会记得每一次相遇。旅人，与我一同启程吧！」",
  selene: "「倾听潮汐的律动，这便是月海不变的誓约。」",
  noctis: "「黑夜并非终点，而是守护你前行的深邃阴影。」",
  alden: "「曜庭圣光不熄！我将化作你最坚固的壁垒。」",
  mira: "「春息初绽，愿花灵的低语抚平你旅途的风霜。」",
  kael: "「炽热的烈火已在沸腾，让我们把暗夜焚烧殆尽！」",
  "shadow-wolf": "「月色之下，群影听从召唤与契约而至！」",
};

export function SummonAnimation({
  results,
  kind,
  onClose,
  onRePull,
  pool = "standard",
}: SummonAnimationProps) {
  const { state } = useGame();
  const [phase, setPhase] = useState<AnimationPhase>("starfall");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState<boolean[]>(() =>
    results.map(() => false),
  );
  const [showSpotlight, setShowSpotlight] = useState(false);

  // 计算本次抽取中的最高稀有度，决定流星与星门光效
  const maxRarity = useMemo<Rarity>(() => {
    if (results.some((r) => r.rarity === "5星")) return "5星";
    if (results.some((r) => r.rarity === "4星")) return "4星";
    return "4星";
  }, [results]);

  // 流星动画自动播放完毕进入揭示阶段
  useEffect(() => {
    if (phase === "starfall") {
      const timer = setTimeout(() => {
        setPhase("reveal");
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // 当前展示项
  const currentResult = results[currentIndex];

  // 当进入新卡牌且为5星时，触发高光特写
  useEffect(() => {
    if (phase === "reveal" && currentResult && currentResult.rarity === "5星") {
      setShowSpotlight(true);
    } else {
      setShowSpotlight(false);
    }
  }, [phase, currentIndex, currentResult]);

  // 辅助获取名称与信息
  const getItemInfo = (res: PullResult) => {
    if (res.kind === "companion") {
      const char = state.companions.find((c) => c.id === res.id);
      return {
        name: char?.name ?? "灵契余辉",
        title: char?.title ?? "群星余辉",
        companion: char,
        element: char?.element,
        quote: characterQuotes[res.id] ?? "「星辉凝成契约，愿旅途常伴光明。」",
      };
    }
    const wep = state.weapons.find((w) => w.id === res.id);
    return {
      name: wep?.name ?? "锻造辉晶",
      title: wep ? `${wep.rarity} 专属武装` : "遗迹余辉",
      companion: null,
      element: undefined,
      quote: "「古老神兵苏醒，锋芒划破天际沉寂。」",
    };
  };

  // 跳过至最终全览结算
  const handleSkip = () => {
    setIsRevealed(results.map(() => true));
    setShowSpotlight(false);
    setPhase("summary");
  };

  // 翻开下一张卡
  const handleNextCard = () => {
    if (showSpotlight) {
      setShowSpotlight(false);
      return;
    }

    const nextRevealed = [...isRevealed];
    nextRevealed[currentIndex] = true;
    setIsRevealed(nextRevealed);

    if (currentIndex < results.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setPhase("summary");
    }
  };

  // 全部一键揭晓
  const handleRevealAll = () => {
    setIsRevealed(results.map(() => true));
    setShowSpotlight(false);
    setPhase("summary");
  };

  const isMulti = results.length > 1;
  const payment = wishPayment(state, pool, isMulti ? 10 : 1);
  const rePullCost = payment.crystals;
  const canRePull = payment.affordable;

  return (
    <div className={`summon-stage-overlay phase-${phase} max-${maxRarity}`}>
      {/* 宇宙星空深空与流光粒子 */}
      <div className="astral-space">
        <div className="astral-nebula" />
        <div className="star-particles" />
      </div>

      {/* 顶部控制栏 */}
      <header className="summon-stage-header">
        <div className="banner-tag">
          <Icon name="sparkle" />
          <span>{kind === "companion" ? "角色星契降临" : "武器回响唤醒"}</span>
        </div>
        {phase !== "summary" && (
          <button className="skip-btn" onClick={handleSkip}>
            <span>跳过动画</span>
            <Icon name="chevron" />
          </button>
        )}
      </header>

      {/* 阶段 1: 星门召唤流星降临动画 */}
      {phase === "starfall" && (
        <div className="starfall-sequence" onClick={() => setPhase("reveal")}>
          <div className="celestial-astrolabe">
            <div className="astrolabe-ring ring-outer" />
            <div className="astrolabe-ring ring-middle" />
            <div className="astrolabe-ring ring-inner" />
            <div className="astrolabe-core" />
          </div>

          <div className={`cosmic-meteor meteor-${maxRarity}`}>
            <div className="meteor-head" />
            <div className="meteor-tail" />
            <div className="meteor-burst" />
          </div>

          <div className="touch-prompt">
            <span className="pulse-mark">✦</span>
            <p>星门共鸣中... 点击触碰星核</p>
          </div>
        </div>
      )}

      {/* 阶段 2: 逐张翻牌与揭示 */}
      {phase === "reveal" && currentResult && (
        <div className="reveal-sequence">
          {/* 5星 专属高光特写浮层 */}
          {showSpotlight ? (
            <div className="ssr-spotlight-modal" onClick={handleNextCard}>
              <div className="spotlight-godrays" />
              <div className="spotlight-badge">
                <span>✦ ✦ ✦ ✦ ✦</span>
                <b>5星 CELESTIAL PACT</b>
              </div>
              <div className="spotlight-content">
                {currentResult.kind === "companion" &&
                getItemInfo(currentResult).companion ? (
                  <div className="spotlight-portrait-wrap">
                    <CharacterArt
                      companion={getItemInfo(currentResult).companion!}
                      className="spotlight-full-art"
                    />
                  </div>
                ) : (
                  <div className="spotlight-weapon-emblem">
                    <span>◇</span>
                  </div>
                )}
                <div className="spotlight-details">
                  <span className="spotlight-title">
                    {getItemInfo(currentResult).title}
                  </span>
                  <h1 className="spotlight-name">
                    {getItemInfo(currentResult).name}
                  </h1>
                  <p className="spotlight-quote">
                    {getItemInfo(currentResult).quote}
                  </p>
                  {currentResult.duplicate && (
                    <div className="spotlight-dup-badge">
                      <Icon name="sparkle" />
                      <span>
                        {currentResult.kind === "companion"
                          ? "同名契约感应 · 命座突破 +1"
                          : "神兵共鸣 · 武器精炼等阶提升"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="spotlight-hint">点击任意区域继续</div>
            </div>
          ) : (
            /* 普通单张卡牌翻牌展示 */
            <div className="single-card-showcase" onClick={handleNextCard}>
              <div className="card-counter">
                {currentIndex + 1} / {results.length}
              </div>

              <div
                className={`card-flip-container rarity-${currentResult.rarity}`}
              >
                <div className="card-front">
                  <div className="card-rarity-header">
                    <span className="rarity-pill">{currentResult.rarity}</span>
                    <span className="kind-pill">
                      {currentResult.kind === "companion" ? "角色" : "兵装"}
                    </span>
                  </div>

                  <div className="card-art-box">
                    {currentResult.kind === "companion" &&
                    getItemInfo(currentResult).companion ? (
                      <CharacterArt
                        companion={getItemInfo(currentResult).companion!}
                        className="reveal-full-art"
                      />
                    ) : (
                      <EquipmentArt
                        kind="weapon"
                        signatureFor={
                          weaponCatalog.find((w) => w.id === currentResult.id)
                            ?.signatureFor
                        }
                        name={getItemInfo(currentResult).name}
                        path={
                          companionCatalog.find(
                            (c) =>
                              c.id ===
                              weaponCatalog.find(
                                (w) => w.id === currentResult.id,
                              )?.signatureFor,
                          )?.path
                        }
                      />
                    )}
                  </div>

                  <div className="card-footer-info">
                    <h3>{getItemInfo(currentResult).name}</h3>
                    <p>{getItemInfo(currentResult).title}</p>
                    {currentResult.duplicate && (
                      <small className="dup-tag">
                        {currentResult.kind === "companion"
                          ? "转化命座"
                          : "自动精炼"}
                      </small>
                    )}
                  </div>
                </div>
              </div>

              <div className="reveal-controls">
                <button
                  className="secondary-button reveal-all-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRevealAll();
                  }}
                >
                  全部翻开
                </button>
                <span className="click-next-hint">点击卡片查看下一张</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 阶段 3: 最终结算全览展示 */}
      {phase === "summary" && (
        <div className="summary-sequence">
          <div className="summary-header">
            <span className="summary-badge">SUMMON RESULTS</span>
            <h2>契约结算 · 群星回响</h2>
            <p>本次祈愿共唤醒 {results.length} 道星轨回响</p>
          </div>

          <div className={`summary-grid count-${results.length}`}>
            {results.map((res, idx) => {
              const info = getItemInfo(res);
              return (
                <article
                  key={`${res.id}-${idx}`}
                  className={`summary-card rarity-${res.rarity}`}
                  style={{ animationDelay: `${idx * 0.06}s` }}
                >
                  <div className="summary-card-glow" />
                  <div className="summary-card-inner">
                    <div className="summary-card-top">
                      <span className="rarity-tag">{res.rarity}</span>
                      {res.duplicate && <span className="dup-chip">突破</span>}
                    </div>

                    <div className="summary-card-art">
                      {res.kind === "companion" && info.companion ? (
                        <Portrait
                          companion={info.companion}
                          className="summary-portrait"
                        />
                      ) : (
                        <EquipmentArt
                          kind="weapon"
                          signatureFor={
                            weaponCatalog.find((w) => w.id === res.id)
                              ?.signatureFor
                          }
                          name={info.name}
                          path={
                            companionCatalog.find(
                              (c) =>
                                c.id ===
                                weaponCatalog.find((w) => w.id === res.id)
                                  ?.signatureFor,
                            )?.path
                          }
                        />
                      )}
                    </div>

                    <div className="summary-card-meta">
                      <b>{info.name}</b>
                      <small>
                        {res.duplicate
                          ? res.kind === "companion"
                            ? "转化为命座"
                            : "自动精炼"
                          : info.title}
                      </small>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* 底部操作面板：确认与直接再抽 */}
          <footer className="summary-actions">
            <button className="secondary-button" onClick={onClose}>
              <Icon name="close" /> 确定返回
            </button>
            <button
              className="primary-button repull-btn"
              disabled={!canRePull}
              onClick={() => onRePull(isMulti ? 10 : 1)}
            >
              <Icon name="sparkle" />
              <span>再抽 {isMulti ? "10" : "1"} 次</span>
              <small>
                <Icon name="sparkle" /> {isMulti ? 10 : 1}
                {payment.resource} · 补{rePullCost}晶
              </small>
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
