import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch } from '../lib/apiFetch'
import type { UserMe } from '../types/auth'

const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === 'true'

const DEV_USER: UserMe = {
  id: 0,
  systemClientId: 0,
  name: 'Modo desenvolvimento',
  email: 'dev@local.test',
  resource: {},
  active: true,
  createdAt: '',
}

type AuthStatus = 'loading' | 'ready'

type AuthContextValue = {
  user: UserMe | null
  status: AuthStatus
  /** Ativo quando VITE_SKIP_AUTH=true — não chama /me e usa usuário placeholder até logout. */
  skipAuth: boolean
  /** Lê sessão atual via cookie (GET /api/users/me). Retorna se há usuário autenticado. */
  refreshSession: () => Promise<boolean>
  /** Encerra sessão no servidor e limpa o usuário local. */
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(() => (SKIP_AUTH ? DEV_USER : null))
  const [status, setStatus] = useState<AuthStatus>(() => (SKIP_AUTH ? 'ready' : 'loading'))

  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (SKIP_AUTH) {
      setUser(DEV_USER)
      return true
    }
    try {
      const res = await apiFetch('/api/users/me')
      if (res.ok) {
        const data = (await res.json()) as UserMe
        setUser(data)
        return true
      }
      setUser(null)
      return false
    } catch {
      setUser(null)
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    if (!SKIP_AUTH) {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' })
      } catch {
        /* rede / servidor indisponível — ainda assim limpamos o estado local */
      }
    }
    setUser(null)
  }, [])

  useEffect(() => {
    if (SKIP_AUTH) {
      return
    }
    let cancelled = false
    ;(async () => {
      await refreshSession()
      if (!cancelled) {
        setStatus('ready')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      skipAuth: SKIP_AUTH,
      refreshSession,
      logout,
    }),
    [user, status, refreshSession, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Hook de sessão (cookies httpOnly + /me). */
// eslint-disable-next-line react-refresh/only-export-components -- hook pareado com AuthProvider
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
