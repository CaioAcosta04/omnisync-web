import { FiActivity, FiArchive, FiGlobe } from 'react-icons/fi'

type ActivityEmptyStateProps = {
  onGoToMarketplaces: () => void
  onGoToStock: () => void
}

export function ActivityEmptyState({ onGoToMarketplaces, onGoToStock }: ActivityEmptyStateProps) {
  return (
    <div style={styles.wrap}>
      <div style={styles.iconCircle}>
        <FiActivity size={36} color="#9ca3af" />
      </div>

      <h3 style={styles.title}>Você ainda não tem atividade</h3>

      <p style={styles.subtitle}>
        As suas vendas e atualizações aparecerão aqui assim que você começar a
        vender ou sincronizar seus marketplaces.
      </p>

      <div style={styles.actions}>
        <button type="button" style={styles.primaryBtn} onClick={onGoToMarketplaces}>
          <FiGlobe size={16} />
          Ir para Marketplaces
        </button>
        <button type="button" style={styles.secondaryBtn} onClick={onGoToStock}>
          <FiArchive size={16} />
          Ir para Estoque
        </button>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    textAlign: 'center' as const,
    gap: '16px',
  },
  iconCircle: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: '#111827',
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
    maxWidth: '420px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
    marginTop: '8px',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 22px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#4f46e5',
    cursor: 'pointer',
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 22px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
} as const
