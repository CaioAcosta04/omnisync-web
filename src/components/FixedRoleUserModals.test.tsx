import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CreateUserModal } from './CreateUserModal'
import { ManageUserModal } from './ManageUserModal'
import type { RoleDefinitionDto } from '../types/user'

const roles: RoleDefinitionDto[] = [
  { code: 'ADMIN', label: 'Administrador', description: 'Acesso total', permissions: ['USER_MANAGE'], limitations: ['Sem limitações'] },
  { code: 'MANAGER', label: 'Gerente', description: 'Gerencia operações', permissions: ['PRODUCT_WRITE'], limitations: ['Não gerencia usuários'] },
  { code: 'SELLER', label: 'Vendedor', description: 'Opera vendas', permissions: ['SALE_WRITE'], limitations: ['Não altera produtos'] },
  { code: 'VIEWER', label: 'Visualizador', description: 'Consulta dados', permissions: ['PRODUCT_READ'], limitations: ['Somente leitura'] },
]

describe('modais de usuário com perfis fixos', () => {
  it('cria usuário enviando somente o perfil selecionado', async () => {
    const onSubmit = vi.fn()
    render(<CreateUserModal open onClose={vi.fn()} onSubmit={onSubmit} roleDefinitions={roles} />)

    expect(screen.queryByText(/^Permissões$/)).not.toBeInTheDocument()
    expect(screen.getByText(/atribuídas automaticamente/i)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/Nome completo/), 'Maria Silva')
    await userEvent.type(screen.getByLabelText(/E-mail/), 'maria@example.com')
    await userEvent.type(screen.getByLabelText(/Senha/), '123456')
    await userEvent.click(screen.getByRole('button', { name: /Vendedor \(SELLER\)/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Criar usuário' }))

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Maria Silva', email: 'maria@example.com', password: '123456', role: 'seller',
    })
  })

  it('edita somente perfil e status, sem permitir alterar permissões', async () => {
    const onSave = vi.fn()
    const user = {
      id: '42', name: 'João', email: 'joao@example.com', role: 'viewer' as const,
      status: 'active' as const, permissions: ['PRODUCT_READ'], avatar: 'JS',
    }
    render(<ManageUserModal user={user} onClose={vi.fn()} onSave={onSave} roleDefinitions={roles} />)

    expect(screen.queryByText(/^Permissões$/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Gerente \(MANAGER\)/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Inativo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(onSave).toHaveBeenCalledWith({ ...user, role: 'manager', status: 'inactive' })
  })
})
