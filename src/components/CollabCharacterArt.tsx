import { WUWA_ART_SOURCE, wuwaArtIndex } from '../data/collabArt';

export function CollabCharacterArt({ id, view = 0 }: { id: string; view?: number }) {
  const column = wuwaArtIndex(id);
  // The generated sheet has a tall portrait row and a shorter chibi row.
  const x = column * 280.4;
  const box = view === 4 ? `${x + 35} 35 210 210`
    : view === 3 ? `${x + 2} 738 276.4 382`
    : `${x + 2} 0 276.4 734`;
  return <svg className="collab-character-view" viewBox={box} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <image href={WUWA_ART_SOURCE} width="1402" height="1122" />
  </svg>;
}
