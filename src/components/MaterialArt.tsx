import React, { useState } from 'react';
import { MATERIAL_ART_ATLAS, MATERIAL_ART_CELLS, materialArtPosition } from '../data/materialArt';

export const DEDICATED_MATERIAL_NAMES = [
  '造化之水',
  '造化青莲',
  '风灵花蜜',
  '曜金碎屑',
  '潮汐结晶',
  '森语种子',
  '影蚀粉尘',
  '赤焰芯核',
  '纯净星核',
  '折光棱晶',
  '战术经验书',
] as const;

export type DedicatedMaterialName = (typeof DEDICATED_MATERIAL_NAMES)[number];

export interface MaterialArtProps {
  name: string;
  rarity?: '4星' | '5星' | string;
  fallbackIcon?: string;
  className?: string;
  inline?: boolean;
  size?: number;
}

export function MaterialArt({
  name,
  rarity,
  fallbackIcon,
  className = '',
  inline = false,
  size,
}: MaterialArtProps) {
  const [failedSource, setFailedSource] = useState('');
  const [atlasFailed, setAtlasFailed] = useState(false);
  const hasError = failedSource === name;
  const isDedicated = (DEDICATED_MATERIAL_NAMES as readonly string[]).includes(name);
  const cell = MATERIAL_ART_CELLS[name];
  if (cell !== undefined && !atlasFailed) {
    return <span role="img" aria-label={name} className={`material-render ${inline ? 'material-render-inline' : 'material-render-full'} ${className}`} style={{
      backgroundImage: `url('${MATERIAL_ART_ATLAS}')`, backgroundSize: '400% 400%', backgroundPosition: materialArtPosition(cell),
      ...(size ? { width: size, height: size } : {}),
    }}><img src={MATERIAL_ART_ATLAS} alt="" hidden onError={() => setAtlasFailed(true)} /></span>;
  }

  if (!isDedicated || hasError) {
    if (inline) {
      return (
        <i className={`material-inline-icon ${className}`} aria-label={name}>
          {fallbackIcon ?? '◈'}
        </i>
      );
    }
    return (
      <div className={`item-art fallback-material-art ${className}`} role="img" aria-label={name}>
        {fallbackIcon ?? '◈'}
      </div>
    );
  }

  const imageSrc = `/assets/materials/${encodeURIComponent(name)}.png`;

  if (inline) {
    return (
      <img
        src={imageSrc}
        alt={name}
        className={`material-inline-art ${className}`}
        style={size ? { width: size, height: size } : undefined}
        onError={() => setFailedSource(name)}
      />
    );
  }

  return (
    <div
      className={`item-art material-art rarity-${rarity ?? '4星'} ${className}`}
      role="img"
      aria-label={name}
      style={{
        backgroundImage: `url('${imageSrc}')`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        ...(size ? { width: size, height: size } : {}),
      }}
    >
      <img
        src={imageSrc}
        alt=""
        style={{ display: 'none' }}
        onError={() => setFailedSource(name)}
      />
    </div>
  );
}
