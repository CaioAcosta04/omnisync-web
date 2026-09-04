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
import { MERCADO_LIVRE_SYNC_COOLDOWN_MS } from '../config/mercadoLivreSync'
import { runMercadoLivreSync, type MercadoLivreSyncMode } from '../lib/mercadoLivreSyncCoordinator'
import {
  buildMercadoLivreSyncStorageKey,
  parseMercadoLivreSyncReference,
  readMercadoLivreSyncReference,
} from '../lib/mercadoLivreSyncStorage'
import { logMlSyncEvent } from '../lib/mlSyncDebug'
import { getMercadoLivreStatus } from '../services/mercadoLivreApi'
import { syncMercadoLivreProducts } from '../services/productsApi'
import type { MercadoLivreSyncResponse } from '../types/product'
import { useAuth } from './AuthContext'
import { useMercadoLivreOAuth } from './MercadoLivreOAuthContext'

export type MercadoLivreSyncPhase = 'idle' | 'checking' | 'syncing' | 'success' | 'error'

type MercadoLivreSyncContextValue = {
  phase: MercadoLivreSyncPhase
  isSyncing: boolean
  lastResult: MercadoLivreSyncResponse | null
  warning: string | null
  catalogRevision: number
  syncNow: (mode?: MercadoLivreSyncMode) => Promise<MercadoLivreSyncResponse | null>
  dismissNotice: () => void
}

type TenantSyncState = {
  tenantId: number | null
  phase: MercadoLivreSyncPhase
  lastResult: MercadoLivreSyncResponse | null
  warning: string | null
  catalogRevision: number
}

const GENERIC_SYNC_WARNING =
  'Não foi possível sincronizar agora. Os dados podem estar desatualizados.'
const GENERIC_STATUS_WARNING =
  'Não foi possível verificar a integração do Mercado Livre.'

const MercadoLivreSyncContext = createContext<MercadoLivreSyncContextValue | null>(null)

const emptyStateFor = (tenantId: number | null): TenantSyncState => ({
  tenantId,
  phase: 'idle',
  lastResult: null,
  warning: null,
  catalogRevision: 0,
})

type MercadoLivreSyncProviderProps = {
  children: ReactNode
}

export function MercadoLivreSyncProvider({ children }: MercadoLivreSyncProviderProps) {
  const { status: authStatus, user, skipAuth } = useAuth()
  const { status: oauthStatus } = useMercadoLivreOAuth()
  const tenantId = user?.systemClientId ?? null
  const activeTenantRef = useRef<number | null>(tenantId)
  const appliedAttemptIdsRef = useRef(new Set<string>())
  const [state, setState] = useState<TenantSyncState>(() => emptyStateFor(tenantId))

  useEffect(() => {
    activeTenantRef.current = tenantId
  }, [tenantId])

  const syncNow = useCallback(
    async (mode: MercadoLivreSyncMode = 'manual') => {
      if (!tenantId || authStatus !== 'ready' || !user || skipAuth) return null

      const startedAt = Date.now()
      setState((current) => ({
        ...(current.tenantId === tenantId ? current : emptyStateFor(tenantId)),
        phase: 'syncing',
        warning: null,
      }))
      logMlSyncEvent('ml_sync_started', { systemClientId: tenantId, mode })

      const outcome = await runMercadoLivreSync({
        systemClientId: tenantId,
        mode,
        cooldownMs: MERCADO_LIVRE_SYNC_COOLDOWN_MS,
        sync: () => syncMercadoLivreProducts(tenantId),
      })

      if (activeTenantRef.current !== tenantId) return null

      if (outcome.status === 'success') {
        if (appliedAttemptIdsRef.current.has(outcome.attemptId)) return outcome.result
        appliedAttemptIdsRef.current.add(outcome.attemptId)
        setState((current) => ({
          ...(current.tenantId === tenantId ? current : emptyStateFor(tenantId)),
          phase: 'success',
          lastResult: outcome.result,
          warning: null,
          catalogRevision:
            (current.tenantId === tenantId ? current.catalogRevision : 0) + 1,
        }))
        logMlSyncEvent('ml_sync_succeeded', {
          systemClientId: tenantId,
          mode,
          syncedProducts: outcome.result.syncedProducts,
          durationMs: Date.now() - startedAt,
        })
        return outcome.result
      }

      if (outcome.status === 'error') {
        setState((current) => ({
          ...(current.tenantId === tenantId ? current : emptyStateFor(tenantId)),
          phase: 'error',
          warning: GENERIC_SYNC_WARNING,
        }))
        logMlSyncEvent('ml_sync_failed', {
          systemClientId: tenantId,
          mode,
          reason: outcome.error instanceof Error ? outcome.error.name : 'unknown',
          durationMs: Date.now() - startedAt,
        })
        return null
      }

      if (outcome.reason === 'locked') {
        const reference = readMercadoLivreSyncReference(tenantId)
        setState((current) => ({
          ...(current.tenantId === tenantId ? current : emptyStateFor(tenantId)),
          phase: reference?.outcome === 'running' ? 'syncing' : 'idle',
        }))
        logMlSyncEvent('ml_sync_skipped', {
          systemClientId: tenantId,
          mode,
          reason: 'locked',
        })
        return null
      }

      const failedBackoff = outcome.reference?.outcome === 'error'
      setState((current) => ({
        ...(current.tenantId === tenantId ? current : emptyStateFor(tenantId)),
        phase: failedBackoff ? 'error' : 'idle',
        warning: failedBackoff ? GENERIC_SYNC_WARNING : null,
      }))
      logMlSyncEvent('ml_sync_skipped', {
        systemClientId: tenantId,
        mode,
        reason: 'cooldown',
      })
      return null
    },
    [authStatus, skipAuth, tenantId, user],
  )

  useEffect(() => {
    if (authStatus !== 'ready' || !user || !tenantId || skipAuth) return

    let cancelled = false

    const evaluateAndSync = async () => {
      try {
        const integration = await getMercadoLivreStatus()
        if (cancelled || activeTenantRef.current !== tenantId) return

        const eligible =
          integration.connected === true &&
          integration.active === true &&
          integration.systemClientId === tenantId

        logMlSyncEvent('ml_sync_eligibility', {
          systemClientId: tenantId,
          reason: eligible ? 'connected-active' : 'not-connected-or-inactive',
        })

        if (eligible) await syncNow('automatic')
      } catch (error) {
        if (cancelled || activeTenantRef.current !== tenantId) return
        setState((current) => ({
          ...(current.tenantId === tenantId ? current : emptyStateFor(tenantId)),
          phase: 'error',
          warning: GENERIC_STATUS_WARNING,
        }))
        logMlSyncEvent('ml_sync_failed', {
          systemClientId: tenantId,
          reason: `status-check:${error instanceof Error ? error.name : 'unknown'}`,
        })
      }
    }

    void evaluateAndSync()
    return () => {
      cancelled = true
    }
  }, [authStatus, oauthStatus, skipAuth, syncNow, tenantId, user])

  useEffect(() => {
    if (!tenantId) return

    const storageKey = buildMercadoLivreSyncStorageKey(tenantId)
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return
      const reference = parseMercadoLivreSyncReference(event.newValue, tenantId)
      if (!reference || activeTenantRef.current !== tenantId) return

      if (reference.outcome === 'running') {
        setState((current) => ({
          ...(current.tenantId === tenantId ? current : emptyStateFor(tenantId)),
          phase: 'syncing',
          warning: null,
        }))
        return
      }

      if (reference.outcome === 'success' && reference.lastResult) {
        if (appliedAttemptIdsRef.current.has(reference.attemptId)) return
        appliedAttemptIdsRef.current.add(reference.attemptId)
        setState((current) => ({
          ...(current.tenantId === tenantId ? current : emptyStateFor(tenantId)),
          phase: 'success',
          lastResult: reference.lastResult ?? null,
          warning: null,
          catalogRevision:
            (current.tenantId === tenantId ? current.catalogRevision : 0) + 1,
        }))
        return
      }

      if (reference.outcome === 'error') {
        setState((current) => ({
          ...(current.tenantId === tenantId ? current : emptyStateFor(tenantId)),
          phase: 'error',
          warning: GENERIC_SYNC_WARNING,
        }))
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [tenantId])

  const visibleState = state.tenantId === tenantId ? state : emptyStateFor(tenantId)
  const dismissNotice = useCallback(() => {
    if (!tenantId) return
    setState((current) => ({
      ...(current.tenantId === tenantId ? current : emptyStateFor(tenantId)),
      warning: null,
      phase:
        current.phase === 'error' || current.phase === 'success'
          ? 'idle'
          : current.phase,
    }))
  }, [tenantId])

  const value = useMemo<MercadoLivreSyncContextValue>(
    () => ({
      phase: visibleState.phase,
      isSyncing: visibleState.phase === 'syncing',
      lastResult: visibleState.lastResult,
      warning: visibleState.warning,
      catalogRevision: visibleState.catalogRevision,
      syncNow,
      dismissNotice,
    }),
    [dismissNotice, syncNow, visibleState],
  )

  return (
    <MercadoLivreSyncContext.Provider value={value}>
      {children}
    </MercadoLivreSyncContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook pareado com o provider
export function useMercadoLivreSync() {
  const context = useContext(MercadoLivreSyncContext)
  if (!context) {
    throw new Error('useMercadoLivreSync must be used within MercadoLivreSyncProvider')
  }
  return context
}
