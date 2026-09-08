import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config/api', () => ({ API_BASE_URL: 'http://api.test' }))

describe('criação autenticada de funcionários', () => {
  const fetchMock = vi.fn<typeof fetch>()
  const data = {
    systemClientId: 7, name: 'Funcionário de teste', email: 'member@example.invalid',
    password: 'test-only-password', resource: { role: 'editor', permissions: ['Vendas'] },
  }

  beforeEach(() => {
    vi.resetModules()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('envia o cookie do administrador para POST /api/users e mantém o payload', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 201 }))
    const { registerUser } = await import('./usersApi')
    await registerUser(data)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('http://api.test/api/users', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  })

  it('exibe a falta de USER_MANAGE sem repetir o cadastro', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      status: 403, message: 'Permissão insuficiente: USER_MANAGE',
    }), { status: 403 }))
    const { registerUser } = await import('./usersApi')
    await expect(registerUser(data)).rejects.toMatchObject({
      status: 403, message: 'Permissão insuficiente: USER_MANAGE',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
