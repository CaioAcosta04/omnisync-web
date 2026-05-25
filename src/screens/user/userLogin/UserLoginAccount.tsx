import { useState } from 'react'
import { FcGoogle } from 'react-icons/fc'
import { FaApple } from 'react-icons/fa'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { useAuth } from '../../../contexts/AuthContext'
import { useUserAuthNavigation } from '../../../contexts/UserAuthNavigationContext'
import { apiFetch } from '../../../lib/apiFetch'

export function UserLoginAccount() {
  const { goToChangePassword, goToCreateAccount } = useUserAuthNavigation()
  const { refreshSession } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Email ou senha inválidos.')
      }
      await response.json()
      const sessionOk = await refreshSession()
      if (!sessionOk) throw new Error('Login ok, mas não foi possível carregar o perfil. Tente novamente.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erro inesperado.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={s.card}>
      {/* ── Left brand panel ── */}
      <div style={s.brand}>
        <div style={s.brandInner}>
          {/* Logo mark */}
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

          {/* Tagline */}
          <div style={s.taglineBlock}>
            <h2 style={s.taglineHeading}>Gerencie tudo<br />em um só lugar.</h2>
            <p style={s.taglineSub}>
              Estoque, anúncios e marketplaces<br />sincronizados em tempo real.
            </p>
          </div>

          {/* Decorative dots */}
          <div style={s.dots}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...s.dot,
                  opacity: Math.random() * 0.35 + 0.1,
                }}
              />
            ))}
          </div>

          {/* Feature pills */}
          <div style={s.pills}>
            {['Mercado Livre', 'Pedidos', 'Relatórios'].map((label) => (
              <span key={label} style={s.pill}>{label}</span>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <p style={s.brandFooter}>© 2026 OmniSync · TCC PUC-Campinas</p>
      </div>

      {/* ── Right form panel ── */}
      <div style={s.formPanel}>
        <div style={s.formInner}>
          <div style={s.formHeader}>
            <h1 style={s.formTitle}>Bem-vindo de volta</h1>
            <p style={s.formSubtitle}>Entre com sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} style={s.form} noValidate>
            {/* Email */}
            <div style={s.fieldGroup}>
              <label style={s.label} htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={s.input}
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div style={s.fieldGroup}>
              <div style={s.labelRow}>
                <label style={s.label} htmlFor="password">Senha</label>
                <button
                  type="button"
                  style={s.forgotBtn}
                  onClick={goToChangePassword}
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div style={s.passwordWrap}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...s.input, paddingRight: '44px' }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  style={s.eyeBtn}
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div style={s.rememberRow}>
              <button
                type="button"
                style={{ ...s.checkbox, ...(rememberMe ? s.checkboxActive : {}) }}
                onClick={() => setRememberMe((v) => !v)}
                aria-pressed={rememberMe}
                aria-label="Lembrar de mim"
              >
                {rememberMe && <span style={s.checkmark}>✓</span>}
              </button>
              <span style={s.rememberLabel}>Lembrar de mim por 30 dias</span>
            </div>

            {/* Error */}
            {errorMessage && (
              <div style={s.errorBanner} role="alert">{errorMessage}</div>
            )}

            {/* Submit */}
            <button
              type="submit"
              style={{ ...s.submitBtn, ...(isSubmitting ? s.submitBtnDisabled : {}) }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          {/* Divider */}
          <div style={s.divider}>
            <div style={s.dividerLine} />
            <span style={s.dividerText}>ou continue com</span>
            <div style={s.dividerLine} />
          </div>

          {/* Social */}
          <div style={s.socialRow}>
            <button type="button" style={s.socialBtn}>
              <FcGoogle size={18} />
              Google
            </button>
            <button type="button" style={s.socialBtn}>
              <FaApple size={18} />
              Apple
            </button>
          </div>

          {/* Sign up link */}
          <p style={s.signupText}>
            Não tem uma conta?{' '}
            <button
              type="button"
              style={s.signupLink}
              onClick={goToCreateAccount}
            >
              Criar conta
            </button>
          </p>
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
    minHeight: '560px',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
  },

  /* ── Brand panel ── */
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

  /* ── Form panel ── */
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
    maxWidth: '340px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
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
    fontSize: '14px',
    color: '#6b7280',
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
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
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
    transition: 'border-color 0.15s',
  },
  passwordWrap: {
    position: 'relative' as const,
  },
  eyeBtn: {
    position: 'absolute' as const,
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
  },
  forgotBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: '12px',
    fontWeight: 600,
    color: '#6d28d9',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  rememberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  checkbox: {
    width: '17px',
    height: '17px',
    minWidth: '17px',
    borderRadius: '4px',
    border: '1.5px solid #d1d5db',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  checkboxActive: {
    borderColor: '#6d28d9',
    backgroundColor: '#6d28d9',
  },
  checkmark: {
    fontSize: '11px',
    color: '#ffffff',
    fontWeight: 700,
    lineHeight: 1,
  },
  rememberLabel: {
    fontSize: '13px',
    color: '#4b5563',
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
    marginTop: '4px',
    transition: 'opacity 0.15s',
  },
  submitBtnDisabled: {
    opacity: 0.65,
    cursor: 'not-allowed',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#f3f4f6',
  },
  dividerText: {
    fontSize: '12px',
    color: '#9ca3af',
    whiteSpace: 'nowrap' as const,
  },
  socialRow: {
    display: 'flex',
    gap: '10px',
  },
  socialBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    cursor: 'pointer',
  },
  signupText: {
    margin: 0,
    textAlign: 'center' as const,
    fontSize: '13px',
    color: '#6b7280',
  },
  signupLink: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: '13px',
    fontWeight: 600,
    color: '#6d28d9',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
} as const
