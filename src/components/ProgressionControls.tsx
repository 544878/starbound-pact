import type { Companion, Weapon } from '../domain/types'
import { ascensionCost, ascensionStage, levelCap } from '../systems/progression'
import { useGame } from '../state/GameContext'
import { MaterialArt } from './MaterialArt'

export function AscensionControl({ unit, kind }: { unit: Companion | Weapon; kind: 'companion' | 'weapon' }) {
  const { state, dispatch, navigate } = useGame()
  const cost = ascensionCost(unit), count = state.materials['纯净星核'] ?? 0
  const owned = (kind === 'companion' ? state.companions : state.weapons).some(u => u.id === unit.id)
  return <div className="ascension-control"><span><MaterialArt name="纯净星核" size={30} inline /> {ascensionStage(unit)} 阶 · Lv.{unit.level} / {levelCap(unit)}</span>
    {unit.level < 90 && <button disabled={!owned || unit.level < levelCap(unit) || count < cost} onClick={() => dispatch({ type: 'ASCEND', kind, id: unit.id })}>突破 · 星核 {count}/{cost}</button>}
    {unit.level < 90 && count < cost && <button className="material-source" onClick={() => navigate('tasks')}>获取星核</button>}
  </div>
}
