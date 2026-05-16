import { useEffect } from 'react'
import { useMercadoLivreOAuth } from '../contexts/MercadoLivreOAuthContext'

export function MercadoLivreOAuthModal() {
  const { status, message, retry, dismiss } = useMercadoLivreOAuth()

  const visible = status !== 'idle'

  useEffect(() => {
    if (visible) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [visible])

  if (!visible) return null

  return (
    <div style={styles.backdrop} aria-modal="true" role="dialog" aria-label="Integração Mercado Livre">
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <img
            src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/logo__large_plus@2x.png"
            alt="Mercado Livre"
            style={styles.logo}
          />
        </div>

        {status === 'processing' && (
          <>
            <div style={styles.spinner} aria-label="Carregando" />
            <p style={styles.title}>Conectando sua conta…</p>
            <p style={styles.subtitle}>Aguarde enquanto validamos a integração com o Mercado Livre.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ ...styles.iconCircle, backgroundColor: '#ecfdf5' }}>
              <span style={{ ...styles.iconText, color: '#059669' }}>✓</span>
            </div>
            <p style={styles.title}>Conta conectada!</p>
            <p style={styles.subtitle}>
              {message ?? 'Sua conta do Mercado Livre foi integrada ao OmniSync com sucesso.'}
            </p>
            <div style={styles.actions}>
              <button type="button" style={styles.btnPrimary} onClick={dismiss}>
                Fechar
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ ...styles.iconCircle, backgroundColor: '#fef2f2' }}>
              <span style={{ ...styles.iconText, color: '#dc2626' }}>✕</span>
            </div>
            <p style={styles.title}>Falha na integração</p>
            <p style={styles.subtitle}>{message ?? 'Ocorreu um erro ao conectar sua conta.'}</p>
            <div style={styles.actions}>
              <button type="button" style={styles.btnSecondary} onClick={dismiss}>
                Fechar
              </button>
              <button type="button" style={styles.btnPrimary} onClick={retry}>
                Tentar novamente
              </button>
            </div>
          </>
        )}

        {status === 'requires_login' && (
          <>
            <div style={{ ...styles.iconCircle, backgroundColor: '#fffbeb' }}>
              <span style={{ ...styles.iconText, color: '#d97706' }}>!</span>
            </div>
            <p style={styles.title}>Faça login para concluir</p>
            <p style={styles.subtitle}>
              Você autenticou com sucesso no Mercado Livre, mas sua sessão OmniSync expirou.
              Clique em <strong>Ir para Login</strong>, entre na sua conta e a integração será
              concluída automaticamente.
            </p>
            <div style={styles.actions}>
              <button type="button" style={styles.btnPrimary} onClick={dismiss}>
                Ir para Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  backdrop: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '36px 32px',
    maxWidth: '420px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
  },
  logoRow: {
    marginBottom: '8px',
  },
  logo: {
    height: '32px',
    objectFit: 'contain' as const,
  },
  iconCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  iconText: {
    fontSize: '28px',
    fontWeight: 700,
    lineHeight: 1,
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#111827',
    textAlign: 'center' as const,
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center' as const,
    lineHeight: 1.5,
    maxWidth: '320px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#ffe600',
    borderRadius: '50%',
    animation: 'ml-spin 0.7s linear infinite',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    marginTop: '8px',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  btnPrimary: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#ffe600',
    color: '#333333',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  btnSecondary: {
    padding: '10px 24px',
    borderRadius: '8px',
    border: '1.5px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
} as const
