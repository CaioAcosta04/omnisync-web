import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UserCreateAccount } from './UserCreateAccount'

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), refreshSession: vi.fn(), goToLogin: vi.fn() }))
vi.mock('../../../lib/apiFetch', () => ({ apiFetch: mocks.apiFetch }))
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ refreshSession: mocks.refreshSession }) }))
vi.mock('../../../contexts/UserAuthNavigationContext', () => ({
  useUserAuthNavigation: () => ({ goToLogin: mocks.goToLogin }),
}))

describe('cadastro público de empresa e administrador', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.refreshSession.mockResolvedValue(true)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => vi.restoreAllMocks())

  async function fillAndSubmit() {
    const user = userEvent.setup()
    render(<UserCreateAccount />)
    fireEvent.change(screen.getByLabelText('Nome da Empresa'), { target: { value: 'Empresa de teste' } })
    fireEvent.change(screen.getByLabelText('CNPJ'), { target: { value: '11.222.333/0001-81' } })
    await user.click(screen.getByRole('button', { name: 'Próximo →' }))
    await screen.findByLabelText('Nome Completo')
    fireEvent.change(screen.getByLabelText('Nome Completo'), { target: { value: 'Administrador de teste' } })
    fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '00000000000' } })
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'admin@example.invalid' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'test-only-password' } })
    await user.click(screen.getByRole('button', { name: 'Criar Conta' }))
  }

  it('envia empresa e usuário juntos e inicia a sessão retornada', async () => {
    mocks.apiFetch.mockResolvedValueOnce(new Response('false', { status: 200 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    await fillAndSubmit()
    await waitFor(() => expect(mocks.refreshSession).toHaveBeenCalledTimes(1))

    expect(mocks.apiFetch).toHaveBeenCalledTimes(2)
    const [path, init] = mocks.apiFetch.mock.calls[1]
    expect(path).toBe('/api/auth/register-company')
    expect(JSON.parse(init.body)).toEqual({
      companyName: 'Empresa de teste', document: '11222333000181', name: 'Administrador de teste',
      email: 'admin@example.invalid', password: 'test-only-password', resource: { cpf: '00000000000' },
    })
  })

  it('mantém o formulário e informa um erro de cadastro sem iniciar sessão', async () => {
    mocks.apiFetch.mockResolvedValueOnce(new Response('false', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Já existe usuário com esse email' }), { status: 400 }))
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe usuário com esse email')
    expect(mocks.refreshSession).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Nome Completo')).toHaveValue('Administrador de teste')
  })
})
