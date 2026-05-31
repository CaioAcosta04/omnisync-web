import { useState } from 'react'
import { FiArrowLeft, FiCheckCircle } from 'react-icons/fi'
import { useUserAuthNavigation } from '../../../contexts/UserAuthNavigationContext'
import { throwApiError } from '../../../lib/apiError'
import { apiFetch } from '../../../lib/apiFetch'

export function UserChangePassword() {
  const { goToLogin } = useUserAuthNavigation()

  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) { setErrorMessage('Informe um email válido.'); return }
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) {
        await throwApiError(res, 'Não foi possível enviar o email.')
      }
      setSent(true)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={s.card}>
      {/* ── Left brand panel ── */}
      <div style={s.brand}>
        <div style={s.brandInner}>
          <div style={s.logoRow}>
            <div style={s.logoMark}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" opacity="0.9" />
                <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
                <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span style={s.logoText}>OmniSync</span>
          </div>

          <div style={s.taglineBlock}>
            <h2 style={s.taglineHeading}>Esqueceu sua<br />senha?</h2>
            <p style={s.taglineSub}>
              Sem problemas. Enviaremos<br />um link de recuperação<br />para o seu email.
            </p>
          </div>

          <div style={s.dots}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} style={{ ...s.dot, opacity: 0.12 + (i % 5) * 0.06 }} />
            ))}
          </div>

          <div style={s.pills}>
            {['Seguro', 'Rápido', 'Simples'].map((label) => (
              <span key={label} style={s.pill}>{label}</span>
            ))}
          </div>
        </div>
        <p style={s.brandFooter}>© 2026 OmniSync · TCC PUC-Campinas</p>
      </div>

      {/* ── Right form panel ── */}
      <div style={s.formPanel}>
        <div style={s.formInner}>
          {!sent ? (
            <>
              <div style={s.formHeader}>
                <h1 style={s.formTitle}>Recuperar Senha</h1>
                <p style={s.formSubtitle}>
                  Informe seu email e enviaremos um link para criar uma nova senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={s.form} noValidate>
                <div style={s.fieldGroup}>
                  <label style={s.label} htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrorMessage('') }}
                    style={s.input}
                    autoComplete="email"
                    required
                  />
                </div>

                {errorMessage && (
                  <div style={s.errorBanner} role="alert">{errorMessage}</div>
                )}

                <button
                  type="submit"
                  style={{ ...s.submitBtn, ...(isSubmitting ? s.submitBtnDisabled : {}) }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Enviando…' : 'Enviar link de recuperação'}
                </button>
              </form>

              <button type="button" style={s.backBtn} onClick={goToLogin}>
                <FiArrowLeft size={14} />
                Voltar para o login
              </button>
            </>
          ) : (
            /* ── Success state ── */
            <div style={s.successWrap}>
              <div style={s.successIcon}>
                <FiCheckCircle size={32} color="#6d28d9" />
              </div>
              <h2 style={s.successTitle}>Email enviado!</h2>
              <p style={s.successText}>
                Enviamos um link de recuperação para{' '}
                <strong style={{ color: '#0f172a' }}>{email}</strong>.
                Verifique sua caixa de entrada.
              </p>
              <button type="button" style={s.submitBtn} onClick={goToLogin}>
                Voltar para o login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  card: {
    display: 'flex',
    width: '100%',
    maxWidth: '880px',
    minHeight: '480px',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
  },

  brand: {
    width: '42%',
    flexShrink: 0,
    background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 60%, #2e1065 100%)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    padding: '36px 32px 28px',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  brandInner: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '32px',
    position: 'relative' as const,
    zIndex: 1,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoMark: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '-0.3px',
  },
  taglineBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  taglineHeading: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: 1.2,
    letterSpacing: '-0.5px',
  },
  taglineSub: {
    margin: 0,
    fontSize: '14px',
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.6,
  },
  dots: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '10px',
    width: 'fit-content',
  },
  dot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    backgroundColor: '#a78bfa',
  },
  pills: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  pill: {
    padding: '5px 12px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.75)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
  },
  brandFooter: {
    margin: 0,
    fontSize: '11px',
    color: 'rgba(255,255,255,0.25)',
    position: 'relative' as const,
    zIndex: 1,
  },

  formPanel: {
    flex: 1,
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 32px',
  },
  formInner: {
    width: '100%',
    maxWidth: '320px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  formHeader: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  formTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.4px',
  },
  formSubtitle: {
    margin: 0,
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.6,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '14px',
    fontFamily: 'inherit',
    color: '#111827',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  errorBanner: {
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    fontSize: '13px',
    lineHeight: 1.4,
  },
  submitBtn: {
    width: '100%',
    padding: '11px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#6d28d9',
    color: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtnDisabled: {
    opacity: 0.65,
    cursor: 'not-allowed',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    width: '100%',
    padding: '9px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
  },

  /* Success */
  successWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '16px',
    textAlign: 'center' as const,
  },
  successIcon: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    backgroundColor: '#ede9fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 700,
    color: '#0f172a',
  },
  successText: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
    maxWidth: '280px',
  },
} as const
