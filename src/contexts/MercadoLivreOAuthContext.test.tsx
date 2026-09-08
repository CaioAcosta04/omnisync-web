import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MercadoLivreOAuthProvider, useMercadoLivreOAuth } from './MercadoLivreOAuthContext'
import { readMercadoLivreIntegration } from '../lib/mercadoLivreStorage'

const mocks = vi.hoisted(() => ({ exchange: vi.fn() }))

vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, systemClientId: 7 },
    status: 'ready',
    skipAuth: false,
  }),
}))
vi.mock('../services/mercadoLivreApi', () => ({
  exchangeMercadoLivreCode: mocks.exchange,
}))

function Probe() {
  const oauth = useMercadoLivreOAuth()
  return <span data-testid="oauth-status">{oauth.status}</span>
}

describe('MercadoLivreOAuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.exchange.mockReset()
    window.history.replaceState({}, '', '/?code=code&state=state')
  })

  it('completes exchange when the successful response contains no ML credential', async () => {
    mocks.exchange.mockResolvedValue({
      message: 'connected',
      systemClientId: 7,
      marketplace: 'MERCADO_LIVRE',
      active: true,
      expiresAt: '2026-09-08T18:00:00',
      resource: { user_id: 123 },
    })

    render(<MercadoLivreOAuthProvider><Probe /></MercadoLivreOAuthProvider>)

    await waitFor(() => expect(screen.getByTestId('oauth-status')).toHaveTextContent('success'))
    expect(readMercadoLivreIntegration()).toMatchObject({ systemClientId: 7, active: true })
    expect(mocks.exchange).toHaveBeenCalledWith({ code: 'code', state: 'state' })
  })
})
