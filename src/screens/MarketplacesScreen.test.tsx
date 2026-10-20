import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MarketplacesScreen } from './MarketplacesScreen'

const mocks = vi.hoisted(() => ({
  user: { id: 1, systemClientId: 7, permissions: ['INTEGRATION_MANAGE'] as string[] },
  status: vi.fn(),
  connectUrl: vi.fn(),
  disconnect: vi.fn(),
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
  disconnectMercadoLivre: mocks.disconnect,
}))

describe('MarketplacesScreen', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.status.mockReset()
    mocks.connectUrl.mockReset()
    mocks.disconnect.mockReset().mockResolvedValue(undefined)
    mocks.user.permissions = ['INTEGRATION_MANAGE']
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

  it('disconnects through the API before clearing local state and offers a new connection', async () => {
    mocks.status.mockResolvedValue({
      connected: true,
      active: true,
      systemClientId: 7,
      expiresAt: '2030-01-01T00:00:00',
      marketplace: 'MERCADO_LIVRE',
      lastSyncAt: null,
    })
    render(<MarketplacesScreen />)

    const disconnectButton = await screen.findByRole('button', { name: 'Encerrar conexão' })
    await userEvent.click(disconnectButton)
    expect(mocks.disconnect).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar encerramento' }))

    await waitFor(() => expect(mocks.disconnect).toHaveBeenCalledWith(7))
    expect(screen.getByRole('button', { name: 'Conectar Mercado Livre' })).toBeInTheDocument()
    expect(screen.getByText('Não conectado')).toBeInTheDocument()
  })

  it('keeps the integration connected when the disconnect API fails', async () => {
    mocks.status.mockResolvedValue({
      connected: true,
      active: true,
      systemClientId: 7,
      expiresAt: '2030-01-01T00:00:00',
      marketplace: 'MERCADO_LIVRE',
      lastSyncAt: null,
    })
    mocks.disconnect.mockRejectedValue(new Error('Falha ao encerrar integração.'))
    render(<MarketplacesScreen />)

    await userEvent.click(await screen.findByRole('button', { name: 'Encerrar conexão' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar encerramento' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao encerrar integração.')
    expect(screen.getByRole('button', { name: 'Confirmar encerramento' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Conectar Mercado Livre' })).not.toBeInTheDocument()
  })

  it('blocks duplicate requests while the disconnect operation is pending', async () => {
    mocks.status.mockResolvedValue({
      connected: true,
      active: true,
      systemClientId: 7,
      expiresAt: '2030-01-01T00:00:00',
      marketplace: 'MERCADO_LIVRE',
      lastSyncAt: null,
    })
    mocks.disconnect.mockReturnValue(new Promise(() => undefined))
    render(<MarketplacesScreen />)

    await userEvent.click(await screen.findByRole('button', { name: 'Encerrar conexão' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar encerramento' }))

    expect(screen.getByRole('button', { name: 'Encerrando conexão…' })).toBeDisabled()
    expect(mocks.disconnect).toHaveBeenCalledTimes(1)
  })

  it('does not expose connection management actions without INTEGRATION_MANAGE', async () => {
    mocks.user.permissions = ['PRODUCT_READ']
    mocks.status.mockResolvedValue({
      connected: true,
      active: true,
      systemClientId: 7,
      expiresAt: '2030-01-01T00:00:00',
      marketplace: 'MERCADO_LIVRE',
      lastSyncAt: null,
    })
    render(<MarketplacesScreen />)

    await screen.findByText('Conectado')
    expect(screen.queryByRole('button', { name: 'Encerrar conexão' })).not.toBeInTheDocument()
  })
})
