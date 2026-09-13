import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UsersScreen } from './UsersScreen'
import type { AuditPageDto } from '../types/audit'

const mocks = vi.hoisted(() => ({
  listUsers: vi.fn(),
  listAuditLogs: vi.fn(),
  authUser: {
    id: 1,
    systemClientId: 7,
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'ADMIN',
    permissions: ['AUDIT_READ'],
    resource: { role: 'admin', permissions: ['AUDIT_READ'] },
    active: true,
    createdAt: '2026-09-01T00:00:00',
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.authUser,
    status: 'ready',
    skipAuth: false,
  }),
}))

vi.mock('../services/usersApi', () => ({
  listUsers: mocks.listUsers,
  registerUser: vi.fn(),
  updateUser: vi.fn(),
  updateUserStatus: vi.fn(),
}))

vi.mock('../services/auditApi', () => ({
  listAuditLogs: mocks.listAuditLogs,
}))

describe('Aba de Auditoria em UsersScreen', () => {
  const sampleAuditResponse: AuditPageDto = {
    content: [
      {
        id: 101,
        system_client_id: 7,
        user: {
          id: 1,
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
        action: 'UPDATE',
        entity_type: 'USER',
        entity_id: '2',
        description: 'Atualização de perfil do membro',
        previous_data: { role: 'viewer', active: true, password: 'secret-hash' },
        new_data: { role: 'editor', active: true, password: 'new-hash' },
        metadata: { source: 'WEB' },
        created_at: '2026-09-12T14:30:00',
      },
    ],
    offset: 0,
    limit: 15,
    total_elements: 1,
    has_next: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authUser.role = 'ADMIN'
    mocks.authUser.permissions = ['AUDIT_READ']
    mocks.listUsers.mockResolvedValue([
      {
        id: 1,
        systemClientId: 7,
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        active: true,
        createdAt: '2026-09-01T00:00:00',
        resource: { role: 'admin' },
      },
      {
        id: 2,
        systemClientId: 7,
        name: 'Carlos Editor',
        email: 'carlos@example.com',
        role: 'editor',
        active: true,
        createdAt: '2026-09-02T00:00:00',
        resource: { role: 'editor' },
      },
    ])
    mocks.listAuditLogs.mockResolvedValue(sampleAuditResponse)
  })

  it('exibe a aba de auditoria para usuário com AUDIT_READ e carrega registros da API ao selecionar a aba', async () => {
    const user = userEvent.setup()
    render(<UsersScreen />)

    const auditTabBtn = await screen.findByTestId('audit-tab-button')
    expect(auditTabBtn).toBeInTheDocument()

    await user.click(auditTabBtn)

    expect(mocks.listAuditLogs).toHaveBeenCalledWith(7, expect.objectContaining({ offset: 0 }))
    expect(await screen.findByText('Atualização de perfil do membro')).toBeInTheDocument()
    expect(screen.getByText('Atualização')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
  })

  it('abre o modal de detalhes e exibe diff sem campos sensíveis de senha', async () => {
    const user = userEvent.setup()
    render(<UsersScreen />)

    const auditTabBtn = await screen.findByTestId('audit-tab-button')
    await user.click(auditTabBtn)

    const detailBtn = await screen.findByRole('button', { name: /visualizar detalhes da alteração 101/i })
    await user.click(detailBtn)

    expect(await screen.findByText(/Evento #101/i)).toBeInTheDocument()
    // Deve mostrar o diff do campo 'role'
    expect(screen.getByText('role')).toBeInTheDocument()
    expect(screen.getByText('viewer')).toBeInTheDocument()
    expect(screen.getByText('editor')).toBeInTheDocument()

    // O campo com chave sensível "password" não pode aparecer
    expect(screen.queryByText('secret-hash')).not.toBeInTheDocument()
    expect(screen.queryByText('new-hash')).not.toBeInTheDocument()
  })

  it('oculta a aba de auditoria para usuário sem AUDIT_READ', async () => {
    mocks.authUser.role = 'VIEWER'
    mocks.authUser.permissions = ['SALE_READ']
    mocks.authUser.resource = { role: 'viewer', permissions: ['SALE_READ'] }

    render(<UsersScreen />)
    await waitFor(() => {
      expect(screen.queryByTestId('audit-tab-button')).not.toBeInTheDocument()
    })
  })
})
