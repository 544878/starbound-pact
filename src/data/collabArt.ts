// Atlas order is part of the asset contract; do not sort these IDs.
export const WUWA_ART_IDS = ['yuno', 'shorekeeper', 'phrolova', 'cantarella', 'xinyuehu'] as const;
export const COLLAB_WEAPON_IDS = [...WUWA_ART_IDS, 'saber', 'sakura', 'rin', 'archer', 'gilgamesh'] as const;
export const WUWA_ART_SOURCE = '/assets/characters/wuwa-atlas-v1.png';
export const wuwaArtIndex = (id: string) => WUWA_ART_IDS.findIndex(value => value === id);
export const FGO_ART_IDS = ['saber', 'sakura', 'rin', 'archer', 'gilgamesh'] as const;
export const FGO_ART_SOURCE = '/assets/characters/fgo-atlas-v2.png';
export const fgoArtIndex = (id: string) => FGO_ART_IDS.findIndex(value => value === id);
