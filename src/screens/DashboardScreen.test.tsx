import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardScreen } from './DashboardScreen'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  getDashboardSummary: vi.fn(),
  getDashboardAnalytics: vi.fn(),
  listLowStockProducts: vi.fn(),
  navigateTo: vi.fn(),
  authUser: {
    id: 1,
    systemClientId: 7,
    role: 'manager',
    permissions: ['PRODUCT_READ', 'SALE_READ'],
  },
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.authUser }),
}))
vi.mock('../contexts/AppNavigationContext', () => ({
  useAppNavigation: () => ({ navigateTo: mocks.navigateTo }),
}))
vi.mock('../contexts/MercadoLivreSyncContext', () => ({
  useMercadoLivreSync: () => ({ catalogRevision: 0, syncNow: vi.fn(), isSyncing: false }),
}))
vi.mock('../services/dashboardApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/dashboardApi')>()
  return {
    ...original,
    getDashboardSummary: mocks.getDashboardSummary,
    getDashboardAnalytics: mocks.getDashboardAnalytics,
  }
})
vi.mock('../services/productsApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/productsApi')>()
  return { ...original, listLowStockProducts: mocks.listLowStockProducts }
})
vi.mock('../components/GenerateReportModal', () => ({ GenerateReportModal: () => null }))
vi.mock('../components/ProductDetailDialog', () => ({
  ProductDetailDialog: ({ onChanged }: { onChanged: () => void }) => (
    <button type="button" onClick={onChanged}>
      Salvar produto de teste
    </button>
  ),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

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
    { id: 'USER:2', entityType: 'USER', entityId: 2, action: 'UPDATED', createdAt: '2026-09-28T07:00:00' },
    { id: 'INTEGRATION:1', entityType: 'INTEGRATION', entityId: 1, action: 'CREATE', createdAt: '2026-09-28T06:00:00' },
    { id: 'LISTING:3', entityType: 'LISTING', entityId: 3, action: 'UPDATED', createdAt: '2026-09-28T05:00:00' },
  ],
}

const analytics = {
  inventoryByDay: [
    { date: '2026-09-27', quantity: 50, value: 5000 },
    { date: '2026-09-28', quantity: 48, value: 4825.09 },
  ],
  sponsoredSalesByDay: [],
}

beforeEach(() => {
  mocks.getDashboardSummary.mockReset().mockResolvedValue(summary)
  mocks.getDashboardAnalytics.mockReset().mockResolvedValue(analytics)
  mocks.listLowStockProducts.mockReset().mockResolvedValue({
    content: [
      {
        id: 21,
        name: 'Cabo USB-C',
        sku: 'CB-21',
        description: '',
        stock: 8,
        reserved_stock: 2,
        available_stock: 6,
        minimum_stock: 7,
        low_stock: true,
        price: 20,
        resource: null,
        system_client_id: 7,
        active: true,
        created_at: '2026-09-28T09:00:00',
      },
    ],
    offset: 0,
    limit: 10,
    total_elements: 1,
    has_next: false,
  })
  mocks.navigateTo.mockReset()
  mocks.authUser = {
    id: 1,
    systemClientId: 7,
    role: 'manager',
    permissions: ['PRODUCT_READ', 'SALE_READ'],
  }
})

// ─── Testes de cards KPI ──────────────────────────────────────────────────────

describe('Cards KPI', () => {
  it('não renderiza o card "Total de produtos"', async () => {
    render(<DashboardScreen />)
    await screen.findByText(/4\.200,00/)
    expect(screen.queryByText('Produtos')).not.toBeInTheDocument()
  })

  it('renderiza os quatro cards corretos com dados da API', async () => {
    render(<DashboardScreen />)

    // Vendas hoje: valor + quantidade
    expect(await screen.findByText(/4\.200,00/)).toBeInTheDocument()
    expect(screen.getByText('18 venda(s)')).toBeInTheDocument()

    // Estoque total
    expect(screen.getByText('Estoque total')).toBeInTheDocument()
    expect(screen.getByText('48')).toBeInTheDocument()

    // Valor em estoque
    expect(screen.getByText(/48\.250,90/)).toBeInTheDocument()

    // Anúncios ativos
    expect(screen.getByText('Anúncios ativos')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('os quatro cards usam somente dados da API (consultou getDashboardSummary)', async () => {
    render(<DashboardScreen />)
    await screen.findByText(/4\.200,00/)
    expect(mocks.getDashboardSummary).toHaveBeenCalledWith(7, '7d')
  })

  it('exibe valores monetários em real brasileiro (formato pt-BR com vírgula decimal)', async () => {
    render(<DashboardScreen />)
    // O valor 4200 deve ser formatado como "4.200,00" (separador de milhar = ponto, decimal = vírgula) em pt-BR
    expect(await screen.findByText(/4\.200,00/)).toBeInTheDocument()
    // O valor 48250.9 deve ser "48.250,90"
    expect(screen.getByText(/48\.250,90/)).toBeInTheDocument()
  })
})

// ─── Teste de período ─────────────────────────────────────────────────────────

describe('Seletor de período', () => {
  it('recarrega o gráfico de vendas ao trocar período', async () => {
    const user = userEvent.setup()
    render(<DashboardScreen />)
    await screen.findByText(/4\.200,00/)

    expect(mocks.getDashboardSummary).toHaveBeenCalledWith(7, '7d')

    await user.click(screen.getByRole('button', { name: '30 dias' }))
    await waitFor(() => expect(mocks.getDashboardSummary).toHaveBeenLastCalledWith(7, '30d'))
    await waitFor(() => expect(mocks.getDashboardAnalytics).toHaveBeenLastCalledWith(7, '30d'))
  })

  it('gráfico de estoque responde ao período selecionado', async () => {
    const user = userEvent.setup()
    render(<DashboardScreen />)
    await screen.findByText('Estoque por dia')

    expect(mocks.getDashboardAnalytics).toHaveBeenCalledWith(7, '7d')
    await user.click(screen.getByRole('button', { name: '30 dias' }))
    await waitFor(() => expect(mocks.getDashboardAnalytics).toHaveBeenLastCalledWith(7, '30d'))
  })
})

// ─── Gráficos ─────────────────────────────────────────────────────────────────

describe('Gráficos', () => {
  it('exibe o gráfico de estoque por dia quando analytics tem dados', async () => {
    render(<DashboardScreen />)
    expect(await screen.findByRole('article', { name: 'Histórico de estoque' })).toBeInTheDocument()
    expect(screen.getByText('Estoque por dia')).toBeInTheDocument()
  })

  it('exibe "Sem histórico de estoque" quando inventoryByDay está vazio', async () => {
    mocks.getDashboardAnalytics.mockResolvedValue({ inventoryByDay: [], sponsoredSalesByDay: [] })
    render(<DashboardScreen />)
    expect(
      await screen.findByText('Sem histórico de estoque para o período.'),
    ).toBeInTheDocument()
  })

  it('exibe erro de carregamento do gráfico de estoque quando analytics falha', async () => {
    mocks.getDashboardAnalytics.mockRejectedValue(new Error('Timeout de rede'))
    render(<DashboardScreen />)
    expect(await screen.findByText('Timeout de rede')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('NÃO exibe o gráfico de vendas patrocinadas quando sponsoredSalesByDay está vazio', async () => {
    render(<DashboardScreen />)
    await screen.findByText('Estoque por dia')
    expect(screen.queryByText('Vendas patrocinadas')).not.toBeInTheDocument()
  })

  it('exibe o gráfico de vendas patrocinadas somente quando há dados reais', async () => {
    mocks.getDashboardAnalytics.mockResolvedValue({
      inventoryByDay: [],
      sponsoredSalesByDay: [{ date: '2026-09-28', count: 3, total: 600 }],
    })
    render(<DashboardScreen />)
    expect(await screen.findByText('Vendas patrocinadas')).toBeInTheDocument()
  })

  it('mantém o gráfico de vendas por dia', async () => {
    render(<DashboardScreen />)
    expect(await screen.findByRole('article', { name: 'Vendas por dia' })).toBeInTheDocument()
    expect(screen.getByText('Vendas por dia')).toBeInTheDocument()
  })

  it('exibe "Sem vendas no período" quando salesByDay está vazio', async () => {
    mocks.getDashboardSummary.mockResolvedValue({ ...summary, salesByDay: [] })
    render(<DashboardScreen />)
    expect(await screen.findByText('Sem vendas no período.')).toBeInTheDocument()
  })

  it('exibe carregamento no gráfico de estoque enquanto analytics não retorna', async () => {
    mocks.getDashboardAnalytics.mockImplementation(() => new Promise(() => {}))
    render(<DashboardScreen />)
    expect(await screen.findByText('Carregando...')).toBeInTheDocument()
  })
})

describe('Layout responsivo', () => {
  it('aplica classes de layout desktop/mobile no painel', async () => {
    const { container } = render(<DashboardScreen />)
    await screen.findByText(/4\.200,00/)
    expect(container.querySelector('.dashboard-page')).toBeInTheDocument()
    expect(container.querySelector('.dashboard-kpi-grid')).toBeInTheDocument()
    expect(container.querySelector('.dashboard-bottom-grid')).toBeInTheDocument()
    expect(container.querySelector('.dashboard-analytics-grid')).toBeInTheDocument()
    expect(container.querySelector('.dashboard-chart-scroll')).toBeInTheDocument()
  })
})

// ─── Eventos recentes (audit_logs) ────────────────────────────────────────────

describe('Eventos recentes (audit_logs)', () => {
  it('exibe todas as entidades retornadas pela auditoria', async () => {
    render(<DashboardScreen />)
    await screen.findByText(/4\.200,00/)

    // SALE → order
    expect(screen.getByText('Venda criado(a) #8')).toBeInTheDocument()
    // PRODUCT → product
    expect(screen.getByText('Produto atualizado(a) #4')).toBeInTheDocument()
    // USER
    expect(screen.getByText('Usuário atualizado(a) #2')).toBeInTheDocument()
    // INTEGRATION
    expect(screen.getByText('Integração criado(a) #1')).toBeInTheDocument()
    // LISTING
    expect(screen.getByText('Anúncio atualizado(a) #3')).toBeInTheDocument()
  })

  it('banner de estoque baixo exibe o número correto', async () => {
    render(<DashboardScreen />)
    expect(
      await screen.findByText('2 itens estão no limite mínimo ou abaixo dele.'),
    ).toBeInTheDocument()
  })
})

// ─── Permissões ───────────────────────────────────────────────────────────────

describe('Permissões', () => {
  it('sem PRODUCT_READ: não exibe cards de estoque/anúncios nem eventos de produto', async () => {
    mocks.authUser = { id: 1, systemClientId: 7, role: 'viewer', permissions: ['SALE_READ'] }
    render(<DashboardScreen />)

    // Deve exibir o card de vendas (único sem restrição de PRODUCT_READ)
    expect(await screen.findByText('Vendas (hoje)')).toBeInTheDocument()

    // Não deve exibir cards de produto/estoque
    expect(screen.queryByText('Estoque total')).not.toBeInTheDocument()
    expect(screen.queryByText('Valor em estoque')).not.toBeInTheDocument()
    expect(screen.queryByText('Anúncios ativos')).not.toBeInTheDocument()

    // Não deve exibir gráfico de estoque
    expect(screen.queryByText('Estoque por dia')).not.toBeInTheDocument()

    // Não deve chamar getDashboardAnalytics
    expect(mocks.getDashboardAnalytics).not.toHaveBeenCalled()

    // Não deve exibir evento de produto
    expect(screen.queryByText('Produto atualizado(a) #4')).not.toBeInTheDocument()
  })

  it('sem PRODUCT_READ: não exibe o banner de estoque baixo nem o botão Ver itens', async () => {
    mocks.authUser = { id: 1, systemClientId: 7, role: 'viewer', permissions: ['SALE_READ'] }
    render(<DashboardScreen />)
    await screen.findByText('Vendas (hoje)')
    expect(screen.queryByRole('button', { name: 'Ver itens' })).not.toBeInTheDocument()
    expect(mocks.listLowStockProducts).not.toHaveBeenCalled()
  })

  it('com PRODUCT_READ: exibe todos os quatro cards e o gráfico de estoque', async () => {
    render(<DashboardScreen />)
    await screen.findByText(/4\.200,00/)
    expect(screen.getByText('Estoque total')).toBeInTheDocument()
    expect(screen.getByText('Valor em estoque')).toBeInTheDocument()
    expect(screen.getByText('Anúncios ativos')).toBeInTheDocument()
    expect(await screen.findByText('Estoque por dia')).toBeInTheDocument()
  })

  it('usuário sem permissão não recebe dados analíticos', async () => {
    mocks.authUser = { id: 1, systemClientId: 7, role: 'viewer', permissions: ['SALE_READ'] }
    render(<DashboardScreen />)
    await screen.findByText('Vendas (hoje)')
    expect(mocks.getDashboardAnalytics).not.toHaveBeenCalled()
  })
})

// ─── Integração completa ──────────────────────────────────────────────────────

describe('Integração', () => {
  it('abre itens de estoque baixo e atualiza resumo/lista após editar produto', async () => {
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

  it('exibe estado de erro global com botão de retry quando summary falha', async () => {
    mocks.getDashboardSummary.mockRejectedValue(new Error('Falha de conexão'))
    const user = userEvent.setup()
    render(<DashboardScreen />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Não foi possível carregar o painel')).toBeInTheDocument()
    expect(screen.getByText('Falha de conexão')).toBeInTheDocument()

    // Retry
    mocks.getDashboardSummary.mockResolvedValue(summary)
    await user.click(screen.getByRole('button', { name: /Tentar novamente/ }))
    expect(await screen.findByText(/4\.200,00/)).toBeInTheDocument()
  })
})
