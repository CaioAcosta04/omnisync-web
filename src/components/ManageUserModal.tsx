import { useState } from 'react'
import { FiCheck, FiShield, FiUser, FiX } from 'react-icons/fi'

type UserRole = 'admin' | 'manager' | 'editor' | 'viewer'
type UserStatus = 'active' | 'inactive'

export type ManagedUser = {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  permissions: string[]
  avatar: string
}

type ManageUserModalProps = {
  user: ManagedUser | null
  onClose: () => void
  onSave: (user: ManagedUser) => void
  submitting?: boolean
  error?: string | null
}

const ROLES: { id: UserRole; label: string; description: string }[] = [
  { id: 'admin', label: 'Administrador', description: 'Acesso total à plataforma, incluindo faturamento e usuários' },
  { id: 'manager', label: 'Gerente', description: 'Gerencia estoque, anúncios, vendas e marketplaces' },
  { id: 'editor', label: 'Editor', description: 'Cria e edita anúncios e entradas de estoque' },
  { id: 'viewer', label: 'Visualizador', description: 'Acesso somente leitura a todos os dados' },
]

const ROLE_COLORS: Record<UserRole, { bg: string; color: string; border: string }> = {
  admin: { bg: '#ede9fe', color: '#6d28d9', border: '#c4b5fd' },
  manager: { bg: '#dbeafe', color: '#2563eb', border: '#93c5fd' },
  editor: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  viewer: { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
}

const ALL_PERMISSIONS = [
  'Acesso total',
  'Gestão de usuários',
  'Faturamento',
  'Gestão de estoque',
  'Anúncios',
  'Vendas',
  'Marketplaces',
  'Atividade',
  'Somente leitura',
]

const AVATAR_COLORS: Record<string, string> = {
  AR: '#6d28d9',
  MC: '#2563eb',
  LF: '#0891b2',
  CD: '#059669',
  PA: '#d97706',
  RO: '#dc2626',
}

export function ManageUserModal({
  user,
  onClose,
  onSave,
  submitting = false,
  error = null,
}: ManageUserModalProps) {
  if (!user) return null
  return (
    <ManageUserModalForm
      key={user.id}
      user={user}
      onClose={onClose}
      onSave={onSave}
      submitting={submitting}
      error={error}
    />
  )
}

function ManageUserModalForm({
  user,
  onClose,
  onSave,
  submitting,
  error,
}: {
  user: ManagedUser
  onClose: () => void
  onSave: (user: ManagedUser) => void
  submitting: boolean
  error: string | null
}) {
  const [role, setRole] = useState<UserRole>(user.role)
  const [status, setStatus] = useState<UserStatus>(user.status)
  const [permissions, setPermissions] = useState<string[]>([...user.permissions])

  const togglePermission = (perm: string) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  const handleSave = () => {
    onSave({ ...user, role, status, permissions })
  }

  const avatarColor = AVATAR_COLORS[user.avatar] ?? '#6b7280'

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Gerenciar usuário</h2>
            <p style={styles.subtitle}>Atualize função, status e permissões</p>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Fechar">
            <FiX size={20} />
          </button>
        </div>

        {/* User info */}
        <div style={styles.userCard}>
          <div style={{ ...styles.avatar, backgroundColor: avatarColor }}>{user.avatar}</div>
          <div>
            <span style={styles.userName}>{user.name}</span>
            <span style={styles.userEmail}>{user.email}</span>
          </div>
        </div>

        {/* Role selection */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <FiShield size={16} color="#6b7280" />
            <span style={styles.sectionTitle}>Função</span>
          </div>
          <div style={styles.rolesGrid}>
            {ROLES.map((r) => {
              const isSelected = role === r.id
              const colors = ROLE_COLORS[r.id]
              return (
                <button
                  key={r.id}
                  type="button"
                  style={{
                    ...styles.roleCard,
                    borderColor: isSelected ? colors.border : '#e5e7eb',
                    backgroundColor: isSelected ? colors.bg : '#ffffff',
                  }}
                  onClick={() => setRole(r.id)}
                >
                  <div style={styles.roleCardTop}>
                    <span
                      style={{
                        ...styles.roleBadge,
                        backgroundColor: colors.bg,
                        color: colors.color,
                      }}
                    >
                      {r.label}
                    </span>
                    {isSelected && (
                      <span style={{ ...styles.checkCircle, backgroundColor: colors.color }}>
                        <FiCheck size={12} color="#fff" />
                      </span>
                    )}
                  </div>
                  <span style={styles.roleDesc}>{r.description}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Status */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <FiUser size={16} color="#6b7280" />
            <span style={styles.sectionTitle}>Status</span>
          </div>
          <div style={styles.statusRow}>
            <button
              type="button"
              style={{
                ...styles.statusBtn,
                ...(status === 'active' ? styles.statusBtnActiveSelected : {}),
              }}
              onClick={() => setStatus('active')}
            >
              <span style={{ ...styles.statusDot, backgroundColor: '#22c55e' }} />
              Ativo
            </button>
            <button
              type="button"
              style={{
                ...styles.statusBtn,
                ...(status === 'inactive' ? styles.statusBtnInactiveSelected : {}),
              }}
              onClick={() => setStatus('inactive')}
            >
              <span style={{ ...styles.statusDot, backgroundColor: '#9ca3af' }} />
              Inativo
            </button>
          </div>
        </div>

        {/* Permissions */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <FiShield size={16} color="#6b7280" />
            <span style={styles.sectionTitle}>Permissões</span>
          </div>
          <div style={styles.permGrid}>
            {ALL_PERMISSIONS.map((perm) => {
              const checked = permissions.includes(perm)
              return (
                <label key={perm} style={styles.permItem} onClick={() => togglePermission(perm)}>
                  <div
                    style={{
                      ...styles.checkbox,
                      ...(checked ? styles.checkboxChecked : {}),
                    }}
                  >
                    {checked && <FiCheck size={12} color="#fff" />}
                  </div>
                  <span style={styles.permLabel}>{perm}</span>
                </label>
              )
            })}
          </div>
        </div>

        {error && (
          <div style={styles.errorBanner} role="alert">
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button
            type="button"
            style={{ ...styles.saveBtn, ...(submitting ? styles.saveBtnDisabled : {}) }}
            onClick={handleSave}
            disabled={submitting}
          >
            {submitting ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  modal: {
    width: '100%',
    maxWidth: '540px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    padding: '28px 32px 32px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '4px',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
  },
  closeBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },

  /* User card */
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px 18px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #f3f4f6',
    marginBottom: '24px',
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 700,
    color: '#ffffff',
    flexShrink: 0,
  },
  userName: {
    display: 'block',
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
  },
  userEmail: {
    display: 'block',
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '2px',
  },

  /* Section */
  section: {
    marginBottom: '24px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },

  /* Roles grid */
  rolesGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  roleCard: {
    padding: '14px',
    borderRadius: '10px',
    border: '2px solid #e5e7eb',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontFamily: 'inherit',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    transition: 'border-color 0.15s, background-color 0.15s',
  },
  roleCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
  },
  checkCircle: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleDesc: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.4,
  },

  /* Status */
  statusRow: {
    display: 'flex',
    gap: '10px',
  },
  statusBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    borderRadius: '10px',
    border: '2px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background-color 0.15s',
  },
  statusBtnActiveSelected: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  statusBtnInactiveSelected: {
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },

  /* Permissions */
  permGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  permItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: '#f9fafb',
    cursor: 'pointer',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    borderRadius: '6px',
    border: '2px solid #d1d5db',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background-color 0.15s, border-color 0.15s',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  permLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },

  /* Actions */
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '4px',
    paddingTop: '20px',
    borderTop: '1px solid #f3f4f6',
  },
  cancelBtn: {
    padding: '10px 22px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 24px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#2563eb',
    cursor: 'pointer',
  },
  saveBtnDisabled: {
    opacity: 0.6,
    cursor: 'default' as const,
  },
  errorBanner: {
    marginBottom: '16px',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    fontSize: '13px',
  },
} as const
