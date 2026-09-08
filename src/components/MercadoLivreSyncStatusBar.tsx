import { FiCheckCircle, FiInfo, FiRefreshCw, FiX, FiXCircle } from 'react-icons/fi'
import { useMercadoLivreSync } from '../contexts/MercadoLivreSyncContext'
import './MercadoLivreSyncStatusBar.css'

export function MercadoLivreSyncStatusBar({ onReconnect }: { onReconnect?: () => void }) {
  const { phase, lastResult, warning, reauthRequired, dismissNotice } = useMercadoLivreSync()

  if (phase === 'idle' || phase === 'checking') return null

  if (phase === 'syncing') {
    return (
      <div className="ml-sync-status ml-sync-status--syncing" role="status" aria-live="polite">
        <FiRefreshCw className="ml-sync-status__spinner" aria-hidden="true" />
        <span>Sincronizando…</span>
      </div>
    )
  }

  const failed = phase === 'error' || phase === 'reauth-required'
  const informational = phase === 'in-progress' || phase === 'rate-limited'
  const message = phase === 'success' ? lastResult?.message : warning
  if (!message) return null

  return (
    <div
      className={`ml-sync-status ml-sync-status--${failed ? 'error' : informational ? 'info' : 'success'}`}
      role={failed ? 'alert' : 'status'}
      aria-live={failed ? 'assertive' : 'polite'}
    >
      {failed ? (
        <FiXCircle aria-hidden="true" />
      ) : informational ? (
        <FiInfo aria-hidden="true" />
      ) : (
        <FiCheckCircle aria-hidden="true" />
      )}
      <span className="ml-sync-status__message">{message}</span>
      {reauthRequired ? (
        <button type="button" className="ml-sync-status__action" onClick={onReconnect}>
          Reconectar Mercado Livre
        </button>
      ) : null}
      <button
        type="button"
        className="ml-sync-status__dismiss"
        onClick={dismissNotice}
        aria-label="Dispensar aviso de sincronização"
      >
        <FiX aria-hidden="true" />
      </button>
    </div>
  )
}
