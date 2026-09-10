import { useState } from 'react'
import { Portrait } from '../components/Portrait'
import { useGame } from '../state/GameContext'
import { createDuel, duelAction, type Duel } from '../systems/duel'
export function DuelGame() {
  const { state, recordPvpWin } = useGame()
  const [teams, setTeams] = useState<[string[], string[]]>([[], []])
  const [picker, setPicker] = useState<0 | 1>(0)
  const [game, setGame] = useState<Duel | null>(null)
  const [actor, setActor] = useState('')
  const [skill, setSkill] = useState(false)
  const [score, setScore] = useState([0, 0])
  const [match, setMatch] = useState(1)
  function pick(id: string) {
    setTeams((t) => {
      const n: [string[], string[]] = [[...t[0]], [...t[1]]]
      n[picker] = n[picker].includes(id)
        ? n[picker].filter((v) => v !== id)
        : n[picker].length < 5
          ? [...n[picker], id]
          : n[picker]
      return n
    })
  }
  function act(id: string) {
    if (!game) return
    const next = duelAction(game, actor, id, skill)
    if (next === game) return
    setGame(next)
    setActor('')
    if (next.winner !== null) {
      setScore((s) => s.map((v, i) => v + (i === next.winner ? 1 : 0)))
      recordPvpWin()
    }
  }
  return (
    <section className="mode-page">
      <header className="mode-heading">
        <div>
          <h1>双人对决</h1>
          <p>同屏轮流操作 · 双方各五人 · 第 {match} 场</p>
        </div>
        <strong className="score">
          {score[0]} : {score[1]}
        </strong>
      </header>
      {!game ? (
        <>
          <div className="segmented">
            {([0, 1] as const).map((i) => (
              <button
                className={picker === i ? 'active' : ''}
                key={i}
                onClick={() => setPicker(i)}
              >
                玩家{i + 1} · {teams[i].length}/5
              </button>
            ))}
          </div>
          <p>每场重新自选阵容，双方可以选择相同角色，单方不能重复。</p>
          <div className="draft-roster">
            {state.companions.map((c) => (
              <button
                key={c.id}
                className={teams[picker].includes(c.id) ? 'chosen' : ''}
                onClick={() => pick(c.id)}
              >
                <Portrait companion={c} />
                <b>{c.name}</b>
                <small>
                  {c.rarity} · {teams[picker].includes(c.id) ? '已选' : '选择'}
                </small>
              </button>
            ))}
          </div>
          <div className="team-summary">
            {teams.map((t, i) => (
              <p key={i}>
                玩家{i + 1}：
                {t
                  .map((id) => state.companions.find((c) => c.id === id)?.name)
                  .join(' / ') || '尚未选人'}
              </p>
            ))}
          </div>
          <button
            className="primary-button"
            disabled={teams.some((t) => t.length !== 5)}
            onClick={() =>
              setGame(
                createDuel(
                  ...(teams.map((t) =>
                    t.map((id) => state.companions.find((c) => c.id === id)!),
                  ) as [typeof state.companions, typeof state.companions]),
                  state.weapons,
                ),
              )
            }
          >
            开始 5 对 5
          </button>
        </>
      ) : (
        <>
          <div className="battle-status">
            <b>
              {game.winner === null
                ? `行动回合 ${game.round} · 玩家${game.team + 1}操作`
                : `玩家${game.winner + 1}获胜`}
            </b>
            <label>
              <input
                type="checkbox"
                checked={skill}
                onChange={(e) => setSkill(e.target.checked)}
              />{' '}
              使用技能（辅助治疗友方）
            </label>
          </div>
          <div className="duel-arena">
            {([0, 1] as const).map((side) => (
              <div className="duel-team" key={side}>
                <h2>玩家{side + 1}</h2>
                {game.fighters
                  .filter((f) => f.team === side)
                  .map((f) => (
                    <button
                      key={f.id}
                      disabled={f.hp <= 0 || game.winner !== null}
                      className={`fighter ${actor === f.id ? 'chosen' : ''} ${game.used.includes(f.id) ? 'acted' : ''}`}
                      onClick={() => {
                        if (
                          actor &&
                          (side !== game.team ||
                            (skill &&
                              game.fighters.find((f) => f.id === actor)
                                ?.character.role === 'support'))
                        )
                          act(f.id)
                        else if (
                          side === game.team &&
                          !game.used.includes(f.id)
                        )
                          setActor(f.id)
                      }}
                    >
                      <Portrait companion={f.character} />
                      <span>
                        <b>{f.character.name}</b>
                        <small>
                          {Math.ceil(f.hp)} / {f.stats.hp}{' '}
                          {game.used.includes(f.id) ? '· 已行动' : ''}
                        </small>
                        <progress value={f.hp} max={f.stats.hp} />
                      </span>
                    </button>
                  ))}
              </div>
            ))}
          </div>
          <div className="combat-log" aria-live="polite">
            {game.log.slice(0, 4).map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
          {game.winner !== null && (
            <button
              className="primary-button"
              onClick={() => {
                setGame(null)
                setTeams([[], []])
                setPicker(0)
                setActor('')
                setMatch((v) => v + 1)
              }}
            >
              下一场 · 重新选择双方五人
            </button>
          )}
          <button
            className="quiet"
            onClick={() => {
              setGame(null)
              setTeams([[], []])
              setActor('')
            }}
          >
            返回选人
          </button>
        </>
      )}
    </section>
  )
}
