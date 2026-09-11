import React from 'react'
import ReactDOM from 'react-dom/client'
import { GameProvider } from './state/GameContext'
import { App } from './App'
import './styles.css'
import { createInitialState } from './state/gameState'
import { companionCatalog } from './data/catalog'

// Development-only visual sandbox: never reads or writes the player's save.
let previewState = import.meta.env.DEV && new URLSearchParams(location.search).has('battle-preview') ? createInitialState() : undefined;
if (previewState) {
  previewState.screen = 'battle';
  const targetFormation = previewState.formation;
  previewState.companions = companionCatalog.filter(c => targetFormation.includes(c.id)).map(c => ({ ...c, level: 60, constellation: 0 }));
  previewState.encounter = { kind: 'tower', id: '5' };
} else if (import.meta.env.DEV && new URLSearchParams(location.search).has('screen')) {
  const p = new URLSearchParams(location.search);
  const target = p.get('screen') as any;
  previewState = createInitialState();
  previewState.screen = target;
  const heroId = p.get('id') || 'lumi';
  previewState.selectedCompanionId = heroId;
  previewState.companions = companionCatalog.map(c => ({
    ...c,
    level: 85,
    rings: ['exclusive-7', 'exclusive-8', 'exclusive-9'],
    v2FunctionalSouls: { 6: 'resist', 7: 'point', 8: 'break' }
  }));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GameProvider previewState={previewState}><App /></GameProvider>
  </React.StrictMode>,
)

import './advanced.css'
import './defense-garden.css'

import './epic.css'

import "./roster-expansion.css"
import './growth.css'

import './character-gallery.css'
import './formation.css'
import './home-remaster.css'

import './abyss.css'
import './shop-remaster.css'
import './inventory-remaster.css'

import './missions-remaster.css'
