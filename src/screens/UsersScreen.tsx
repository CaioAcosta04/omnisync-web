import { useMemo, useState } from 'react'
import {
  FiBell,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiMoreVertical,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUser,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi'
import { CreateUserModal, type NewUserData } from '../components/CreateUserModal'
import { ManageUserModal, type ManagedUser } from '../components/ManageUserModal'

type UserRole = 'admin' | 'manager' | 'editor' | 'viewer'
type UserStatus = 'active' | 'inactive'

type PlatformUser = {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  lastActive: string
  permissions: string[]
  avatar: string
}

const ROLE_CONFIG: Record<UserRole, { label: string; bg: string; color: string }> = {
  admin: { label: 'Admin', bg: '#ede9fe', color: '#6d28d9' },
  manager: { label: 'Manager', bg: '#dbeafe', color: '#2563eb' },
  editor: { label: 'Editor', bg: '#fef3c7', color: '#92400e' },
  viewer: { label: 'Viewer', bg: '#f3f4f6', color: '#374151' },
}

const STATUS_CONFIG: Record<UserStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: '#22c55e' },
  inactive: { label: 'Inactive', color: '#9ca3af' },
}

const MOCK_USERS: PlatformUser[] = [
  {
    id: '1',
    name: 'Alex Rivera',
    email: 'alex.rivera@omnisync.com',
    role: 'admin',
    status: 'active',
    lastActive: '2 mins ago',
    permissions: ['Full Access', 'Billing', 'User Management'],
    avatar: 'AR',
  },
  {
    id: '2',
    name: 'Mariana Costa',
    email: 'mariana.costa@omnisync.com',
    role: 'manager',
    status: 'active',
    lastActive: '15 mins ago',
    permissions: ['Stock Management', 'Listings', 'Orders'],
    avatar: 'MC',
  },
  {
    id: '3',
    name: 'Lucas Ferreira',
    email: 'lucas.ferreira@omnisync.com',
    role: 'editor',
    status: 'active',
    lastActive: '1 hour ago',
    permissions: ['Listings', 'Stock Management'],
    avatar: 'LF',
  },
  {
    id: '4',
    name: 'Camila Duarte',
    email: 'camila.duarte@omnisync.com',
    role: 'viewer',
    status: 'inactive',
    lastActive: '3 days ago',
    permissions: ['View Only'],
    avatar: 'CD',
  },
  {
    id: '5',
    name: 'Pedro Almeida',
    email: 'pedro.almeida@omnisync.com',
    role: 'manager',
    status: 'active',
    lastActive: '30 mins ago',
    permissions: ['Stock Management', 'Marketplaces', 'Activity'],
    avatar: 'PA',
  },
  {
    id: '6',
    name: 'Rafael Oliveira',
    email: 'rafael.oliveira@omnisync.com',
    role: 'admin',
    status: 'active',
    lastActive: '5 mins ago',
    permissions: ['Full Access', 'Billing', 'User Management'],
    avatar: 'RO',
  },
]

const AVATAR_COLORS = ['#6d28d9', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#4f46e5']

const ITEMS_PER_PAGE = 5

export function UsersScreen() {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [managingUser, setManagingUser] = useState<PlatformUser | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleSaveUser = (updated: ManagedUser) => {
    console.log('User updated:', updated)
    setManagingUser(null)
  }

  const handleCreateUser = (data: NewUserData) => {
    console.log('New user:', data)
    setShowCreateModal(false)
  }

  const filteredUsers = useMemo(() => {
    let users = MOCK_USERS

    if (roleFilter !== 'all') {
      users = users.filter((u) => u.role === roleFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
      )
    }

    return users
  }, [searchQuery, roleFilter])

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredUsers, currentPage])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  const handleRoleFilter = (role: 'all' | UserRole) => {
    setRoleFilter(role)
    setCurrentPage(1)
  }

  const stats = useMemo(() => {
    const total = MOCK_USERS.length
    const active = MOCK_USERS.filter((u) => u.status === 'active').length
    const admins = MOCK_USERS.filter((u) => u.role === 'admin').length
    const inactive = MOCK_USERS.filter((u) => u.status === 'inactive').length
    return { total, active, admins, inactive }
  }, [])

  const renderPagination = () => {
    const buttons: React.ReactNode[] = []

    buttons.push(
      <button
        key="prev"
        type="button"
        style={{ ...styles.pageBtn, ...(currentPage === 1 ? styles.pageBtnDisabled : {}) }}
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <FiChevronLeft size={16} />
      </button>
    )

    for (let i = 1; i <= totalPages; i++) {
      buttons.push(
        <button
          key={i}
          type="button"
          style={{ ...styles.pageBtn, ...(i === currentPage ? styles.pageBtnActive : {}) }}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </button>
      )
    }

    buttons.push(
      <button
        key="next"
        type="button"
        style={{ ...styles.pageBtn, ...(currentPage === totalPages ? styles.pageBtnDisabled : {}) }}
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <FiChevronRight size={16} />
      </button>
    )

    return buttons
  }

  return (
    <div style={styles.page} onClick={() => setOpenMenuId(null)}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.searchWrap}>
          <FiSearch size={18} color="#9ca3af" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={handleSearch}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.topBarRight}>
          <button type="button" style={styles.bellBtn} aria-label="Notifications">
            <FiBell size={20} color="#6b7280" />
          </button>
          <button type="button" style={styles.createUserBtn} onClick={() => setShowCreateModal(true)}>
            <FiUserPlus size={16} />
            Create User
          </button>
        </div>
      </div>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>User Management</h1>
          <p style={styles.subtitle}>
            Manage team members, roles, and access permissions for your platform.
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryIcon, backgroundColor: '#ede9fe', color: '#7c3aed' }}>
            <FiUsers size={20} />
          </div>
          <div>
            <span style={styles.summaryLabel}>Total Users</span>
            <span style={styles.summaryValue}>{stats.total}</span>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryIcon, backgroundColor: '#dcfce7', color: '#16a34a' }}>
            <FiUser size={20} />
          </div>
          <div>
            <span style={styles.summaryLabel}>Active Now</span>
            <span style={styles.summaryValue}>{stats.active}</span>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryIcon, backgroundColor: '#dbeafe', color: '#2563eb' }}>
            <FiShield size={20} />
          </div>
          <div>
            <span style={styles.summaryLabel}>Admins</span>
            <span style={styles.summaryValue}>{stats.admins}</span>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryIcon, backgroundColor: '#f3f4f6', color: '#6b7280' }}>
            <FiUser size={20} />
          </div>
          <div>
            <span style={styles.summaryLabel}>Inactive</span>
            <span style={styles.summaryValue}>{stats.inactive}</span>
          </div>
        </div>
      </div>

      {/* Role filter tabs */}
      <div style={styles.filters}>
        {(['all', 'admin', 'manager', 'editor', 'viewer'] as const).map((role) => (
          <button
            key={role}
            type="button"
            style={{
              ...styles.filterBtn,
              ...(roleFilter === role ? styles.filterBtnActive : {}),
            }}
            onClick={() => handleRoleFilter(role)}
          >
            {role === 'all' ? 'All Roles' : ROLE_CONFIG[role].label}
          </button>
        ))}
      </div>

      {/* Users table */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, ...styles.thFirst }}>USER</th>
              <th style={styles.th}>ROLE</th>
              <th style={styles.th}>PERMISSIONS</th>
              <th style={styles.th}>STATUS</th>
              <th style={styles.th}>LAST ACTIVE</th>
              <th style={{ ...styles.th, ...styles.thLast }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((user, idx) => {
              const roleCfg = ROLE_CONFIG[user.role]
              const statusCfg = STATUS_CONFIG[user.status]
              const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length]

              return (
                <tr key={user.id} style={styles.tr}>
                  <td style={{ ...styles.td, ...styles.tdFirst }}>
                    <div style={styles.userCell}>
                      <div style={{ ...styles.avatar, backgroundColor: avatarColor }}>
                        {user.avatar}
                      </div>
                      <div>
                        <span style={styles.userName}>{user.name}</span>
                        <span style={styles.userEmail}>{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.roleBadge,
                        backgroundColor: roleCfg.bg,
                        color: roleCfg.color,
                      }}
                    >
                      {roleCfg.label}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.permissionsWrap}>
                      {user.permissions.map((p) => (
                        <span key={p} style={styles.permissionTag}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.statusCell}>
                      <span style={{ ...styles.statusDot, backgroundColor: statusCfg.color }} />
                      <span style={styles.statusLabel}>{statusCfg.label}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.lastActiveText}>{user.lastActive}</span>
                  </td>
                  <td style={{ ...styles.td, ...styles.tdLast }}>
                    <div style={styles.actionsCell}>
                      <button
                        type="button"
                        style={styles.manageBtn}
                        onClick={() => setManagingUser(user)}
                      >
                        <FiEdit2 size={14} />
                        Manage
                      </button>
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          style={styles.moreBtn}
                          aria-label="More actions"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === user.id ? null : user.id)
                          }}
                        >
                          <FiMoreVertical size={16} />
                        </button>
                        {openMenuId === user.id && (
                          <div style={styles.dropdown}>
                            <button type="button" style={styles.dropdownItem}>
                              <FiShield size={14} />
                              Change Role
                            </button>
                            <button
                              type="button"
                              style={{ ...styles.dropdownItem, color: '#dc2626' }}
                            >
                              <FiTrash2 size={14} />
                              Remove User
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={styles.pagination}>
        <span style={styles.paginationInfo}>
          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
          {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of{' '}
          {filteredUsers.length} users
        </span>
        <div style={styles.paginationBtns}>{renderPagination()}</div>
      </div>

      <ManageUserModal
        user={managingUser}
        onClose={() => setManagingUser(null)}
        onSave={handleSaveUser}
      />

      <CreateUserModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateUser}
      />
    </div>
  )
}

const styles = {
  page: {
    width: '100%',
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '24px 28px 40px',
    fontSize: '16px',
    fontWeight: 400,
    color: '#111827',
    alignSelf: 'flex-start',
  },

  /* Top bar */
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '28px',
    flexWrap: 'wrap' as const,
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: '1 1 320px',
    maxWidth: '480px',
    padding: '10px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    color: '#111827',
    backgroundColor: 'transparent',
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  bellBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  createUserBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#2563eb',
    cursor: 'pointer',
  },

  /* Header */
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '6px',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '14px',
    lineHeight: 1.5,
    color: '#6b7280',
  },

  /* Summary cards */
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '28px',
  },
  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '18px 20px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
  },
  summaryIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  summaryLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b7280',
    marginBottom: '2px',
  },
  summaryValue: {
    display: 'block',
    fontSize: '22px',
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1.1,
  },

  /* Filters */
  filters: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    width: 'fit-content',
  },
  filterBtn: {
    padding: '9px 18px',
    border: 'none',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
    cursor: 'pointer',
    borderRight: '1px solid #e5e7eb',
  },
  filterBtnActive: {
    backgroundColor: '#f3f4f6',
    color: '#111827',
    fontWeight: 600,
  },

  /* Table */
  tableWrap: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    overflow: 'visible',
    marginBottom: '16px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: '14px 16px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: '#6b7280',
    textAlign: 'left' as const,
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#fafafa',
    whiteSpace: 'nowrap' as const,
  },
  thFirst: { paddingLeft: '24px' },
  thLast: { paddingRight: '24px' },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    verticalAlign: 'middle' as const,
  },
  tdFirst: { paddingLeft: '24px' },
  tdLast: { paddingRight: '24px' },

  /* User cell */
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    color: '#ffffff',
    flexShrink: 0,
  },
  userName: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  userEmail: {
    display: 'block',
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '1px',
  },

  /* Role badge */
  roleBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
  },

  /* Permissions */
  permissionsWrap: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px',
    maxWidth: '220px',
  },
  permissionTag: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#f3f4f6',
    whiteSpace: 'nowrap' as const,
  },

  /* Status */
  statusCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
  },

  /* Last active */
  lastActiveText: {
    fontSize: '13px',
    color: '#6b7280',
  },

  /* Actions */
  actionsCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  manageBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    cursor: 'pointer',
  },
  moreBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#6b7280',
  },

  /* Dropdown */
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: '4px',
    minWidth: '170px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
    zIndex: 50,
    padding: '4px',
    overflow: 'hidden',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 12px',
    border: 'none',
    backgroundColor: 'transparent',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    borderRadius: '6px',
    textAlign: 'left' as const,
  },

  /* Pagination */
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  paginationInfo: {
    fontSize: '13px',
    color: '#6b7280',
  },
  paginationBtns: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  pageBtn: {
    minWidth: '36px',
    height: '36px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 8px',
  },
  pageBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    color: '#ffffff',
  },
  pageBtnDisabled: {
    opacity: 0.4,
    cursor: 'default' as const,
  },
} as const
