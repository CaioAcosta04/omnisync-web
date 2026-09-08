import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MarketplacesScreen } from './MarketplacesScreen'

const mocks = vi.hoisted(() => ({
  user: { id: 1, systemClientId: 7 },
  status: vi.fn(),
  connectUrl: vi.fn(),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}))
vi.mock('../contexts/MercadoLivreOAuthContext', () => ({
  useMercadoLivreOAuth: () => ({ status: 'idle' }),
}))
vi.mock('../contexts/MercadoLivreSyncContext', () => ({
  useMercadoLivreSync: () => ({ catalogRevision: 0 }),
}))
vi.mock('../services/mercadoLivreApi', () => ({
  getMercadoLivreStatus: mocks.status,
  fetchMercadoLivreConnectUrl: mocks.connectUrl,
}))

describe('MarketplacesScreen', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.status.mockReset()
    mocks.connectUrl.mockReset()
  })

  it('shows the persisted last synchronization instead of token expiry', async () => {
    mocks.status.mockResolvedValue({
      connected: true,
      active: true,
      systemClientId: 7,
      expiresAt: '2030-01-01T00:00:00',
      marketplace: 'MERCADO_LIVRE',
      lastSyncAt: '2026-09-08T15:00:00Z',
    })
    render(<MarketplacesScreen />)

    await waitFor(() => expect(mocks.status).toHaveBeenCalledOnce())
    expect(screen.queryByText(/Token até/i)).not.toBeInTheDocument()
    expect(screen.getAllByText('ÚLTIMA SINCRONIZAÇÃO')).not.toHaveLength(0)
    expect(screen.queryByText('Ainda não sincronizado')).not.toBeInTheDocument()
  })

  it('preserves inactive state and starts the existing reconnect flow', async () => {
    mocks.status.mockResolvedValue({
      connected: true,
      active: false,
      systemClientId: 7,
      expiresAt: null,
      marketplace: 'MERCADO_LIVRE',
      lastSyncAt: null,
    })
    mocks.connectUrl.mockReturnValue(new Promise(() => undefined))
    render(<MarketplacesScreen />)

    expect(await screen.findByText('Ainda não sincronizado')).toBeInTheDocument()
    expect(screen.getByText('Reconexão necessária')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reconectar Mercado Livre' }))
    await waitFor(() => expect(mocks.connectUrl).toHaveBeenCalledWith(7))
  })
})
