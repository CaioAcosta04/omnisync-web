import { useMemo, useState } from 'react'
import { FcGoogle } from 'react-icons/fc'
import { FaApple } from 'react-icons/fa'
import { FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi'
import { useAuth } from '../../../contexts/AuthContext'
import { useUserAuthNavigation } from '../../../contexts/UserAuthNavigationContext'
import { throwApiError } from '../../../lib/apiError'
import { apiFetch } from '../../../lib/apiFetch'

// ─── Shared field component ─────────────────────────────────────────────────

function Field({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  autoComplete,
}: {
  id: string
  label: string
  type?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  error?: string
  autoComplete?: string
}) {
  const [showPw, setShowPw] = useState(false)
  const isPassword = type === 'password'

  return (
    <div style={s.fieldGroup}>
      <label style={s.label} htmlFor={id}>{label}</label>
      <div style={s.passwordWrap}>
        <input
          id={id}
          type={isPassword ? (showPw ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          style={{
            ...s.input,
            ...(error ? s.inputError : {}),
            ...(isPassword ? { paddingRight: '44px' } : {}),
          }}
        />
        {isPassword && (
          <button
            type="button"
            style={s.eyeBtn}
            onClick={() => setShowPw((v) => !v)}
            tabIndex={-1}
            aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        )}
      </div>
      {error && <span style={s.fieldError}>{error}</span>}
    </div>
  )
}

// ─── Step indicators ────────────────────────────────────────────────────────

function Steps({ current }: { current: 1 | 2 }) {
  return (
    <div style={s.stepsRow}>
      {([1, 2] as const).map((n) => (
        <div key={n} style={s.stepItem}>
          <div
            style={{
              ...s.stepDot,
              ...(current === n ? s.stepDotActive : current > n ? s.stepDotDone : {}),
            }}
          >
            {current > n ? '✓' : n}
          </div>
          <span style={{ ...s.stepLabel, ...(current === n ? s.stepLabelActive : {}) }}>
            {n === 1 ? 'Empresa' : 'Usuário'}
          </span>
        </div>
      ))}
      <div style={s.stepConnector} />
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export function UserCreateAccount() {
  const { refreshSession } = useAuth()
  const { goToLogin } = useUserAuthNavigation()

  const [step, setStep] = useState<1 | 2>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Step 1 fields
  const [companyName, setCompanyName] = useState('')
  const [cnpj, setCnpj] = useState('')

  // Step 2 fields
  const [fullName, setFullName] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [savedCompany, setSavedCompany] = useState<{ name: string; document: string } | null>(null)

  // ── Validation ────────────────────────────────────────────────────────────

  const validateStep1 = () => {
    const errors: Record<string, string> = {}
    if (!companyName.trim()) errors.companyName = 'Informe o nome da empresa.'
    const digits = cnpj.replace(/\D/g, '')
    if (digits.length !== 14) errors.cnpj = 'Informe um CNPJ com 14 dígitos.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateStep2 = () => {
    const errors: Record<string, string> = {}
    if (fullName.trim().length < 4) errors.fullName = 'Informe seu nome completo.'
    const cpfDigits = cpf.replace(/\D/g, '')
    if (cpfDigits.length !== 11) errors.cpf = 'Informe um CPF com 11 dígitos.'
    if (!email.includes('@')) errors.email = 'Informe um email válido.'
    if (password.length < 6) errors.password = 'A senha deve ter pelo menos 6 caracteres.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep1()) return
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      const normalizedDocument = cnpj.replace(/\D/g, '')
      const res = await apiFetch(
        `/api/client/checkCNPJ/${encodeURIComponent(normalizedDocument)}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } }
      )
      if (!res.ok) {
        await throwApiError(res, 'Não foi possível validar o CNPJ.')
      }
      const alreadyExists = (await res.json()) as boolean
      if (alreadyExists) {
        setErrorMessage('Já existe empresa cadastrada com esse CNPJ.')
        return
      }
      setSavedCompany({ name: companyName.trim(), document: normalizedDocument })
      setStep(2)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep2()) return
    if (!savedCompany) { setErrorMessage('Dados da empresa não encontrados. Volte ao passo 1.'); setStep(1); return }
    setIsSubmitting(true)
    setErrorMessage('')
    try {
      const companyRes = await apiFetch('/api/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: savedCompany.name, document: savedCompany.document }),
      })
      if (!companyRes.ok) await throwApiError(companyRes, 'Não foi possível criar a empresa.')
      const companyResult = (await companyRes.json()) as { id?: number }
      const systemClientId = companyResult.id
      if (!systemClientId) throw new Error('Empresa criada sem retorno de ID.')

      const registerRes = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemClientId,
          name: fullName.trim(),
          email: email.trim(),
          password,
          resource: { cpf: cpf.replace(/\D/g, '') },
        }),
      })
      if (!registerRes.ok) await throwApiError(registerRes, 'Não foi possível criar o usuário.')
      await registerRes.json()
      const sessionOk = await refreshSession()
      if (!sessionOk) throw new Error('Conta criada, mas não foi possível iniciar a sessão. Faça login.')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro inesperado ao criar conta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Left panel content (changes per step) ────────────────────────────────

  const brandContent = useMemo(() => ({
    1: {
      heading: 'Comece a\nvender mais.',
      sub: 'Centralize seus marketplaces\nem uma única plataforma.',
    },
    2: {
      heading: 'Quase lá,\nsó mais um passo.',
      sub: 'Configure seu perfil de usuário\npara acessar o OmniSync.',
    },
  }), [])

  const { heading, sub } = brandContent[step]

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
            <h2 style={s.taglineHeading}>
              {heading.split('\n').map((line, i) => (
                <span key={i}>{line}{i === 0 && <br />}</span>
              ))}
            </h2>
            <p style={s.taglineSub}>
              {sub.split('\n').map((line, i) => (
                <span key={i}>{line}{i === 0 && <br />}</span>
              ))}
            </p>
          </div>

          <div style={s.dots}>
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} style={{ ...s.dot, opacity: 0.12 + (i % 5) * 0.06 }} />
            ))}
          </div>

          <div style={s.pills}>
            {['Mercado Livre', 'Pedidos', 'Relatórios'].map((label) => (
              <span key={label} style={s.pill}>{label}</span>
            ))}
          </div>
        </div>
        <p style={s.brandFooter}>© 2026 OmniSync · TCC PUC-Campinas</p>
      </div>

      {/* ── Right form panel ── */}
      <div style={s.formPanel}>
        <div style={s.formInner}>
          <div style={s.formHeader}>
            <Steps current={step} />
            <h1 style={s.formTitle}>
              {step === 1 ? 'Criar Empresa' : 'Criar Conta'}
            </h1>
            <p style={s.formSubtitle}>
              {step === 1
                ? 'Primeiro, informe os dados da sua empresa.'
                : 'Agora preencha seus dados pessoais.'}
            </p>
          </div>

          {/* ── Step 1 ── */}
          {step === 1 && (
            <form onSubmit={handleStep1} style={s.form} noValidate>
              <Field
                id="companyName"
                label="Nome da Empresa"
                placeholder="TopInc LTDA"
                value={companyName}
                onChange={setCompanyName}
                error={fieldErrors.companyName}
              />
              <Field
                id="cnpj"
                label="CNPJ"
                placeholder="12.345.678/0001-90"
                value={cnpj}
                onChange={setCnpj}
                error={fieldErrors.cnpj}
              />
              {errorMessage && <div style={s.errorBanner} role="alert">{errorMessage}</div>}
              <button
                type="submit"
                style={{ ...s.submitBtn, ...(isSubmitting ? s.submitBtnDisabled : {}) }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Verificando…' : 'Próximo →'}
              </button>
            </form>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <form onSubmit={handleStep2} style={s.form} noValidate>
              <Field
                id="fullName"
                label="Nome Completo"
                placeholder="João Silva"
                value={fullName}
                onChange={setFullName}
                error={fieldErrors.fullName}
              />
              <Field
                id="cpf"
                label="CPF"
                placeholder="123.456.789-10"
                value={cpf}
                onChange={setCpf}
                error={fieldErrors.cpf}
              />
              <Field
                id="email"
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={setEmail}
                error={fieldErrors.email}
                autoComplete="email"
              />
              <Field
                id="password"
                label="Senha"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={setPassword}
                error={fieldErrors.password}
                autoComplete="new-password"
              />
              {errorMessage && <div style={s.errorBanner} role="alert">{errorMessage}</div>}
              <button
                type="submit"
                style={{ ...s.submitBtn, ...(isSubmitting ? s.submitBtnDisabled : {}) }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Criando conta…' : 'Criar Conta'}
              </button>

              <button
                type="button"
                style={s.backBtn}
                onClick={() => { setStep(1); setErrorMessage(''); setFieldErrors({}) }}
                disabled={isSubmitting}
              >
                <FiArrowLeft size={14} />
                Voltar para Etapa 1
              </button>
            </form>
          )}

          {/* Divider + Social */}
          <div style={s.divider}>
            <div style={s.dividerLine} />
            <span style={s.dividerText}>ou continue com</span>
            <div style={s.dividerLine} />
          </div>
          <div style={s.socialRow}>
            <button type="button" style={s.socialBtn}><FcGoogle size={18} />Google</button>
            <button type="button" style={s.socialBtn}><FaApple size={18} />Apple</button>
          </div>

          <p style={s.signupText}>
            Já tem uma conta?{' '}
            <button type="button" style={s.signupLink} onClick={goToLogin}>
              Entrar
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
    gap: '28px',
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
    fontSize: '26px',
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: 1.25,
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
    padding: '36px 32px',
    overflowY: 'auto' as const,
  },
  formInner: {
    width: '100%',
    maxWidth: '340px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  formHeader: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  formTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.4px',
  },
  formSubtitle: {
    margin: 0,
    fontSize: '13px',
    color: '#6b7280',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '5px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
  },
  passwordWrap: {
    position: 'relative' as const,
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
  inputError: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff5f5',
  },
  fieldError: {
    fontSize: '11px',
    color: '#dc2626',
    fontWeight: 500,
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
    marginTop: '2px',
  },
  submitBtnDisabled: {
    opacity: 0.65,
    cursor: 'not-allowed',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
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

  /* Steps indicator */
  stepsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    position: 'relative' as const,
    marginBottom: '4px',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    zIndex: 1,
  },
  stepDot: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    border: '2px solid #e5e7eb',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: '#9ca3af',
    flexShrink: 0,
  },
  stepDotActive: {
    borderColor: '#6d28d9',
    backgroundColor: '#6d28d9',
    color: '#ffffff',
  },
  stepDotDone: {
    borderColor: '#6d28d9',
    backgroundColor: '#ede9fe',
    color: '#6d28d9',
  },
  stepLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#9ca3af',
  },
  stepLabelActive: {
    color: '#6d28d9',
    fontWeight: 600,
  },
  stepConnector: {
    position: 'absolute' as const,
    top: '50%',
    left: '32px',
    right: '32px',
    height: '1px',
    backgroundColor: '#e5e7eb',
    zIndex: 0,
  },
} as const
