export type UserRole = 'admin' | 'manager' | 'editor' | 'viewer'

/** Explicit permissions win, including an empty list. Never grant access from the role name. */
export function hasUserManagePermission(user: { permissions?: string[]; resource?: Record<string, unknown> | null } | null | undefined): boolean {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : user?.resource?.permissions
  return Array.isArray(permissions) && permissions.some(permission => typeof permission === 'string' &&
    ['USER_MANAGE', 'PERM_USER_MANAGE', 'GESTÃO DE USUÁRIOS', 'USER MANAGEMENT', 'ACESSO TOTAL', 'FULL ACCESS'].includes(permission.trim().toUpperCase()))
}

const VALID_ROLES: UserRole[] = ['admin', 'manager', 'editor', 'viewer']

const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, string[]> = {
  admin: ['Acesso total', 'Faturamento', 'Gestão de usuários'],
  manager: ['Gestão de estoque', 'Anúncios', 'Vendas'],
  editor: ['Anúncios', 'Gestão de estoque'],
  viewer: ['Somente leitura'],
}

const PERMISSION_LABELS: Record<string, string> = {
  'Full Access': 'Acesso total',
  'Billing': 'Faturamento',
  'User Management': 'Gestão de usuários',
  'Stock Management': 'Gestão de estoque',
  'Listings': 'Anúncios',
  'Orders': 'Vendas',
  'Marketplaces': 'Marketplaces',
  'Activity': 'Atividade',
  'View Only': 'Somente leitura',
  'Acesso total': 'Acesso total',
  'Faturamento': 'Faturamento',
  'Gestão de usuários': 'Gestão de usuários',
  'Gestão de estoque': 'Gestão de estoque',
  'Anúncios': 'Anúncios',
  'Vendas': 'Vendas',
  'Somente leitura': 'Somente leitura',
  'AUDIT_READ': 'Auditoria',
  'Auditoria': 'Auditoria',
}

export function formatPermissionLabel(permission: string): string {
  return PERMISSION_LABELS[permission] ?? permission
}

export function hasAuditReadPermission(
  user: { role?: string; permissions?: string[]; resource?: Record<string, unknown> | null } | null | undefined
): boolean {
  if (!user) return false
  const role = (user.role ?? (user.resource?.role as string) ?? '').toLowerCase()
  if (role === 'admin') return true

  const perms = Array.isArray(user.permissions)
    ? user.permissions
    : Array.isArray(user.resource?.permissions)
    ? (user.resource?.permissions as string[])
    : []

  return perms.some(
    (p) =>
      typeof p === 'string' &&
      (p.toUpperCase() === 'AUDIT_READ' || p.toUpperCase() === 'PERM_AUDIT_READ' || p === 'Auditoria')
  )
}

export function hasProductReadPermission(
  user:
    | {
        role?: string
        permissions?: string[]
        resource?: Record<string, unknown> | null
      }
    | null
    | undefined,
): boolean {
  if (!user) return false
  const resource = user.resource ?? null
  const role = (user.role ?? (resource?.role as string) ?? '').toLowerCase()
  const explicitPermissions = Array.isArray(user.permissions)
    ? user.permissions
    : Array.isArray(resource?.permissions)
      ? (resource.permissions as string[])
      : null

  if (explicitPermissions == null) return ['admin', 'manager', 'seller', 'editor', 'viewer'].includes(role)

  return explicitPermissions.some((permission) => {
    const normalized = permission.trim().toUpperCase()
    return (
      normalized === 'PRODUCT_READ' ||
      normalized === 'PERM_PRODUCT_READ' ||
      ['GESTÃO DE ESTOQUE', 'STOCK MANAGEMENT', 'ANÚNCIOS', 'LISTINGS', 'ATIVIDADE', 'ACTIVITY', 'SOMENTE LEITURA', 'VIEW ONLY', 'ACESSO TOTAL', 'FULL ACCESS'].includes(normalized)
    )
  })
}

export function parseUserRole(resource: Record<string, unknown> | null | undefined): UserRole {
  const raw = resource?.role
  if (typeof raw === 'string') {
    const normalized = raw.toLowerCase()
    if (normalized === 'seller') return 'editor'
    if (VALID_ROLES.includes(normalized as UserRole)) {
      return normalized as UserRole
    }
  }
  return 'viewer'
}

export function parseUserPermissions(
  resource: Record<string, unknown> | null | undefined,
  role: UserRole
): string[] {
  const raw = resource?.permissions
  if (Array.isArray(raw) && raw.every((p) => typeof p === 'string')) {
    return raw as string[]
  }
  return [...DEFAULT_PERMISSIONS_BY_ROLE[role]]
}

export function buildUserResource(
  existing: Record<string, unknown> | null | undefined,
  role: UserRole,
  permissions: string[]
): Record<string, unknown> {
  return {
    ...(existing ?? {}),
    role,
    permissions,
  }
}

export function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
