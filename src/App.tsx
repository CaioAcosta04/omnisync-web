import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  FiActivity,
  FiArchive,
  FiGlobe,
  FiLayers,
  FiList,
  FiSettings,
  FiShoppingBag,
  FiUsers,
} from 'react-icons/fi'
import { AppSidebar } from './components/AppSidebar'
import { AppTopbar, type AppTopbarVariant } from './components/AppTopbar/AppTopbar'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { MercadoLivreOAuthProvider } from './contexts/MercadoLivreOAuthContext'
import {
  AppNavigationProvider,
  type AppScreenLabel,
} from './contexts/AppNavigationContext'
import {
  UserAuthNavigationProvider,
  type UserAuthScreenLabel,
} from './contexts/UserAuthNavigationContext'
import {
  ActivityScreen,
  DashboardScreen,
  ListingsScreen,
  MarketplacesScreen,
  OrdersScreen,
  SettingsScreen,
  StockScreen,
  UsersScreen,
} from './screens'
import { UserCreateAccount } from './screens/user/userCreateAccount/UserCreateAccount'
import { UserLoginAccount } from './screens/user/userLogin/UserLoginAccount'
import { UserChangePassword } from './screens/user/userChangePassword/UserChangePassword'
import { MercadoLivreOAuthModal } from './components/MercadoLivreOAuthModal'
import { MercadoLivreDebugPanel } from './components/MercadoLivreDebugPanel'
import { parseUserRole, type UserRole } from './lib/userResource'

const ML_DEBUG_ENABLED =
  import.meta.env.DEV ||
  (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug'))

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

const ROLE_SCREEN_ACCESS: Record<UserRole, readonly AppScreenLabel[]> = {
  admin: ['Painel', 'Estoque', 'Vendas', 'Marketplaces', 'Atividade', 'Anúncios', 'Usuários', 'Configurações'],
  manager: ['Painel', 'Estoque', 'Vendas', 'Marketplaces', 'Atividade', 'Anúncios', 'Configurações'],
  editor: ['Painel', 'Estoque', 'Vendas', 'Atividade', 'Anúncios', 'Configurações'],
  viewer: ['Painel', 'Estoque', 'Vendas', 'Atividade', 'Configurações'],
}

function AppShell() {
  const mainScrollRef = useRef<HTMLElement | null>(null)
  const { user, status, skipAuth, logout: authLogout } = useAuth()
  const [authScreen, setAuthScreen] = useState<UserAuthScreenLabel>('Login')
  const userRole = parseUserRole(
    user ? { ...user.resource, role: user.role ?? user.resource.role } : null,
  )
  const sidebarItems = useMemo(
    () => [
      { label: 'Painel', icon: <FiLayers size={20} />, Screen: DashboardScreen },
      { label: 'Estoque', icon: <FiArchive size={20} />, Screen: StockScreen },
      { label: 'Vendas', icon: <FiShoppingBag size={20} />, Screen: OrdersScreen },
      { label: 'Marketplaces', icon: <FiGlobe size={20} />, Screen: MarketplacesScreen },
      { label: 'Atividade', icon: <FiActivity size={20} />, Screen: ActivityScreen },
      { label: 'Anúncios', icon: <FiList size={20} />, Screen: ListingsScreen },
      { label: 'Usuários', icon: <FiUsers size={20} />, Screen: UsersScreen },
      { label: 'Configurações', icon: <FiSettings size={20} />, Screen: SettingsScreen },
    ].filter((item) => ROLE_SCREEN_ACCESS[userRole].includes(item.label as AppScreenLabel)),
    [userRole]
  )
  const [activeLabel, setActiveLabel] = useState(sidebarItems[0]?.label ?? 'Painel')
  const visibleActiveLabel = sidebarItems.some((item) => item.label === activeLabel)
    ? activeLabel
    : sidebarItems[0]?.label ?? 'Painel'
  const activeItem =
    sidebarItems.find((item) => item.label === visibleActiveLabel) ?? sidebarItems[0]

  const handleAuthNavigate = useCallback((label: UserAuthScreenLabel) => {
    setAuthScreen(label)
  }, [])

  const handleLogout = useCallback(async () => {
    await authLogout()
    setAuthScreen('Login')
  }, [authLogout])

  const isAuthenticated = user !== null

  const AuthScreen = AUTH_SCREENS[authScreen]
  const authTopbarVariant = USER_AUTH_TOPBAR_VARIANT[authScreen]

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [visibleActiveLabel, isAuthenticated])

  if (!skipAuth && status === 'loading') {
    return (
      <div style={styles.loadingScreen}>
        <p style={styles.loadingText}>Carregando…</p>
      </div>
    )
  }

  return (
    <UserAuthNavigationProvider onNavigate={handleAuthNavigate} onLogout={handleLogout}>
      {!isAuthenticated ? (
        <div style={styles.authLayout}>
          <AppTopbar variant={authTopbarVariant} />
          <main style={styles.authMain}>
            <div style={styles.authScreenShell}>
              <AuthScreen />
            </div>
          </main>
        </div>
      ) : (
        <AppNavigationProvider onNavigate={(label: AppScreenLabel) => setActiveLabel(label)}>
          <div style={styles.layout}>
            <AppSidebar items={sidebarItems} activeLabel={activeLabel} onSelect={setActiveLabel} />
            <div style={styles.mainColumn}>
              <main ref={mainScrollRef} style={styles.main}>
                {activeItem ? (
                  <div style={styles.screenTitle}>
                    <activeItem.Screen />
                  </div>
                ) : null}
              </main>
            </div>
          </div>
        </AppNavigationProvider>
      )}
    </UserAuthNavigationProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <MercadoLivreOAuthProvider>
        <AppShell />
        <MercadoLivreOAuthModal />
        {ML_DEBUG_ENABLED && <MercadoLivreDebugPanel />}
      </MercadoLivreOAuthProvider>
    </AuthProvider>
  )
}

export default App

const styles = {
  loadingScreen: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    margin: 0,
    fontSize: '16px',
    color: '#4b5563',
  },
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    overflowY: 'auto',
  },
  layout: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
  },
  mainColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    minWidth: 0,
    backgroundColor: '#f3f4f6',
  },
  main: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '24px 16px',
    overflowY: 'auto',
  },
  screenTitle: {
    width: '100%',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    boxSizing: 'border-box',
  },
  authScreenShell: {
    width: '100%',
    minWidth: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    boxSizing: 'border-box',
  },
} as const
