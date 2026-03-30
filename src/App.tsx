import { useMemo, useState } from 'react'
import {
  FiLayers,
  FiArchive,
  FiGlobe,
  FiShoppingCart,
  FiHome,
  FiUsers,
  FiSettings,
  FiLogIn,
} from 'react-icons/fi'
import { AppSidebar } from './components/AppSidebar'
import { AppTopbar, type AppTopbarVariant } from './components/AppTopbar/AppTopbar'
import { UserAuthNavigationProvider } from './contexts/UserAuthNavigationContext'
import {
  DashboardScreen,
  MarketplacesScreen,
  OrdersScreen,
  SettingsScreen,
  StockScreen,
  StoresScreen,
  UsersScreen,
} from './screens'
import { UserCreateAccount } from './screens/user/userCreateAccount/UserCreateAccount'
import { UserLoginAccount } from './screens/user/userLogin/UserLoginAccount'
import { UserChangePassword } from './screens/user/userChangePassword/UserChangePassword'

const USER_AUTH_TOPBAR_VARIANT: Partial<Record<string, AppTopbarVariant>> = {
  CreateAccount: 'create',
  Login: 'login',
  ChangePassword: 'changePassword',
}

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
      { label: 'CreateAccount', icon: <FiLogIn size={20} />, Screen: UserCreateAccount },
      { label: 'Login', icon: <FiLogIn size={20} />, Screen: UserLoginAccount },
      { label: 'ChangePassword', icon: <FiLogIn size={20} />, Screen: UserChangePassword },
    ],
    []
  )
  const [activeLabel, setActiveLabel] = useState(items[0]?.label ?? '')
  const activeItem = items.find((item) => item.label === activeLabel) ?? items[0]
  const authTopbarVariant = USER_AUTH_TOPBAR_VARIANT[activeLabel]

  return (
    <UserAuthNavigationProvider onNavigate={setActiveLabel}>
      <div style={styles.layout}>
        <AppSidebar
          items={items}
          activeLabel={activeLabel}
          onSelect={setActiveLabel}
        />
        <div style={styles.mainColumn}>
          {authTopbarVariant ? <AppTopbar variant={authTopbarVariant} /> : null}
          <main style={styles.main}>
            {activeItem ? (
              <div style={styles.screenTitle}>
                <activeItem.Screen />
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </UserAuthNavigationProvider>
  )
}

export default App

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
  },
  mainColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    minWidth: 0,
    backgroundColor: '#f3f4f6',
  },
  main: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  screenTitle: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#111827',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
} as const
