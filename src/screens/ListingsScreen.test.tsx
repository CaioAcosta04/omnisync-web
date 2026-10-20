import { render, screen, waitFor, within } from '@testing-library/react'
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

describe('organização da tela de anúncios', () => {
  beforeEach(() => {
    mocks.listProducts.mockResolvedValue({
      content: [
        {
          id: 1,
          sku: 'SKU-B',
          name: 'Produto B',
          description: '',
          stock: 4,
          reserved_stock: 1,
          minimum_stock: 0,
          price: 20,
          resource: {
            mercado_livre: {
              item_id: 'MLB20',
              status: 'paused',
              last_updated: '2026-10-02T12:00:00Z',
              raw: { date_created: '2026-09-02T12:00:00Z' },
            },
          },
          system_client_id: 7,
          active: true,
          created_at: '2026-08-02T12:00:00Z',
        },
        {
          id: 2,
          sku: 'SKU-A',
          name: 'Produto A',
          description: '',
          stock: 9,
          reserved_stock: 1,
          minimum_stock: 0,
          price: 10,
          resource: {
            mercado_livre: {
              item_id: 'MLB10',
              status: 'active',
              last_updated: '2026-10-01T12:00:00Z',
              raw: { date_created: '2026-09-01T12:00:00Z' },
            },
          },
          system_client_id: 7,
          active: true,
          created_at: '2026-08-01T12:00:00Z',
        },
      ],
      totalElements: 2,
      totalPages: 1,
      number: 0,
      size: 200,
    })
  })

  it('posiciona o título antes da pesquisa e identifica o último anúncio adicionado', async () => {
    render(<ListingsScreen />)
    await screen.findByText('Produto A')

    const heading = screen.getByRole('heading', { name: 'Anúncios do Mercado Livre' })
    const search = screen.getByPlaceholderText('Buscar por título, SKU ou item ID...')
    expect(heading.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const lastAddedLabel = screen.getByText('Último anúncio adicionado')
    expect(within(lastAddedLabel.parentElement as HTMLElement).getByText('Produto B')).toBeInTheDocument()
    expect(screen.queryByText('Última Sincronização')).not.toBeInTheDocument()
  })

  it('permite ordenar individualmente todas as colunas', async () => {
    render(<ListingsScreen />)
    await screen.findByText('Produto A')

    const labels = [
      'TÍTULO DO ANÚNCIO',
      'ITEM ID',
      'DISPONÍVEL',
      'PREÇO',
      'ÚLTIMA ATUALIZAÇÃO',
      'STATUS',
    ]

    for (const label of labels) {
      const button = screen.getByRole('button', { name: `Ordenar por ${label}` })
      await userEvent.click(button)
      expect(button.closest('th')).toHaveAttribute('aria-sort', 'ascending')
    }

    await userEvent.click(screen.getByRole('button', { name: 'Ordenar por TÍTULO DO ANÚNCIO' }))
    const rows = screen.getByRole('table').querySelectorAll<HTMLTableRowElement>('tbody tr')
    expect(within(rows[0]).getByText('Produto A')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ordenar por TÍTULO DO ANÚNCIO' }))
    const descendingRows = screen.getByRole('table').querySelectorAll<HTMLTableRowElement>('tbody tr')
    expect(within(descendingRows[0]).getByText('Produto B')).toBeInTheDocument()
  })
})
