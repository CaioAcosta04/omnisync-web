import { createContext, useContext, useMemo, type ReactNode } from 'react'

export type UserAuthScreenLabel = 'Login' | 'CreateAccount' | 'ChangePassword'

export type UserAuthNav = {
  goToLogin: () => void
  goToCreateAccount: () => void
  goToChangePassword: () => void
  /** Sai do app autenticado e volta para a tela de login. */
  logout: () => void | Promise<void>
}

const UserAuthNavigationContext = createContext<UserAuthNav | null>(null)

export function UserAuthNavigationProvider({
  children,
  onNavigate,
  onLogout,
}: {
  children: ReactNode
  onNavigate: (label: UserAuthScreenLabel) => void
  onLogout: () => void | Promise<void>
}) {
  const value = useMemo<UserAuthNav>(
    () => ({
      goToLogin: () => onNavigate('Login'),
      goToCreateAccount: () => onNavigate('CreateAccount'),
      goToChangePassword: () => onNavigate('ChangePassword'),
      logout: onLogout,
    }),
    [onNavigate, onLogout]
  )
  return (
    <UserAuthNavigationContext.Provider value={value}>
      {children}
    </UserAuthNavigationContext.Provider>
  )
}

/** Hook de navegação entre telas de autenticação. */
// eslint-disable-next-line react-refresh/only-export-components -- hook pareado com o provider
export function useUserAuthNavigation(): UserAuthNav {
  const ctx = useContext(UserAuthNavigationContext)
  if (!ctx) {
    throw new Error('useUserAuthNavigation must be used within UserAuthNavigationProvider')
  }
  return ctx
}
