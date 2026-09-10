import React from 'react'
import ReactDOM from 'react-dom/client'
import { GameProvider } from './state/GameContext'
import { App } from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GameProvider><App /></GameProvider>
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
