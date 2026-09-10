import { FGO_ART_SOURCE, fgoArtIndex } from '../data/collabArt';

export function FgoCharacterArt({ id, view = 0 }: { id: string; view?: number }) {
  // Measured cell edges keep adjacent costumes out of each crop.
  const edges = [0, 207, 400, 600, 793, 1000];
  const index = fgoArtIndex(id);
  const x = edges[index] + 1;
  const width = edges[index + 1] - edges[index] - 2;
  const box = view === 4 ? `${x} 512 ${width} ${width}`
    : view === 3 ? `${x} 750 ${width} 248`
    : `${x} 1 ${width} 504`;
  return <svg className={`collab-character-view fgo-character-view fgo-view-${view}`} viewBox={box} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <image href={FGO_ART_SOURCE} width="1000" height="1000" preserveAspectRatio="none" />
  </svg>;
}
