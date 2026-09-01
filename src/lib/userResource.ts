import type { Permission, UserRole } from '../types/user'

export type { Permission, UserRole }

export const CANONICAL_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'SELLER', 'VIEWER']

export const CANONICAL_PERMISSIONS: Permission[] = [
  'PRODUCT_READ',
  'PRODUCT_WRITE',
  'LISTING_PUBLISH',
  'SALE_READ',
  'SALE_WRITE',
  'USER_MANAGE',
  'INTEGRATION_MANAGE',
  'SETTINGS_MANAGE',
]

const PERMISSION_LABELS: Record<string, string> = {
  PRODUCT_READ: 'Visualizar estoque',
  PRODUCT_WRITE: 'Gestão de estoque',
  LISTING_PUBLISH: 'Publicar anúncios',
  SALE_READ: 'Visualizar vendas',
  SALE_WRITE: 'Gerenciar vendas',
  USER_MANAGE: 'Gestão de usuários',
  INTEGRATION_MANAGE: 'Marketplaces',
  SETTINGS_MANAGE: 'Configurações',
  // Legado (compatibilidade retroativa de rótulos)
  'Acesso total': 'Acesso total',
  'Gestão de estoque': 'Gestão de estoque',
  'Anúncios': 'Publicar anúncios',
  'Vendas': 'Visualizar vendas',
  'Gestão de usuários': 'Gestão de usuários',
  'Marketplaces': 'Marketplaces',
  'Somente leitura': 'Somente leitura',
  'Faturamento': 'Faturamento',
  'Atividade': 'Atividade',
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  SELLER: 'Vendedor',
  VIEWER: 'Visualizador',
  admin: 'Administrador',
  manager: 'Gerente',
  editor: 'Vendedor',
  seller: 'Vendedor',
  viewer: 'Visualizador',
}

export function formatPermissionLabel(permission: string): string {
  return PERMISSION_LABELS[permission] ?? permission
}

export function formatRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}

export function normalizeRole(raw: unknown): UserRole {
  if (typeof raw !== 'string') return 'VIEWER'
  const normalized = raw.trim().toUpperCase()
  if (normalized === 'EDITOR') return 'SELLER'
  if (CANONICAL_ROLES.includes(normalized as UserRole)) {
    return normalized as UserRole
  }
  return 'VIEWER'
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
