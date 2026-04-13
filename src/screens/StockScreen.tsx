import { useMemo, useState } from 'react'
import {
  FiBell,
  FiBox,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiImage,
  FiPlus,
  FiSearch,
  FiSliders,
  FiTrendingDown,
  FiTrendingUp,
} from 'react-icons/fi'
import { AddProductModal, type NewProductData } from '../components/AddProductModal'

type ProductStatus = 'healthy' | 'low_stock' | 'out_of_stock'

type MarketplaceBadge = {
  letter: string
  color: string
}

type Product = {
  id: string
  name: string
  sku: string
  totalStock: number
  marketplaces: MarketplaceBadge[]
  lastUpdate: string
  status: ProductStatus
}

const MARKETPLACE_BADGES: Record<string, MarketplaceBadge> = {
  amazon: { letter: 'A', color: '#f59e0b' },
  walmart: { letter: 'W', color: '#3b82f6' },
  tiktok: { letter: 'T', color: '#6b7280' },
  shopee: { letter: 'S', color: '#2563eb' },
  mercadolivre: { letter: 'M', color: '#22c55e' },
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Premium Wireless Headphones',
    sku: 'WH-1000XM5-B',
    totalStock: 42,
    marketplaces: [MARKETPLACE_BADGES.amazon, MARKETPLACE_BADGES.walmart, MARKETPLACE_BADGES.tiktok],
    lastUpdate: '2 mins ago',
    status: 'healthy',
  },
  {
    id: '2',
    name: 'Ergonomic Mechanical Keyboard',
    sku: 'MK-RGB-87-PRO',
    totalStock: 8,
    marketplaces: [MARKETPLACE_BADGES.amazon, MARKETPLACE_BADGES.shopee],
    lastUpdate: '1 hour ago',
    status: 'low_stock',
  },
  {
    id: '3',
    name: '4K OLED Professional Monitor',
    sku: 'MON-4K-27-OLED',
    totalStock: 15,
    marketplaces: [MARKETPLACE_BADGES.amazon, MARKETPLACE_BADGES.tiktok],
    lastUpdate: '4 hours ago',
    status: 'healthy',
  },
  {
    id: '4',
    name: 'Portable Power Bank 20k mAh',
    sku: 'PB-20000-USB-C',
    totalStock: 0,
    marketplaces: [MARKETPLACE_BADGES.amazon, MARKETPLACE_BADGES.walmart, MARKETPLACE_BADGES.shopee],
    lastUpdate: '12 hours ago',
    status: 'out_of_stock',
  },
  {
    id: '5',
    name: 'USB-C Hub 7-in-1 Aluminum',
    sku: 'HUB-C7-ALU',
    totalStock: 89,
    marketplaces: [MARKETPLACE_BADGES.amazon, MARKETPLACE_BADGES.shopee],
    lastUpdate: '1 day ago',
    status: 'healthy',
  },
  {
    id: '6',
    name: 'Noise Cancelling Earbuds Pro',
    sku: 'NC-EARBUDS-PRO',
    totalStock: 5,
    marketplaces: [MARKETPLACE_BADGES.amazon, MARKETPLACE_BADGES.mercadolivre],
    lastUpdate: '3 hours ago',
    status: 'low_stock',
  },
  {
    id: '7',
    name: 'Smart Watch Ultra Sport',
    sku: 'SW-ULTRA-SPORT',
    totalStock: 120,
    marketplaces: [MARKETPLACE_BADGES.amazon, MARKETPLACE_BADGES.walmart, MARKETPLACE_BADGES.shopee],
    lastUpdate: '30 mins ago',
    status: 'healthy',
  },
  {
    id: '8',
    name: 'Wireless Gaming Mouse RGB',
    sku: 'GM-WIRELESS-RGB',
    totalStock: 0,
    marketplaces: [MARKETPLACE_BADGES.amazon, MARKETPLACE_BADGES.tiktok],
    lastUpdate: '2 days ago',
    status: 'out_of_stock',
  },
  {
    id: '9',
    name: 'Webcam 4K Auto Focus',
    sku: 'WC-4K-AF',
    totalStock: 34,
    marketplaces: [MARKETPLACE_BADGES.amazon, MARKETPLACE_BADGES.mercadolivre, MARKETPLACE_BADGES.shopee],
    lastUpdate: '5 hours ago',
    status: 'healthy',
  },
  {
    id: '10',
    name: 'Laptop Stand Adjustable',
    sku: 'LS-ADJ-ALUM',
    totalStock: 3,
    marketplaces: [MARKETPLACE_BADGES.amazon, MARKETPLACE_BADGES.walmart],
    lastUpdate: '6 hours ago',
    status: 'low_stock',
  },
  {
    id: '11',
    name: 'Bluetooth Speaker Waterproof',
    sku: 'BS-WATER-20W',
    totalStock: 67,
    marketplaces: [MARKETPLACE_BADGES.shopee, MARKETPLACE_BADGES.mercadolivre],
    lastUpdate: '1 day ago',
    status: 'healthy',
  },
  {
    id: '12',
    name: 'USB Microphone Condenser',
    sku: 'MIC-USB-COND',
    totalStock: 0,
    marketplaces: [MARKETPLACE_BADGES.amazon, MARKETPLACE_BADGES.walmart, MARKETPLACE_BADGES.tiktok],
    lastUpdate: '3 days ago',
    status: 'out_of_stock',
  },
]

const ITEMS_PER_PAGE = 5

const STATUS_CONFIG: Record<ProductStatus, { label: string; bg: string; color: string }> = {
  healthy: { label: 'Healthy', bg: '#dcfce7', color: '#166534' },
  low_stock: { label: 'Low Stock', bg: '#fef3c7', color: '#92400e' },
  out_of_stock: { label: 'Out of Stock', bg: '#fee2e2', color: '#991b1b' },
}

export function StockScreen() {
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)

  const handleAddProduct = (data: NewProductData) => {
    console.log('New product:', data)
    setShowAddModal(false)
  }

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_PRODUCTS
    const q = searchQuery.toLowerCase()
    return MOCK_PRODUCTS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    )
  }, [searchQuery])

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProducts, currentPage])

  const summaryStats = useMemo(() => {
    const totalSkus = MOCK_PRODUCTS.length
    const lowStock = MOCK_PRODUCTS.filter((p) => p.status === 'low_stock').length
    const outOfStock = MOCK_PRODUCTS.filter((p) => p.status === 'out_of_stock').length
    const totalValue = 142500
    return { totalSkus, lowStock, outOfStock, totalValue }
  }, [])

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
        aria-label="Previous page"
      >
        <FiChevronLeft size={16} />
      </button>
    )

    const maxVisible = 3
    const pages: (number | 'ellipsis')[] = []

    for (let i = 1; i <= Math.min(maxVisible, totalPages); i++) {
      pages.push(i)
    }
    if (totalPages > maxVisible + 1) {
      pages.push('ellipsis')
    }
    if (totalPages > maxVisible) {
      pages.push(totalPages)
    }

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
        style={{ ...styles.pageBtn, ...(currentPage === totalPages ? styles.pageBtnDisabled : {}) }}
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <FiChevronRight size={16} />
      </button>
    )

    return buttons
  }

  const activeMarketplaceCount = useMemo(() => {
    const unique = new Set<string>()
    for (const p of MOCK_PRODUCTS) {
      for (const m of p.marketplaces) {
        unique.add(m.letter)
      }
    }
    return unique.size
  }, [])

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.searchWrap}>
          <FiSearch size={18} color="#9ca3af" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={handleSearch}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.topBarRight}>
          <button type="button" style={styles.bellBtn} aria-label="Notifications">
            <FiBell size={20} color="#6b7280" />
          </button>
          <div style={styles.userInfo}>
            <div style={styles.userText}>
              <span style={styles.userName}>Alex Rivera</span>
              <span style={styles.userRole}>Operations Manager</span>
            </div>
            <div style={styles.avatar}>
              <FiBox size={18} color="#fff" />
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>TOTAL SKUS</span>
          <div style={styles.summaryBottom}>
            <span style={styles.summaryValue}>{summaryStats.totalSkus.toLocaleString()}</span>
            <span style={styles.trendUp}>
              +2.4%
              <FiTrendingUp size={14} />
            </span>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>LOW STOCK ALERTS</span>
          <div style={styles.summaryBottom}>
            <span style={styles.summaryValue}>{summaryStats.lowStock}</span>
            <span style={styles.trendDown}>
              -5.1%
              <FiTrendingDown size={14} />
            </span>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>OUT OF STOCK</span>
          <div style={styles.summaryBottom}>
            <span style={styles.summaryValue}>{summaryStats.outOfStock}</span>
            <span style={styles.trendNeutral}>No change</span>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.summaryLabel}>TOTAL VALUE</span>
          <div style={styles.summaryBottom}>
            <span style={styles.summaryValue}>
              ${summaryStats.totalValue.toLocaleString()}
            </span>
            <span style={styles.trendUp}>
              +12%
              <FiTrendingUp size={14} />
            </span>
          </div>
        </div>
      </div>

      {/* Inventory overview header */}
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>Inventory Overview</h2>
          <p style={styles.sectionSubtitle}>
            Manage stock across {activeMarketplaceCount} active marketplaces
          </p>
        </div>
        <div style={styles.sectionActions}>
          <button type="button" style={styles.filterBtn}>
            <FiSliders size={16} />
            Filters
          </button>
          <button type="button" style={styles.exportBtn}>
            <FiDownload size={16} />
            Export CSV
          </button>
          <button type="button" style={styles.addProductBtn} onClick={() => setShowAddModal(true)}>
            <FiPlus size={18} />
            Add Product
          </button>
        </div>
      </div>

      {/* Products table */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, ...styles.thFirst }}>PRODUCT NAME</th>
              <th style={styles.th}>SKU</th>
              <th style={styles.th}>TOTAL STOCK</th>
              <th style={styles.th}>LINKED MARKETPLACES</th>
              <th style={styles.th}>LAST UPDATE</th>
              <th style={{ ...styles.th, ...styles.thLast }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((product) => {
              const statusCfg = STATUS_CONFIG[product.status]
              return (
                <tr key={product.id} style={styles.tr}>
                  <td style={{ ...styles.td, ...styles.tdFirst }}>
                    <div style={styles.productNameCell}>
                      <div style={styles.productIcon}>
                        <FiImage size={18} color="#9ca3af" />
                      </div>
                      <span style={styles.productName}>{product.name}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.skuText}>{product.sku}</span>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.stockText,
                        color: product.totalStock === 0 ? '#dc2626' : product.totalStock < 10 ? '#d97706' : '#111827',
                      }}
                    >
                      {product.totalStock} units
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.badgesWrap}>
                      {product.marketplaces.map((m, i) => (
                        <span
                          key={`${product.id}-${m.letter}-${i}`}
                          style={{ ...styles.marketplaceBadge, backgroundColor: m.color }}
                        >
                          {m.letter}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.lastUpdateText}>{product.lastUpdate}</span>
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
          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
          {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of{' '}
          {filteredProducts.length} results
        </span>
        <div style={styles.paginationBtns}>{renderPaginationButtons()}</div>
      </div>

      <AddProductModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddProduct}
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
  thFirst: {
    paddingLeft: '24px',
  },
  thLast: {
    paddingRight: '24px',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '16px 16px',
    fontSize: '14px',
    verticalAlign: 'middle' as const,
  },
  tdFirst: {
    paddingLeft: '24px',
  },
  tdLast: {
    paddingRight: '24px',
  },

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
