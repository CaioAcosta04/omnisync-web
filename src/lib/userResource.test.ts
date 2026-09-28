import { describe, expect, it } from 'vitest'
import {
  hasProductReadPermission,
  parseUserPermissions,
  parseUserRole,
  type UserRole,
} from './userResource'

describe('permissões individuais do usuário', () => {
  it.each<UserRole>(['admin', 'manager', 'editor', 'viewer'])('preserva permissões revogadas de %s', (role) => {
    expect(parseUserPermissions({ role, permissions: [] }, role)).toEqual([])
  })

  it('preserva a seleção explícita sem completar com permissões do papel', () => {
    expect(parseUserPermissions({ role: 'editor', permissions: ['Vendas'] }, 'editor')).toEqual(['Vendas'])
  })

  it('usa os padrões somente quando a configuração está ausente', () => {
    expect(parseUserPermissions({}, 'viewer')).toEqual(['Somente leitura'])
    expect(parseUserRole({ role: 'SELLER' })).toBe('editor')
  })

  it('identifica PRODUCT_READ e não confunde permissões de venda com leitura de estoque', () => {
    expect(hasProductReadPermission({ permissions: ['PERM_PRODUCT_READ'] })).toBe(true)
    expect(hasProductReadPermission({ resource: { permissions: ['Vendas'] } })).toBe(false)
    expect(hasProductReadPermission({ role: 'viewer' })).toBe(true)
  })
})
