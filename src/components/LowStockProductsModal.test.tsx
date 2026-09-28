import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LowStockProductsModal } from './LowStockProductsModal'

const mocks = vi.hoisted(() => ({ listLowStockProducts: vi.fn(), onClose: vi.fn(), onViewProduct: vi.fn() }))
vi.mock('../services/productsApi', () => ({ listLowStockProducts: mocks.listLowStockProducts }))

const product = {
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
}

beforeEach(() => {
  mocks.listLowStockProducts.mockReset()
  mocks.onClose.mockReset()
  mocks.onViewProduct.mockReset()
})

const renderModal = () => render(
  <LowStockProductsModal open systemClientId={7} onClose={mocks.onClose} onViewProduct={mocks.onViewProduct} />,
)

describe('LowStockProductsModal', () => {
  it('mostra carregamento, dados do item, paginação e encaminha para detalhes', async () => {
    let resolvePage!: (value: unknown) => void
    mocks.listLowStockProducts.mockReturnValueOnce(new Promise((resolve) => { resolvePage = resolve }))
    const user = userEvent.setup()
    renderModal()

    expect(screen.getByRole('status')).toHaveTextContent('Carregando itens')
    resolvePage({ content: [product], offset: 0, limit: 10, total_elements: 11, has_next: true })

    expect(await screen.findByText('Cabo USB-C')).toBeInTheDocument()
    expect(screen.getByText(/CB-21/)).toBeInTheDocument()
    expect(screen.getByText('Estoque físico')).toBeInTheDocument()
    expect(screen.getByText('Reservado')).toBeInTheDocument()
    expect(screen.getByText('Disponível')).toBeInTheDocument()
    expect(screen.getByText('Mínimo')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir detalhes' }))
    expect(mocks.onViewProduct).toHaveBeenCalledWith(product)

    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    await waitFor(() => expect(mocks.listLowStockProducts).toHaveBeenLastCalledWith(7, 10, 10))
  })

  it('apresenta estado vazio quando não existem produtos', async () => {
    mocks.listLowStockProducts.mockResolvedValue({ content: [], offset: 0, limit: 10, total_elements: 0, has_next: false })
    renderModal()
    expect(await screen.findByText('Nenhum produto com estoque baixo.')).toBeInTheDocument()
  })

  it('apresenta erro e permite repetir o carregamento', async () => {
    mocks.listLowStockProducts
      .mockRejectedValueOnce(new Error('Falha temporária'))
      .mockResolvedValueOnce({ content: [product], offset: 0, limit: 10, total_elements: 1, has_next: false })
    const user = userEvent.setup()
    renderModal()
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha temporária')
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('Cabo USB-C')).toBeInTheDocument()
    expect(mocks.listLowStockProducts).toHaveBeenCalledTimes(2)
  })
})
