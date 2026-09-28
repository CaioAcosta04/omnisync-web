import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardScreen } from './DashboardScreen'

const mocks = vi.hoisted(() => ({
  getDashboardSummary: vi.fn(),
  listLowStockProducts: vi.fn(),
  navigateTo: vi.fn(),
  authUser: { id: 1, systemClientId: 7, role: 'manager', permissions: ['PRODUCT_READ', 'SALE_READ'] },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.authUser }),
}))
vi.mock('../contexts/AppNavigationContext', () => ({ useAppNavigation: () => ({ navigateTo: mocks.navigateTo }) }))
vi.mock('../contexts/MercadoLivreSyncContext', () => ({
  useMercadoLivreSync: () => ({ catalogRevision: 0, syncNow: vi.fn(), isSyncing: false }),
}))
vi.mock('../services/dashboardApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/dashboardApi')>()
  return { ...original, getDashboardSummary: mocks.getDashboardSummary }
})
vi.mock('../services/productsApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/productsApi')>()
  return { ...original, listLowStockProducts: mocks.listLowStockProducts }
})
vi.mock('../components/GenerateReportModal', () => ({ GenerateReportModal: () => null }))
vi.mock('../components/ProductDetailDialog', () => ({
  ProductDetailDialog: ({ onChanged }: { onChanged: () => void }) => (
    <button type="button" onClick={onChanged}>Salvar produto de teste</button>
  ),
}))

const summary = {
  totalProducts: 12,
  totalProductsChangePct: 2.1,
  totalStock: 48,
  totalStockChangePct: -1.2,
  inventoryValue: 48250.9,
  activeListings: 6,
  activeListingsChangePct: 0,
  revenueToday: 4200,
  revenueTodayChangePct: 12.3,
  salesTodayCount: 18,
  lowStockCount: 2,
  salesByDay: [
    { date: '2026-09-27', total: 1200, count: 4 },
    { date: '2026-09-28', total: 4200, count: 12 },
  ],
  recentEvents: [
    { id: 'SALE:8', entityType: 'SALE', entityId: 8, action: 'CREATED', createdAt: '2026-09-28T09:00:00' },
    { id: 'PRODUCT:4', entityType: 'PRODUCT', entityId: 4, action: 'edit', createdAt: '2026-09-28T08:00:00' },
  ],
}

beforeEach(() => {
  mocks.getDashboardSummary.mockReset().mockResolvedValue(summary)
  mocks.listLowStockProducts.mockReset().mockResolvedValue({
    content: [{
      id: 21, name: 'Cabo USB-C', sku: 'CB-21', description: '', stock: 8,
      reserved_stock: 2, available_stock: 6, minimum_stock: 7, low_stock: true,
      price: 20, resource: null, system_client_id: 7, active: true, created_at: '2026-09-28T09:00:00',
    }], offset: 0, limit: 10, total_elements: 1, has_next: false,
  })
  mocks.navigateTo.mockReset()
  mocks.authUser = { id: 1, systemClientId: 7, role: 'manager', permissions: ['PRODUCT_READ', 'SALE_READ'] }
})

describe('DashboardScreen integrado ao resumo da API', () => {
  it('usa o resumo para KPIs, vendas e eventos, e recarrega o gráfico ao trocar período', async () => {
    const user = userEvent.setup()
    render(<DashboardScreen />)

    expect(await screen.findByText(/4\.200,00/)).toBeInTheDocument()
    expect(screen.getByText('18 venda(s)')).toBeInTheDocument()
    expect(screen.getByText(/48\.250,90/)).toBeInTheDocument()
    expect(screen.getByText('Produto atualizado #4')).toBeInTheDocument()
    expect(screen.getByText('2 itens estão no limite mínimo ou abaixo dele.')).toBeInTheDocument()
    expect(mocks.getDashboardSummary).toHaveBeenCalledWith(7, '7d')

    await user.click(screen.getByRole('button', { name: '30 dias' }))
    await waitFor(() => expect(mocks.getDashboardSummary).toHaveBeenLastCalledWith(7, '30d'))
    expect(screen.getAllByTitle(/R\$/)).toHaveLength(2)
  })

  it('abre os itens de estoque baixo e atualiza resumo/lista após editar um produto', async () => {
    const user = userEvent.setup()
    render(<DashboardScreen />)
    await user.click(await screen.findByRole('button', { name: 'Ver itens' }))
    expect(await screen.findByRole('dialog', { name: 'Itens com estoque baixo' })).toBeInTheDocument()
    expect(mocks.listLowStockProducts).toHaveBeenCalledWith(7, 0, 10)
    await user.click(await screen.findByRole('button', { name: 'Abrir detalhes' }))
    await user.click(screen.getByRole('button', { name: 'Salvar produto de teste' }))
    await waitFor(() => expect(mocks.getDashboardSummary).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(mocks.listLowStockProducts).toHaveBeenCalledTimes(2))
  })

  it('não exibe nem consulta itens de estoque sem PRODUCT_READ', async () => {
    const { rerender } = render(<DashboardScreen />)
    await screen.findByText('Produto atualizado #4')

    mocks.authUser = { id: 1, systemClientId: 7, role: 'viewer', permissions: ['SALE_READ'] }
    rerender(<DashboardScreen />)

    await waitFor(() => expect(screen.queryByText('Valor em estoque')).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Ver itens' })).not.toBeInTheDocument()
    expect(mocks.listLowStockProducts).not.toHaveBeenCalled()
  })
})
