import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiBox,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiPlus,
  FiSearch,
  FiSliders,
  FiTrendingDown,
  FiTrendingUp,
} from 'react-icons/fi'
import { AddProductModal, type NewProductData } from '../components/AddProductModal'
import { ProductDetailDialog } from '../components/ProductDetailDialog'
import { ProductImageThumb } from '../components/ProductImageThumb'
import { StockEmptyState } from '../components/StockEmptyState'
import { useAuth } from '../contexts/AuthContext'
import { parseUserRole } from '../lib/userResource'
import { readMercadoLivreIntegration } from '../lib/mercadoLivreStorage'
import { getProductImageUrl } from '../lib/productImage'
import { formatRelative } from '../lib/relativeTime'
import { createProduct, listProducts } from '../services/productsApi'
import type { ProductCreateRequest, ProductDto } from '../types/product'

type ProductStatus = 'healthy' | 'low_stock' | 'out_of_stock'

type MarketplaceBadge = {
  letter: string
  color: string
}

type TableRow = {
  id: number
  name: string
  sku: string
  imageUrl: string | null
  availableQty: number
  marketplaces: MarketplaceBadge[]
  lastUpdate: string
  status: ProductStatus
}

const ML_BADGE: MarketplaceBadge = { letter: 'M', color: '#22c55e' }

const ITEMS_PER_PAGE = 5

const STATUS_CONFIG: Record<ProductStatus, { label: string; bg: string; color: string }> = {
  healthy: { label: 'Normal', bg: '#dcfce7', color: '#166534' },
  low_stock: { label: 'Estoque baixo', bg: '#fef3c7', color: '#92400e' },
  out_of_stock: { label: 'Sem estoque', bg: '#fee2e2', color: '#991b1b' },
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function deriveStatus(availableQty: number): ProductStatus {
  if (availableQty === 0) return 'out_of_stock'
  if (availableQty < 10) return 'low_stock'
  return 'healthy'
}

function toTableRow(p: ProductDto): TableRow {
  const availableQty = Math.max(0, p.stock - p.reserved_stock)
  const mlResource = p.resource?.mercado_livre as Record<string, unknown> | undefined
  const marketplaces: MarketplaceBadge[] =
    mlResource?.item_id != null ? [ML_BADGE] : []

  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    imageUrl: getProductImageUrl(p),
    availableQty,
    marketplaces,
    lastUpdate: formatRelative(p.created_at),
    status: deriveStatus(availableQty),
  }
}

export function StockScreen() {
  const { user } = useAuth()
  const systemClientId = user?.systemClientId ?? null
  const canWrite = parseUserRole(
    user ? { ...user.resource, role: user.role ?? user.resource.role } : null,
  ) !== 'viewer'

  const [products, setProducts] = useState<ProductDto[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const mlIntegration = readMercadoLivreIntegration()
  const mlConnected =
    mlIntegration != null &&
    systemClientId != null &&
    Number(mlIntegration.systemClientId) === Number(systemClientId) &&
    mlIntegration.active === true

  const fetchProducts = useCallback(async () => {
    if (systemClientId == null) return
    setLoading(true)
    setError(null)
    try {
      const page = await listProducts(systemClientId, 0, 200)
      setProducts(page.content)
      setTotalElements(page.totalElements)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar produtos.')
    } finally {
      setLoading(false)
    }
  }, [systemClientId])

  useEffect(() => {
    void fetchProducts()
  }, [fetchProducts])

  const handleAddProduct = useCallback(async (data: NewProductData) => {
    if (systemClientId == null) return
    setCreateSubmitting(true)
    setCreateError(null)
    try {
      // Only set announcement=true when mlMetadata is actually present — defensive guard
      const hasMLMetadata = data.mlMetadata != null
      const resource: Record<string, unknown> = {}
      if (data.imageResource?.length) resource.images = data.imageResource
      if (hasMLMetadata) resource.mercado_livre = data.mlMetadata
      const payload: ProductCreateRequest = {
        system_client_id: systemClientId,
        name: data.name,
        sku: data.sku,
        description: data.description,
        stock: data.stock,
        reserved_stock: data.reservedStock,
        price: data.price,
        announcement: data.announcement && hasMLMetadata,
        resource,
      }
      await createProduct(systemClientId, payload)
      setShowAddModal(false)
      await fetchProducts()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Não foi possível criar o produto.')
    } finally {
      setCreateSubmitting(false)
    }
  }, [systemClientId, fetchProducts])

  const handleConnectML = () => {
    window.alert('Acesse a tela "Marketplaces" para conectar sua conta do Mercado Livre.')
  }

  const rows = useMemo<TableRow[]>(() => products.map(toTableRow), [products])

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows
    const q = searchQuery.toLowerCase()
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q)
    )
  }, [rows, searchQuery])

  const totalPages = Math.ceil(filteredRows.length / ITEMS_PER_PAGE)
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredRows.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredRows, currentPage])

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  )

  const summaryStats = useMemo(() => {
    const lowStock = rows.filter((r) => r.status === 'low_stock').length
    const outOfStock = rows.filter((r) => r.status === 'out_of_stock').length
    const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0)
    return { totalSkus: totalElements, lowStock, outOfStock, totalValue }
  }, [rows, products, totalElements])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  const renderPaginationButtons = () => {
    const buttons: React.ReactNode[] = []

    buttons.push(
      <button
        key="prev"
        type="button"
        style={{ ...styles.pageBtn, ...(currentPage === 1 ? styles.pageBtnDisabled : {}) }}
        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        aria-label="Página anterior"
      >
        <FiChevronLeft size={16} />
      </button>
    )

    const maxVisible = 3
    const pages: (number | 'ellipsis')[] = []
    for (let i = 1; i <= Math.min(maxVisible, totalPages); i++) pages.push(i)
    if (totalPages > maxVisible + 1) pages.push('ellipsis')
    if (totalPages > maxVisible) pages.push(totalPages)

    for (const page of pages) {
      if (page === 'ellipsis') {
        buttons.push(
          <span key="ellipsis" style={styles.ellipsis}>...</span>
        )
      } else {
        const isActive = page === currentPage
        buttons.push(
          <button
            key={page}
            type="button"
            style={{ ...styles.pageBtn, ...(isActive ? styles.pageBtnActive : {}) }}
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </button>
        )
      }
    }

    buttons.push(
      <button
        key="next"
        type="button"
        style={{
          ...styles.pageBtn,
          ...(currentPage === totalPages || totalPages === 0 ? styles.pageBtnDisabled : {}),
        }}
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages || totalPages === 0}
        aria-label="Próxima página"
      >
        <FiChevronRight size={16} />
      </button>
    )

    return buttons
  }

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.searchWrap}>
          <FiSearch size={18} color="#9ca3af" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Buscar por nome ou SKU..."
            value={searchQuery}
            onChange={handleSearch}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.topBarRight}>
          <div style={styles.userInfo}>
            <div style={styles.userText}>
              <span style={styles.userName}>{user?.name ?? '—'}</span>
              <span style={styles.userRole}>OmniSync</span>
            </div>
            <div style={styles.avatar}>
              <FiBox size={18} color="#fff" />
            </div>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner} role="alert">
          <span>{error}</span>
          <button
            type="button"
            style={styles.retryBtn}
            onClick={() => void fetchProducts()}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>TOTAL DE SKUS</span>
          <div style={styles.summaryBottom}>
            <span style={styles.summaryValue}>
              {loading ? '…' : summaryStats.totalSkus.toLocaleString('pt-BR')}
            </span>
            <span style={styles.trendNeutral}>produtos ativos</span>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>ALERTAS DE ESTOQUE</span>
          <div style={styles.summaryBottom}>
            <span style={styles.summaryValue}>
              {loading ? '…' : summaryStats.lowStock}
            </span>
            {summaryStats.lowStock > 0 ? (
              <span style={styles.trendDown}>
                <FiTrendingDown size={14} />
                atenção
              </span>
            ) : (
              <span style={styles.trendUp}>
                <FiTrendingUp size={14} />
                ok
              </span>
            )}
          </div>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>SEM ESTOQUE</span>
          <div style={styles.summaryBottom}>
            <span style={styles.summaryValue}>
              {loading ? '…' : summaryStats.outOfStock}
            </span>
            <span style={styles.trendNeutral}>
              {summaryStats.outOfStock === 0 ? 'Nenhum' : 'repor estoque'}
            </span>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>VALOR EM ESTOQUE</span>
          <div style={styles.summaryBottom}>
            <span style={styles.summaryValue}>
              {loading ? '…' : BRL.format(summaryStats.totalValue)}
            </span>
            <span style={styles.trendNeutral}>estimado</span>
          </div>
        </div>
      </div>

      {/* Inventory overview header */}
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Visão do estoque</h2>
          <p style={styles.sectionSubtitle}>Gerencie seus produtos cadastrados</p>
        </div>
        <div style={styles.sectionActions}>
          <button type="button" style={styles.filterBtn}>
            <FiSliders size={16} />
            Filtros
          </button>
          <button type="button" style={styles.exportBtn}>
            <FiDownload size={16} />
            Exportar CSV
          </button>
          {canWrite && (
            <button type="button" style={styles.addProductBtn} onClick={() => setShowAddModal(true)}>
              <FiPlus size={18} />
              Adicionar produto
            </button>
          )}
        </div>
      </div>

      {/* Loading spinner */}
      {loading && (
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} aria-label="Carregando produtos" />
          <span style={styles.loadingText}>Carregando produtos…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && totalElements === 0 && (
        <StockEmptyState
          mlConnected={mlConnected}
          onConnectML={handleConnectML}
          onAddManual={() => setShowAddModal(true)}
          canWrite={canWrite}
        />
      )}

      {/* Products table */}
      {!loading && totalElements > 0 && (
        <>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, ...styles.thFirst }}>PRODUTO</th>
                  <th style={styles.th}>SKU</th>
                  <th style={styles.th}>QTD DISPONÍVEL</th>
                  <th style={styles.th}>MARKETPLACES</th>
                  <th style={styles.th}>ADICIONADO</th>
                  <th style={{ ...styles.th, ...styles.thLast }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => {
                  const statusCfg = STATUS_CONFIG[row.status]
                  return (
                    <tr
                      key={row.id}
                      style={styles.trClickable}
                      onClick={() => setSelectedProductId(row.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedProductId(row.id)
                        }
                      }}
                    >
                      <td style={{ ...styles.td, ...styles.tdFirst }}>
                        <div style={styles.productNameCell}>
                          <ProductImageThumb src={row.imageUrl} alt={row.name} size={40} />
                          <span style={styles.productName}>{row.name}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.skuText}>{row.sku}</span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.stockText,
                            color:
                              row.availableQty === 0
                                ? '#dc2626'
                                : row.availableQty < 10
                                  ? '#d97706'
                                  : '#111827',
                          }}
                        >
                          {row.availableQty} un.
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.badgesWrap}>
                          {row.marketplaces.length > 0 ? (
                            row.marketplaces.map((m, i) => (
                              <span
                                key={`${row.id}-${m.letter}-${i}`}
                                style={{ ...styles.marketplaceBadge, backgroundColor: m.color }}
                              >
                                {m.letter}
                              </span>
                            ))
                          ) : (
                            <span style={styles.noBadgeText}>—</span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.lastUpdateText}>{row.lastUpdate}</span>
                      </td>
                      <td style={{ ...styles.td, ...styles.tdLast }}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            backgroundColor: statusCfg.bg,
                            color: statusCfg.color,
                          }}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={styles.pagination}>
            <span style={styles.paginationInfo}>
              Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredRows.length)} de{' '}
              {filteredRows.length} resultados
            </span>
            <div style={styles.paginationBtns}>{renderPaginationButtons()}</div>
          </div>
        </>
      )}

      <AddProductModal
        open={showAddModal}
        onClose={() => {
          if (!createSubmitting) {
            setShowAddModal(false)
            setCreateError(null)
          }
        }}
        onSubmit={handleAddProduct}
        mlConnected={mlConnected}
        systemClientId={systemClientId}
        submitting={createSubmitting}
        errorMessage={createError}
      />

      {systemClientId != null && selectedProductId != null && (
        <ProductDetailDialog
          productId={selectedProductId}
          systemClientId={systemClientId}
          initialProduct={selectedProduct}
          mlConnected={mlConnected}
          onClose={() => setSelectedProductId(null)}
          onChanged={() => void fetchProducts()}
        />
      )}
    </div>
  )
}

const styles = {
  page: {
    width: '100%',
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '24px 28px 40px',
    fontSize: '16px',
    fontWeight: 400,
    color: '#111827',
    alignSelf: 'flex-start',
  },

  /* Top bar */
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '28px',
    flexWrap: 'wrap' as const,
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: '1 1 320px',
    maxWidth: '480px',
    padding: '10px 16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    color: '#111827',
    backgroundColor: 'transparent',
  },
  topBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  bellBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userText: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  userRole: {
    fontSize: '12px',
    color: '#6b7280',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Banners */
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '12px 16px',
    marginBottom: '20px',
    borderRadius: '10px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    fontSize: '14px',
  },
  retryBtn: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid #fca5a5',
    backgroundColor: '#ffffff',
    color: '#991b1b',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
  /* Summary cards */
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '32px',
  },
  summaryCard: {
    padding: '20px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  summaryLabel: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: '#6b7280',
  },
  summaryBottom: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  summaryValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1.1,
  },
  trendUp: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#16a34a',
  },
  trendDown: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#dc2626',
  },
  trendNeutral: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#9ca3af',
  },

  /* Section header */
  sectionHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '4px',
  },
  sectionSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
  },
  sectionActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  filterBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
  },
  exportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
  },
  addProductBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#2563eb',
    cursor: 'pointer',
  },
  /* Loading */
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 0',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#2563eb',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: '#6b7280',
  },

  /* Table */
  tableWrap: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    overflow: 'hidden',
    marginBottom: '20px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    tableLayout: 'auto' as const,
  },
  th: {
    padding: '14px 16px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: '#6b7280',
    textAlign: 'left' as const,
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#fafafa',
    whiteSpace: 'nowrap' as const,
  },
  thFirst: { paddingLeft: '24px' },
  thLast: { paddingRight: '24px' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  trClickable: {
    borderBottom: '1px solid #f3f4f6',
    cursor: 'pointer',
    transition: 'background-color 0.12s',
  },
  td: {
    padding: '16px 16px',
    fontSize: '14px',
    verticalAlign: 'middle' as const,
  },
  tdFirst: { paddingLeft: '24px' },
  tdLast: { paddingRight: '24px' },

  /* Product name cell */
  productNameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  productIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  productName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  skuText: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  stockText: {
    fontSize: '14px',
    fontWeight: 600,
  },
  lastUpdateText: {
    fontSize: '13px',
    color: '#6b7280',
  },

  /* Marketplace badges */
  badgesWrap: {
    display: 'flex',
    gap: '6px',
  },
  marketplaceBadge: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: '#ffffff',
  },
  noBadgeText: {
    fontSize: '13px',
    color: '#9ca3af',
  },

  /* Status badge */
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  },

  /* Pagination */
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  paginationInfo: {
    fontSize: '13px',
    color: '#6b7280',
  },
  paginationBtns: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  pageBtn: {
    minWidth: '36px',
    height: '36px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 8px',
  },
  pageBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    color: '#ffffff',
  },
  pageBtnDisabled: {
    opacity: 0.4,
    cursor: 'default' as const,
  },
  ellipsis: {
    fontSize: '14px',
    color: '#9ca3af',
    padding: '0 4px',
  },
} as const
