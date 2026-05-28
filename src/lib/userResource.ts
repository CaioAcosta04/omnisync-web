export type UserRole = 'admin' | 'manager' | 'editor' | 'viewer'

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
}

export function formatPermissionLabel(permission: string): string {
  return PERMISSION_LABELS[permission] ?? permission
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
