import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiBell,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiSearch,
  FiShoppingBag,
} from 'react-icons/fi'
import {
  RegisterLocalSaleModal,
  type LocalSaleFormData,
} from '../components/RegisterLocalSaleModal'
import { useAuth } from '../contexts/AuthContext'
import { formatRelative } from '../lib/relativeTime'
import { listProducts } from '../services/productsApi'
import { createSales, listSales } from '../services/salesApi'
import type { ProductDto } from '../types/product'
import type { SaleChannel, SaleDto } from '../types/sale'

type ChannelFilter = 'all' | 'physical' | 'marketplace'

const ITEMS_PER_PAGE = 8

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const CHANNEL_LABELS: Record<SaleChannel, string> = {
  MERCADO_LIVRE: 'Mercado Livre',
  SHOPEE: 'Shopee',
  AMAZON: 'Amazon',
  PHYSICAL: 'Loja física',
  MANUAL: 'Manual',
}

const CHANNEL_COLORS: Record<SaleChannel, { bg: string; color: string }> = {
  MERCADO_LIVRE: { bg: '#fef9c3', color: '#854d0e' },
  SHOPEE: { bg: '#ffedd5', color: '#c2410c' },
  AMAZON: { bg: '#fef3c7', color: '#92400e' },
  PHYSICAL: { bg: '#dbeafe', color: '#1d4ed8' },
  MANUAL: { bg: '#ede9fe', color: '#6d28d9' },
}

const STATUS_LABELS = {
  CONFIRMED: { label: 'Confirmada', bg: '#dcfce7', color: '#166534' },
  CANCELLED: { label: 'Cancelada', bg: '#fee2e2', color: '#991b1b' },
} as const

function isToday(iso: string): boolean {
  const date = new Date(iso)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function isPhysicalChannel(channel: SaleChannel): boolean {
  return channel === 'PHYSICAL' || channel === 'MANUAL'
}

export function OrdersScreen() {
  const { user } = useAuth()
  const systemClientId = user?.systemClientId ?? null

  const [sales, setSales] = useState<SaleDto[]>([])
  const [products, setProducts] = useState<ProductDto[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const productNamesById = useMemo(() => {
    const map: Record<number, string> = {}
    for (const p of products) map[p.id] = p.name
    return map
  }, [products])

  const fetchSales = useCallback(async () => {
    if (systemClientId == null) return
    setLoading(true)
    setError(null)
    try {
      const page = await listSales(systemClientId, 0, 200)
      setSales(page.content)
      setTotalElements(page.totalElements)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar vendas.')
    } finally {
      setLoading(false)
    }
  }, [systemClientId])

  const fetchProducts = useCallback(async () => {
    if (systemClientId == null) return
    setLoadingProducts(true)
    try {
      const page = await listProducts(systemClientId, 0, 200)
      setProducts(page.content)
    } catch {
      setProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }, [systemClientId])

  useEffect(() => {
    void fetchSales()
    void fetchProducts()
  }, [fetchSales, fetchProducts])

  const handleRegisterSale = useCallback(
    async (data: LocalSaleFormData) => {
      if (systemClientId == null) return
      setSubmitting(true)
      setSubmitError(null)
      try {
        const resource = data.note ? { note: data.note } : undefined
        await createSales(systemClientId, [
          {
            systemClientId,
            productId: data.productId,
            quantity: data.quantity,
            totalValue: data.totalValue,
            channel: 'PHYSICAL',
            resource,
          },
        ])
        setShowRegisterModal(false)
        setSuccessMessage('Venda registrada com sucesso.')
        await fetchSales()
        await fetchProducts()
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : 'Não foi possível registrar a venda.')
      } finally {
        setSubmitting(false)
      }
    },
    [systemClientId, fetchSales, fetchProducts],
  )

  const filteredSales = useMemo(() => {
    let rows = sales
    if (channelFilter === 'physical') {
      rows = rows.filter((s) => isPhysicalChannel(s.channel))
    } else if (channelFilter === 'marketplace') {
      rows = rows.filter((s) => !isPhysicalChannel(s.channel))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      rows = rows.filter((s) => {
        const name = productNamesById[s.product_id] ?? ''
        return (
          name.toLowerCase().includes(q) ||
          String(s.id).includes(q) ||
          s.channel.toLowerCase().includes(q)
        )
      })
    }
    return rows
  }, [sales, channelFilter, searchQuery, productNamesById])

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / ITEMS_PER_PAGE))
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredSales.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredSales, currentPage])

  const stats = useMemo(() => {
    const todaySales = sales.filter((s) => isToday(s.created_at) && s.status === 'CONFIRMED')
    const todayPhysical = todaySales.filter((s) => isPhysicalChannel(s.channel))
    const todayTotal = todaySales.reduce((sum, s) => sum + Number(s.total_value), 0)
    const todayPhysicalTotal = todayPhysical.reduce((sum, s) => sum + Number(s.total_value), 0)
    return {
      total: totalElements,
      todayCount: todaySales.length,
      todayTotal,
      todayPhysicalCount: todayPhysical.length,
      todayPhysicalTotal,
    }
  }, [sales, totalElements])

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
      </button>,
    )
    for (let i = 1; i <= Math.min(3, totalPages); i++) {
      buttons.push(
        <button
          key={i}
          type="button"
          style={{
            ...styles.pageBtn,
            ...(currentPage === i ? styles.pageBtnActive : {}),
          }}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </button>,
      )
    }
    buttons.push(
      <button
        key="next"
        type="button"
        style={{
          ...styles.pageBtn,
          ...(currentPage === totalPages ? styles.pageBtnDisabled : {}),
        }}
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        aria-label="Próxima página"
      >
        <FiChevronRight size={16} />
      </button>,
    )
    return buttons
  }

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div style={styles.searchWrap}>
          <FiSearch size={18} color="#9ca3af" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Buscar por produto, ID ou canal…"
            value={searchQuery}
            onChange={handleSearch}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.topBarRight}>
          <button type="button" style={styles.bellBtn} aria-label="Notificações">
            <FiBell size={20} color="#6b7280" />
          </button>
          <div style={styles.userInfo}>
            <div style={styles.userText}>
              <span style={styles.userName}>{user?.name ?? '—'}</span>
              <span style={styles.userRole}>OmniSync</span>
            </div>
            <div style={styles.avatar}>
              <FiShoppingBag size={18} color="#fff" />
            </div>
          </div>
        </div>
      </div>

      {error != null && (
        <div style={styles.errorBanner} role="alert">
          <span>{error}</span>
          <button type="button" style={styles.retryBtn} onClick={() => void fetchSales()}>
            Tentar novamente
          </button>
        </div>
      )}

      {successMessage != null && (
        <div style={styles.successBanner} role="status">
          <span>{successMessage}</span>
          <button type="button" style={styles.dismissBtn} onClick={() => setSuccessMessage(null)}>
            Fechar
          </button>
        </div>
      )}

      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>VENDAS HOJE</span>
          <span style={styles.summaryValue}>{loading ? '…' : stats.todayCount}</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>FATURAMENTO HOJE</span>
          <span style={styles.summaryValue}>
            {loading ? '…' : BRL.format(stats.todayTotal)}
          </span>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>LOJA FÍSICA HOJE</span>
          <span style={styles.summaryValue}>{loading ? '…' : stats.todayPhysicalCount}</span>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>TOTAL LOJA FÍSICA</span>
          <span style={styles.summaryValue}>
            {loading ? '…' : BRL.format(stats.todayPhysicalTotal)}
          </span>
        </div>
      </div>

      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Vendas</h2>
          <p style={styles.sectionSubtitle}>
            Registre vendas da loja física e acompanhe o histórico
          </p>
        </div>
        <button
          type="button"
          style={styles.primaryBtn}
          onClick={() => {
            setSubmitError(null)
            setShowRegisterModal(true)
          }}
        >
          <FiPlus size={18} />
          Registrar venda
        </button>
      </div>

      <div style={styles.tabs}>
        {(
          [
            { id: 'all' as const, label: 'Todas' },
            { id: 'physical' as const, label: 'Loja física' },
            { id: 'marketplace' as const, label: 'Marketplaces' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            style={{
              ...styles.tabBtn,
              ...(channelFilter === tab.id ? styles.tabBtnActive : {}),
            }}
            onClick={() => {
              setChannelFilter(tab.id)
              setCurrentPage(1)
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loadingWrap}>Carregando vendas…</div>
        ) : filteredSales.length === 0 ? (
          <div style={styles.emptyWrap}>
            <FiShoppingBag size={40} color="#d1d5db" />
            <p style={styles.emptyTitle}>Nenhuma venda encontrada</p>
            <p style={styles.emptyText}>
              Registre a primeira venda da sua loja física para baixar o estoque automaticamente.
            </p>
            <button
              type="button"
              style={styles.primaryBtn}
              onClick={() => setShowRegisterModal(true)}
            >
              <FiPlus size={18} />
              Registrar venda
            </button>
          </div>
        ) : (
          <>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, ...styles.thFirst }}>#</th>
                    <th style={styles.th}>PRODUTO</th>
                    <th style={styles.th}>QTD</th>
                    <th style={styles.th}>TOTAL</th>
                    <th style={styles.th}>CANAL</th>
                    <th style={styles.th}>DATA</th>
                    <th style={{ ...styles.th, ...styles.thLast }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSales.map((sale) => {
                    const channelCfg = CHANNEL_COLORS[sale.channel] ?? {
                      bg: '#f3f4f6',
                      color: '#374151',
                    }
                    const statusCfg = STATUS_LABELS[sale.status] ?? STATUS_LABELS.CONFIRMED
                    return (
                      <tr key={sale.id} style={styles.tr}>
                        <td style={{ ...styles.td, ...styles.tdFirst }}>
                          <span style={styles.idText}>#{sale.id}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.productText}>
                            {productNamesById[sale.product_id] ?? `Produto #${sale.product_id}`}
                          </span>
                        </td>
                        <td style={styles.td}>{sale.quantity}</td>
                        <td style={styles.td}>
                          <span style={styles.totalText}>{BRL.format(Number(sale.total_value))}</span>
                        </td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.channelBadge,
                              backgroundColor: channelCfg.bg,
                              color: channelCfg.color,
                            }}
                          >
                            {CHANNEL_LABELS[sale.channel] ?? sale.channel}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.dateText}>{formatRelative(sale.created_at)}</span>
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
            <div style={styles.pagination}>
              <span style={styles.paginationInfo}>
                Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredSales.length)} de{' '}
                {filteredSales.length}
              </span>
              <div style={styles.paginationBtns}>{renderPaginationButtons()}</div>
            </div>
          </>
        )}
      </div>

      <RegisterLocalSaleModal
        open={showRegisterModal}
        products={products}
        loadingProducts={loadingProducts}
        submitting={submitting}
        errorMessage={submitError}
        onClose={() => {
          if (!submitting) {
            setShowRegisterModal(false)
            setSubmitError(null)
          }
        }}
        onSubmit={handleRegisterSale}
      />
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
    color: '#111827',
    alignSelf: 'flex-start',
  },
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
    flex: 1,
    minWidth: '220px',
    maxWidth: '420px',
    padding: '0 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    padding: '12px 0',
    fontFamily: 'inherit',
    fontSize: '14px',
    backgroundColor: 'transparent',
  },
  topBarRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  bellBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  userText: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end' },
  userName: { fontSize: '14px', fontWeight: 600, color: '#111827' },
  userRole: { fontSize: '12px', color: '#6b7280' },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '20px',
    padding: '12px 16px',
    borderRadius: '10px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    fontSize: '14px',
  },
  successBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '20px',
    padding: '12px 16px',
    borderRadius: '10px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    fontSize: '14px',
  },
  retryBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid #fca5a5',
    backgroundColor: '#ffffff',
    color: '#991b1b',
    fontFamily: 'inherit',
    fontSize: '13px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  dismissBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid #86efac',
    backgroundColor: '#ffffff',
    color: '#166534',
    fontFamily: 'inherit',
    fontSize: '13px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '28px',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  summaryLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#9ca3af',
    letterSpacing: '0.05em',
  },
  summaryValue: { fontSize: '24px', fontWeight: 700, color: '#111827' },
  sectionHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
  },
  sectionTitle: { fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 },
  sectionSubtitle: { fontSize: '14px', color: '#6b7280', marginTop: '4px' },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
  },
  tabBtn: {
    padding: '8px 16px',
    borderRadius: '999px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
    cursor: 'pointer',
  },
  tabBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    color: '#ffffff',
  },
  tableCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    overflow: 'hidden',
  },
  loadingWrap: { padding: '48px', textAlign: 'center' as const, color: '#6b7280' },
  emptyWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
    padding: '56px 24px',
    textAlign: 'center' as const,
  },
  emptyTitle: { margin: 0, fontSize: '18px', fontWeight: 600, color: '#111827' },
  emptyText: { margin: 0, fontSize: '14px', color: '#6b7280', maxWidth: '360px' },
  tableWrap: { overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: {
    padding: '14px 16px',
    textAlign: 'left' as const,
    fontSize: '11px',
    fontWeight: 700,
    color: '#9ca3af',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#fafafa',
  },
  thFirst: { paddingLeft: '24px' },
  thLast: { paddingRight: '24px' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '16px', fontSize: '14px', verticalAlign: 'middle' as const },
  tdFirst: { paddingLeft: '24px' },
  tdLast: { paddingRight: '24px' },
  idText: { fontFamily: 'monospace', color: '#6b7280', fontSize: '13px' },
  productText: { fontWeight: 500, color: '#111827' },
  totalText: { fontWeight: 600, color: '#059669' },
  channelBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
  },
  dateText: { color: '#6b7280', fontSize: '13px' },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '16px 24px',
    flexWrap: 'wrap' as const,
  },
  paginationInfo: { fontSize: '13px', color: '#6b7280' },
  paginationBtns: { display: 'flex', gap: '4px' },
  pageBtn: {
    minWidth: '36px',
    height: '36px',
    padding: '0 8px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    color: '#ffffff',
  },
  pageBtnDisabled: { opacity: 0.4, cursor: 'default' as const },
} as const
