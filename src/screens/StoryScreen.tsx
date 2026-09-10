import { useState } from "react";
import { initialStoryChapters, companionCatalog } from "../data/catalog";
import { CHRONICLES } from "../data/chronicles";
import { encounterBosses, stageUnlocked } from "../data/encounters";
import { CharacterArt } from "../components/CharacterArt";
import { useGame } from "../state/GameContext";
export function StoryScreen() {
  const { state, dispatch, claimSideQuest } = useGame();
  const [chapterId, setChapterId] = useState(
    state.encounter?.kind === "story" &&
      state.encounter.id.endsWith("-4") &&
      state.completedStages.includes(state.encounter.id)
      ? Number(state.encounter.id.split("-")[0])
      : Math.min(8, state.mainStoryChapter),
  );
  const [side, setSide] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const chapter = initialStoryChapters[chapterId - 1],
    story = CHRONICLES[chapterId - 1];
  const boss = encounterBosses[chapterId - 1],
    hero = companionCatalog.find((c) => c.id === story.hero)!;
  const choiceId = `${chapterId}-4`,
    choice = state.storyChoices?.[choiceId];
  const stage = chapter.stages.find((s) => s.id === reading);
  const sceneIndex = stage ? chapter.stages.indexOf(stage) : 0;
  return (
    <section className="epic-page chronicles-page">
      <header className="epic-heading">
        <div>
          <span className="eyebrow">CHRONICLES / 万界编年</span>
          <h1>以一人之志，与万千同行。</h1>
          <p>八卷玄幻长诗 · {state.completedStages.length} / 32 关卡已通关</p>
        </div>
        <div className="detail-tabs">
          <button aria-selected={!side} onClick={() => setSide(false)}>
            主线
          </button>
          <button aria-selected={side} onClick={() => setSide(true)}>
            见闻
          </button>
        </div>
      </header>
      {side ? (
        <div className="epic-quest-grid">
          {state.sideQuests.map((q) => (
            <article className="epic-card" key={q.id}>
              <span className="eyebrow">
                {q.tag} · {q.progress}/{q.targetCount}
              </span>
              <h2>{q.title}</h2>
              <p>{q.description}</p>
              <p>
                星晶 {q.rewardCrystals} · 金币 {q.rewardGold}
              </p>
              <button
                className="primary-button"
                disabled={q.claimed || q.progress < q.targetCount}
                onClick={() => claimSideQuest(q.id)}
              >
                {q.claimed ? "奖励已领取" : "交付见闻"}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="chronicle-layout">
          <aside className="chapter-nav">
            {initialStoryChapters.map((c) => (
              <button
                key={c.id}
                aria-pressed={c.id === chapterId}
                onClick={() => setChapterId(c.id)}
              >
                <span>{String(c.id).padStart(2, "0")}</span>
                <div>
                  <b>{CHRONICLES[c.id - 1].title}</b>
                  <small>
                    {
                      state.completedStages.filter((s) =>
                        s.startsWith(`${c.id}-`),
                      ).length
                    }
                    /4 · {c.id <= state.mainStoryChapter ? "已开启" : "可预览"}
                  </small>
                </div>
              </button>
            ))}
          </aside>
          <main className="chronicle-main">
            <div className="chronicle-banner">
              <div>
                <span className="eyebrow">{story.subtitle}</span>
                <h2>{story.title}</h2>
                <p>{story.description}</p>
                <blockquote>
                  「{story.scenes[0][2].replace(/[“”]/g, "")}」
                </blockquote>
              </div>
              <CharacterArt companion={hero} />
            </div>
            <div className="chapter-stages">
              {chapter.stages.map((s, i) => {
                const cleared = state.completedStages.includes(s.id),
                  open = stageUnlocked(state.completedStages, s.id);
                return (
                  <article key={s.id}>
                    <span className="stage-index">
                      {cleared ? "✓" : s.stageNum}
                    </span>
                    <div>
                      <small>
                        {i === 3 ? "首领决战" : "剧情战役"} · 体力{" "}
                        {s.staminaCost}
                      </small>
                      <h3>{s.title}</h3>
                      <p>{s.synopsis}</p>
                      <small>
                        首通：{s.firstClearRewards.crystals}星晶 ·{" "}
                        {s.firstClearRewards.gold}金币 ·{" "}
                        {s.firstClearRewards.items[0].name}×
                        {s.firstClearRewards.items[0].count}
                      </small>
                    </div>
                    <button disabled={!open} onClick={() => setReading(s.id)}>
                      {cleared
                        ? "重温 / 再战"
                        : open
                          ? "进入剧情 →"
                          : "前置未通关"}
                    </button>
                  </article>
                );
              })}
            </div>
            {state.completedStages.includes(choiceId) && (
              <section className="epic-card story-ending">
                <span className="eyebrow">章节抉择 / 命运回响</span>
                <h3>你们的选择，将如何被记住？</h3>
                <div className="choice-buttons">
                  {story.choice.map((text, i) => (
                    <button
                      aria-pressed={choice === (i === 0 ? "self" : "team")}
                      key={text}
                      onClick={() =>
                        dispatch({
                          type: "STORY_CHOICE",
                          id: choiceId,
                          choice: i === 0 ? "self" : "team",
                        })
                      }
                    >
                      {text}
                    </button>
                  ))}
                </div>
                <p>
                  {choice
                    ? story.endings[choice === "self" ? 0 : 1]
                    : "选择后记录结局，可随时重温并调整。"}
                </p>
                <small>
                  最新章节选择作用于后续战斗：独行之志使星璃直接伤害+12%；同行之誓使全阵承伤−8%。
                </small>
              </section>
            )}
          </main>
          <aside className="chapter-boss epic-card">
            <img src={`/assets/bosses/${boss.id}.png`} alt={boss.name} />
            <span className="eyebrow">本卷首领</span>
            <h2>{boss.name}</h2>
            <p>{boss.hint}</p>
            <dl>
              <dt>基础生命</dt>
              <dd>{(boss.hp * 250).toLocaleString()}</dd>
              <dt>阶段转换</dt>
              <dd>50%生命</dd>
              <dt>破盾窗口</dt>
              <dd>战技削盾 · 破盾增伤20%</dd>
            </dl>
          </aside>
        </div>
      )}
      {stage && (
        <div className="epic-modal-backdrop">
          <section
            className="story-reader"
            role="dialog"
            aria-modal="true"
            aria-label={stage.title}
            onKeyDown={(e) => e.key === "Escape" && setReading(null)}
          >
            <span className="eyebrow">
              {stage.stageNum} / {story.title}
            </span>
            <h2>{stage.title}</h2>
            <p>{stage.synopsis}</p>
            <blockquote>
              <b>{story.speaker}</b>
              <p>{story.scenes[sceneIndex][2]}</p>
            </blockquote>
            <p className="fine-print">
              战斗胜利后结算奖励。进入编队不会消耗体力。
            </p>
            <div>
              <button
                autoFocus
                className="secondary-button"
                onClick={() => setReading(null)}
              >
                返回章节
              </button>
              <button
                className="primary-button"
                onClick={() =>
                  dispatch({
                    type: "PREPARE_ENCOUNTER",
                    encounter: { kind: "story", id: stage.id },
                  })
                }
              >
                集结出战 →
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
