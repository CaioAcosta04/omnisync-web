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
      <div style={styles.sidebarShell}>
        <AppSidebar
          items={items}
          activeLabel={activeLabel}
          onSelect={setActiveLabel}
        />
      </div>
      <main style={styles.main}>
        {activeItem ? <activeItem.Screen /> : null}
      </main>
    </div>
  )
}

export default App

const styles = {
  layout: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
  },
  /** Mantém a coluna da sidebar no viewport; o scroll fica só no `main`. */
  sidebarShell: {
    flexShrink: 0,
    height: '100%',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    backgroundColor: '#f9fafb',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    overflow: 'auto',
  },
} as const
