import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductDto } from '../types/product'
import type { SaleChannel, SaleDto } from '../types/sale'
import { OrdersScreen } from './OrdersScreen'

const mocks = vi.hoisted(() => ({
  catalogRevision: 0,
  listProducts: vi.fn(),
  listSales: vi.fn(),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Usuário', systemClientId: 7, resource: {}, role: 'admin' },
    status: 'ready',
    skipAuth: false,
  }),
}))

vi.mock('../contexts/MercadoLivreSyncContext', () => ({
  useMercadoLivreSync: () => ({ catalogRevision: mocks.catalogRevision }),
}))

vi.mock('../services/productsApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/productsApi')>()
  return { ...original, listProducts: mocks.listProducts }
})

vi.mock('../services/salesApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('../services/salesApi')>()
  return { ...original, listSales: mocks.listSales }
})

function product(id: number, name: string): ProductDto {
  return {
    id,
    system_client_id: 7,
    name,
    description: '',
    price: 10,
    stock: 10,
    reserved_stock: 0,
    minimum_stock: 1,
    sku: `SKU-${id}`,
    resource: null,
    active: true,
    created_at: '2026-10-01T12:00:00',
  }
}

function sale(id: number, channel: SaleChannel): SaleDto {
  return {
    id,
    system_client_id: 7,
    product_id: id,
    quantity: 1,
    total_value: 10,
    resource: null,
    channel,
    external_reference_id: null,
    status: 'CONFIRMED',
    created_at: '2026-10-01T12:00:00',
    logs: [],
  }
}

const products = [
  product(1, 'Balcão físico'),
  product(2, 'Pedido manual'),
  product(3, 'Venda Mercado Livre'),
  product(4, 'Venda Shopee'),
  product(5, 'Venda canal futuro'),
]

const sales = [
  sale(1, 'PHYSICAL'),
  sale(2, 'MANUAL'),
  sale(3, 'MERCADO_LIVRE'),
  sale(4, 'SHOPEE'),
  sale(5, 'TIKTOK_SHOP' as SaleChannel),
]

beforeEach(() => {
  mocks.catalogRevision = 0
  mocks.listProducts.mockReset().mockResolvedValue({
    content: products,
    totalElements: products.length,
    totalPages: 1,
    number: 0,
    size: 200,
  })
  mocks.listSales.mockReset().mockResolvedValue({
    content: sales,
    totalElements: sales.length,
    totalPages: 1,
    number: 0,
    size: 200,
  })
})

describe('OrdersScreen channel filter', () => {
  it('shows all sales by default and exposes the selected option', async () => {
    render(<OrdersScreen />)

    expect(await screen.findByText('Balcão físico')).toBeInTheDocument()
    expect(screen.getByText('Pedido manual')).toBeInTheDocument()
    expect(screen.getByText('Venda Mercado Livre')).toBeInTheDocument()
    const filters = screen.getByRole('group', { name: 'Filtros de vendas' })
    expect(filters).toContainElement(
      screen.getByRole('combobox', { name: 'Filtrar por canal' }),
    )
    expect(filters).toContainElement(screen.getByRole('searchbox', { name: 'Buscar vendas' }))
    expect(screen.getByRole('combobox', { name: 'Filtrar por canal' })).toHaveValue('all')
  })

  it('groups PHYSICAL and MANUAL under Loja física', async () => {
    const user = userEvent.setup()
    render(<OrdersScreen />)
    const filter = await screen.findByRole('combobox', { name: 'Filtrar por canal' })

    await user.selectOptions(filter, 'physical')

    expect(filter).toHaveValue('physical')
    expect(screen.getByText('Balcão físico')).toBeInTheDocument()
    expect(screen.getByText('Pedido manual')).toBeInTheDocument()
    expect(screen.queryByText('Venda Mercado Livre')).not.toBeInTheDocument()
  })

  it('groups Mercado Livre and future integrated channels under Marketplaces', async () => {
    const user = userEvent.setup()
    render(<OrdersScreen />)
    const filter = await screen.findByRole('combobox', { name: 'Filtrar por canal' })

    await user.selectOptions(filter, 'marketplace')

    expect(filter).toHaveValue('marketplace')
    expect(screen.getByText('Venda Mercado Livre')).toBeInTheDocument()
    expect(screen.getByText('Venda Shopee')).toBeInTheDocument()
    expect(screen.getByText('Venda canal futuro')).toBeInTheDocument()
    expect(screen.queryByText('Balcão físico')).not.toBeInTheDocument()
    expect(screen.queryByText('Pedido manual')).not.toBeInTheDocument()
  })

  it('combines the channel filter with search', async () => {
    const user = userEvent.setup()
    render(<OrdersScreen />)

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Filtrar por canal' }),
      'physical',
    )
    await user.type(screen.getByRole('searchbox', { name: 'Buscar vendas' }), 'loja fisica')

    expect(screen.getByText('Balcão físico')).toBeInTheDocument()
    expect(screen.queryByText('Pedido manual')).not.toBeInTheDocument()
    expect(screen.queryByText('Venda Mercado Livre')).not.toBeInTheDocument()
  })

  it('returns to the first page when the filter changes', async () => {
    const user = userEvent.setup()
    const pagedProducts = Array.from({ length: 9 }, (_, index) =>
      product(index + 1, `Produto ${index + 1}`),
    )
    const pagedSales = [
      ...Array.from({ length: 8 }, (_, index) => sale(index + 1, 'MERCADO_LIVRE')),
      sale(9, 'PHYSICAL'),
    ]
    mocks.listProducts.mockResolvedValue({
      content: pagedProducts,
      totalElements: 9,
      totalPages: 1,
      number: 0,
      size: 200,
    })
    mocks.listSales.mockResolvedValue({
      content: pagedSales,
      totalElements: 9,
      totalPages: 1,
      number: 0,
      size: 200,
    })
    render(<OrdersScreen />)

    await screen.findByText('Produto 1')
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    expect(screen.getByText('Produto 9')).toBeInTheDocument()

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filtrar por canal' }),
      'physical',
    )

    expect(screen.getByText('Mostrando 1 a 1 de 1')).toBeInTheDocument()
    expect(screen.getByText('Produto 9')).toBeInTheDocument()
  })

  it('keeps the selected filter while synchronization refreshes the data', async () => {
    const user = userEvent.setup()
    const view = render(<OrdersScreen />)
    const filter = await screen.findByRole('combobox', { name: 'Filtrar por canal' })
    await user.selectOptions(filter, 'physical')

    mocks.catalogRevision = 1
    view.rerender(<OrdersScreen />)

    await waitFor(() => expect(mocks.listSales).toHaveBeenCalledTimes(2))
    expect(filter).toHaveValue('physical')
    expect(screen.getByText('Balcão físico')).toBeInTheDocument()
    expect(screen.queryByText('Venda Mercado Livre')).not.toBeInTheDocument()
  })

  it('can be reached with keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<OrdersScreen />)
    const filter = await screen.findByRole('combobox', { name: 'Filtrar por canal' })

    await user.tab()
    await user.tab()
    await user.tab()
    expect(filter).toHaveFocus()
  })
})
