import { useCallback, useMemo, useState, type ComponentType } from 'react'
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
import { AppTopbar, type AppTopbarVariant } from './components/AppTopbar/AppTopbar'
import {
  UserAuthNavigationProvider,
  type UserAuthScreenLabel,
} from './contexts/UserAuthNavigationContext'
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

const USER_AUTH_TOPBAR_VARIANT: Record<UserAuthScreenLabel, AppTopbarVariant> = {
  CreateAccount: 'create',
  Login: 'login',
  ChangePassword: 'changePassword',
}

const AUTH_SCREENS: Record<UserAuthScreenLabel, ComponentType> = {
  Login: UserLoginAccount,
  CreateAccount: UserCreateAccount,
  ChangePassword: UserChangePassword,
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authScreen, setAuthScreen] = useState<UserAuthScreenLabel>('Login')
  const sidebarItems = useMemo(
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
  const [activeLabel, setActiveLabel] = useState(sidebarItems[0]?.label ?? 'Dashboard')
  const activeItem =
    sidebarItems.find((item) => item.label === activeLabel) ?? sidebarItems[0]

  const handleAuthNavigate = useCallback((label: UserAuthScreenLabel) => {
    setAuthScreen(label)
  }, [])

  const handleAuthenticated = useCallback(() => {
    setIsAuthenticated(true)
    setActiveLabel(sidebarItems[0]?.label ?? 'Dashboard')
  }, [sidebarItems])

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false)
    setAuthScreen('Login')
  }, [])

  const AuthScreen = AUTH_SCREENS[authScreen]
  const authTopbarVariant = USER_AUTH_TOPBAR_VARIANT[authScreen]

  return (
    <UserAuthNavigationProvider
      onNavigate={handleAuthNavigate}
      onAuthenticated={handleAuthenticated}
      onLogout={handleLogout}
    >
      {!isAuthenticated ? (
        <div style={styles.authLayout}>
          <AppTopbar variant={authTopbarVariant} />
          <main style={styles.authMain}>
            <div style={styles.screenTitle}>
              <AuthScreen />
            </div>
          </main>
        </div>
      ) : (
        <div style={styles.layout}>
          <AppSidebar items={sidebarItems} activeLabel={activeLabel} onSelect={setActiveLabel} />
          <div style={styles.mainColumn}>
            <main style={styles.main}>
              {activeItem ? (
                <div style={styles.screenTitle}>
                  <activeItem.Screen />
                </div>
              ) : null}
            </main>
          </div>
        </div>
      )}
    </UserAuthNavigationProvider>
  )
}

export default App

const styles = {
  authLayout: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
  },
  authMain: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: '24px 16px',
    overflowY: 'auto',
  },
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
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: '24px 16px',
    overflowY: 'auto',
  },
  screenTitle: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#111827',
    width: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    alignContent: 'center',
    flexWrap: 'wrap',
  },
} as const
