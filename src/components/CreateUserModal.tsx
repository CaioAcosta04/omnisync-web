import { useState } from 'react'
import { FiCheck, FiLock, FiMail, FiShield, FiUser, FiX } from 'react-icons/fi'

type UserRole = 'admin' | 'manager' | 'editor' | 'viewer'

export type NewUserData = {
  name: string
  email: string
  password: string
  role: UserRole
  permissions: string[]
}

type CreateUserModalProps = {
  open: boolean
  onClose: () => void
  onSubmit: (data: NewUserData) => void
}

type FieldError = Partial<Record<'name' | 'email' | 'password', string>>

const ROLES: { id: UserRole; label: string; description: string }[] = [
  { id: 'admin', label: 'Admin', description: 'Full platform access including billing and user management' },
  { id: 'manager', label: 'Manager', description: 'Manage stock, listings, orders, and marketplaces' },
  { id: 'editor', label: 'Editor', description: 'Create and edit listings and stock entries' },
  { id: 'viewer', label: 'Viewer', description: 'View-only access to all platform data' },
]

const ROLE_COLORS: Record<UserRole, { bg: string; color: string; border: string }> = {
  admin: { bg: '#ede9fe', color: '#6d28d9', border: '#c4b5fd' },
  manager: { bg: '#dbeafe', color: '#2563eb', border: '#93c5fd' },
  editor: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  viewer: { bg: '#f3f4f6', color: '#374151', border: '#d1d5db' },
}

const ALL_PERMISSIONS = [
  'Full Access',
  'User Management',
  'Billing',
  'Stock Management',
  'Listings',
  'Orders',
  'Marketplaces',
  'Activity',
  'View Only',
]

const INITIAL_FORM: NewUserData = {
  name: '',
  email: '',
  password: '',
  role: 'viewer',
  permissions: ['View Only'],
}

function validate(form: NewUserData): FieldError {
  const errors: FieldError = {}
  if (!form.name.trim()) errors.name = 'Name is required.'
  if (!form.email.trim()) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'Enter a valid email address.'
  if (!form.password) errors.password = 'Password is required.'
  else if (form.password.length < 6) errors.password = 'Password must be at least 6 characters.'
  return errors
}

export function CreateUserModal({ open, onClose, onSubmit }: CreateUserModalProps) {
  const [form, setForm] = useState<NewUserData>({ ...INITIAL_FORM })
  const [errors, setErrors] = useState<FieldError>({})
  const [touched, setTouched] = useState<Set<string>>(new Set())

  if (!open) return null

  const set = <K extends keyof NewUserData>(key: K, value: NewUserData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (touched.has(key)) {
      const updated = { ...form, [key]: value }
      const newErrors = validate(updated)
      setErrors((prev) => ({ ...prev, [key]: newErrors[key as keyof FieldError] }))
    }
  }

  const markTouched = (key: string) => {
    setTouched((prev) => new Set(prev).add(key))
    const newErrors = validate(form)
    setErrors((prev) => ({ ...prev, [key]: newErrors[key as keyof FieldError] }))
  }

  const togglePermission = (perm: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const allErrors = validate(form)
    setErrors(allErrors)
    setTouched(new Set(['name', 'email', 'password']))
    if (Object.keys(allErrors).length > 0) return

    onSubmit(form)
    setForm({ ...INITIAL_FORM })
    setErrors({})
    setTouched(new Set())
  }

  const handleClose = () => {
    setForm({ ...INITIAL_FORM })
    setErrors({})
    setTouched(new Set())
    onClose()
  }

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Create New User</h2>
            <p style={styles.subtitle}>Add a new team member to the platform</p>
          </div>
          <button type="button" style={styles.closeBtn} onClick={handleClose} aria-label="Close">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Name */}
          <div style={styles.field}>
            <label style={styles.label} htmlFor="new-user-name">
              Full Name <span style={styles.required}>*</span>
            </label>
            <div style={{ ...styles.inputWrap, ...(errors.name ? styles.inputWrapError : {}) }}>
              <FiUser size={16} color="#9ca3af" />
              <input
                id="new-user-name"
                type="text"
                placeholder="e.g. Maria Silva"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                onBlur={() => markTouched('name')}
                style={styles.input}
              />
            </div>
            {errors.name && <span style={styles.errorMsg}>{errors.name}</span>}
          </div>

          {/* Email */}
          <div style={styles.field}>
            <label style={styles.label} htmlFor="new-user-email">
              Email <span style={styles.required}>*</span>
            </label>
            <div style={{ ...styles.inputWrap, ...(errors.email ? styles.inputWrapError : {}) }}>
              <FiMail size={16} color="#9ca3af" />
              <input
                id="new-user-email"
                type="email"
                placeholder="e.g. maria@omnisync.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                onBlur={() => markTouched('email')}
                style={styles.input}
              />
            </div>
            {errors.email && <span style={styles.errorMsg}>{errors.email}</span>}
          </div>

          {/* Password */}
          <div style={styles.field}>
            <label style={styles.label} htmlFor="new-user-password">
              Password <span style={styles.required}>*</span>
            </label>
            <div style={{ ...styles.inputWrap, ...(errors.password ? styles.inputWrapError : {}) }}>
              <FiLock size={16} color="#9ca3af" />
              <input
                id="new-user-password"
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                onBlur={() => markTouched('password')}
                style={styles.input}
              />
            </div>
            {errors.password && <span style={styles.errorMsg}>{errors.password}</span>}
          </div>

          {/* Role */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <FiShield size={16} color="#6b7280" />
              <span style={styles.sectionTitle}>Role</span>
            </div>
            <div style={styles.rolesGrid}>
              {ROLES.map((r) => {
                const isSelected = form.role === r.id
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
                    onClick={() => set('role', r.id)}
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

          {/* Permissions */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <FiShield size={16} color="#6b7280" />
              <span style={styles.sectionTitle}>Permissions</span>
            </div>
            <div style={styles.permGrid}>
              {ALL_PERMISSIONS.map((perm) => {
                const checked = form.permissions.includes(perm)
                return (
                  <label key={perm} style={styles.permItem}>
                    <div
                      style={{
                        ...styles.checkbox,
                        ...(checked ? styles.checkboxChecked : {}),
                      }}
                      onClick={() => togglePermission(perm)}
                    >
                      {checked && <FiCheck size={12} color="#fff" />}
                    </div>
                    <span style={styles.permLabel}>{perm}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" style={styles.submitBtn}>
              Create User
            </button>
          </div>
        </form>
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
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
  },
  required: {
    color: '#dc2626',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    transition: 'border-color 0.15s',
  },
  inputWrapError: {
    borderColor: '#fca5a5',
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    color: '#111827',
    backgroundColor: 'transparent',
    minWidth: 0,
  },
  errorMsg: {
    fontSize: '12px',
    color: '#dc2626',
    fontWeight: 500,
  },

  /* Section */
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },

  /* Roles */
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
    cursor: 'pointer',
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
  submitBtn: {
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
} as const
