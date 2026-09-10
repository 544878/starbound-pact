import { expansionCompanions } from '../data/expansion'
export function ExpansionPortrait({ id }: { id: string }) {
  const i = expansionCompanions.findIndex(c => c.id === id)
  const xs = [0,233,474,716,948], ys = [0,225,446,667,889,1113,1373,1659]
  const x = i % 4, y = Math.floor(i / 4)
  return <svg className="expansion-portrait" role="img" aria-label={`${expansionCompanions[i]?.name}头像特写`} viewBox={`${xs[x]+28} ${ys[y]+12} ${xs[x+1]-xs[x]-56} ${(ys[y+1]-ys[y])*0.76}`} preserveAspectRatio="xMidYMid slice"><image href="/assets/expansion-portraits.png" width="948" height="1659" preserveAspectRatio="none" /></svg>
}
