import { it, expect } from 'vitest'
import { companions } from '../data/catalog'
import {
  createDefense,
  deploy,
  startWave,
  tickDefense,
  activateSkill,
} from './defense'
it('can complete five waves with a supported defense formation', () => {
  let s = { ...createDefense(), dp: 99 }
  s = deploy(s, companions[1], 2, 2, 2)
  s = deploy(s, companions[2], 1, 1, 1)
  s = deploy(s, companions[3], 3, 2, 2)
  s = deploy(s, companions[4], 5, 2, 3)
  for (let i = 0; i < 20000 && s.phase !== 'lost' && s.phase !== 'won'; i++) {
    if (s.phase === 'prepare' || s.phase === 'between') s = startWave(s)
    for (const o of s.operators) if (o.cooldown <= 0) s = activateSkill(s, o.id)
    s = tickDefense(s, 0.1)
  }
  expect(s.phase).toBe('won')
  expect(s.kills).toBeGreaterThan(0)
})
