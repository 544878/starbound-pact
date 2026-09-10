import { useState, useEffect } from 'react'
import { useGame } from '../state/GameContext'
import { DynamicSignboard, type SignboardStance } from '../components/DynamicSignboard'
import { Icon } from '../components/Icon'
import { Portrait } from '../components/Portrait'
import { MusicPlayerPill } from '../components/MusicPlayerPill'
import { audioEngine } from '../audio/audioEngine'
import type { Screen } from '../domain/types'

export function HomeScreen() {
  const { state, navigate, selectCompanion, cycleAssistantQuote } = useGame()
  const [stance, setStance] = useState<SignboardStance>('wide')
  const [immersiveMode, setImmersiveMode] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filterElement, setFilterElement] = useState<string>('all')

  // Signboard companion (defaults to selene or selected)
  const companion =
    state.companions.find((c) => c.id === state.selectedCompanionId) ??
    state.companions.find((c) => c.id === 'selene') ??
    state.companions[0]

  const currentQuote =
    companion.quotes?.[state.assistantQuoteIndex % (companion.quotes?.length ?? 1)] ??
    '星光与潮汐，皆在此处与你同行。'

  // Check pending task rewards
  const hasTaskRewards =
    state.dailyTasks.some((t) => !t.claimed && t.progress >= t.target) ||
    state.weeklyTasks.some((t) => !t.claimed && t.progress >= t.target)

  // Quick navigation items for right HUD dock
  const navHubs: Array<{
    id: Screen
    title: string
    sub: string
    icon: 'gamepad' | 'paw' | 'shield' | 'star' | 'tower' | 'scroll' | 'bag' | 'shop'
    badge?: string
    highlight?: boolean
  }> = [
    {
      id: 'activities',
      title: '作战演练',
      sub: '试炼 · 副本',
      icon: 'gamepad',
      highlight: true,
    },
    {
      id: 'companions',
      title: '角色名册',
      sub: `${state.companions.length}位同行`,
      icon: 'paw',
    },
    {
      id: 'formation',
      title: '星阵编队',
      sub: '五行战术阵法',
      icon: 'shield',
    },
    {
      id: 'summon',
      title: '星轨祈愿',
      sub: '命运限定招募',
      icon: 'star',
    },
    {
      id: 'tower',
      title: '万界深塔',
      sub: `第${state.highestTowerFloor || 4}层试炼`,
      icon: 'tower',
    },
    {
      id: 'tasks',
      title: '日常委托',
      sub: '执勤奖励',
      icon: 'scroll',
      badge: hasTaskRewards ? '可领' : undefined,
    },
    {
      id: 'inventory',
      title: '星际行囊',
      sub: '装备 · 圣宝',
      icon: 'bag',
    },
    {
      id: 'shop',
      title: '星辉补给',
      sub: '超值特惠兑换',
      icon: 'shop',
    },
  ]

  const filteredCompanions =
    filterElement === 'all'
      ? state.companions
      : state.companions.filter((c) => c.element === filterElement)

  return (
    <section className={`quiet-home ${immersiveMode ? 'immersive-active' : ''}`}>
      {/* Dynamic Animated Signboard Girl (Full Screen Canvas, No Seams) */}
      <DynamicSignboard
        companion={companion}
        currentQuote={immersiveMode ? undefined : currentQuote}
        onInteract={cycleAssistantQuote}
        stance={stance}
        onStanceChange={setStance}
      />

      {/* Top Floating Controls Bar */}
      <div className="home-top-controls">
        <MusicPlayerPill />

        <button
          className={`glass-pill-btn ${immersiveMode ? 'active' : ''}`}
          onClick={() => setImmersiveMode((v) => !v)}
          title={immersiveMode ? '退出沉浸模式' : '进入沉浸模式（隐藏UI）'}
          aria-label="沉浸模式"
        >
          <span className="pill-icon">{immersiveMode ? '✨' : '👁️'}</span>
          <span>{immersiveMode ? '退出沉浸' : '沉浸模式'}</span>
        </button>

        <button
          className="glass-pill-btn"
          onClick={() => setDrawerOpen(true)}
          title="更换当前看板娘"
          aria-label="更换看板娘"
        >
          <span className="pill-icon">👥</span>
          <span>换看板娘</span>
        </button>
      </div>

      {/* Main Interactive HUD Layer (Hidden during Immersive Mode) */}
      <div className={`home-hud-layer ${immersiveMode ? 'hud-hidden' : ''}`}>
        {/* Left Panel: Campaign & Main Story Card */}
        <div className="home-campaign-dock">
          <div className="campaign-tag-badge">
            <span className="star-symbol">✦</span>
            <span>第{state.mainStoryChapter || 1}卷 · 溯忆海渊</span>
          </div>

          <h1 className="campaign-headline">天命之外，与你同行。</h1>
          <p className="campaign-lead">
            和<b>{companion.name}</b>一起，把万界的明天，握在自己手中。
          </p>

          <div className="campaign-stage-card">
            <div className="stage-info-row">
              <span className="stage-badge">主线进展</span>
              <span className="stage-num">Stage {state.mainStoryStageId}</span>
              <span className="stage-cost">⚡ 体力 6</span>
            </div>
            <div className="stage-actions">
              <button
                className="campaign-prime-btn"
                onClick={() => navigate('activities')}
              >
                <Icon name="sword" className="btn-icon" />
                <span>进入作战</span>
              </button>
              <button
                className="campaign-sub-btn"
                onClick={() => navigate('story')}
              >
                <span>继续剧情</span>
                <span className="arrow-mark">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Primary Game Entrances Matrix */}
        <div className="home-entrance-dock" aria-label="核心玩法入口">
          <div className="dock-header">
            <span className="dock-accent-line" />
            <span className="dock-title">星轨枢纽 · 快捷入口</span>
          </div>
          <div className="dock-grid">
            {navHubs.map((hub) => (
              <button
                key={hub.id}
                className={`hub-card ${hub.highlight ? 'hub-card-highlight' : ''}`}
                onClick={() => navigate(hub.id)}
                title={`前往 ${hub.title}`}
              >
                <div className="hub-card-icon-wrap">
                  <Icon name={hub.icon} className="hub-svg" />
                  {hub.badge && <span className="hub-badge-dot">{hub.badge}</span>}
                </div>
                <div className="hub-card-meta">
                  <b className="hub-card-title">{hub.title}</b>
                  <small className="hub-card-sub">{hub.sub}</small>
                </div>
                <span className="hub-glow-corner" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Companion Selector Drawer Modal */}
      {drawerOpen && (
        <div
          className="companion-drawer-overlay"
          onClick={() => setDrawerOpen(false)}
        >
          <aside
            className="companion-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="选择看板娘"
          >
            <header className="drawer-header">
              <div className="drawer-title-group">
                <span className="brand-mark">✦</span>
                <h2>更换看板娘</h2>
                <small>共 {state.companions.length} 位同伴</small>
              </div>
              <button
                className="drawer-close-btn"
                onClick={() => setDrawerOpen(false)}
                aria-label="关闭"
              >
                ✕
              </button>
            </header>

            {/* Element Filter Pills */}
            <div className="drawer-filter-pills">
              {[
                { id: 'all', label: '全部' },
                { id: 'water', label: '水潮' },
                { id: 'wind', label: '风灵' },
                { id: 'light', label: '光曜' },
                { id: 'fire', label: '烈焰' },
                { id: 'flora', label: '森语' },
                { id: 'shadow', label: '幽影' },
              ].map((f) => (
                <button
                  key={f.id}
                  className={`filter-pill ${filterElement === f.id ? 'active' : ''}`}
                  onClick={() => setFilterElement(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Roster Grid */}
            <div className="drawer-roster-grid">
              {filteredCompanions.map((unit) => {
                const isCurrent = unit.id === companion.id
                return (
                  <button
                    key={unit.id}
                    className={`drawer-roster-card ${isCurrent ? 'selected' : ''}`}
                    onClick={() => {
                      selectCompanion(unit.id)
                      setDrawerOpen(false)
                    }}
                  >
                    <div className="roster-portrait-wrap">
                      <Portrait companion={unit} />
                      {isCurrent && <span className="active-badge">当前在位</span>}
                      <span className="rarity-badge">{unit.rarity}</span>
                    </div>
                    <div className="roster-meta">
                      <b>{unit.name}</b>
                      <small>{unit.title}</small>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}
