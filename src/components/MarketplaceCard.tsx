import type { ReactNode } from 'react'
import { FiLink2, FiLock, FiPlus } from 'react-icons/fi'

export type MarketplaceCardData = {
  id: string
  name: string
  apiType: string
  icon: ReactNode
  connected: boolean
  integrationActive: boolean
  lastSyncLabel: string
  /** Card marcado como "Em breve" — não permite interação */
  disabled?: boolean
  reconnectRequired?: boolean
}

type MarketplaceCardProps = {
  marketplace: MarketplaceCardData
  canManage?: boolean
  disconnectConfirmationOpen?: boolean
  onRequestDisconnect?: () => void
  onCancelDisconnect?: () => void
  onConfirmDisconnect?: () => void
  onConnect?: () => void
  disconnecting?: boolean
}

export function MarketplaceCard({
  marketplace,
  canManage = false,
  disconnectConfirmationOpen = false,
  onRequestDisconnect,
  onCancelDisconnect,
  onConfirmDisconnect,
  onConnect,
  disconnecting = false,
}: MarketplaceCardProps) {
  const { name, apiType, icon, connected, integrationActive, lastSyncLabel, disabled, reconnectRequired } =
    marketplace

  return (
    <article
      style={{
        ...styles.card,
        ...(disabled ? styles.cardDisabled : {}),
      }}
    >
      {disabled && (
        <div style={styles.comingSoonRibbon} aria-hidden="true">
          <span style={styles.comingSoonRibbonText}>EM BREVE</span>
        </div>
      )}

      <div
        style={{
          ...styles.iconWrap,
          ...(disabled ? styles.iconWrapDisabled : {}),
        }}
      >
        {icon}
      </div>

      <div style={styles.body}>
        <div style={styles.bodyHeader}>
          <div>
            <p style={styles.apiType}>{apiType}</p>
            <h2 style={styles.name}>{name}</h2>
          </div>

          {disabled ? (
            <span style={{ ...styles.stateBadge, ...styles.stateBadgeComingSoon }}>
              <FiLock size={10} strokeWidth={2.5} />
              EM BREVE
            </span>
          ) : (
            <span
              style={{
                ...styles.stateBadge,
                ...(integrationActive ? styles.stateBadgeActive : styles.stateBadgeInactive),
              }}
            >
              {integrationActive ? 'ATIVO' : 'INATIVO'}
            </span>
          )}
        </div>

        <div style={styles.metaGrid}>
          <div>
            <p style={styles.metaLabel}>STATUS</p>
            <p style={{ ...styles.metaValue, ...(disabled ? styles.metaValueDisabled : {}) }}>
              {disabled
                ? 'Em breve'
                : reconnectRequired
                  ? 'Reconexão necessária'
                  : connected
                    ? 'Conectado'
                    : 'Não conectado'}
            </p>
          </div>
          <div>
            <p style={styles.metaLabel}>ÚLTIMA SINCRONIZAÇÃO</p>
            <p style={{ ...styles.metaValue, ...(disabled ? styles.metaValueDisabled : {}) }}>
              {disabled ? '—' : lastSyncLabel}
            </p>
          </div>
        </div>

        {!disabled && canManage && (
          <div style={styles.actions}>
            {connected && integrationActive ? (
              disconnectConfirmationOpen ? (
                <div style={styles.confirmDisconnect} role="alertdialog" aria-label="Confirmar encerramento da conexão">
                  <p style={styles.confirmText}>
                    Encerrar a conexão com o Mercado Livre? Será necessário autorizar a conta novamente para sincronizar.
                  </p>
                  <div style={styles.confirmActions}>
                    <button
                      type="button"
                      style={styles.btnCancel}
                      onClick={() => onCancelDisconnect?.()}
                      disabled={disconnecting}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      style={{ ...styles.btnConfirmDisconnect, ...(disconnecting ? styles.btnDisabled : {}) }}
                      onClick={() => onConfirmDisconnect?.()}
                      disabled={disconnecting}
                    >
                      {disconnecting ? 'Encerrando conexão…' : 'Confirmar encerramento'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  style={styles.btnDisconnect}
                  onClick={() => onRequestDisconnect?.()}
                >
                  <FiLink2 size={18} />
                  Encerrar conexão
                </button>
              )
            ) : (
              <button type="button" style={styles.btnConnect} onClick={() => onConnect?.()}>
                <FiPlus size={18} />
                {reconnectRequired ? 'Reconectar Mercado Livre' : `Conectar ${name}`}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

const styles = {
  card: {
    position: 'relative' as const,
    display: 'flex',
    gap: '20px',
    padding: '20px 22px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
    overflow: 'hidden',
  },
  cardDisabled: {
    backgroundColor: '#f9fafb',
    border: '1px dashed #d1d5db',
    boxShadow: 'none',
    opacity: 0.75,
  },
  /** Faixa diagonal "EM BREVE" no canto superior direito */
  comingSoonRibbon: {
    position: 'absolute' as const,
    top: '12px',
    right: '-28px',
    width: '110px',
    backgroundColor: '#fef3c7',
    transform: 'rotate(30deg)',
    transformOrigin: 'center',
    padding: '3px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none' as const,
    zIndex: 1,
  },
  comingSoonRibbonText: {
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '0.06em',
    color: '#92400e',
  },
  iconWrap: {
    flexShrink: 0,
    width: '88px',
    height: '88px',
    borderRadius: '12px',
    background: 'linear-gradient(145deg, #f5f3ff 0%, #ede9fe 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6d28d9',
  },
  iconWrapDisabled: {
    background: '#f3f4f6',
    color: '#9ca3af',
  },
  body: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  bodyHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  apiType: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: '#7c3aed',
    marginBottom: '4px',
  },
  name: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1.2,
  },
  stateBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    padding: '4px 10px',
    borderRadius: '999px',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  stateBadgeActive: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  stateBadgeInactive: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  /** Âmbar — completamente diferente de INATIVO (cinza) */
  stateBadgeComingSoon: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fde68a',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    maxWidth: '360px',
  },
  metaLabel: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    color: '#9ca3af',
    marginBottom: '2px',
  },
  metaValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  metaValueDisabled: {
    color: '#9ca3af',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '4px',
  },
  btnDisconnect: {
    flex: 1,
    maxWidth: '320px',
    padding: '12px 18px',
    borderRadius: '10px',
    border: '1px solid #dc2626',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#b91c1c',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'default' as const,
  },
  confirmDisconnect: {
    flex: 1,
    maxWidth: '520px',
    padding: '14px',
    borderRadius: '10px',
    border: '1px solid #fecaca',
    backgroundColor: '#fef2f2',
  },
  confirmText: {
    margin: 0,
    color: '#991b1b',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  confirmActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '12px',
  },
  btnCancel: {
    padding: '9px 14px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnConfirmDisconnect: {
    padding: '9px 14px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnConnect: {
    flex: 1,
    maxWidth: '320px',
    padding: '12px 18px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#0f172a',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
} as const
