import { useMemo, useState } from 'react'
import {
  FiBell,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiImage,
  FiLink,
  FiSearch,
  FiShoppingBag,
  FiShoppingCart,
  FiTruck,
  FiXCircle,
} from 'react-icons/fi'
import type { ReactNode } from 'react'

type TabId = 'all' | 'linked' | 'unlinked' | 'errors'

type ListingStatus = 'active' | 'draft' | 'paused'
type SyncStatus = 'synced' | 'pending' | 'error'

type Marketplace = {
  name: string
  icon: ReactNode
  color: string
}

type Listing = {
  id: string
  title: string
  sku: string
  marketplace: Marketplace
  linkedProduct: string | null
  available: number
  status: ListingStatus
  syncStatus: SyncStatus
}

const MARKETPLACES: Record<string, Marketplace> = {
  amazon: {
    name: 'Amazon',
    icon: <FiShoppingCart size={16} />,
    color: '#f59e0b',
  },
  mercadolivre: {
    name: 'Mercado Livre',
    icon: <FiShoppingBag size={16} />,
    color: '#ffe600',
  },
  shopify: {
    name: 'Shopify',
    icon: <FiTruck size={16} />,
    color: '#22c55e',
  },
  ebay: {
    name: 'eBay',
    icon: <FiShoppingBag size={16} />,
    color: '#ef4444',
  },
}

const MOCK_LISTINGS: Listing[] = [
  {
    id: '1',
    title: 'Sony WH-1000XM5 Wireless Headphones',
    sku: 'SNY-HEAD-BLK-01',
    marketplace: MARKETPLACES.amazon,
    linkedProduct: 'Sony XM5 Premium Audio',
    available: 42,
    status: 'active',
    syncStatus: 'synced',
  },
  {
    id: '2',
    title: 'Mechanical Keyboard RGB - Cherry Blue',
    sku: 'KBD-MCH-RGB-L2',
    marketplace: MARKETPLACES.ebay,
    linkedProduct: null,
    available: 0,
    status: 'draft',
    syncStatus: 'pending',
  },
  {
    id: '3',
    title: 'Vlog Pro 4K Camera Bundle',
    sku: 'CAM-VLG-BNDL',
    marketplace: MARKETPLACES.shopify,
    linkedProduct: 'Vlog Master Kit',
    available: 12,
    status: 'active',
    syncStatus: 'error',
  },
  {
    id: '4',
    title: 'L-Shape Gaming Desk Carbon Fiber',
    sku: 'FUR-DSK-GAM-04',
    marketplace: MARKETPLACES.amazon,
    linkedProduct: 'Elite Series Gaming Desk',
    available: 155,
    status: 'active',
    syncStatus: 'synced',
  },
  {
    id: '5',
    title: 'Fone Bluetooth TWS Pro Max',
    sku: 'FON-BT-PROMAX',
    marketplace: MARKETPLACES.mercadolivre,
    linkedProduct: 'TWS Pro Max Earbuds',
    available: 78,
    status: 'active',
    syncStatus: 'synced',
  },
  {
    id: '6',
    title: 'Mouse Gamer Sem Fio 16000 DPI',
    sku: 'MOU-GAM-16K',
    marketplace: MARKETPLACES.mercadolivre,
    linkedProduct: null,
    available: 0,
    status: 'draft',
    syncStatus: 'pending',
  },
  {
    id: '7',
    title: 'Ultra-Wide Monitor 34" Curved',
    sku: 'MON-UW-34-CRV',
    marketplace: MARKETPLACES.amazon,
    linkedProduct: 'UltraWide Pro Monitor',
    available: 23,
    status: 'active',
    syncStatus: 'synced',
  },
  {
    id: '8',
    title: 'Webcam Full HD Autofocus',
    sku: 'WBC-FHD-AF-01',
    marketplace: MARKETPLACES.shopify,
    linkedProduct: 'HD Webcam Pro',
    available: 9,
    status: 'paused',
    syncStatus: 'error',
  },
]

const ITEMS_PER_PAGE = 4

const TAB_ITEMS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'linked', label: 'Linked' },
  { id: 'unlinked', label: 'Unlinked' },
  { id: 'errors', label: 'Errors' },
]

const STATUS_CONFIG: Record<ListingStatus, { label: string; bg: string; color: string }> = {
  active: { label: 'ACTIVE', bg: '#dcfce7', color: '#166534' },
  draft: { label: 'DRAFT', bg: '#f3f4f6', color: '#374151' },
  paused: { label: 'PAUSED', bg: '#fef3c7', color: '#92400e' },
}

const SYNC_CONFIG: Record<SyncStatus, { label: string; color: string; icon: ReactNode }> = {
  synced: {
    label: 'Synced',
    color: '#4f46e5',
    icon: <FiCheckCircle size={12} />,
  },
  pending: {
    label: 'Pending Link',
    color: '#6b7280',
    icon: <FiClock size={12} />,
  },
  error: {
    label: 'Sync Error',
    color: '#dc2626',
    icon: <FiXCircle size={12} />,
  },
}

export function ListingsScreen() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredListings = useMemo(() => {
    let listings = MOCK_LISTINGS

    if (activeTab === 'linked') {
      listings = listings.filter((l) => l.linkedProduct !== null)
    } else if (activeTab === 'unlinked') {
      listings = listings.filter((l) => l.linkedProduct === null)
    } else if (activeTab === 'errors') {
      listings = listings.filter((l) => l.syncStatus === 'error')
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      listings = listings.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.sku.toLowerCase().includes(q) ||
          l.marketplace.name.toLowerCase().includes(q)
      )
    }

    return listings
  }, [searchQuery, activeTab])

  const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE)
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredListings.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredListings, currentPage])

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    setCurrentPage(1)
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  const stats = useMemo(() => {
    const errors = MOCK_LISTINGS.filter((l) => l.syncStatus === 'error').length
    const unlinked = MOCK_LISTINGS.filter((l) => l.linkedProduct === null).length
    return { errors, unlinked }
  }, [])

  const renderPagination = () => {
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

    for (let i = 1; i <= totalPages; i++) {
      buttons.push(
        <button
          key={i}
          type="button"
          style={{ ...styles.pageBtn, ...(i === currentPage ? styles.pageBtnActive : {}) }}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </button>
      )
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

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.searchWrap}>
          <FiSearch size={18} color="#9ca3af" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search listings, SKUs, or marketplaces..."
            value={searchQuery}
            onChange={handleSearch}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.topBarRight}>
          <button type="button" style={styles.bellBtn} aria-label="Notifications">
            <FiBell size={20} color="#6b7280" />
          </button>
          <button type="button" style={styles.linkListingBtn}>
            <FiLink size={16} />
            Link Listing
          </button>
        </div>
      </div>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Marketplace Listings</h1>
        <p style={styles.subtitle}>
          Manage synchronization between marketplace advertisements and your central inventory.
        </p>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            style={{
              ...styles.tabBtn,
              ...(activeTab === tab.id ? styles.tabBtnActive : {}),
            }}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, ...styles.thFirst }}>LISTING TITLE</th>
              <th style={styles.th}>MARKETPLACE</th>
              <th style={styles.th}>LINKED PRODUCT</th>
              <th style={styles.th}>AVAILABLE</th>
              <th style={styles.th}>STATUS</th>
              <th style={{ ...styles.th, ...styles.thLast }}>SYNC STATUS</th>
            </tr>
          </thead>
          <tbody>
            {paginatedListings.map((listing) => {
              const statusCfg = STATUS_CONFIG[listing.status]
              const syncCfg = SYNC_CONFIG[listing.syncStatus]

              return (
                <tr key={listing.id} style={styles.tr}>
                  <td style={{ ...styles.td, ...styles.tdFirst }}>
                    <div style={styles.titleCell}>
                      <div style={styles.listingIcon}>
                        <FiImage size={18} color="#9ca3af" />
                      </div>
                      <div>
                        <span style={styles.listingTitle}>{listing.title}</span>
                        <span style={styles.listingSku}>SKU: {listing.sku}</span>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.marketplaceCell}>
                      <span
                        style={{
                          ...styles.mpIcon,
                          backgroundColor: `${listing.marketplace.color}20`,
                          color: listing.marketplace.color,
                        }}
                      >
                        {listing.marketplace.icon}
                      </span>
                      <span style={styles.mpName}>{listing.marketplace.name}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    {listing.linkedProduct ? (
                      <span style={styles.linkedText}>{listing.linkedProduct}</span>
                    ) : (
                      <span style={styles.notLinked}>Not linked</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.availableText,
                        color: listing.available === 0 ? '#dc2626' : '#111827',
                      }}
                    >
                      {listing.available} units
                    </span>
                  </td>
                  <td style={styles.td}>
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
                  <td style={{ ...styles.td, ...styles.tdLast }}>
                    <div style={{ ...styles.syncCell, color: syncCfg.color }}>
                      {syncCfg.icon}
                      <span style={styles.syncLabel}>{syncCfg.label}</span>
                    </div>
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
          Showing <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> to{' '}
          <strong>{Math.min(currentPage * ITEMS_PER_PAGE, filteredListings.length)}</strong> of{' '}
          <strong>{filteredListings.length}</strong> listings
        </span>
        <div style={styles.paginationBtns}>{renderPagination()}</div>
      </div>

      {/* Footer stats */}
      <div style={styles.footerRow}>
        <div style={styles.footerCard}>
          <div style={{ ...styles.footerIcon, backgroundColor: '#ede9fe', color: '#7c3aed' }}>
            <FiClock size={20} />
          </div>
          <div>
            <span style={styles.footerLabel}>Last Sync</span>
            <span style={styles.footerValue}>2 minutes ago</span>
          </div>
        </div>
        <div style={styles.footerCard}>
          <div style={{ ...styles.footerIcon, backgroundColor: '#dcfce7', color: '#16a34a' }}>
            <FiCheckCircle size={20} />
          </div>
          <div>
            <span style={styles.footerLabel}>Health Status</span>
            <span style={styles.footerValue}>
              {stats.errors === 0 ? 'Excellent' : `${stats.errors} error(s)`}
            </span>
          </div>
        </div>
        <div style={styles.footerCard}>
          <div style={{ ...styles.footerIcon, backgroundColor: '#fef3c7', color: '#d97706' }}>
            <FiLink size={20} />
          </div>
          <div>
            <span style={styles.footerLabel}>Unlinked Found</span>
            <span style={styles.footerValue}>{stats.unlinked} Listings</span>
          </div>
        </div>
      </div>
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
    marginBottom: '32px',
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
    gap: '12px',
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
  linkListingBtn: {
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
    backgroundColor: '#4f46e5',
    cursor: 'pointer',
  },

  /* Header */
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '6px',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '14px',
    lineHeight: 1.5,
    color: '#6b7280',
  },

  /* Tabs */
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '24px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    width: 'fit-content',
  },
  tabBtn: {
    padding: '9px 20px',
    border: 'none',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
    cursor: 'pointer',
    borderRight: '1px solid #e5e7eb',
  },
  tabBtnActive: {
    backgroundColor: '#f3f4f6',
    color: '#111827',
    fontWeight: 600,
  },

  /* Table */
  tableWrap: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    overflow: 'hidden',
    marginBottom: '16px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
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
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    verticalAlign: 'middle' as const,
  },
  tdFirst: { paddingLeft: '24px' },
  tdLast: { paddingRight: '24px' },

  /* Title cell */
  titleCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  listingIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  listingTitle: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
    lineHeight: 1.3,
  },
  listingSku: {
    display: 'block',
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '2px',
  },

  /* Marketplace cell */
  marketplaceCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  mpIcon: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mpName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },

  /* Linked product */
  linkedText: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    lineHeight: 1.4,
  },
  notLinked: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#d1d5db',
    fontStyle: 'italic' as const,
  },

  /* Available */
  availableText: {
    fontSize: '14px',
    fontWeight: 600,
  },

  /* Status badge */
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.03em',
  },

  /* Sync status */
  syncCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  },
  syncLabel: {
    fontSize: '13px',
  },

  /* Pagination */
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '28px',
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
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
    color: '#ffffff',
  },
  pageBtnDisabled: {
    opacity: 0.4,
    cursor: 'default' as const,
  },

  /* Footer stats */
  footerRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  footerCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '20px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
  },
  footerIcon: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  footerLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '2px',
  },
  footerValue: {
    display: 'block',
    fontSize: '18px',
    fontWeight: 700,
    color: '#111827',
  },
} as const
