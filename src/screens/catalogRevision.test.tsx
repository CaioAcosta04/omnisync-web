import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActivityScreen } from './ActivityScreen'
import { ListingsScreen } from './ListingsScreen'
import { OrdersScreen } from './OrdersScreen'
import { StockScreen } from './StockScreen'

const mocks = vi.hoisted(() => ({
  catalogRevision: 0,
  listProducts: vi.fn(),
  listSales: vi.fn(),
  getSaleById: vi.fn(),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, systemClientId: 7 }, status: 'ready', skipAuth: false }),
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

const sale = {
  id: 11,
  system_client_id: 7,
  product_id: 21,
  quantity: 1,
  total_value: 10,
  resource: null,
  channel: 'PHYSICAL' as const,
  external_reference_id: null,
  status: 'CONFIRMED' as const,
  created_at: '2026-08-28T12:00:00',
  logs: [],
}

beforeEach(() => {
  mocks.catalogRevision = 0
  mocks.listProducts.mockReset().mockResolvedValue({
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 200,
  })
  mocks.listSales.mockReset().mockResolvedValue({
    content: [sale],
    totalElements: 1,
    totalPages: 1,
    number: 0,
    size: 200,
  })
  mocks.getSaleById.mockReset().mockResolvedValue(sale)
})

describe.each([
  ['Estoque', StockScreen],
  ['Anúncios', ListingsScreen],
  ['Vendas', OrdersScreen],
  ['Atividade', ActivityScreen],
] as const)('%s reage à revisão do catálogo', (_name, Screen) => {
  it('loads products again without a page reload', async () => {
    const view = render(<Screen />)
    await waitFor(() => expect(mocks.listProducts).toHaveBeenCalledTimes(1))

    mocks.catalogRevision = 1
    view.rerender(<Screen />)
    await waitFor(() => expect(mocks.listProducts).toHaveBeenCalledTimes(2))
  })
})
