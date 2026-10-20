import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActivityScreen } from './ActivityScreen'

const mocks = vi.hoisted(() => ({
  catalogRevision: 0,
  listProducts: vi.fn(),
  listSales: vi.fn(),
  getSaleById: vi.fn(),
  getActivitySummary: vi.fn(),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, systemClientId: 7, resource: {}, role: 'admin' },
    status: 'ready',
    skipAuth: false,
  }),
}))

vi.mock('../contexts/MercadoLivreSyncContext', () => ({
  useMercadoLivreSync: () => ({
    catalogRevision: mocks.catalogRevision,
    phase: 'idle',
    isSyncing: false,
    lastResult: null,
    warning: null,
    syncNow: vi.fn(),
    dismissNotice: vi.fn(),
  }),
}))

vi.mock('../contexts/AppNavigationContext', () => ({
  useAppNavigation: () => ({ navigateTo: vi.fn() }),
}))

vi.mock('../services/productsApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/productsApi')>()
  return { ...original, listProducts: mocks.listProducts }
})

vi.mock('../services/salesApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/salesApi')>()
  return {
    ...original,
    listSales: mocks.listSales,
    getSaleById: mocks.getSaleById,
  }
})

vi.mock('../services/activityApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/activityApi')>()
  return {
    ...original,
    getActivitySummary: mocks.getActivitySummary,
  }
})

const sampleSale = {
  id: 101,
  system_client_id: 7,
  product_id: 1,
  quantity: 2,
  total_value: 200,
  resource: null,
  channel: 'MERCADO_LIVRE' as const,
  external_reference_id: 'ML-101',
  status: 'CONFIRMED' as const,
  created_at: new Date().toISOString(),
  logs: [],
}

describe('ActivityScreen - Vendas por hora e filtro de marketplace', () => {
  beforeEach(() => {
    mocks.catalogRevision = 0
    mocks.listProducts.mockResolvedValue({
      content: [{ id: 1, name: 'Produto Teste' }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 200,
    })
    mocks.listSales.mockResolvedValue({
      content: [sampleSale],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 50,
    })
    mocks.getSaleById.mockResolvedValue(sampleSale)
    mocks.getActivitySummary.mockResolvedValue({
      salesByHour: [
        { hour: 0, count: 0, total: 0 },
        { hour: 8, count: 2, total: 200 },
        { hour: 9, count: 0, total: 0 },
      ],
    })
  })

  it('consome a API de vendas por hora e renderiza o gráfico e totais', async () => {
    render(<ActivityScreen />)

    await waitFor(() => {
      expect(mocks.getActivitySummary).toHaveBeenCalledWith(
        7,
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        null,
      )
    })

    expect(await screen.findByText('VENDAS POR HORA (HOJE)')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Gráfico de vendas por hora' })).toBeInTheDocument()
  })

  it('permite filtrar por marketplace no dropdown e atualiza a busca na API', async () => {
    render(<ActivityScreen />)

    const select = await screen.findByLabelText('Filtrar por marketplace')
    expect(select).toBeInTheDocument()
    expect(select).toHaveValue('')

    fireEvent.change(select, { target: { value: 'MERCADO_LIVRE' } })

    await waitFor(() => {
      expect(mocks.getActivitySummary).toHaveBeenCalledWith(
        7,
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        'MERCADO_LIVRE',
      )
    })
  })
})

