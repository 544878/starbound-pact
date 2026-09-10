import { useState } from 'react'
import { companionCatalog as companions, roleLabels } from '../data/catalog'
import { RULES } from '../data/advancedRules'
import { Portrait } from '../components/Portrait'
import { useGame } from '../state/GameContext'
import {
  createWar,
  buy,
  position,
  fightWar,
  nextWar,
  offers,
  cost,
  bonds,
} from '../systems/currencyWar'
export function CurrencyGame() {
  const { state, updateCurrencyWarsScore } = useGame()
  const [war, setWar] = useState(() => createWar())
  const [fighting, setFighting] = useState(false)
  const ready = war.phase === 'prepare' && !fighting
  function fight() {
    if (!ready) return
    setFighting(true)
    const next = fightWar(war, state.companions, state.weapons)
    setWar(next)
    if (next.phase === 'finished')
      updateCurrencyWarsScore(next.round * 100 + next.health * 10)
    setFighting(false)
  }
  return (
    <section className="mode-page">
      <header className="mode-heading">
        <div>
          <h1>货币战争</h1>
          <p>招募、经营与羁绊 · 前台作战，后台协同</p>
        </div>
        <div className="mode-metrics">
          <b>
            节点 {war.round}/{RULES.currency.rounds}
          </b>
          <b>生命 {war.health}</b>
          <b>金币 {war.gold}</b>
          <b>
            团队 {war.roster.filter((u) => u.zone !== 'bench').length}/
            {war.level}
          </b>
        </div>
      </header>
      <div className="war-layout">
        <div>
          <div className="war-toolbar">
            <label>
              投资策略{' '}
              <select
                value={war.strategy}
                disabled={!ready || war.round !== 1}
                onChange={(e) =>
                  setWar({
                    ...war,
                    strategy: e.target.value as typeof war.strategy,
                  })
                }
              >
                <option value="income">稳健经营 · 每轮 +2 金币</option>
                <option value="assault">锋锐投资 · 攻击 +15%</option>
                <option value="reserve">协同投资 · 每位后台 +1 金币</option>
              </select>
            </label>
            <button
              disabled={
                !ready ||
                war.gold < RULES.currency.upgrade ||
                war.level >= RULES.currency.maxTeam
              }
              onClick={() =>
                setWar({
                  ...war,
                  gold: war.gold - RULES.currency.upgrade,
                  level: war.level + 1,
                })
              }
            >
              扩充团队 · {RULES.currency.upgrade} 金币
            </button>
          </div>
          {(['front', 'back', 'bench'] as const).map((zone) => (
            <section className={`deployment-zone zone-${zone}`} key={zone}>
              <h2>
                {
                  {
                    front: '前台 · 最多四人',
                    back: '后台 · 每三次行动触发协同',
                    bench: '备战席 · 最多九人',
                  }[zone]
                }
              </h2>
              <div className="war-units">
                {war.roster
                  .filter((u) => u.zone === zone)
                  .map((u) => {
                    const c = companions.find((c) => c.id === u.id)!
                    return (
                      <article key={u.uid}>
                        <Portrait companion={c} />
                        <b>{c.name}</b>
                        <small>
                          {'◆'.repeat(u.rank)} 阶 · {roleLabels[c.role]}
                        </small>
                        <select
                          aria-label={`${c.name}部署位置`}
                          disabled={!ready}
                          value={u.zone}
                          onChange={(e) =>
                            setWar(
                              position(
                                war,
                                u.uid,
                                e.target.value as typeof zone,
                              ),
                            )
                          }
                        >
                          <option value="front">前台</option>
                          <option value="back">后台</option>
                          <option value="bench">备战</option>
                        </select>
                        <button
                          className="quiet"
                          disabled={!ready}
                          onClick={() =>
                            setWar({
                              ...war,
                              gold: war.gold + cost(u.id) * 3 ** (u.rank - 1),
                              roster: war.roster.filter((v) => v.uid !== u.uid),
                            })
                          }
                        >
                          出售 +{cost(u.id) * 3 ** (u.rank - 1)}
                        </button>
                      </article>
                    )
                  })}
                {!war.roster.some((u) => u.zone === zone) && (
                  <p className="empty-note">从商店招募，再选择部署位置</p>
                )}
              </div>
            </section>
          ))}
        </div>
        <aside className="tactical-inspector">
          <h2>羁绊</h2>
          {bonds(war).map((b) => (
            <p key={b.role} className={b.count >= 2 ? 'bond-active' : ''}>
              {roleLabels[b.role as keyof typeof roleLabels]} {b.count}/2{' '}
              {b.count >= 2 ? '· 全队伤害 +12%' : ''}
            </p>
          ))}
          <p>相同角色三合一升阶；重复角色不重复计入羁绊。</p>
          <p>
            利息：每 {RULES.currency.interestStep} 金币 +1，上限{' '}
            {RULES.currency.interestCap}。另有基础与连胜收入。
          </p>
          <div className="combat-log" aria-live="polite">
            {war.log.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
          {war.phase === 'prepare' ? (
            <button
              className="primary-button wide"
              disabled={!ready || !war.roster.some((u) => u.zone === 'front')}
              onClick={fight}
            >
              开始自动战斗
            </button>
          ) : war.phase === 'result' ? (
            <button
              className="primary-button wide"
              onClick={() => setWar(nextWar(war))}
            >
              进入下一节点
            </button>
          ) : (
            <>
              <h3>{war.health > 0 ? '博弈完成' : '团队生命耗尽'}</h3>
              <button
                className="primary-button wide"
                onClick={() => setWar(createWar())}
              >
                重新开局
              </button>
            </>
          )}
        </aside>
      </div>
      <section className="recruit-shop">
        <div className="war-toolbar">
          <h2>招募商店</h2>
          <label>
            <input
              type="checkbox"
              checked={war.locked}
              disabled={!ready}
              onChange={(e) => setWar({ ...war, locked: e.target.checked })}
            />{' '}
            锁定商店
          </label>
          <button
            disabled={!ready || war.gold < RULES.currency.refresh}
            onClick={() =>
              setWar({
                ...war,
                gold: war.gold - RULES.currency.refresh,
                shop: offers(),
              })
            }
          >
            刷新 · {RULES.currency.refresh} 金币
          </button>
        </div>
        <div className="shop-offers">
          {war.shop.map((id, i) => {
            const c = companions.find((c) => c.id === id)
            return (
              <button
                key={i}
                disabled={!ready || !c || war.gold < cost(id!)}
                onClick={() => setWar(buy(war, i))}
              >
                {c ? (
                  <>
                    <Portrait companion={c} />
                    <span>
                      <b>{c.name}</b>
                      <small>
                        {c.rarity} · {roleLabels[c.role]} · {cost(c.id)} 金币
                      </small>
                    </span>
                  </>
                ) : (
                  <span>已招募</span>
                )}
              </button>
            )
          })}
        </div>
      </section>
    </section>
  )
}
