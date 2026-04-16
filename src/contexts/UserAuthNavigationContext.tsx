import { createContext, useContext, useMemo, type ReactNode } from 'react'

export type UserAuthScreenLabel = 'Login' | 'CreateAccount' | 'ChangePassword'

export type UserAuthNav = {
  goToLogin: () => void
  goToCreateAccount: () => void
  goToChangePassword: () => void
  /** Chamar após login ou cadastro bem-sucedido para entrar no app principal. */
  completeAuthentication: () => void
  /** Sai do app autenticado e volta para a tela de login. */
  logout: () => void
}

const UserAuthNavigationContext = createContext<UserAuthNav | null>(null)

export function UserAuthNavigationProvider({
  children,
  onNavigate,
  onAuthenticated,
  onLogout,
}: {
  children: ReactNode
  onNavigate: (label: UserAuthScreenLabel) => void
  onAuthenticated: () => void
  onLogout: () => void
}) {
  const value = useMemo<UserAuthNav>(
    () => ({
      goToLogin: () => onNavigate('Login'),
      goToCreateAccount: () => onNavigate('CreateAccount'),
      goToChangePassword: () => onNavigate('ChangePassword'),
      completeAuthentication: onAuthenticated,
      logout: onLogout,
    }),
    [onNavigate, onAuthenticated, onLogout]
  )
  return (
    <UserAuthNavigationContext.Provider value={value}>
      {children}
    </UserAuthNavigationContext.Provider>
  )
}

export function useUserAuthNavigation(): UserAuthNav {
  const ctx = useContext(UserAuthNavigationContext)
  if (!ctx) {
    throw new Error('useUserAuthNavigation must be used within UserAuthNavigationProvider')
  }
  return ctx
}
