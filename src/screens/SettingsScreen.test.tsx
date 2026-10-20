import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsScreen } from './SettingsScreen'

const mocks = vi.hoisted(() => ({
  user: {
    id: 1,
    systemClientId: 7,
    name: 'Usuário Original',
    email: 'original@example.com',
    role: 'ADMIN',
    permissions: ['SETTINGS_MANAGE'] as string[],
    resource: {},
  },
  refreshSession: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  getCompany: vi.fn(),
  updateCompany: vi.fn(),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, refreshSession: mocks.refreshSession }),
}))
vi.mock('../contexts/UserAuthNavigationContext', () => ({
  useUserAuthNavigation: () => ({ logout: mocks.logout }),
}))
vi.mock('../components/PasswordForm', () => ({
  PasswordForm: () => <div>Formulário de senha existente</div>,
}))
vi.mock('../services/usersApi', () => ({ updateOwnProfile: mocks.updateProfile }))
vi.mock('../services/systemClientApi', () => ({
  getSystemClient: mocks.getCompany,
  updateSystemClient: mocks.updateCompany,
}))

const updatedUser = {
  id: 1,
  systemClientId: 7,
  name: 'Novo Nome',
  email: 'novo@example.com',
  resource: {},
  role: 'ADMIN',
  permissions: ['SETTINGS_MANAGE'],
  active: true,
  createdAt: '2026-10-20T10:00:00',
}

const company = {
  id: 7,
  name: 'Empresa Original',
  document: '11222333000181',
  resource: {},
  active: true,
  createdAt: '2026-10-20T10:00:00',
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    mocks.user.permissions = ['SETTINGS_MANAGE']
    mocks.refreshSession.mockReset().mockResolvedValue(true)
    mocks.logout.mockReset()
    mocks.updateProfile.mockReset().mockResolvedValue(updatedUser)
    mocks.getCompany.mockReset().mockResolvedValue(company)
    mocks.updateCompany.mockReset().mockResolvedValue({
      ...company,
      name: 'Empresa Atualizada',
      document: '11444777000161',
    })
  })

  it('updates the authenticated user profile and refreshes the session', async () => {
    render(<SettingsScreen />)
    await userEvent.clear(screen.getByLabelText('Nome completo'))
    await userEvent.type(screen.getByLabelText('Nome completo'), 'Novo Nome')
    await userEvent.clear(screen.getByLabelText('E-mail'))
    await userEvent.type(screen.getByLabelText('E-mail'), 'NOVO@EXAMPLE.COM')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledWith({
      name: 'Novo Nome', email: 'novo@example.com',
    }))
    expect(mocks.refreshSession).toHaveBeenCalledOnce()
    expect(screen.getByRole('alert')).toHaveTextContent('Perfil atualizado com sucesso.')
  })

  it('loads and updates company data through the API for SETTINGS_MANAGE', async () => {
    render(<SettingsScreen />)
    await userEvent.click(screen.getByRole('button', { name: 'Empresa' }))

    expect(await screen.findByDisplayValue('Empresa Original')).toBeInTheDocument()
    expect(screen.getByDisplayValue('11.222.333/0001-81')).toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Nome da empresa'))
    await userEvent.type(screen.getByLabelText('Nome da empresa'), 'Empresa Atualizada')
    await userEvent.clear(screen.getByLabelText('CNPJ'))
    await userEvent.type(screen.getByLabelText('CNPJ'), '11444777000161')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => expect(mocks.updateCompany).toHaveBeenCalledWith(7, {
      name: 'Empresa Atualizada', document: '11444777000161',
    }))
    expect(screen.getByRole('alert')).toHaveTextContent('Dados da empresa atualizados com sucesso.')
  })

  it('keeps password editing and removes all out-of-scope settings', async () => {
    render(<SettingsScreen />)
    expect(screen.queryByText('Aparência')).not.toBeInTheDocument()
    expect(screen.queryByText('Tema')).not.toBeInTheDocument()
    expect(screen.queryByText(/sessões ativas/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/notificações/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/densidade/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Segurança' }))
    expect(screen.getByText('Formulário de senha existente')).toBeInTheDocument()
  })

  it('shows company data as read-only without SETTINGS_MANAGE', async () => {
    mocks.user.permissions = ['PRODUCT_READ']
    render(<SettingsScreen />)
    await userEvent.click(screen.getByRole('button', { name: 'Empresa' }))
    expect(await screen.findByDisplayValue('Empresa Original')).toBeDisabled()
    expect(screen.getByDisplayValue('11.222.333/0001-81')).toBeDisabled()
    expect(screen.getByText('Somente administradores podem alterar estes dados.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument()
  })
})
