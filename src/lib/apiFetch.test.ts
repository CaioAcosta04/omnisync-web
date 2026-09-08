import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config/api', () => ({ API_BASE_URL: 'http://api.test' }))

describe('apiFetch com autorização por permissão', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_SKIP_AUTH', 'false')
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('devolve o 403 sem renovar tokens nem repetir a operação', async () => {
    const denied = new Response(JSON.stringify({ status: 403, message: 'Permissão insuficiente: PRODUCT_WRITE' }), { status: 403 })
    fetchMock.mockResolvedValueOnce(denied)
    const { apiFetch } = await import('./apiFetch')

    expect(await apiFetch('/api/products/7', { method: 'POST' })).toBe(denied)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/products/7', {
      method: 'POST', credentials: 'include',
    })
  })

  it('mantém a renovação e uma repetição quando o token retorna 401', async () => {
    const ok = new Response('{}', { status: 200 })
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))
      .mockResolvedValueOnce(ok)
    const { apiFetch } = await import('./apiFetch')

    expect(await apiFetch('/api/users/me')).toBe(ok)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://api.test/api/auth/refresh', {
      method: 'POST', credentials: 'include',
    })
  })

  it('não repete o cadastro público automaticamente', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }))
    const { apiFetch } = await import('./apiFetch')
    expect((await apiFetch('/api/auth/register-company', { method: 'POST' })).status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
