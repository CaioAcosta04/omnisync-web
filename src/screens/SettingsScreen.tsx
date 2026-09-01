import { useState } from 'react'
import {
  FiEye,
  FiEyeOff,
  FiFileText,
  FiLock,
  FiMonitor,
  FiMoon,
  FiSave,
  FiSun,  
  FiUser,
} from 'react-icons/fi'
import { BsBuildings } from 'react-icons/bs'
import { useAuth } from '../contexts/AuthContext'
import { useUserAuthNavigation } from '../contexts/UserAuthNavigationContext'

type SettingsTab = 'profile' | 'store' | 'security' | 'appearance'

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Perfil', icon: <FiUser size={18} /> },
  { id: 'store', label: 'Loja', icon: <BsBuildings size={18} /> },
  { id: 'security', label: 'Segurança', icon: <FiLock size={18} /> },
  { id: 'appearance', label: 'Aparência', icon: <FiMonitor size={18} /> },
]

/* ─── Profile Section ─── */

function ProfileSection() {
  const { user } = useAuth()
  const { logout } = useUserAuthNavigation()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div style={s.sectionColumn}>
      <div style={s.card}>
        <h3 style={s.cardTitle}>Informações Pessoais</h3>
        <p style={s.cardDesc}>Atualize seus dados pessoais e email de contato.</p>

        <div style={s.profileHeader}>
          <div style={s.avatarLarge}>{initials}</div>
          <div>
            <div style={s.avatarName}>{name}</div>
            <div style={s.avatarEmail}>{email}</div>
          </div>
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>Nome Completo</label>
          <input
            style={s.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
          />
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
          />
        </div>

        <div style={s.cardActions}>
          <button type="button" style={s.btnPrimary} onClick={() => console.log('Profile saved:', { name, email })}>
            <FiSave size={16} />
            Salvar Alterações
          </button>
        </div>
        <div style={s.divLogout}>
            <button type="button" style={s.logout} onClick={() => void logout()}>
              Logout
            </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Store Section ─── */

function StoreSection() {
  const [storeName, setStoreName] = useState('OmniSync LTDA')
  const [cnpj, setCnpj] = useState('12.345.678/0001-90')

  return (
    <div style={s.sectionColumn}>
      <div style={s.card}>
        <h3 style={s.cardTitle}>Dados da Loja</h3>
        <p style={s.cardDesc}>Informações da sua empresa cadastrada no OmniSync.</p>

        <div style={s.fieldGroup}>
          <label style={s.label}>Nome da Empresa</label>
          <input
            style={s.input}
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Nome da empresa"
          />
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>CNPJ</label>
          <input
            style={s.input}
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00"
          />
        </div>

        <div style={s.fieldGroup}>
          <label style={s.label}>Criado em</label>
          <div style={s.readOnlyField}>15 de Março de 2026</div>
        </div>

        <div style={s.cardActions}>
          <button type="button" style={s.btnPrimary} onClick={() => console.log('Store saved:', { storeName, cnpj })}>
            <FiSave size={16} />
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Security Section ─── */

function SecuritySection() {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div style={s.sectionColumn}>
      <div style={s.card}>
        <h3 style={s.cardTitle}>Alterar Senha</h3>
        <p style={s.cardDesc}>Mantenha sua conta segura com uma senha forte.</p>

        <SecurityPasswordField
          label="Senha Atual"
          value={currentPw}
          onChange={setCurrentPw}
          visible={showCurrent}
          onToggle={() => setShowCurrent((v) => !v)}
          placeholder="Digite sua senha atual"
        />
        <SecurityPasswordField
          label="Nova Senha"
          value={newPw}
          onChange={setNewPw}
          visible={showNew}
          onToggle={() => setShowNew((v) => !v)}
          placeholder="Mínimo 6 caracteres"
        />
        <SecurityPasswordField
          label="Confirmar Nova Senha"
          value={confirmPw}
          onChange={setConfirmPw}
          visible={showConfirm}
          onToggle={() => setShowConfirm((v) => !v)}
          placeholder="Repita a nova senha"
        />

        <div style={s.cardActions}>
          <button type="button" style={s.btnDisabled} disabled>
            <FiLock size={16} />
            Alterar Senha — Em breve
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Appearance Section ─── */

type ThemeOption = 'light' | 'dark' | 'system'
type LangOption = 'pt' | 'en'

function AppearanceSection() {
  const [theme, setTheme] = useState<ThemeOption>('light')
  const [lang, setLang] = useState<LangOption>('pt')

  const themeOptions: { id: ThemeOption; label: string; icon: React.ReactNode; available: boolean }[] = [
    { id: 'light', label: 'Claro', icon: <FiSun size={22} />, available: true },
    { id: 'dark', label: 'Escuro', icon: <FiMoon size={22} />, available: false },
    { id: 'system', label: 'Sistema', icon: <FiMonitor size={22} />, available: false },
  ]

  const langOptions: { id: LangOption; label: string; flag: string }[] = [
    { id: 'pt', label: 'Português', flag: '🇧🇷' },
    { id: 'en', label: 'English', flag: '🇺🇸' },
  ]

  return (
    <div style={s.sectionColumn}>
      <div style={s.card}>
        <h3 style={s.cardTitle}>Tema</h3>
        <p style={s.cardDesc}>Personalize a aparência da plataforma.</p>

        <div style={s.themeGrid}>
          {themeOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => opt.available && setTheme(opt.id)}
              style={{
                ...s.themeCard,
                borderColor: theme === opt.id ? '#6d28d9' : '#e5e7eb',
                backgroundColor: theme === opt.id ? '#f5f3ff' : '#ffffff',
                opacity: opt.available ? 1 : 0.5,
                cursor: opt.available ? 'pointer' : 'not-allowed',
              }}
            >
              <div style={{ color: theme === opt.id ? '#6d28d9' : '#6b7280' }}>{opt.icon}</div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: theme === opt.id ? '#6d28d9' : '#374151' }}>
                {opt.label}
              </span>
              {!opt.available && <span style={s.comingSoon}>Em breve</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={s.card}>
        <h3 style={s.cardTitle}>Idioma</h3>
        <p style={s.cardDesc}>Selecione o idioma da interface.</p>

        <div style={s.langGrid}>
          {langOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setLang(opt.id)}
              style={{
                ...s.langCard,
                borderColor: lang === opt.id ? '#6d28d9' : '#e5e7eb',
                backgroundColor: lang === opt.id ? '#f5f3ff' : '#ffffff',
              }}
            >
              <span style={{ fontSize: '24px' }}>{opt.flag}</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: lang === opt.id ? '#6d28d9' : '#374151' }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Main Settings Screen ─── */

const SECTION_MAP: Record<SettingsTab, () => React.JSX.Element> = {
  profile: ProfileSection,
  store: StoreSection,
  security: SecuritySection,
  appearance: AppearanceSection,
}

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const { user } = useAuth()
  const ActiveSection = SECTION_MAP[activeTab]

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Configurações</h1>
        <p style={s.pageSubtitle}>Gerencie sua conta, loja e preferências da plataforma.</p>
      </div>

      <div style={s.content}>
        <nav style={s.sidebar}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...s.tabBtn,
                ...(activeTab === tab.id ? s.tabBtnActive : {}),
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}

          <div style={s.sidebarDivider} />

          <a
            href="https://drive.google.com/uc?export=download&id=1A4ZR9at7hDXYKwW1wDP-Q1ikGATQ0ZpV"
            target="_blank"
            rel="noopener noreferrer"
            style={s.presentationLink}
          >
            <FiFileText size={15} />
            <span>Apresentação do Projeto</span>
          </a>
        </nav>

        <div style={s.panel}>
          {activeTab === 'profile' ? (
            <ProfileSection key={user?.id ?? 'profile'} />
          ) : (
            <ActiveSection />
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Styles ─── */

const s = {
  page: {
    width: '100%',
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '0 0 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  pageHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  content: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '200px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '8px',
    position: 'sticky',
    top: '24px',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    borderRadius: '10px',
    backgroundColor: 'transparent',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  tabBtnActive: {
    backgroundColor: '#ede9fe',
    color: '#6d28d9',
    fontWeight: 600,
  },
  sidebarDivider: {
    height: '1px',
    backgroundColor: '#f3f4f6',
    margin: '4px 0',
  },
  presentationLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    padding: '9px 14px',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
  },
  panel: {
    flex: 1,
    minWidth: 0,
  },

  /* Section layout */
  sectionColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },

  /* Card */
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  cardDesc: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.5,
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: '4px',
  },

  /* Profile */
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '8px 0',
  },
  avatarLarge: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#6d28d9',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 700,
    flexShrink: 0,
  },
  avatarName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  avatarEmail: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '2px',
  },
  divLogout:{
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: '10px',
  },
  logout:{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 16px',
    borderRadius: '10px',
    border: '1px solid #991b1b',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },

  /* Fields */
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    padding: '10px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'inherit',
    color: '#111827',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  readOnlyField: {
    padding: '10px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
  },

  /* Password */
  passwordWrap: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  inputPassword: {
    width: '100%',
    padding: '10px 42px 10px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'inherit',
    color: '#111827',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  eyeBtn: {
    position: 'absolute' as const,
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
  },

  /* Sessions */
  sessionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  sessionIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    flexShrink: 0,
  },
  sessionDevice: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  sessionMeta: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '2px',
  },
  sessionBadge: {
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    backgroundColor: '#dcfce7',
    color: '#16a34a',
  },

  /* Buttons */
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnDisabled: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#e5e7eb',
    color: '#9ca3af',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'not-allowed',
  },
  btnSecondarySmall: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '12px',
    fontWeight: 600,
    color: '#374151',
    cursor: 'pointer',
  },

  /* Notifications */
  notifList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0px',
  },
  notifRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  notifIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    flexShrink: 0,
  },
  notifLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  notifDesc: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '2px',
    lineHeight: 1.4,
  },

  /* Toggle */
  toggle: {
    width: '44px',
    height: '24px',
    borderRadius: '999px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative' as const,
    flexShrink: 0,
    padding: 0,
    transition: 'background-color 0.2s',
  },
  toggleKnob: {
    position: 'absolute' as const,
    top: '2px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
    transition: 'transform 0.2s',
  },

  /* Appearance – theme */
  themeGrid: {
    display: 'flex',
    gap: '12px',
  },
  themeCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    padding: '20px 16px',
    borderRadius: '12px',
    border: '2px solid',
    fontFamily: 'inherit',
    position: 'relative' as const,
  },
  comingSoon: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },

  /* Appearance – language */
  langGrid: {
    display: 'flex',
    gap: '12px',
  },
  langCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '16px',
    borderRadius: '12px',
    border: '2px solid',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },

  /* Density */
  densityRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
} as const

type SecurityPasswordFieldProps = {
  label: string
  value: string
  onChange: (v: string) => void
  visible: boolean
  onToggle: () => void
  placeholder: string
}

function SecurityPasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  placeholder,
}: SecurityPasswordFieldProps) {
  return (
    <div style={s.fieldGroup}>
      <label style={s.label}>{label}</label>
      <div style={s.passwordWrap}>
        <input
          style={s.inputPassword}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button type="button" style={s.eyeBtn} onClick={onToggle}>
          {visible ? <FiEyeOff size={16} /> : <FiEye size={16} />}
        </button>
      </div>
    </div>
  )
}
