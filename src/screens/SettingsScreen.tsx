import { useEffect, useState, type FormEvent } from 'react'
import { BsBuildings } from 'react-icons/bs'
import { FiFileText, FiLock, FiSave, FiUser } from 'react-icons/fi'
import { PasswordForm } from '../components/PasswordForm'
import { useAuth } from '../contexts/AuthContext'
import { useUserAuthNavigation } from '../contexts/UserAuthNavigationContext'
import { hasSettingsManagePermission } from '../lib/userResource'
import { getSystemClient, updateSystemClient } from '../services/systemClientApi'
import { updateOwnProfile } from '../services/usersApi'

type SettingsTab = 'profile' | 'company' | 'security'
type Feedback = { kind: 'success' | 'error'; message: string } | null

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Perfil', icon: <FiUser size={18} /> },
  { id: 'company', label: 'Empresa', icon: <BsBuildings size={18} /> },
  { id: 'security', label: 'Segurança', icon: <FiLock size={18} /> },
]

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function ProfileSection() {
  const { user, refreshSession } = useAuth()
  const { logout } = useUserAuthNavigation()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '').join('') || 'US'
  const changed = name.trim() !== (user?.name ?? '') || email.trim().toLowerCase() !== (user?.email ?? '')

  async function submit(event: FormEvent) {
    event.preventDefault()
    const normalizedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()
    if (normalizedName.length < 2) {
      setFeedback({ kind: 'error', message: 'Informe um nome válido.' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFeedback({ kind: 'error', message: 'Informe um e-mail válido.' })
      return
    }

    setSaving(true)
    setFeedback(null)
    try {
      const updated = await updateOwnProfile({ name: normalizedName, email: normalizedEmail })
      setName(updated.name)
      setEmail(updated.email)
      await refreshSession()
      setFeedback({ kind: 'success', message: 'Perfil atualizado com sucesso.' })
    } catch (error) {
      setFeedback({ kind: 'error', message: errorMessage(error, 'Não foi possível atualizar o perfil.') })
    } finally {
      setSaving(false)
    }
  }

  return <div style={s.sectionColumn}>
    <form style={s.card} onSubmit={submit}>
      <h3 style={s.cardTitle}>Informações pessoais</h3>
      <p style={s.cardDesc}>Atualize seu nome e o e-mail usado para acessar o OmniSync.</p>
      <div style={s.profileHeader}>
        <div style={s.avatarLarge}>{initials}</div>
        <div><div style={s.avatarName}>{name}</div><div style={s.avatarEmail}>{email}</div></div>
      </div>
      <div style={s.fieldGroup}>
        <label htmlFor="settings-name" style={s.label}>Nome completo</label>
        <input id="settings-name" style={s.input} value={name} disabled={saving}
          onChange={(event) => setName(event.target.value)} autoComplete="name" />
      </div>
      <div style={s.fieldGroup}>
        <label htmlFor="settings-email" style={s.label}>E-mail</label>
        <input id="settings-email" style={s.input} type="email" value={email} disabled={saving}
          onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
      </div>
      {feedback && <div role="alert" style={feedback.kind === 'success' ? s.success : s.error}>{feedback.message}</div>}
      <div style={s.cardActions}>
        <button type="submit" style={saving || !changed ? s.btnDisabled : s.btnPrimary} disabled={saving || !changed}>
          <FiSave size={16} />{saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
      <div style={s.logoutRow}>
        <button type="button" style={s.logout} onClick={() => void logout()}>Sair da conta</button>
      </div>
    </form>
  </div>
}

function CompanySection() {
  const { user } = useAuth()
  const canManageCompany = hasSettingsManagePermission(user)
  const [name, setName] = useState('')
  const [document, setDocument] = useState('')
  const [original, setOriginal] = useState({ name: '', document: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  useEffect(() => {
    let active = true
    if (user?.systemClientId == null) return
    setLoading(true)
    getSystemClient(user.systemClientId)
      .then((company) => {
        if (!active) return
        const formattedDocument = formatCnpj(company.document)
        setName(company.name)
        setDocument(formattedDocument)
        setOriginal({ name: company.name, document: formattedDocument })
      })
      .catch((error) => active && setFeedback({ kind: 'error', message: errorMessage(error, 'Não foi possível carregar os dados da empresa.') }))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [user?.systemClientId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (user?.systemClientId == null) return
    const normalizedName = name.trim()
    const documentDigits = document.replace(/\D/g, '')
    if (normalizedName.length < 2) {
      setFeedback({ kind: 'error', message: 'Informe o nome da empresa.' })
      return
    }
    if (documentDigits.length !== 14) {
      setFeedback({ kind: 'error', message: 'Informe um CNPJ com 14 dígitos.' })
      return
    }

    setSaving(true)
    setFeedback(null)
    try {
      const updated = await updateSystemClient(user.systemClientId, { name: normalizedName, document: documentDigits })
      const formattedDocument = formatCnpj(updated.document)
      setName(updated.name)
      setDocument(formattedDocument)
      setOriginal({ name: updated.name, document: formattedDocument })
      setFeedback({ kind: 'success', message: 'Dados da empresa atualizados com sucesso.' })
    } catch (error) {
      setFeedback({ kind: 'error', message: errorMessage(error, 'Não foi possível atualizar os dados da empresa.') })
    } finally {
      setSaving(false)
    }
  }

  const changed = name.trim() !== original.name || document !== original.document
  return <div style={s.sectionColumn}>
    <form style={s.card} onSubmit={submit}>
      <h3 style={s.cardTitle}>Dados da empresa</h3>
      <p style={s.cardDesc}>Gerencie os dados cadastrais da empresa vinculada à sua conta.</p>
      <div style={s.fieldGroup}>
        <label htmlFor="settings-company-name" style={s.label}>Nome da empresa</label>
        <input id="settings-company-name" style={s.input} value={name} disabled={loading || saving || !canManageCompany}
          onChange={(event) => setName(event.target.value)} />
      </div>
      <div style={s.fieldGroup}>
        <label htmlFor="settings-company-document" style={s.label}>CNPJ</label>
        <input id="settings-company-document" style={s.input} value={document} disabled={loading || saving || !canManageCompany}
          onChange={(event) => setDocument(formatCnpj(event.target.value))} inputMode="numeric" />
      </div>
      {loading && <div style={s.info}>Carregando dados da empresa…</div>}
      {!loading && !canManageCompany && <div style={s.info}>Somente administradores podem alterar estes dados.</div>}
      {feedback && <div role="alert" style={feedback.kind === 'success' ? s.success : s.error}>{feedback.message}</div>}
      {canManageCompany && <div style={s.cardActions}>
        <button type="submit" style={loading || saving || !changed ? s.btnDisabled : s.btnPrimary}
          disabled={loading || saving || !changed}>
          <FiSave size={16} />{saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>}
    </form>
  </div>
}

function SecuritySection() {
  const { logout } = useUserAuthNavigation()
  return <div style={s.sectionColumn}><div style={s.card}>
    <h3 style={s.cardTitle}>Alterar senha</h3>
    <p style={s.cardDesc}>Mantenha sua conta segura com uma senha forte.</p>
    <PasswordForm operation={{ kind: 'own' }} onSuccess={logout} />
  </div></div>
}

const SECTION_MAP: Record<SettingsTab, () => React.JSX.Element> = {
  profile: ProfileSection,
  company: CompanySection,
  security: SecuritySection,
}

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const { user } = useAuth()
  const visibleActiveTab = TABS.some((tab) => tab.id === activeTab) ? activeTab : 'profile'
  const ActiveSection = SECTION_MAP[visibleActiveTab]

  return <div style={s.page}>
    <div style={s.pageHeader}>
      <h1 style={s.pageTitle}>Configurações</h1>
      <p style={s.pageSubtitle}>Gerencie seu perfil, empresa e segurança.</p>
    </div>
    <div className="settings-content">
      <nav style={s.sidebar} aria-label="Seções de configurações">
        {TABS.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
          style={{ ...s.tabBtn, ...(visibleActiveTab === tab.id ? s.tabBtnActive : {}) }}>
          {tab.icon}{tab.label}
        </button>)}
        <div style={s.sidebarDivider} />
        <a href="https://drive.google.com/uc?export=download&id=1A4ZR9at7hDXYKwW1wDP-Q1ikGATQ0ZpV"
          target="_blank" rel="noopener noreferrer" style={s.presentationLink}>
          <FiFileText size={15} /><span>Apresentação do Projeto</span>
        </a>
      </nav>
      <div style={s.panel}>{visibleActiveTab === 'profile'
        ? <ProfileSection key={`${user?.id ?? 'profile'}-${user?.email ?? ''}`} />
        : <ActiveSection />}</div>
    </div>
  </div>
}

const s = {
  page: { width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '0 0 40px', display: 'flex', flexDirection: 'column', gap: '24px' },
  pageHeader: { display: 'flex', flexDirection: 'column', gap: '4px' },
  pageTitle: { fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 },
  pageSubtitle: { fontSize: '14px', color: '#6b7280', margin: 0 },
  sidebar: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '8px', position: 'sticky', top: '24px' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', border: 'none', borderRadius: '10px', backgroundColor: 'transparent', fontFamily: 'inherit', fontSize: '14px', fontWeight: 500, color: '#374151', cursor: 'pointer', textAlign: 'left' as const },
  tabBtnActive: { backgroundColor: '#ede9fe', color: '#6d28d9', fontWeight: 600 },
  sidebarDivider: { height: '1px', backgroundColor: '#f3f4f6', margin: '4px 0' },
  presentationLink: { display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 14px', borderRadius: '10px', textDecoration: 'none', fontSize: '13px', fontWeight: 500, color: '#6b7280' },
  panel: { flex: 1, minWidth: 0 },
  sectionColumn: { display: 'flex', flexDirection: 'column', gap: '20px' },
  card: { backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' },
  cardTitle: { fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 },
  cardDesc: { fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 },
  cardActions: { display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' },
  profileHeader: { display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 0' },
  avatarLarge: { width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#6d28d9', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, flexShrink: 0 },
  avatarName: { fontSize: '16px', fontWeight: 600, color: '#111827' },
  avatarEmail: { fontSize: '13px', color: '#6b7280', marginTop: '2px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#374151' },
  input: { padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', color: '#111827', outline: 'none', backgroundColor: '#fff' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontFamily: 'inherit', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  btnDisabled: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: 'none', backgroundColor: '#e5e7eb', color: '#9ca3af', fontFamily: 'inherit', fontSize: '14px', fontWeight: 600, cursor: 'not-allowed' },
  logoutRow: { display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #f3f4f6' },
  logout: { padding: '10px 16px', borderRadius: '10px', border: '1px solid #991b1b', backgroundColor: '#fee2e2', color: '#991b1b', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
  success: { padding: '10px 12px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#047857', fontSize: '13px' },
  error: { padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '13px' },
  info: { padding: '10px 12px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '13px' },
} as const
