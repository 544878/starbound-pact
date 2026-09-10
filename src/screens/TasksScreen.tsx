import { lazy, Suspense } from 'react'
import { RESOURCE_DUNGEONS } from '../data/resourceDungeons'
const StarCrystal = lazy(() => import('../components/StarCrystal'))
import { useState } from 'react'
import { Icon } from '../components/Icon'
import { MaterialArt } from '../components/MaterialArt'
import { activityMilestones } from '../data/catalog'
import type { TaskType } from '../domain/types'
import { useGame } from '../state/GameContext'

export function TasksScreen() {
  const { state, dispatch, navigate, claimTask, claimAllTasks, claimActivityChest } = useGame()
  const [tab, setTab] = useState<TaskType>('daily')

  const tasks = tab === 'daily' ? state.dailyTasks : tab === 'weekly' ? state.weeklyTasks : state.monthlyTasks
  const currentActivity = tab === 'daily' ? state.dailyActivity : tab === 'weekly' ? state.weeklyActivity : state.monthlyActivity
  const maxActivity = tab === 'daily' ? 100 : tab === 'weekly' ? 150 : 250
  const claimedChests = tab === 'daily' ? state.claimedDailyChests : tab === 'weekly' ? state.claimedWeeklyChests : state.claimedMonthlyChests
  const milestones = activityMilestones[tab]

  const hasUnclaimedTasks = tasks.some((t) => !t.claimed && t.progress >= t.target)

  const handleGoTask = (title: string) => {
    if (title.includes('祈愿') || title.includes('召唤')) navigate('summon')
    else if (title.includes('关卡') || title.includes('主线')) navigate('story')
    else if (title.includes('深塔') || title.includes('高塔')) navigate('tower')
    else if (title.includes('强化') || title.includes('等级') || title.includes('精炼')) navigate('companions')
    else navigate('formation')
  }

  return (
    <section className="tasks-screen">
      <div className="tasks-background" />

      {/* 顶部标题与分类标签 */}
      <header className="tasks-header panel">
        <div className="tasks-title-box">
          <span className="tasks-badge">MISSIONS & REWARDS</span>
          <h1>委托与使命</h1>
          <p>每日巡礼 · 周度攻坚 · 月度征程 · 积累星轨活跃度赢取丰厚星晶与道具</p>
        </div>

        <div className="mission-crystal"><Suspense fallback={<MaterialArt name="星晶" size={140} />}><StarCrystal /></Suspense></div>
        <div className="tasks-tabs-row" role="tablist" aria-label="任务周期">
          <button
            role="tab"
            className={`tasks-tab ${tab === 'daily' ? 'active' : ''}`}
            aria-selected={tab === 'daily'} onClick={() => setTab('daily')}
          >
            <Icon name="sparkle" />
            <span>每日任务</span>
            <small>每日00:00刷新（北京时间）</small>
            {state.dailyTasks.some((t) => !t.claimed && t.progress >= t.target) && <span className="tab-dot" />}
          </button>
          <button
            role="tab"
            className={`tasks-tab ${tab === 'weekly' ? 'active' : ''}`}
            aria-selected={tab === 'weekly'} onClick={() => setTab('weekly')}
          >
            <Icon name="trophy" />
            <span>每周任务</span>
            <small>每周一刷新</small>
            {state.weeklyTasks.some((t) => !t.claimed && t.progress >= t.target) && <span className="tab-dot" />}
          </button>
          <button
            role="tab"
            className={`tasks-tab ${tab === 'monthly' ? 'active' : ''}`}
            aria-selected={tab === 'monthly'} onClick={() => setTab('monthly')}
          >
            <Icon name="star" />
            <span>每月任务</span>
            <small>每月1日刷新</small>
            {state.monthlyTasks.some((t) => !t.claimed && t.progress >= t.target) && <span className="tab-dot" />}
          </button>
        </div>
      </header>

      {/* 活跃度天梯横条与阶段宝箱 */}
      <section className="activity-rail panel">
        <div className="activity-info">
          <div className="activity-score">
            <span className="score-label">{tab === 'daily' ? '今日活跃' : tab === 'weekly' ? '本周活跃' : '本月活跃'}</span>
            <b className="score-num">{currentActivity}</b>
            <small>/{maxActivity}</small>
          </div>
          <p className="activity-desc">达成活跃度目标即可点击开启星契补给宝箱</p>
        </div>

        <div className="milestones-bar-container">
          <div className="milestones-track">
            <div
              className="milestones-fill"
              style={{ width: `${Math.min(100, (currentActivity / maxActivity) * 100)}%` }}
            />
          </div>

          <div className="milestones-points">
            {milestones.map((m) => {
              const isUnlocked = currentActivity >= m.points
              const isClaimed = claimedChests.includes(m.points)
              return (
                <button
                  key={m.points}
                  className={`milestone-node ${isUnlocked ? 'unlocked' : ''} ${isClaimed ? 'claimed' : ''}`}
                  disabled={!isUnlocked || isClaimed}
                  onClick={() => claimActivityChest(tab, m.points)}
                  title={
                    isClaimed
                      ? `已领取：星晶x${m.rewardCrystals}`
                      : isUnlocked
                        ? `点击领取：星晶x${m.rewardCrystals}，金币x${m.rewardGold}`
                        : `达到 ${m.points} 活跃度可领取`
                  }
                >
                  <div className="chest-icon-wrapper">
                    <MaterialArt name="金币宝箱" size={52} />{isClaimed && <Icon name="check" />}
                    {isUnlocked && !isClaimed && <span className="chest-glow-ring" />}
                  </div>
                  <span className="milestone-points-text">{m.points}</span>
                  <div className="milestone-tooltip">
                    <span>+{m.rewardCrystals}星晶</span>
                    {m.rewardItem && <small>{m.rewardItem.icon} {m.rewardItem.name}</small>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* 任务列表内容 */}
      <div className="mission-columns"><section className="tasks-content panel">
        <div className="tasks-toolbar">
          <div className="tasks-count">
            <span>任务进度：</span>
            <b>{tasks.filter((t) => t.claimed).length} / {tasks.length}</b>
          </div>
          <button
            className="primary-button claim-all-btn"
            disabled={!hasUnclaimedTasks}
            onClick={() => claimAllTasks(tab)}
          >
            <Icon name="gift" />
            <span>一键领取全部奖励</span>
          </button>
        </div>

        <div className="task-items-list">
          {tasks.map((task) => {
            const isFinished = task.progress >= task.target
            const progressPercent = Math.min(100, Math.round((task.progress / task.target) * 100))

            return (
              <div
                key={task.id}
                className={`task-row ${task.claimed ? 'claimed' : isFinished ? 'completable' : ''}`}
              >
                <div className="task-left">
                  <div className="task-activity-badge">
                    <span>+{task.rewardActivity}</span>
                    <small>活跃</small>
                  </div>
                  <div className="task-info">
                    <div className="task-title-row">
                      <h4>{task.title}</h4>
                      <span className="task-counter">
                        {Math.min(task.progress, task.target)} / {task.target}
                      </span>
                    </div>
                    <p className="task-desc">{task.desc}</p>
                    <div className="task-progress-mini">
                      <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                </div>

                <div className="task-right">
                  <div className="task-rewards">
                    <span className="reward-chip"><MaterialArt name="星晶" inline size={30} />+{task.rewardCrystals}</span>
                    <span className="reward-chip"><MaterialArt name="金币" inline size={30} />+{task.rewardGold.toLocaleString()}</span>
                    {task.rewardItem && (
                      <span className="reward-chip material">
                        <MaterialArt name={task.rewardItem.name} fallbackIcon={task.rewardItem.icon} inline size={16} />
                        x{task.rewardItem.count}
                      </span>
                    )}
                  </div>

                  <div className="task-action">
                    {task.claimed ? (
                      <span className="claimed-text">
                        <Icon name="check" /> 已完成
                      </span>
                    ) : isFinished ? (
                      <button
                        className="primary-button claim-single-btn"
                        onClick={() => claimTask(tab, task.id)}
                      >
                        <Icon name="gift" />
                        <span>领取</span>
                      </button>
                    ) : (
                      <button
                        className="secondary-button go-btn"
                        onClick={() => handleGoTask(task.title)}
                      >
                        <span>去完成</span>
                        <Icon name="chevron" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
      <aside className="resource-domains">
        <header><h2>资源副本</h2><p>每次挑战消耗 20 体力 · 胜利获得养成资源</p></header>
        {RESOURCE_DUNGEONS.map((d, i) => <button key={d.id} className={`resource-domain domain-${i}`} onClick={() => dispatch({ type: 'PREPARE_ENCOUNTER', encounter: { kind: 'resource', id: d.id } })}>
          <span className="domain-number">0{i + 1} / {d.name}</span><h3>{d.title}</h3><p>{d.desc}</p><span className="domain-reward">{d.reward}</span><span className="domain-enter">{state.stamina < d.cost ? '体力不足 · 查看编队' : '前往挑战'} <Icon name="chevron" /></span>
        </button>)}
        <p className="domain-note">纯净星核用于角色与武器每 10 级突破。技能材料覆盖全部六种元素。</p>
      </aside></div>
    </section>
  )
}
