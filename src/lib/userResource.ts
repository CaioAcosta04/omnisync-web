export type UserRole = 'admin' | 'manager' | 'editor' | 'viewer'

const VALID_ROLES: UserRole[] = ['admin', 'manager', 'editor', 'viewer']

const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, string[]> = {
  admin: ['Full Access', 'Billing', 'User Management'],
  manager: ['Stock Management', 'Listings', 'Orders'],
  editor: ['Listings', 'Stock Management'],
  viewer: ['View Only'],
}

export function parseUserRole(resource: Record<string, unknown> | null | undefined): UserRole {
  const raw = resource?.role
  if (typeof raw === 'string' && VALID_ROLES.includes(raw as UserRole)) {
    return raw as UserRole
  }
  return 'viewer'
}

export function parseUserPermissions(
  resource: Record<string, unknown> | null | undefined,
  role: UserRole
): string[] {
  const raw = resource?.permissions
  if (Array.isArray(raw) && raw.length > 0 && raw.every((p) => typeof p === 'string')) {
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
