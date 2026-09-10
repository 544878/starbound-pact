import type { CSSProperties } from 'react'
import type { PathId } from '../domain/combat'
import { COMBAT_PATHS } from '../data/combat'
import { COLLAB_WEAPON_IDS } from '../data/collabArt'
import { ROSTER_WEAPON_ART } from '../data/rosterWeaponArt'
import { signatureArt } from '../data/signatureArt'

export const CORE_DEDICATED_WEAPON_IDS = [
  'lumi',
  'alden',
  'selene',
  'mira',
  'noctis',
  'kael',
  'astra',
  'xuanzhao',
  'canglan',
  'yanhuang',
  'jingxuan',
  'siming',
  'yueheng',
] as const;

export const COLLAB_DEDICATED_WEAPON_IDS = [
  'yuno',
  'shorekeeper',
  'phrolova',
  'cantarella',
  'xinyuehu',
  'saber',
  'sakura',
  'rin',
  'archer',
  'gilgamesh',
] as const;

export const EXPANSION_DEDICATED_WEAPON_IDS = [
  'R5-001',
  'R5-002',
  'R5-003',
  'R5-004',
  'R5-005',
  'R5-006',
  'R5-007',
  'R5-008',
] as const;

export const DEDICATED_WEAPON_IDS = [
  ...CORE_DEDICATED_WEAPON_IDS,
  ...COLLAB_DEDICATED_WEAPON_IDS,
  ...EXPANSION_DEDICATED_WEAPON_IDS,
] as const;


export function EquipmentArt({
  kind,
  path = 'mortal',
  name,
  signatureFor,
  className = '',
}: {
  kind: 'ring' | 'weapon';
  path?: PathId;
  name: string;
  signatureFor?: string;
  className?: string;
}) {
  const individual = kind === 'weapon' && signatureFor ? signatureArt(signatureFor, 'weapon') : undefined;
  if (individual) {
    return <div className={`equipment-art dedicated-weapon-art signature-art-v2 ${className}`} role="img" aria-label={name}>
      <img src={individual} alt="" aria-hidden="true" decoding="async" />
    </div>;
  }
  const rosterArt = kind === 'weapon' && signatureFor ? ROSTER_WEAPON_ART[signatureFor] : undefined;
  if (rosterArt) {
    return (
      <div className={`equipment-art dedicated-weapon-art roster-weapon-art ${className}`} role="img" aria-label={name}>
        <img src={rosterArt} alt="" aria-hidden="true" />
      </div>
    );
  }
  if (kind === 'weapon' && signatureFor && (DEDICATED_WEAPON_IDS as readonly string[]).includes(signatureFor)) {
    return (
      <div
        className={`equipment-art dedicated-weapon-art ${className}`}
        role="img"
        aria-label={name}
        style={{
          backgroundImage: `url('/assets/weapons/${signatureFor}.png')`,
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
    );
  }

  const collabIndex = kind === 'weapon' ? COLLAB_WEAPON_IDS.findIndex((id) => id === signatureFor) : -1;
  if (collabIndex >= 0) {
    return (
      <div
        className={`equipment-art collab-weapon-art ${className}`}
        role="img"
        aria-label={name}
        style={{
          backgroundImage: "url('/assets/collab-weapons-v1.png')",
          backgroundSize: '500% 200%',
          backgroundPosition: `${(collabIndex % 5) / 4 * 100}% ${collabIndex < 5 ? 0 : 100}%`,
        }}
      />
    );
  }

  const index = Math.max(0, COMBAT_PATHS.findIndex((p) => p.id === path)) + (kind === 'weapon' ? 8 : 0);
  return (
    <div
      className={`equipment-art ${className}`}
      role="img"
      aria-label={name}
      style={
        {
          backgroundPosition: `${(index % 4) / 3 * 100}% ${Math.floor(index / 4) / 3 * 100}%`,
        } as CSSProperties
      }
    />
  );
}
