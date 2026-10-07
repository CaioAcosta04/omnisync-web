import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PasswordForm } from './PasswordForm'
import { apiFetch } from '../lib/apiFetch'
import { validateNewPassword, type PasswordOperation } from '../services/passwordApi'
import { hasUserManagePermission } from '../lib/userResource'
import { ResetPasswordScreen } from '../screens/user/userChangePassword/ResetPasswordScreen'

vi.mock('../lib/apiFetch', () => ({ apiFetch: vi.fn() }))
const request = vi.mocked(apiFetch)
const password = 'NewSecret456'

function fill(current = false) {
  if (current) fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'OldSecret123' } })
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: password } })
}
beforeEach(() => { request.mockReset(); request.mockResolvedValue(new Response(null, { status: 204 })) })
afterEach(() => { vi.useRealTimers(); window.history.replaceState(null, '', '/') })

describe('password flows', () => {
  const scenarios: [PasswordOperation, string, string, object][] = [
    [{ kind: 'own' }, '/api/users/me/password', 'PUT', { current_password: 'OldSecret123', new_password: password, new_password_confirmation: password }],
    [{ kind: 'admin', userId: 38 }, '/api/users/38/password', 'PUT', { new_password: password, new_password_confirmation: password }],
    [{ kind: 'recovery', token: 'fake-token' }, '/api/auth/reset-password', 'POST', { token: 'fake-token', newPassword: password }],
  ]
  it.each(scenarios)('sends the contract for %j and redirects only after success', async (operation, path, method, body) => {
    vi.useFakeTimers()
    const done = vi.fn()
    const { container } = render(<PasswordForm operation={operation} onSuccess={done} />)
    fill(operation.kind === 'own')
    await act(async () => { fireEvent.submit(container.querySelector('form')!) })
    expect(request).toHaveBeenCalledWith(path, expect.objectContaining({ method, referrerPolicy: 'no-referrer', cache: 'no-store' }))
    expect(JSON.parse(request.mock.calls[0][1]!.body as string)).toEqual(body)
    expect(screen.getByRole('status')).toHaveTextContent('Senha atualizada')
    expect(container.querySelector('input')).toBeNull()
    expect(done).not.toHaveBeenCalled()
    await act(async () => { vi.advanceTimersByTime(1500) })
    expect(done).toHaveBeenCalledOnce()
  })

  it('requires current password and rejects a mismatching confirmation without a request', () => {
    const { container } = render(<PasswordForm operation={{ kind: 'own' }} onSuccess={vi.fn()} />)
    fill()
    fireEvent.submit(container.querySelector('form')!)
    expect(screen.getByRole('alert')).toHaveTextContent('Informe sua senha atual')
    fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'OldSecret123' } })
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'different' } })
    fireEvent.submit(container.querySelector('form')!)
    expect(screen.getByRole('alert')).toHaveTextContent('confirmação')
    expect(request).not.toHaveBeenCalled()
  })

  it('blocks repeated submissions while pending and after success', async () => {
    let release!: (response: Response) => void
    request.mockReturnValue(new Promise(resolve => { release = resolve }))
    const { container } = render(<PasswordForm operation={{ kind: 'admin', userId: 38 }} onSuccess={vi.fn()} />)
    fill()
    const form = container.querySelector('form')!
    fireEvent.submit(form); fireEvent.submit(form)
    expect(request).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled()
    await act(async () => release(new Response(null, { status: 204 })))
    fireEvent.submit(form)
    expect(request).toHaveBeenCalledOnce()
  })

  it.each([400, 401, 403, 404, 429, 500])('shows safe errors for HTTP %s and allows a retry', async status => {
    request.mockResolvedValue(new Response('SECRET-PASSWORD fake-token internal.stacktrace', { status }))
    const done = vi.fn()
    const { container } = render(<PasswordForm operation={{ kind: 'recovery', token: 'fake-token' }} onSuccess={done} />)
    fill(); fireEvent.submit(container.querySelector('form')!)
    expect(await screen.findByRole('alert')).not.toHaveTextContent(/SECRET-PASSWORD|fake-token|stacktrace/)
    expect(screen.getByRole('button', { name: 'Redefinir senha' })).toBeEnabled()
    expect(done).not.toHaveBeenCalled()
    if (status === 400) expect(screen.getByRole('alert')).toHaveTextContent('Link inválido, utilizado ou expirado')
  })

  it('does not echo network exceptions', async () => {
    request.mockRejectedValue(new Error('SENSITIVE-SECRET'))
    const { container } = render(<PasswordForm operation={{ kind: 'own' }} onSuccess={vi.fn()} />)
    fill(true); fireEvent.submit(container.querySelector('form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('Verifique sua conexão')
    expect(screen.getByRole('alert')).not.toHaveTextContent('SENSITIVE-SECRET')
  })

  it('opens a recovery token only in memory and strips it from the URL', async () => {
    window.history.replaceState(null, '', '/reset-password?token=fake-token')
    const { container } = render(<ResetPasswordScreen />)
    expect(window.location.search).toBe('')
    expect(window.history.state).toBeNull()
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
    fill(); fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(request).toHaveBeenCalledWith('/api/auth/reset-password', expect.objectContaining({ body: JSON.stringify({ token: 'fake-token', newPassword: password }) })))
  })

  it('does not present a form without a recovery token', () => {
    window.history.replaceState(null, '', '/reset-password')
    render(<ResetPasswordScreen />)
    expect(screen.getByRole('alert')).toHaveTextContent('sem token')
    expect(screen.queryByLabelText('Nova senha')).toBeNull()
    expect(request).not.toHaveBeenCalled()
  })

  it('matches the backend character and UTF-8 policy', () => {
    for (const value of ['123456', 'a'.repeat(72), 'á'.repeat(36)]) expect(validateNewPassword(value, value)).toBeNull()
    for (const value of ['', '12345', '      ', 'a'.repeat(73), 'á'.repeat(37)]) expect(validateNewPassword(value, value)).not.toBeNull()
  })

  it('uses effective permissions, never the role name or defaults', () => {
    expect(hasUserManagePermission({ permissions: ['USER_MANAGE'] })).toBe(true)
    expect(hasUserManagePermission({ permissions: [], resource: { role: 'admin', permissions: ['USER_MANAGE'] } })).toBe(false)
    expect(hasUserManagePermission({ resource: { role: 'admin' } })).toBe(false)
    expect(hasUserManagePermission({ resource: { permissions: ['Gestão de usuários'] } })).toBe(true)
    expect(hasUserManagePermission(null)).toBe(false)
  })
})
