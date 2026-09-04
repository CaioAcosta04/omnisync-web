import { FiCheckCircle, FiRefreshCw, FiX, FiXCircle } from 'react-icons/fi'
import { useMercadoLivreSync } from '../contexts/MercadoLivreSyncContext'
import './MercadoLivreSyncStatusBar.css'

export function MercadoLivreSyncStatusBar() {
  const { phase, lastResult, warning, dismissNotice } = useMercadoLivreSync()

  if (phase === 'idle' || phase === 'checking') return null

  if (phase === 'syncing') {
    return (
      <div className="ml-sync-status ml-sync-status--syncing" role="status" aria-live="polite">
        <FiRefreshCw className="ml-sync-status__spinner" aria-hidden="true" />
        <span>Sincronizando…</span>
      </div>
    )
  }

  const failed = phase === 'error'
  const message = failed ? warning : lastResult?.message
  if (!message) return null

  return (
    <div
      className={`ml-sync-status ml-sync-status--${failed ? 'error' : 'success'}`}
      role={failed ? 'alert' : 'status'}
      aria-live={failed ? 'assertive' : 'polite'}
    >
      {failed ? <FiXCircle aria-hidden="true" /> : <FiCheckCircle aria-hidden="true" />}
      <span className="ml-sync-status__message">{message}</span>
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
