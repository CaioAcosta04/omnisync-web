import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'

// NOTE: 'Permission' is not exported by './types/user' in this project. This app uses
// the permission union from the role/permissions types instead.
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
import { MercadoLivreSyncProvider } from './contexts/MercadoLivreSyncContext'
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
import { MercadoLivreSyncStatusBar } from './components/MercadoLivreSyncStatusBar'
import { ToastContainer } from './components/ToastContainer'
import type { Permission } from './types/user'

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

type NavItemConfig = {
  label: string
  icon: React.ReactNode
  Screen: ComponentType
  requiredPermission?: Permission | Permission[]
}

export function AppShell() {
  const mainScrollRef = useRef<HTMLElement | null>(null)
  const { user, status, skipAuth, hasPermission, logout: authLogout } = useAuth()
  const [authScreen, setAuthScreen] = useState<UserAuthScreenLabel>('Login')

  const allSidebarItems = useMemo<NavItemConfig[]>(
    () => [
      { label: 'Painel', icon: <FiLayers size={20} />, Screen: DashboardScreen },
      { label: 'Estoque', icon: <FiArchive size={20} />, Screen: StockScreen, requiredPermission: 'PRODUCT_READ' },
      { label: 'Vendas', icon: <FiShoppingBag size={20} />, Screen: OrdersScreen, requiredPermission: 'SALE_READ' },
      { label: 'Marketplaces', icon: <FiGlobe size={20} />, Screen: MarketplacesScreen, requiredPermission: 'INTEGRATION_MANAGE' },
      { label: 'Atividade', icon: <FiActivity size={20} />, Screen: ActivityScreen, requiredPermission: ['PRODUCT_READ', 'SALE_READ'] },
      { label: 'Anúncios', icon: <FiList size={20} />, Screen: ListingsScreen, requiredPermission: 'PRODUCT_READ' },
      { label: 'Usuários', icon: <FiUsers size={20} />, Screen: UsersScreen, requiredPermission: 'USER_MANAGE' },
      { label: 'Configurações', icon: <FiSettings size={20} />, Screen: SettingsScreen },
    ],
    []
  )

  const sidebarItems = useMemo(() => {
    return allSidebarItems.filter((item) => {
      if (!item.requiredPermission) return true
      if (Array.isArray(item.requiredPermission)) {
        return item.requiredPermission.some((p) => hasPermission(p))
      }
      return hasPermission(item.requiredPermission)
    })
  }, [allSidebarItems, hasPermission])

  const [userSelectedLabel, setUserSelectedLabel] = useState<string | null>(null)

  const activeLabel = useMemo(() => {
    if (userSelectedLabel && sidebarItems.some((item) => item.label === userSelectedLabel)) {
      return userSelectedLabel
    }
    return sidebarItems[0]?.label ?? 'Painel'
  }, [sidebarItems, userSelectedLabel])

  const setActiveLabel = useCallback(
    (label: string) => setUserSelectedLabel(label),
    []
  )

  const activeItem =
    sidebarItems.find((item) => item.label === activeLabel) ?? sidebarItems[0]

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
  }, [activeLabel, isAuthenticated])

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
              <MercadoLivreSyncStatusBar />
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
        <MercadoLivreSyncProvider>
          <AppShell />
          <MercadoLivreOAuthModal />
          {ML_DEBUG_ENABLED && <MercadoLivreDebugPanel />}
          <ToastContainer />
        </MercadoLivreSyncProvider>
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
