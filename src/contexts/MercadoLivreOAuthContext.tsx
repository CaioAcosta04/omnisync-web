import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { exchangeMercadoLivreCode } from '../services/mercadoLivreApi'
import { writeMercadoLivreIntegration } from '../lib/mercadoLivreStorage'
import { logMlEvent } from '../lib/mlOAuthDebug'
import type { MercadoLivreIntegrationResponse } from '../types/mercadolivre'

export type MlOAuthStatus =
  | 'idle'
  | 'requires_login'
  | 'processing'
  | 'success'
  | 'error'

type MlOAuthState = {
  status: MlOAuthStatus
  message?: string
  integration?: MercadoLivreIntegrationResponse
}

type MlOAuthContextValue = MlOAuthState & {
  /** Refaz o POST /exchange com o mesmo code/state ainda na sessão. */
  retry: () => void
  /** Fecha o modal e volta para idle (não remove code/state da URL se ainda não concluiu). */
  dismiss: () => void
}

const MercadoLivreOAuthContext = createContext<MlOAuthContextValue | null>(null)

function readOAuthParams(): { code: string; state: string } | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')
  if (code && state) return { code, state }
  return null
}

function clearOAuthParamsFromUrl(): void {
  const path = window.location.pathname + window.location.hash
  window.history.replaceState({}, '', path)
}

export function MercadoLivreOAuthProvider({ children }: { children: ReactNode }) {
  const { user, status: authStatus, skipAuth } = useAuth()
  const authReady = skipAuth || authStatus === 'ready'

  /** Params capturados no mount — imutáveis durante o ciclo de vida desta montagem. */
  const oauthParamsRef = useRef<{ code: string; state: string } | null>(readOAuthParams())
  /** Evita duplo disparo no React StrictMode. */
  const runningRef = useRef(false)

  const [state, setState] = useState<MlOAuthState>(() => {
    const hasParams = oauthParamsRef.current !== null
    return { status: hasParams ? 'idle' : 'idle' }
  })

  const doExchange = useCallback(async () => {
    const params = oauthParamsRef.current
    if (!params) return
    if (runningRef.current) {
      logMlEvent({
        category: 'oauth',
        level: 'warn',
        message: 'doExchange skipped — already running',
      })
      return
    }
    runningRef.current = true

    logMlEvent({
      category: 'api',
      level: 'info',
      message: 'POST /exchange iniciado',
      data: { code: params.code.slice(0, 12) + '…' },
    })
    setState({ status: 'processing' })

    try {
      const result = await exchangeMercadoLivreCode(params)
      logMlEvent({
        category: 'api',
        level: 'success',
        message: 'POST /exchange OK',
        data: { systemClientId: result.systemClientId, active: result.active },
      })
      writeMercadoLivreIntegration(result)
      logMlEvent({
        category: 'storage',
        level: 'success',
        message: 'writeMercadoLivreIntegration gravado',
      })
      clearOAuthParamsFromUrl()
      oauthParamsRef.current = null
      setState({ status: 'success', message: result.message, integration: result })
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Falha ao conectar a conta do Mercado Livre.'
      logMlEvent({
        category: 'api',
        level: 'error',
        message: 'POST /exchange FAIL',
        data: { error: msg },
      })
      // Mantém oauthParamsRef.current para permitir retry; limpa só a URL
      clearOAuthParamsFromUrl()
      setState({ status: 'error', message: msg })
    } finally {
      runningRef.current = false
    }
  }, [])

  useEffect(() => {
    const params = oauthParamsRef.current
    if (!params) {
      logMlEvent({
        category: 'mount',
        level: 'info',
        message: 'Provider mount: sem code/state na URL',
      })
      return
    }
    logMlEvent({
      category: 'mount',
      level: 'info',
      message: 'Provider mount: code/state detectados',
      data: { authReady, hasUser: !!user, userSystemClientId: user?.systemClientId },
    })
    if (!authReady) return

    if (!user) {
      logMlEvent({
        category: 'auth',
        level: 'warn',
        message: 'authReady mas sem user → requires_login',
      })
      setState({ status: 'requires_login' })
      return
    }

    logMlEvent({
      category: 'auth',
      level: 'info',
      message: 'user pronto → disparando exchange',
    })
    void doExchange()
  }, [authReady, user, doExchange])

  const retry = useCallback(() => {
    if (runningRef.current) return
    const params = oauthParamsRef.current
    if (!params) return
    void doExchange()
  }, [doExchange])

  const dismiss = useCallback(() => {
    setState({ status: 'idle' })
  }, [])

  const value = useMemo<MlOAuthContextValue>(
    () => ({ ...state, retry, dismiss }),
    [state, retry, dismiss]
  )

  return (
    <MercadoLivreOAuthContext.Provider value={value}>
      {children}
    </MercadoLivreOAuthContext.Provider>
  )
}

/** Hook para consumir o estado do fluxo OAuth do Mercado Livre. */
// eslint-disable-next-line react-refresh/only-export-components -- hook pareado com MercadoLivreOAuthProvider
export function useMercadoLivreOAuth(): MlOAuthContextValue {
  const ctx = useContext(MercadoLivreOAuthContext)
  if (!ctx) {
    throw new Error('useMercadoLivreOAuth must be used within MercadoLivreOAuthProvider')
  }
  return ctx
}
