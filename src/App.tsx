import { useMemo, useState } from 'react'
import {
  FiLayers,
  FiArchive,
  FiGlobe,
  FiShoppingCart,
  FiHome,
  FiUsers,
  FiSettings,
} from 'react-icons/fi'
import { AppSidebar } from './components/AppSidebar'
import {
  DashboardScreen,
  MarketplacesScreen,
  OrdersScreen,
  SettingsScreen,
  StockScreen,
  StoresScreen,
  UsersScreen,
} from './screens'

function App() {
  const items = useMemo(
    () => [
      { label: 'Dashboard', icon: <FiLayers size={20} />, Screen: DashboardScreen },
      { label: 'Stock', icon: <FiArchive size={20} />, Screen: StockScreen },
      { label: 'Marketplaces', icon: <FiGlobe size={20} />, Screen: MarketplacesScreen },
      { label: 'Orders', icon: <FiShoppingCart size={20} />, Screen: OrdersScreen },
      { label: 'Stores', icon: <FiHome size={20} />, Screen: StoresScreen },
      { label: 'Users', icon: <FiUsers size={20} />, Screen: UsersScreen },
      { label: 'Settings', icon: <FiSettings size={20} />, Screen: SettingsScreen },
    ],
    []
  )
  const [activeLabel, setActiveLabel] = useState(items[0]?.label ?? '')
  const activeItem = items.find((item) => item.label === activeLabel) ?? items[0]

  return (
    <div style={styles.layout}>
      <AppSidebar
        items={items}
        activeLabel={activeLabel}
        onSelect={setActiveLabel}
      />
      <main style={styles.main}>
        {activeItem ? (
          <div style={styles.screenTitle}>
            <activeItem.Screen />
          </div>
        ) : null}
      </main>
    </div>
  )
}

export default App

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
  },
  main: {
    flex: 1,
    backgroundColor: '#ffffff',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#111827',
  },
} as const
