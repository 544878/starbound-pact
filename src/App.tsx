import { useEffect } from 'react'
import { useGame } from './state/GameContext'
import { AppShell } from './components/AppShell'
import { audioEngine } from './audio/audioEngine'
import { HomeScreen } from './screens/HomeScreen'
import { FormationScreen } from './screens/FormationScreen'
import { BattleScreen } from './screens/BattleV2Screen'
import { CompanionsScreen } from './screens/CompanionsScreen'
import { SummonScreen } from './screens/SummonScreen'
import { InventoryScreen } from './screens/InventoryScreen'
import { ShopScreen } from './screens/ShopScreen'
import { StoryScreen } from './screens/StoryScreen'
import { TowerScreen } from './screens/TowerScreen'
import { TasksScreen } from './screens/TasksScreen'
import { ActivitiesScreen } from './screens/ActivitiesScreen'

export function App() {
  const { state } = useGame()

  useEffect(() => {
    if (state.screen === 'battle') {
      audioEngine.playTrack('battle');
    } else {
      audioEngine.playTrack('home');
    }
  }, [state.screen]);
  const screen = {
    home: <HomeScreen />,
    formation: <FormationScreen />,
    battle: <BattleScreen />,
    companions: <CompanionsScreen />,
    summon: <SummonScreen />,
    inventory: <InventoryScreen />,
    shop: <ShopScreen />,
    story: <StoryScreen />,
    tower: <TowerScreen />,
    tasks: <TasksScreen />,
    activities: <ActivitiesScreen />,
  }[state.screen]
  return <AppShell hideNav={state.screen === 'battle' || state.screen === 'home' || state.screen === 'tower'}>{screen}</AppShell>
}

