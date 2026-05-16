import { FiPackage, FiPlus, FiRefreshCw, FiShoppingCart } from 'react-icons/fi'

type StockEmptyStateProps = {
  mlConnected: boolean
  syncing: boolean
  onSyncML: () => void
  onConnectML: () => void
  onAddManual: () => void
}

export function StockEmptyState({
  mlConnected,
  syncing,
  onSyncML,
  onConnectML,
  onAddManual,
}: StockEmptyStateProps) {
  return (
    <div style={styles.wrap}>
      <div style={styles.iconCircle}>
        <FiPackage size={36} color="#9ca3af" />
      </div>

      <h3 style={styles.title}>Você ainda não tem produtos</h3>

      <p style={styles.subtitle}>
        {mlConnected
          ? 'Sincronize os seus anúncios do Mercado Livre para importar o estoque automaticamente, ou adicione um produto manualmente.'
          : 'Conecte sua conta do Mercado Livre para importar seus anúncios e estoque automaticamente, ou adicione um produto manualmente.'}
      </p>

      <div style={styles.actions}>
        {mlConnected ? (
          <button
            type="button"
            style={styles.primaryBtn}
            onClick={onSyncML}
            disabled={syncing}
          >
            <FiRefreshCw
              size={16}
              style={syncing ? styles.spinIcon : undefined}
            />
            {syncing ? 'Sincronizando…' : 'Sincronizar do Mercado Livre'}
          </button>
        ) : (
          <button type="button" style={styles.mlBtn} onClick={onConnectML}>
            <FiShoppingCart size={16} />
            Conectar Mercado Livre
          </button>
        )}

        <button type="button" style={styles.secondaryBtn} onClick={onAddManual}>
          <FiPlus size={16} />
          Adicionar manualmente
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
    backgroundColor: '#2563eb',
    cursor: 'pointer',
  },
  mlBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 22px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#333333',
    backgroundColor: '#ffe600',
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
  spinIcon: {
    animation: 'spin 0.8s linear infinite',
  },
} as const
