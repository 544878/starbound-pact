import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  CORE_DEDICATED_WEAPON_IDS,
  COLLAB_DEDICATED_WEAPON_IDS,
  EXPANSION_DEDICATED_WEAPON_IDS,
  DEDICATED_WEAPON_IDS,
} from '../components/EquipmentArt';
import { COLLAB_WEAPON_IDS } from '../data/collabArt';
import { weaponCatalog, materialCatalog } from '../data/catalog';
import { DEDICATED_MATERIAL_NAMES } from '../components/MaterialArt';
import { ROSTER_WEAPON_ART } from '../data/rosterWeaponArt';
import { companionCatalog } from '../data/catalog';

describe('EquipmentArt and MaterialArt Assets Integration', () => {
  it('uses a separate weapon image for each of the 20 requested heroes', () => {
    const names = ['晷宁', '砺川', '灯禾', '绛音', '焰笙', '镜弦', '忆澜', '磐舟', '赤垒', '梦珀',
      '春蘅', '雨织', '岁安', '朔衡', '尘歌', '绯月', '曜烬', '梦璃', '溯白', '终祈'];
    const sources = names.map(name => {
      const hero = companionCatalog.find(c => c.name === name);
      expect(hero, name).toBeDefined();
      const source = ROSTER_WEAPON_ART[hero!.id];
      expect(source, name).toBeTruthy();
      const bytes = fs.readFileSync(path.resolve(__dirname, '../../public', source.slice(1)));
      expect(bytes.length).toBeGreaterThan(1000);
      // Square standalone canvases share the existing contain-fit display geometry.
      expect(bytes.readUInt32BE(16)).toBe(bytes.readUInt32BE(20));
      return source;
    });
    expect(new Set(sources).size).toBe(20);
  });
  it('registers all 13 core non-collab weapon IDs in CORE_DEDICATED_WEAPON_IDS', () => {
    expect(CORE_DEDICATED_WEAPON_IDS).toHaveLength(13);
    for (const id of CORE_DEDICATED_WEAPON_IDS) {
      const weapon = weaponCatalog.find((w) => w.signatureFor === id);
      expect(weapon).toBeDefined();
      expect(weapon?.name).toBeTruthy();
    }
  });

  it('registers all 10 collab weapons in COLLAB_DEDICATED_WEAPON_IDS and COLLAB_WEAPON_IDS', () => {
    expect(COLLAB_DEDICATED_WEAPON_IDS).toHaveLength(10);
    expect(COLLAB_WEAPON_IDS).toHaveLength(10);
  });

  it('registers all 8 expansion weapon IDs in EXPANSION_DEDICATED_WEAPON_IDS', () => {
    expect(EXPANSION_DEDICATED_WEAPON_IDS).toHaveLength(8);
  });

  it('has all 31 weapons registered in DEDICATED_WEAPON_IDS with physical assets on disk', () => {
    expect(DEDICATED_WEAPON_IDS).toHaveLength(31);
    const weaponsDir = path.resolve(__dirname, '../../public/assets/weapons');
    for (const id of DEDICATED_WEAPON_IDS) {
      const assetPath = path.join(weaponsDir, `${id}.png`);
      expect(fs.existsSync(assetPath)).toBe(true);
      const stat = fs.statSync(assetPath);
      expect(stat.size).toBeGreaterThan(1000);
    }
  });

  it('registers all 11 game materials in DEDICATED_MATERIAL_NAMES with physical assets on disk', () => {
    expect(DEDICATED_MATERIAL_NAMES).toHaveLength(11);
    const materialsDir = path.resolve(__dirname, '../../public/assets/materials');
    for (const name of DEDICATED_MATERIAL_NAMES) {
      expect(materialCatalog[name]).toBeDefined();
      const assetPath = path.join(materialsDir, `${name}.png`);
      expect(fs.existsSync(assetPath)).toBe(true);
      const stat = fs.statSync(assetPath);
      expect(stat.size).toBeGreaterThan(1000);
    }
  });
});

