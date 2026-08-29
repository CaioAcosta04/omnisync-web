import { StrictMode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MercadoLivreSyncProvider,
  useMercadoLivreSync,
} from './MercadoLivreSyncContext'
import { resetMercadoLivreSyncCoordinator } from '../lib/mercadoLivreSyncCoordinator'
import {
  buildMercadoLivreSyncStorageKey,
  resetMercadoLivreSyncMemoryStorage,
} from '../lib/mercadoLivreSyncStorage'

const mocks = vi.hoisted(() => ({
  auth: {
    user: null as null | { id: number; systemClientId: number },
    status: 'loading' as 'loading' | 'ready',
    skipAuth: false,
  },
  oauth: { status: 'idle' as 'idle' | 'success' },
  getStatus: vi.fn(),
  sync: vi.fn(),
}))

vi.mock('./AuthContext', () => ({ useAuth: () => mocks.auth }))
vi.mock('./MercadoLivreOAuthContext', () => ({ useMercadoLivreOAuth: () => mocks.oauth }))
vi.mock('../services/mercadoLivreApi', () => ({
  getMercadoLivreStatus: mocks.getStatus,
}))
vi.mock('../services/productsApi', () => ({
  syncMercadoLivreProducts: mocks.sync,
}))

function Probe() {
  const state = useMercadoLivreSync()
  return (
    <div>
      <span data-testid="phase">{state.phase}</span>
      <span data-testid="result">{state.lastResult?.message ?? 'none'}</span>
      <span data-testid="revision">{state.catalogRevision}</span>
      <button type="button" onClick={state.dismissNotice}>dismiss</button>
    </div>
  )
}

const activeStatus = (systemClientId: number) => ({
  connected: true,
  active: true,
  systemClientId,
  expiresAt: null,
  marketplace: 'MERCADO_LIVRE',
})

beforeEach(() => {
  mocks.auth.user = null
  mocks.auth.status = 'loading'
  mocks.auth.skipAuth = false
  mocks.oauth.status = 'idle'
  mocks.getStatus.mockReset()
  mocks.sync.mockReset()
  resetMercadoLivreSyncCoordinator()
  resetMercadoLivreSyncMemoryStorage()
})

describe('MercadoLivreSyncProvider', () => {
  it('waits for a ready authenticated session', async () => {
    render(
      <MercadoLivreSyncProvider>
        <Probe />
      </MercadoLivreSyncProvider>
    )
    await Promise.resolve()
    expect(mocks.getStatus).not.toHaveBeenCalled()
    expect(mocks.sync).not.toHaveBeenCalled()
  })

  it('runs one automatic sync in StrictMode and exposes its result', async () => {
    mocks.auth.user = { id: 1, systemClientId: 7 }
    mocks.auth.status = 'ready'
    mocks.getStatus.mockResolvedValue({
      connected: true,
      active: true,
      systemClientId: 7,
      expiresAt: null,
      marketplace: 'MERCADO_LIVRE',
    })
    mocks.sync.mockResolvedValue({ message: 'Catálogo atualizado', syncedProducts: 3 })

    render(
      <StrictMode>
        <MercadoLivreSyncProvider>
          <Probe />
        </MercadoLivreSyncProvider>
      </StrictMode>
    )

    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('success'))
    expect(mocks.sync).toHaveBeenCalledTimes(1)
    expect(mocks.sync).toHaveBeenCalledWith(7)
    expect(screen.getByTestId('result')).toHaveTextContent('Catálogo atualizado')
    expect(screen.getByTestId('revision')).toHaveTextContent('1')
  })

  it('dismisses a completed notice without discarding the shared result', async () => {
    mocks.auth.user = { id: 1, systemClientId: 7 }
    mocks.auth.status = 'ready'
    mocks.getStatus.mockResolvedValue(activeStatus(7))
    mocks.sync.mockResolvedValue({ message: 'Catálogo atualizado', syncedProducts: 3 })

    render(
      <MercadoLivreSyncProvider>
        <Probe />
      </MercadoLivreSyncProvider>
    )
    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('success'))

    await userEvent.click(screen.getByRole('button', { name: 'dismiss' }))
    expect(screen.getByTestId('phase')).toHaveTextContent('idle')
    expect(screen.getByTestId('result')).toHaveTextContent('Catálogo atualizado')
  })

  it.each([
    { connected: false, active: null, systemClientId: 7 },
    { connected: true, active: false, systemClientId: 7 },
    { connected: true, active: true, systemClientId: 99 },
  ])('does not sync an ineligible integration: %o', async (status) => {
    mocks.auth.user = { id: 1, systemClientId: 7 }
    mocks.auth.status = 'ready'
    mocks.getStatus.mockResolvedValue({ ...status, expiresAt: null, marketplace: null })

    render(
      <MercadoLivreSyncProvider>
        <Probe />
      </MercadoLivreSyncProvider>
    )

    await waitFor(() => expect(mocks.getStatus).toHaveBeenCalled())
    expect(mocks.sync).not.toHaveBeenCalled()
  })

  it('rechecks eligibility after OAuth succeeds during the session', async () => {
    mocks.auth.user = { id: 1, systemClientId: 7 }
    mocks.auth.status = 'ready'
    mocks.getStatus
      .mockResolvedValueOnce({
        connected: false,
        active: null,
        systemClientId: 7,
        expiresAt: null,
        marketplace: null,
      })
      .mockResolvedValueOnce({
        connected: true,
        active: true,
        systemClientId: 7,
        expiresAt: null,
        marketplace: 'MERCADO_LIVRE',
      })
    mocks.sync.mockResolvedValue({ message: 'Conectado e atualizado', syncedProducts: 1 })

    const view = render(
      <MercadoLivreSyncProvider>
        <Probe />
      </MercadoLivreSyncProvider>
    )
    await waitFor(() => expect(mocks.getStatus).toHaveBeenCalledTimes(1))

    mocks.oauth.status = 'success'
    view.rerender(
      <MercadoLivreSyncProvider>
        <Probe />
      </MercadoLivreSyncProvider>
    )

    await waitFor(() => expect(mocks.sync).toHaveBeenCalledTimes(1))
  })

  it('applies a successful storage event for the active tenant only once', async () => {
    mocks.auth.user = { id: 1, systemClientId: 7 }
    mocks.auth.status = 'ready'
    mocks.getStatus.mockResolvedValue({
      connected: false,
      active: null,
      systemClientId: 7,
      expiresAt: null,
      marketplace: null,
    })

    render(
      <MercadoLivreSyncProvider>
        <Probe />
      </MercadoLivreSyncProvider>
    )
    await waitFor(() => expect(mocks.getStatus).toHaveBeenCalled())

    const reference = JSON.stringify({
      version: 1,
      systemClientId: 7,
      attemptId: 'other-tab-success',
      lastAttemptAt: Date.now(),
      lastSyncAt: Date.now(),
      outcome: 'success',
      lastResult: { message: 'Outra aba concluiu', syncedProducts: 0 },
    })
    const event = new StorageEvent('storage', {
      key: buildMercadoLivreSyncStorageKey(7),
      newValue: reference,
    })
    window.dispatchEvent(event)
    window.dispatchEvent(event)

    await waitFor(() => expect(screen.getByTestId('revision')).toHaveTextContent('1'))
    expect(screen.getByTestId('result')).toHaveTextContent('Outra aba concluiu')
  })

  it('ignores a late result after the active tenant changes', async () => {
    let resolveSync!: (value: { message: string; syncedProducts: number }) => void
    mocks.auth.user = { id: 1, systemClientId: 7 }
    mocks.auth.status = 'ready'
    mocks.getStatus
      .mockResolvedValueOnce(activeStatus(7))
      .mockResolvedValueOnce({
        connected: false,
        active: null,
        systemClientId: 8,
        expiresAt: null,
        marketplace: null,
      })
    mocks.sync.mockImplementation(
      () =>
        new Promise<{ message: string; syncedProducts: number }>((resolve) => {
          resolveSync = resolve
        })
    )

    const view = render(
      <MercadoLivreSyncProvider>
        <Probe />
      </MercadoLivreSyncProvider>
    )
    await waitFor(() => expect(mocks.sync).toHaveBeenCalledTimes(1))

    mocks.auth.user = { id: 2, systemClientId: 8 }
    view.rerender(
      <MercadoLivreSyncProvider>
        <Probe />
      </MercadoLivreSyncProvider>
    )
    await waitFor(() => expect(mocks.getStatus).toHaveBeenCalledTimes(2))
    resolveSync({ message: 'Resultado antigo', syncedProducts: 9 })

    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('idle'))
    expect(screen.getByTestId('result')).toHaveTextContent('none')
    expect(screen.getByTestId('revision')).toHaveTextContent('0')
  })

  it('contains a status-check failure without attempting a sync', async () => {
    mocks.auth.user = { id: 1, systemClientId: 7 }
    mocks.auth.status = 'ready'
    mocks.getStatus.mockRejectedValue(new Error('private upstream response'))

    render(
      <MercadoLivreSyncProvider>
        <Probe />
      </MercadoLivreSyncProvider>
    )

    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('error'))
    expect(mocks.sync).not.toHaveBeenCalled()
  })

  it('contains a sync failure and backs off instead of looping', async () => {
    mocks.auth.user = { id: 1, systemClientId: 7 }
    mocks.auth.status = 'ready'
    mocks.getStatus.mockResolvedValue(activeStatus(7))
    mocks.sync.mockRejectedValue(new Error('private upstream response'))

    const view = render(
      <MercadoLivreSyncProvider>
        <Probe />
      </MercadoLivreSyncProvider>
    )
    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('error'))

    mocks.oauth.status = 'success'
    view.rerender(
      <MercadoLivreSyncProvider>
        <Probe />
      </MercadoLivreSyncProvider>
    )

    await waitFor(() => expect(mocks.getStatus).toHaveBeenCalledTimes(2))
    expect(mocks.sync).toHaveBeenCalledTimes(1)
  })
})
