import { useState } from 'react'
import {
  FiBell,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMonitor,
  FiMoon,
  FiRefreshCw,
  FiSave,
  FiShoppingCart,
  FiSun,
  FiAlertTriangle,
  FiCornerUpLeft,
  FiSettings,
  FiUser,
} from 'react-icons/fi'
import { BsBuildings } from 'react-icons/bs'

type SettingsTab = 'profile' | 'store' | 'security' | 'notifications' | 'appearance'

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Perfil', icon: <FiUser size={18} /> },
  { id: 'store', label: 'Loja', icon: <BsBuildings size={18} /> },
  { id: 'security', label: 'Segurança', icon: <FiLock size={18} /> },
  { id: 'notifications', label: 'Notificações', icon: <FiBell size={18} /> },
  { id: 'appearance', label: 'Aparência', icon: <FiMonitor size={18} /> },
]

/* ─── Toggle Switch ─── */

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        ...s.toggle,
        backgroundColor: checked ? '#6d28d9' : '#d1d5db',
      }}
    >
      <span
        style={{
          ...s.toggleKnob,
          transform: checked ? 'translateX(18px)' : 'translateX(2px)',
        }}
      />
    </button>
  )
}

/* ─── Profile Section ─── */

function ProfileSection() {
  const [name, setName] = useState('Alex Rivera')
  const [email, setEmail] = useState('alex.rivera@omnisync.com')

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

  function PasswordInput({
    label,
    value,
    onChange,
    visible,
    onToggle,
    placeholder,
  }: {
    label: string
    value: string
    onChange: (v: string) => void
    visible: boolean
    onToggle: () => void
    placeholder: string
  }) {
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

  return (
    <div style={s.sectionColumn}>
      <div style={s.card}>
        <h3 style={s.cardTitle}>Alterar Senha</h3>
        <p style={s.cardDesc}>Mantenha sua conta segura com uma senha forte.</p>

        <PasswordInput
          label="Senha Atual"
          value={currentPw}
          onChange={setCurrentPw}
          visible={showCurrent}
          onToggle={() => setShowCurrent((v) => !v)}
          placeholder="Digite sua senha atual"
        />
        <PasswordInput
          label="Nova Senha"
          value={newPw}
          onChange={setNewPw}
          visible={showNew}
          onToggle={() => setShowNew((v) => !v)}
          placeholder="Mínimo 6 caracteres"
        />
        <PasswordInput
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

      <div style={s.card}>
        <h3 style={s.cardTitle}>Sessões Ativas</h3>
        <p style={s.cardDesc}>Gerencie os dispositivos conectados à sua conta.</p>

        <div style={s.sessionRow}>
          <div style={s.sessionIcon}><FiMonitor size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={s.sessionDevice}>MacOS — Chrome</div>
            <div style={s.sessionMeta}>São Paulo, BR · Ativo agora</div>
          </div>
          <span style={s.sessionBadge}>Atual</span>
        </div>

        <div style={s.sessionRow}>
          <div style={s.sessionIcon}><FiMonitor size={20} /></div>
          <div style={{ flex: 1 }}>
            <div style={s.sessionDevice}>Windows — Firefox</div>
            <div style={s.sessionMeta}>Campinas, BR · 2 dias atrás</div>
          </div>
          <button type="button" style={s.btnSecondarySmall}>Encerrar</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Notifications Section ─── */

type NotifPref = {
  id: string
  label: string
  desc: string
  icon: React.ReactNode
  enabled: boolean
}

function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotifPref[]>([
    { id: 'orders', label: 'Novos Pedidos', desc: 'Receba alertas quando um novo pedido for realizado.', icon: <FiShoppingCart size={20} />, enabled: true },
    { id: 'low_stock', label: 'Estoque Baixo', desc: 'Alertas quando produtos atingirem o mínimo de estoque.', icon: <FiAlertTriangle size={20} />, enabled: true },
    { id: 'sync', label: 'Sincronização de Anúncios', desc: 'Notifique quando anúncios forem sincronizados com marketplaces.', icon: <FiRefreshCw size={20} />, enabled: false },
    { id: 'returns', label: 'Devoluções', desc: 'Alertas sobre solicitações de devolução de produtos.', icon: <FiCornerUpLeft size={20} />, enabled: true },
    { id: 'system', label: 'Atualizações do Sistema', desc: 'Novidades, manutenções e atualizações da plataforma.', icon: <FiSettings size={20} />, enabled: false },
  ])

  const toggle = (id: string) => {
    setPrefs((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)))
  }

  return (
    <div style={s.sectionColumn}>
      <div style={s.card}>
        <h3 style={s.cardTitle}>Preferências de Notificação</h3>
        <p style={s.cardDesc}>Escolha quais alertas você deseja receber.</p>

        <div style={s.notifList}>
          {prefs.map((pref) => (
            <div key={pref.id} style={s.notifRow}>
              <div style={s.notifIcon}>{pref.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.notifLabel}>{pref.label}</div>
                <div style={s.notifDesc}>{pref.desc}</div>
              </div>
              <ToggleSwitch checked={pref.enabled} onChange={() => toggle(pref.id)} />
            </div>
          ))}
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
  const [compact, setCompact] = useState(false)

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

      <div style={s.card}>
        <h3 style={s.cardTitle}>Densidade</h3>
        <p style={s.cardDesc}>Ajuste o espaçamento dos elementos na tela.</p>

        <div style={s.densityRow}>
          <div style={{ flex: 1 }}>
            <div style={s.notifLabel}>Modo Compacto</div>
            <div style={s.notifDesc}>Reduz o espaçamento para exibir mais informações na tela.</div>
          </div>
          <ToggleSwitch checked={compact} onChange={() => setCompact((v) => !v)} />
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
  notifications: NotificationsSection,
  appearance: AppearanceSection,
}

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
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
        </nav>

        <div style={s.panel}>
          <ActiveSection />
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
