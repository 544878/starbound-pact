import { useState } from 'react'
import { EquippedSkinArt } from './SkinMedia';
import { ExpansionPortrait } from "./ExpansionPortrait";
import type { CSSProperties } from 'react'
import type { Companion } from '../domain/types'
import { characterSheet, HERO_LORE } from '../data/epic'
import { CollabCharacterArt } from './CollabCharacterArt'
import { wuwaArtIndex, fgoArtIndex } from '../data/collabArt'
import { FgoCharacterArt } from './FgoCharacterArt'
import { hasScenicArt, ScenicArt } from './ScenicArt'

export function Portrait({companion,className=''}:{companion:Companion;className?:string}){
  const [failedSource, setFailedSource] = useState('');
  const error = failedSource === characterSheet(companion.id);
  const showSheet = !companion.id.startsWith("R") && HERO_LORE[companion.id] && !error;
  return (
    <div className={`portrait ${className}`} role="img" aria-label={companion.name}>
      <EquippedSkinArt characterId={companion.id} view={4}>{hasScenicArt(companion.id) ? <ScenicArt id={companion.id} view={4} /> : fgoArtIndex(companion.id) >= 0 ? (
        <FgoCharacterArt id={companion.id} view={4} />
      ) : wuwaArtIndex(companion.id) >= 0 ? (
        <CollabCharacterArt id={companion.id} view={4} />
      ) : companion.id.startsWith("R") ? (
        <ExpansionPortrait id={companion.id} />
      ) : showSheet ? (
        <img
          className="sheet-portrait"
          src={characterSheet(companion.id)}
          alt=""
          loading="lazy"
          onError={() => setFailedSource(characterSheet(companion.id))}
        />
      ) : (
        <span
          className="portrait-fallback-badge"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: `radial-gradient(circle, ${companion.accent || "#6b7280"} 0%, #111827 85%)`,
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1.1rem",
            textShadow: "0 2px 4px rgba(0,0,0,0.8)",
            borderRadius: "inherit",
          }}
        >
          {companion.name.slice(0, 1)}
        </span>
      )}</EquippedSkinArt>
    </div>
  );
}
export function EnemyPortrait({index,className=''}:{index:number;className?:string}){
 const x=['0%','50%','100%'][index%3],y=index<3?'0%':'100%'
 return <div className={`portrait ${className}`} role="img" aria-label="敌方灵兽"><span className="portrait-image enemy-portrait-image" style={{'--portrait-position':`${x} ${y}`} as CSSProperties}/></div>
}
