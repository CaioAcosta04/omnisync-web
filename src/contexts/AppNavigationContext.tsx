import { createContext, useContext, useMemo, type ReactNode } from 'react'

export type AppScreenLabel =
  | 'Dashboard'
  | 'Stock'
  | 'Marketplaces'
  | 'Activity'
  | 'Listings'
  | 'Users'
  | 'Settings'

export type AppNav = {
  navigateTo: (label: AppScreenLabel) => void
}

const AppNavigationContext = createContext<AppNav | null>(null)

export function AppNavigationProvider({
  children,
  onNavigate,
}: {
  children: ReactNode
  onNavigate: (label: AppScreenLabel) => void
}) {
  const value = useMemo<AppNav>(
    () => ({ navigateTo: onNavigate }),
    [onNavigate],
  )
  return (
    <AppNavigationContext.Provider value={value}>
      {children}
    </AppNavigationContext.Provider>
  )
}

/** Hook de navegação entre telas do app autenticado. */
// eslint-disable-next-line react-refresh/only-export-components -- hook pareado com AppNavigationProvider
export function useAppNavigation(): AppNav {
  const ctx = useContext(AppNavigationContext)
  if (!ctx) {
    throw new Error('useAppNavigation must be used within AppNavigationProvider')
  }
  return ctx
}
