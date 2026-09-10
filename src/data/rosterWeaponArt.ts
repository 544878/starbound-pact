// Individual, padded weapon images prevent neighboring atlas sprites from bleeding in.
const rosterWeaponIds = [
  'R4-016', 'R4-017', 'R4-018', 'R4-019', 'R4-020',
  'R4-021', 'R4-022', 'R4-025', 'R4-026', 'R4-027',
  'R4-028', 'R4-029', 'R4-030', 'R5-001', 'R5-002',
  'R5-003', 'R5-004', 'R5-005', 'R5-006', 'R5-007',
] as const;

const isolatedWeaponIds = new Set(['R4-016', 'R4-017', 'R4-018', 'R4-028', 'R4-029', 'R4-030', 'R5-001', 'R5-002', 'R5-003', 'R5-004', 'R5-005', 'R5-006', 'R5-007']);

export const ROSTER_WEAPON_ART: Record<string, string> = Object.fromEntries(
  rosterWeaponIds.map(id => [id, `/assets/weapons/${id}${isolatedWeaponIds.has(id) ? "-isolated" : ""}.png`]),
);
