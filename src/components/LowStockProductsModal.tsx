import { useCallback, useEffect, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiRefreshCw, FiX } from 'react-icons/fi'
import { listLowStockProducts } from '../services/productsApi'
import type { ProductDto } from '../types/product'

const PAGE_SIZE = 10
const NUM = new Intl.NumberFormat('pt-BR')

type LowStockProductsModalProps = {
  open: boolean
  systemClientId: number
  onClose: () => void
  onViewProduct: (product: ProductDto) => void
}

export function LowStockProductsModal({
  open,
  systemClientId,
  onClose,
  onViewProduct,
}: LowStockProductsModalProps) {
  const [products, setProducts] = useState<ProductDto[]>([])
  const [offset, setOffset] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPage = useCallback(async (pageOffset: number) => {
    setLoading(true)
    setError(null)
    try {
      const page = await listLowStockProducts(systemClientId, pageOffset, PAGE_SIZE)
      setProducts(page.content)
      setOffset(page.offset)
      setTotalElements(page.total_elements)
      setHasNext(page.has_next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os itens com estoque baixo.')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [systemClientId])

  useEffect(() => {
    if (open) void loadPage(0)
  }, [open, loadPage])

  if (!open) return null

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE))

  return (
    <div style={styles.overlay} onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="low-stock-title"
        style={styles.modal}
        onClick={(event) => event.stopPropagation()}
      >
        <header style={styles.header}>
          <div>
            <h2 id="low-stock-title" style={styles.title}>Itens com estoque baixo</h2>
            <p style={styles.subtitle}>Produtos no limite mínimo ou abaixo dele.</p>
          </div>
          <button type="button" style={styles.closeButton} onClick={onClose} aria-label="Fechar">
            <FiX size={20} />
          </button>
        </header>

        {loading ? (
          <div style={styles.state} role="status">
            <FiRefreshCw size={22} style={styles.spinner} />
            <span>Carregando itens…</span>
          </div>
        ) : error ? (
          <div style={styles.error} role="alert">
            <p>{error}</p>
            <button type="button" style={styles.retryButton} onClick={() => void loadPage(offset)}>
              Tentar novamente
            </button>
          </div>
        ) : products.length === 0 ? (
          <div style={styles.state}>Nenhum produto com estoque baixo.</div>
        ) : (
          <>
            <div style={styles.list}>
              {products.map((product) => {
                const available = product.available_stock ?? Math.max(0, product.stock - product.reserved_stock)
                return (
                  <article key={product.id} style={styles.productRow}>
                    <div style={styles.productHeading}>
                      <div style={styles.productName}>{product.name}</div>
                      <div style={styles.sku}>SKU: {product.sku}</div>
                    </div>
                    <dl style={styles.metrics}>
                      <Metric label="Estoque físico" value={product.stock} />
                      <Metric label="Reservado" value={product.reserved_stock} />
                      <Metric label="Disponível" value={available} />
                      <Metric label="Mínimo" value={product.minimum_stock ?? 0} />
                    </dl>
                    <button type="button" style={styles.detailsButton} onClick={() => onViewProduct(product)}>
                      Abrir detalhes
                    </button>
                  </article>
                )
              })}
            </div>
            <footer style={styles.pagination}>
              <span style={styles.pageInfo}>
                {NUM.format(totalElements)} itens · Página {NUM.format(currentPage)} de {NUM.format(totalPages)}
              </span>
              <div style={styles.pageActions}>
                <button
                  type="button"
                  style={styles.pageButton}
                  aria-label="Página anterior"
                  disabled={loading || offset === 0}
                  onClick={() => void loadPage(Math.max(0, offset - PAGE_SIZE))}
                >
                  <FiChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  style={styles.pageButton}
                  aria-label="Próxima página"
                  disabled={loading || !hasNext}
                  onClick={() => void loadPage(offset + PAGE_SIZE)}
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.metric}>
      <dt style={styles.metricLabel}>{label}</dt>
      <dd style={styles.metricValue}>{NUM.format(value)}</dd>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 1050,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
  },
  modal: {
    width: '100%',
    maxWidth: '760px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    padding: '24px',
    borderRadius: '16px',
    backgroundColor: '#ffffff',
    boxShadow: '0 24px 70px rgba(15, 23, 42, 0.25)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '20px',
  },
  title: { margin: 0, fontSize: '21px', color: '#0f172a' },
  subtitle: { margin: '6px 0 0', fontSize: '13px', color: '#64748b' },
  closeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    border: '0',
    borderRadius: '9px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    cursor: 'pointer',
  },
  state: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    minHeight: '180px',
    color: '#64748b',
    fontSize: '14px',
  },
  spinner: { animation: 'spin 1s linear infinite' },
  error: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    minHeight: '180px',
    color: '#b91c1c',
    textAlign: 'center' as const,
  },
  retryButton: {
    border: 0,
    borderRadius: '8px',
    padding: '9px 14px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  list: { display: 'flex', flexDirection: 'column' as const, gap: '10px' },
  productRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(130px, 1fr) 2fr auto',
    alignItems: 'center',
    gap: '14px',
    padding: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
  },
  productHeading: { minWidth: 0 },
  productName: { color: '#0f172a', fontSize: '14px', fontWeight: 700 },
  sku: { marginTop: '4px', color: '#64748b', fontSize: '12px', overflowWrap: 'anywhere' as const },
  metrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(60px, 1fr))',
    gap: '8px',
    margin: 0,
  },
  metric: { display: 'flex', flexDirection: 'column' as const, gap: '4px' },
  metricLabel: { color: '#64748b', fontSize: '10px' },
  metricValue: { color: '#0f172a', fontSize: '13px', fontWeight: 700 },
  detailsButton: {
    border: '1px solid #c7d2fe',
    borderRadius: '8px',
    padding: '8px 10px',
    backgroundColor: '#eef2ff',
    color: '#4338ca',
    fontSize: '12px',
    fontWeight: 700,
    whiteSpace: 'nowrap' as const,
    cursor: 'pointer',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginTop: '16px',
    paddingTop: '14px',
    borderTop: '1px solid #e2e8f0',
  },
  pageInfo: { color: '#64748b', fontSize: '12px' },
  pageActions: { display: 'flex', gap: '8px' },
  pageButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '34px',
    height: '34px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    backgroundColor: '#fff',
    color: '#334155',
    cursor: 'pointer',
  },
}
