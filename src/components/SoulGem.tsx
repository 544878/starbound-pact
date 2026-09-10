import { RING_NAMES } from "../systems/ringAffixes";
import { signatureArt, SOUL_ART_KINDS } from '../data/signatureArt';

export function SoulGem({ slot, companionId }: { slot: number; companionId?: string }) {
  const kind = SOUL_ART_KINDS[slot - 6];
  const individual = companionId && kind ? signatureArt(companionId, kind) : undefined;
  if (individual) {
    return <div className="equipment-art soul-gem signature-art-v2" role="img" aria-label={RING_NAMES[slot]}>
      <img src={individual} alt="" aria-hidden="true" decoding="async" />
    </div>;
  }
  // Normalized row crops exclude the atlas's extra bottom margin.
  return (
    <div
      className="equipment-art soul-gem"
      role="img"
      aria-label={RING_NAMES[slot]}
    >
      <svg
        viewBox={`${(slot % 3) * 100} ${Math.floor(slot / 3) * 93.75} 100 93.75`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <image
          href="/assets/characters/scenic/soul-gems.png"
          width="300"
          height="300"
        />
      </svg>
    </div>
  );
}
