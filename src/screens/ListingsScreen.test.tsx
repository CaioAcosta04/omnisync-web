import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ListingsScreen } from './ListingsScreen'

const mocks = vi.hoisted(() => ({
  syncNow: vi.fn(),
  directSync: vi.fn(),
  listProducts: vi.fn(),
  syncState: {
    catalogRevision: 0,
    phase: 'idle',
    isSyncing: false,
    lastResult: null as null | { message: string; syncedProducts: number },
    warning: null as string | null,
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, systemClientId: 7 }, status: 'ready', skipAuth: false }),
}))
vi.mock('../contexts/MercadoLivreSyncContext', () => ({
  useMercadoLivreSync: () => ({
    ...mocks.syncState,
    syncNow: mocks.syncNow,
    dismissNotice: vi.fn(),
  }),
}))
vi.mock('../lib/mercadoLivreStorage', () => ({
  readMercadoLivreIntegration: () => ({ systemClientId: 7, active: true, expiresAt: '' }),
}))
vi.mock('../services/productsApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/productsApi')>()
  return {
    ...original,
    listProducts: mocks.listProducts,
    syncMercadoLivreProducts: mocks.directSync,
  }
})

beforeEach(() => {
  mocks.syncNow.mockReset().mockResolvedValue({ message: 'Atualizado', syncedProducts: 2 })
  mocks.directSync.mockReset().mockResolvedValue({ message: 'Chamada antiga', syncedProducts: 2 })
  mocks.listProducts.mockReset().mockResolvedValue({
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 200,
  })
  mocks.syncState = {
    catalogRevision: 0,
    phase: 'idle',
    isSyncing: false,
    lastResult: null,
    warning: null,
  }
})

describe('sincronização manual em ListingsScreen', () => {
  it('uses the shared manual mode instead of calling the endpoint directly', async () => {
    render(<ListingsScreen />)
    await waitFor(() => expect(mocks.listProducts).toHaveBeenCalled())

    await userEvent.click(screen.getByRole('button', { name: 'Sincronizar ML' }))

    expect(mocks.syncNow).toHaveBeenCalledWith('manual')
    expect(mocks.directSync).not.toHaveBeenCalled()
  })

  it('disables every manual retry while a shared operation is active', async () => {
    mocks.syncState.phase = 'syncing'
    mocks.syncState.isSyncing = true
    render(<ListingsScreen />)

    for (const button of screen.getAllByRole('button', { name: 'Sincronizando…' })) {
      expect(button).toBeDisabled()
    }
  })

  it('reflects success and failure supplied by the shared context without a duplicate banner', () => {
    mocks.syncState.phase = 'success'
    mocks.syncState.lastResult = { message: 'Catálogo atualizado globalmente', syncedProducts: 0 }
    const view = render(<ListingsScreen />)
    expect(screen.getByRole('button', { name: 'Sincronizar ML' })).toHaveAttribute(
      'title',
      'Sincronizar novamente. Último resultado: Catálogo atualizado globalmente'
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    mocks.syncState.phase = 'error'
    mocks.syncState.lastResult = null
    mocks.syncState.warning = 'Falha segura global'
    view.rerender(<ListingsScreen />)
    expect(screen.getByRole('button', { name: 'Sincronizar ML' })).toHaveAttribute(
      'title',
      'Última tentativa falhou. Tentar novamente'
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
