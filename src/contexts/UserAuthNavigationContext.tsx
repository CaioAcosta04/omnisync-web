import { createContext, useContext, useMemo, type ReactNode } from 'react'

export type UserAuthNav = {
  goToLogin: () => void
  goToCreateAccount: () => void
  goToChangePassword: () => void
}

const UserAuthNavigationContext = createContext<UserAuthNav | null>(null)

export function UserAuthNavigationProvider({
  children,
  onNavigate,
}: {
  children: ReactNode
  onNavigate: (label: string) => void
}) {
  const value = useMemo<UserAuthNav>(
    () => ({
      goToLogin: () => onNavigate('Login'),
      goToCreateAccount: () => onNavigate('CreateAccount'),
      goToChangePassword: () => onNavigate('ChangePassword'),
    }),
    [onNavigate]
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
