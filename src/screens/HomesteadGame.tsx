import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { Portrait } from '../components/Portrait'
import { CharacterArt } from '../components/CharacterArt'
import { useGame } from '../state/GameContext'
export function HomesteadGame({ onBack }: { onBack: () => void }) {
  const { state, harvestHomestead, toggleStationCompanion } = useGame()
  const companions = state.companions
  const [speechIndex, setSpeechIndex] = useState(0)
  const [harvestFeedback, setHarvestFeedback] = useState<string | null>(null)

  // 驻留的伙伴列表
  const stationedCompanions = companions.filter((c) =>
    state.homestead.stationedCompanionIds.includes(c.id)
  )

  // 计算离线/实时累积收益
  const [now,setNow] = useState(Date.now())
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return ()=>window.clearInterval(timer)},[])
  const elapsedMinutes = Math.max(0, Math.floor((now - state.homestead.lastHarvestTimestamp) / (1000 * 60)))
  const pendingStamina = Math.min(240-state.stamina, Math.min(120, state.homestead.accumulatedStamina + Math.floor(elapsedMinutes / 5)))
  const pendingGold = Math.min(20000, state.homestead.accumulatedGold + elapsedMinutes * 20)

  const quotes = [
    '“指挥官，刚为您沏好了特制的星辰红茶，先坐下歇歇脚吧~”',
    '“家园的温室花房开满了风铃草，散发着安神的清香。”',
    '“大家聚在一起的时光，连漫长的虚空征途都变得温暖了呢。”',
    '“刚才艾尔登擦拭了圣殿之盾，诺克缇娅正在阳台看星星。”',
  ]

  const handleHarvest = () => {
    if (pendingStamina <= 0 && pendingGold <= 0) {
      setHarvestFeedback('暂无过多产出，请稍后再来收取哦~')
      setTimeout(() => setHarvestFeedback(null), 1500)
      return
    }
    harvestHomestead()
    setHarvestFeedback(`🎉 一键收取成功！获得 体力 +${pendingStamina}，金币 +${pendingGold}`)
    setTimeout(() => setHarvestFeedback(null), 2500)
  }

  return (
    <div className="minigame-container homestead-view">
      <div className="minigame-sub-header">
        <button className="sub-back-btn" onClick={onBack}>
          <Icon name="chevron" /> 返回活动大厅
        </button>
        <div className="sub-header-center">
          <h3>🏡 星界家园 · 休憩庇护所</h3>
          <span className="dorm-status-pill">舒适度: {state.homestead.comfort} 点</span>
        </div>
        <div className="sub-high-score">
          <small>驻留成员</small>
          <b>{stationedCompanions.length} / 4 位</b>
        </div>
      </div>

      <div className="homestead-room-container">
        {/* 家园房间视觉画布 */}
        <div className="dorm-room-visual panel">
          <div className="dorm-room-sky-window">
            <div className="nebula-twinkle" />
            <div className="space-planet" />
          </div>

          {/* 气泡对话框 */}
          <div
            className="dorm-bubble"
            onClick={() => setSpeechIndex((prev) => (prev + 1) % quotes.length)}
          >
            <Icon name="chat" />
            <span>{quotes[speechIndex]}</span>
            <small className="bubble-hint">点击互动 ✦</small>
          </div>

          {/* 房间悬浮待领取的资源气泡 */}
          <div className="dorm-floating-bubbles">
            <div className="resource-bubble stamina-bubble" onClick={handleHarvest}>
              <Icon name="bolt" />
              <span>+{pendingStamina} 体力</span>
            </div>
            <div className="resource-bubble gold-bubble" onClick={handleHarvest}>
              <Icon name="coin" />
              <span>+{pendingGold} 金币</span>
            </div>
          </div>

          {/* 驻留的战术伙伴们 */}
          <div className="dorm-chibi-stage">
            {stationedCompanions.map((comp, idx) => (
              <div
                key={comp.id}
                className="dorm-chibi-actor"
                style={{ animationDelay: `${idx * 0.4}s` }}
              >
                <div className="actor-sprite-wrap">
                  <CharacterArt companion={comp} view={3} />
                </div>
                <div className="actor-nametag">
                  <span>{comp.name}</span>
                </div>
              </div>
            ))}
            {stationedCompanions.length === 0 && (
              <div className="empty-dorm-tip">
                <p>家园尚无成员驻留，快从下方安排伙伴们入驻吧~</p>
              </div>
            )}
          </div>
        </div>

        {harvestFeedback && (
          <div className="harvest-feedback-toast">{harvestFeedback}</div>
        )}

        {/* 收益收取与舒适度统计面板 */}
        <div className="homestead-control-panel panel">
          <div className="comfort-overview">
            <div className="comfort-metric">
              <span>当前家园舒适度</span>
              <b className="comfort-val">{state.homestead.comfort}</b>
              <small>已驻留 {stationedCompanions.length} 位角色 (每位 +110 舒适度)</small>
            </div>
            <div className="pending-yield-metric">
              <span>待收取自然积累</span>
              <div className="yield-pills">
                <span className="y-pill"><Icon name="bolt" /> {pendingStamina} 点</span>
                <span className="y-pill"><Icon name="coin" /> {pendingGold} 金</span>
              </div>
              <small>每分钟 20 金币 · 每 5 分钟 1 体力</small>
            </div>
            <button className="primary-button harvest-btn" onClick={handleHarvest}>
              <Icon name="sparkle" /> 一键收取全部收益
            </button>
          </div>

          {/* 伙伴驻留排班管理 */}
          <div className="stationing-manager">
            <div className="manager-title">
              <b>伙伴驻留排班 (最多入驻 4 位伙伴)</b>
              <small>点击角色头像即可入驻或移出家园</small>
            </div>
            <div className="manager-grid">
              {companions.map((comp) => {
                const isStationed = state.homestead.stationedCompanionIds.includes(comp.id)
                return (
                  <div
                    key={comp.id}
                    className={`manager-card ${isStationed ? 'stationed' : ''}`}
                    onClick={() => toggleStationCompanion(comp.id)}
                  >
                    <Portrait companion={comp} />
                    <div className="manager-meta">
                      <b>{comp.name}</b>
                      <span className={`status-badge ${isStationed ? 'badge-in' : 'badge-out'}`}>
                        {isStationed ? '✓ 驻留中' : '+ 安排入驻'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

