import descriptions from './signatureArtDescriptions.json';

export type SignatureArtKind = 'weapon' | 'true-form' | 'vessel' | 'origin';
// Use the existing transparent originals. Opaque review variants must never
// replace equipment sprites on the dark soul-constellation screen.
const images = import.meta.glob('/public/assets/signature-v2/*/*.png', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;

export function signatureArt(id: string, kind: SignatureArtKind) {
  return images[`/public/assets/signature-v2/${id}/${kind}.png`];
}

export function signatureDescription(id: string) {
  return descriptions.find(hero => hero.id === id)?.artDescription;
}

export const SOUL_ART_KINDS = ['true-form', 'vessel', 'origin'] as const;
