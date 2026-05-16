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
}

type MarketplaceCardProps = {
  marketplace: MarketplaceCardData
  onManage?: () => void
  onDisconnect?: () => void
  onConnect?: () => void
}

export function MarketplaceCard({
  marketplace,
  onManage,
  onDisconnect,
  onConnect,
}: MarketplaceCardProps) {
  const { name, apiType, icon, connected, integrationActive, lastSyncLabel, disabled } =
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
              {disabled ? 'Em breve' : connected ? 'Conectado' : 'Não conectado'}
            </p>
          </div>
          <div>
            <p style={styles.metaLabel}>ÚLTIMA SINCRONIZAÇÃO</p>
            <p style={{ ...styles.metaValue, ...(disabled ? styles.metaValueDisabled : {}) }}>
              {disabled ? '—' : lastSyncLabel}
            </p>
          </div>
        </div>

        {!disabled && (
          <div style={styles.actions}>
            {connected ? (
              <>
                <button
                  type="button"
                  style={styles.btnPrimary}
                  onClick={() => onManage?.()}
                >
                  Gerenciar Conexão
                </button>
                <button
                  type="button"
                  style={styles.btnIcon}
                  aria-label="Desconectar marketplace"
                  onClick={() => onDisconnect?.()}
                >
                  <FiLink2 size={18} />
                </button>
              </>
            ) : (
              <button type="button" style={styles.btnConnect} onClick={() => onConnect?.()}>
                <FiPlus size={18} />
                Conectar Marketplace
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
  btnPrimary: {
    flex: 1,
    maxWidth: '280px',
    padding: '12px 18px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#6d28d9',
    cursor: 'pointer',
  },
  btnIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#4b5563',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
