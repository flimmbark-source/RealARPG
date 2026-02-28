import { Navigate, NavLink, Route, Routes } from 'react-router-dom'

import { GameStateProvider } from './ui/GameStateContext'
import { BattleScreen } from './ui/screens/BattleScreen'
import { CombatTestScreen } from './ui/screens/CombatTestScreen'
import { EncounterScreen } from './ui/screens/EncounterScreen'
import { FeedScreen } from './ui/screens/FeedScreen'
import { HomeScreen } from './ui/screens/HomeScreen'
import { InventoryScreen } from './ui/screens/InventoryScreen'
import { MapScreen } from './ui/screens/MapScreen'
import { ProgressionScreen } from './ui/screens/ProgressionScreen'

const navItems = [
  { to: '/home', label: 'Home', icon: '🏠' },
  { to: '/map', label: 'Map', icon: '🗺️' },
  { to: '/encounter', label: 'Encounter', icon: '⚔️' },
  { to: '/inventory', label: 'Inventory', icon: '🎒' },
  { to: '/feed', label: 'Feed', icon: '📰' },
  { to: '/combat-test', label: 'Combat Test', icon: '🧪' },
  { to: '/progression', label: 'Progression', icon: '📈' },
]

function App() {
  return (
    <GameStateProvider>
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white text-slate-900">
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomeScreen />} />
            <Route path="/map" element={<MapScreen />} />
            <Route path="/encounter" element={<EncounterScreen />} />
            <Route path="/battle" element={<BattleScreen />} />
            <Route path="/inventory" element={<InventoryScreen />} />
            <Route path="/feed" element={<FeedScreen />} />
            <Route path="/combat-test" element={<CombatTestScreen />} />
            <Route path="/progression" element={<ProgressionScreen />} />
          </Routes>
        </div>

        <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white">
          <ul className="mx-auto grid max-w-md grid-cols-7">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex flex-col items-center py-2 text-xs ${isActive ? 'text-sky-700' : 'text-slate-500'}`
                  }
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </GameStateProvider>
  )
}

export default App
