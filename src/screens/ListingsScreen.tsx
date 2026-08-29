import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiBell,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiExternalLink,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShoppingBag,
  FiXCircle,
} from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import { useMercadoLivreSync } from '../contexts/MercadoLivreSyncContext'
import { getProductImageUrl } from '../lib/productImage'
import { hasMercadoLivreListing } from '../lib/productMercadoLivre'
import { readMercadoLivreIntegration } from '../lib/mercadoLivreStorage'
import { AnnounceProductModal } from '../components/AnnounceProductModal'
import { ProductImageThumb } from '../components/ProductImageThumb'
import { ProductDetailDialog } from '../components/ProductDetailDialog'
import { SelectProductToAnnounceModal } from '../components/SelectProductToAnnounceModal'
import { formatRelative } from '../lib/relativeTime'
import { announceProduct, listProducts } from '../services/productsApi'
import type { MercadoLivreProductMetadata, ProductDto } from '../types/product'

// ─── Types ─────────────────────────────────────────────────────────────────

type TabId = 'all' | 'active' | 'paused' | 'closed'

type MlListingStatus = 'active' | 'paused' | 'closed' | 'unknown'

type MlListing = {
  productId: number
  itemId: string
  title: string
  sku: string
  imageUrl: string | null
  available: number
  price: number
  status: MlListingStatus
  permalink: string | null
  lastUpdated: string | null
}

// ─── Constants ─────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 8

const TAB_ITEMS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Ativos' },
  { id: 'paused', label: 'Pausados' },
  { id: 'closed', label: 'Fechados' },
]

const STATUS_CONFIG: Record<MlListingStatus, { label: string; bg: string; color: string }> = {
  active: { label: 'ATIVO', bg: '#dcfce7', color: '#166534' },
  paused: { label: 'PAUSADO', bg: '#fef3c7', color: '#92400e' },
  closed: { label: 'FECHADO', bg: '#fee2e2', color: '#991b1b' },
  unknown: { label: 'OUTRO', bg: '#f3f4f6', color: '#374151' },
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// ─── Helpers ───────────────────────────────────────────────────────────────

function normalizeStatus(raw: unknown): MlListingStatus {
  const s = String(raw ?? '').toLowerCase()
  if (s === 'active') return 'active'
  if (s === 'paused') return 'paused'
  if (s === 'closed' || s === 'deleted') return 'closed'
  return 'unknown'
}

function toMlListing(p: ProductDto): MlListing | null {
  const ml = p.resource?.mercado_livre as Record<string, unknown> | undefined
  if (!ml?.item_id) return null
  return {
    productId: p.id,
    itemId: String(ml.item_id),
    title: p.name,
    sku: p.sku,
    imageUrl: getProductImageUrl(p),
    available: Math.max(0, p.stock - p.reserved_stock),
    price: p.price,
    status: normalizeStatus(ml.status),
    permalink: ml.permalink ? String(ml.permalink) : null,
    lastUpdated: ml.last_updated ? String(ml.last_updated) : p.created_at ?? null,
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

export function ListingsScreen() {
  const { user } = useAuth()
  const { catalogRevision, isSyncing, lastResult, warning, syncNow } =
    useMercadoLivreSync()
  const systemClientId = user?.systemClientId ?? null

  const mlIntegration = readMercadoLivreIntegration()
  const mlConnected =
    mlIntegration != null &&
    systemClientId != null &&
    Number(mlIntegration.systemClientId) === Number(systemClientId) &&
    mlIntegration.active === true

  const [products, setProducts] = useState<ProductDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [showSelectProductModal, setShowSelectProductModal] = useState(false)
  const [announceTarget, setAnnounceTarget] = useState<ProductDto | null>(null)
  const [announceSubmitting, setAnnounceSubmitting] = useState(false)
  const [announceError, setAnnounceError] = useState<string | null>(null)

  const fetchListings = useCallback(async () => {
    if (systemClientId == null) return
    setLoading(true)
    setError(null)
    try {
      const page = await listProducts(systemClientId, 0, 200)
      setProducts(page.content)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar anúncios.')
    } finally {
      setLoading(false)
    }
  }, [systemClientId])

  useEffect(() => {
    // A revisão é um sinal de invalidação, não um parâmetro da API.
    void catalogRevision
    void fetchListings()
  }, [catalogRevision, fetchListings])

  const handleSync = useCallback(async () => {
    if (systemClientId == null || isSyncing) return
    await syncNow('manual')
  }, [isSyncing, syncNow, systemClientId])

  const unannouncedProducts = useMemo(
    () => products.filter((p) => !hasMercadoLivreListing(p)),
    [products]
  )

  const handleSelectProductToAnnounce = (product: ProductDto) => {
    setShowSelectProductModal(false)
    setAnnounceError(null)
    setAnnounceTarget(product)
  }

  const handleAnnounce = async (mlMetadata: MercadoLivreProductMetadata) => {
    if (systemClientId == null || announceTarget == null) return
    setAnnounceSubmitting(true)
    setAnnounceError(null)
    try {
      await announceProduct(systemClientId, announceTarget.id, mlMetadata)
      setAnnounceTarget(null)
      await fetchListings()
    } catch (e) {
      setAnnounceError(e instanceof Error ? e.message : 'Não foi possível publicar o anúncio.')
    } finally {
      setAnnounceSubmitting(false)
    }
  }

  // Derive ML listings from all products
  const allListings = useMemo<MlListing[]>(() => {
    const result: MlListing[] = []
    for (const p of products) {
      const l = toMlListing(p)
      if (l) result.push(l)
    }
    return result
  }, [products])

  const filteredListings = useMemo(() => {
    let list = allListings

    if (activeTab === 'active') list = list.filter((l) => l.status === 'active')
    else if (activeTab === 'paused') list = list.filter((l) => l.status === 'paused')
    else if (activeTab === 'closed') list = list.filter((l) => l.status === 'closed' || l.status === 'unknown')

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.sku.toLowerCase().includes(q) ||
          l.itemId.toLowerCase().includes(q)
      )
    }

    return list
  }, [allListings, activeTab, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / ITEMS_PER_PAGE))

  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredListings.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredListings, currentPage])

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  )

  const stats = useMemo(() => {
    const active = allListings.filter((l) => l.status === 'active').length
    const inactive = allListings.filter((l) => l.status !== 'active').length
    const lastUpdated = allListings
      .map((l) => l.lastUpdated)
      .filter((d): d is string => d != null)
      .sort()
      .at(-1)
    return { total: allListings.length, active, inactive, lastUpdated }
  }, [allListings])

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    setCurrentPage(1)
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    setCurrentPage(1)
  }

  const renderPagination = () => {
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
        buttons.push(<span key="ellipsis" style={styles.ellipsis}>...</span>)
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
          ...(currentPage >= totalPages || filteredListings.length === 0 ? styles.pageBtnDisabled : {}),
        }}
        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        disabled={currentPage >= totalPages || filteredListings.length === 0}
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
            placeholder="Buscar por título, SKU ou item ID..."
            value={searchQuery}
            onChange={handleSearch}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.topBarRight}>
          <button type="button" style={styles.bellBtn} aria-label="Notificações">
            <FiBell size={20} color="#6b7280" />
          </button>
          <button
            type="button"
            style={{
              ...styles.announceBtn,
              ...(!mlConnected ? styles.syncBtnDisabled : {}),
            }}
            onClick={() => setShowSelectProductModal(true)}
            disabled={!mlConnected}
            title={
              !mlConnected
                ? 'Conecte o Mercado Livre para anunciar'
                : 'Anunciar produto da loja no Mercado Livre'
            }
          >
            <FiPlus size={16} />
            Anunciar produto
          </button>
          <button
            type="button"
            style={{
              ...styles.syncBtn,
              ...(!mlConnected || isSyncing ? styles.syncBtnDisabled : {}),
            }}
            onClick={handleSync}
            disabled={!mlConnected || isSyncing}
            title={
              !mlConnected
                ? 'Conecte o Mercado Livre para sincronizar'
                : isSyncing
                  ? 'Sincronizando…'
                  : warning
                    ? 'Última tentativa falhou. Tentar novamente'
                    : lastResult
                      ? `Sincronizar novamente. Último resultado: ${lastResult.message}`
                      : 'Sincronizar anúncios do Mercado Livre'
            }
          >
            <FiRefreshCw size={16} style={isSyncing ? styles.spinIcon : undefined} />
            {isSyncing ? 'Sincronizando…' : 'Sincronizar ML'}
          </button>
        </div>
      </div>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.mlLogoWrap}>
            <img
              src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/logo__large_plus@2x.png"
              alt="Mercado Livre"
              style={styles.mlLogo}
            />
          </div>
          <div>
            <h1 style={styles.title}>Anúncios do Mercado Livre</h1>
            <p style={styles.subtitle}>
              Gerencie e acompanhe seus anúncios publicados no Mercado Livre.
            </p>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner} role="alert">
          <span>{error}</span>
          <button type="button" style={styles.retryBtn} onClick={() => void fetchListings()}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Not connected state */}
      {!loading && !mlConnected && (
        <div style={styles.emptyWrap}>
          <div style={styles.emptyIconCircle}>
            <FiShoppingBag size={34} color="#9ca3af" />
          </div>
          <h3 style={styles.emptyTitle}>Mercado Livre não conectado</h3>
          <p style={styles.emptySubtitle}>
            Conecte sua conta do Mercado Livre na tela de Marketplaces para visualizar e sincronizar seus anúncios.
          </p>
        </div>
      )}

      {/* Main content */}
      {mlConnected && (
        <>
          {/* Tabs */}
          <div style={styles.tabs}>
            {TAB_ITEMS.map((tab) => {
              const count =
                tab.id === 'all'
                  ? allListings.length
                  : tab.id === 'active'
                    ? stats.active
                    : tab.id === 'paused'
                      ? allListings.filter((l) => l.status === 'paused').length
                      : allListings.filter((l) => l.status === 'closed' || l.status === 'unknown').length

              return (
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
                  {!loading && (
                    <span
                      style={{
                        ...styles.tabCount,
                        ...(activeTab === tab.id ? styles.tabCountActive : {}),
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Loading */}
          {loading && (
            <div style={styles.loadingWrap}>
              <div style={styles.spinner} />
              <span style={styles.loadingText}>Carregando anúncios…</span>
            </div>
          )}

          {/* Empty — no ML listings */}
          {!loading && allListings.length === 0 && (
            <div style={styles.emptyWrap}>
              <div style={styles.emptyIconCircle}>
                <FiShoppingBag size={34} color="#9ca3af" />
              </div>
              <h3 style={styles.emptyTitle}>Nenhum anúncio encontrado</h3>
              <p style={styles.emptySubtitle}>
                {unannouncedProducts.length > 0
                  ? 'Anuncie um produto da loja ou sincronize os anúncios já existentes no Mercado Livre.'
                  : 'Clique em "Sincronizar ML" para importar seus anúncios do Mercado Livre.'}
              </p>
              <div style={styles.emptyActions}>
                {unannouncedProducts.length > 0 && (
                  <button
                    type="button"
                    style={styles.announceCtaBtn}
                    onClick={() => setShowSelectProductModal(true)}
                  >
                    <FiPlus size={15} />
                    Anunciar produto
                  </button>
                )}
                <button
                  type="button"
                  style={styles.syncCtaBtn}
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  <FiRefreshCw size={15} style={isSyncing ? styles.spinIcon : undefined} />
                  {isSyncing ? 'Sincronizando…' : 'Sincronizar agora'}
                </button>
              </div>
            </div>
          )}

          {/* Empty — tab filter yields nothing */}
          {!loading && allListings.length > 0 && filteredListings.length === 0 && (
            <div style={styles.emptyWrap}>
              <h3 style={styles.emptyTitle}>Sem resultados</h3>
              <p style={styles.emptySubtitle}>Tente ajustar os filtros ou a busca.</p>
            </div>
          )}

          {/* Table */}
          {!loading && filteredListings.length > 0 && (
            <>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, ...styles.thFirst }}>TÍTULO DO ANÚNCIO</th>
                      <th style={styles.th}>ITEM ID</th>
                      <th style={styles.th}>DISPONÍVEL</th>
                      <th style={styles.th}>PREÇO</th>
                      <th style={styles.th}>ÚLTIMA ATUALIZAÇÃO</th>
                      <th style={{ ...styles.th, ...styles.thLast }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedListings.map((listing) => {
                      const statusCfg = STATUS_CONFIG[listing.status]
                      return (
                        <tr
                          key={listing.productId}
                          style={styles.trClickable}
                          onClick={() => setSelectedProductId(listing.productId)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSelectedProductId(listing.productId)
                            }
                          }}
                        >
                          <td style={{ ...styles.td, ...styles.tdFirst }}>
                            <div style={styles.titleCell}>
                              <ProductImageThumb src={listing.imageUrl} alt={listing.title} size={40} />
                              <div>
                                <span style={styles.listingTitle}>{listing.title}</span>
                                <span style={styles.listingSku}>SKU: {listing.sku}</span>
                              </div>
                            </div>
                          </td>
                          <td style={styles.td}>
                            {listing.permalink ? (
                              <a
                                href={listing.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={styles.itemIdLink}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {listing.itemId}
                                <FiExternalLink size={12} />
                              </a>
                            ) : (
                              <span style={styles.itemIdText}>{listing.itemId}</span>
                            )}
                          </td>
                          <td style={styles.td}>
                            <span
                              style={{
                                ...styles.availableText,
                                color:
                                  listing.available === 0
                                    ? '#dc2626'
                                    : listing.available < 10
                                      ? '#d97706'
                                      : '#111827',
                              }}
                            >
                              {listing.available} un.
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.priceText}>{BRL.format(listing.price)}</span>
                          </td>
                          <td style={styles.td}>
                            <span style={styles.dateText}>
                              {listing.lastUpdated
                                ? formatRelative(listing.lastUpdated)
                                : '—'}
                            </span>
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
                  Mostrando{' '}
                  <strong>{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> a{' '}
                  <strong>
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredListings.length)}
                  </strong>{' '}
                  de <strong>{filteredListings.length}</strong> anúncios
                </span>
                <div style={styles.paginationBtns}>{renderPagination()}</div>
              </div>
            </>
          )}

          {/* Footer stats */}
          {!loading && (
            <div style={styles.footerRow}>
              <div style={styles.footerCard}>
                <div style={{ ...styles.footerIcon, backgroundColor: '#ede9fe', color: '#7c3aed' }}>
                  <FiClock size={20} />
                </div>
                <div>
                  <span style={styles.footerLabel}>Última Sincronização</span>
                  <span style={styles.footerValue}>
                    {stats.lastUpdated ? formatRelative(stats.lastUpdated) : '—'}
                  </span>
                </div>
              </div>
              <div style={styles.footerCard}>
                <div style={{ ...styles.footerIcon, backgroundColor: '#dcfce7', color: '#16a34a' }}>
                  <FiCheckCircle size={20} />
                </div>
                <div>
                  <span style={styles.footerLabel}>Anúncios Ativos</span>
                  <span style={styles.footerValue}>{stats.active}</span>
                </div>
              </div>
              <div style={styles.footerCard}>
                <div style={{ ...styles.footerIcon, backgroundColor: '#fee2e2', color: '#dc2626' }}>
                  <FiXCircle size={20} />
                </div>
                <div>
                  <span style={styles.footerLabel}>Inativos / Fechados</span>
                  <span style={styles.footerValue}>{stats.inactive}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {systemClientId != null && selectedProductId != null && (
        <ProductDetailDialog
          productId={selectedProductId}
          systemClientId={systemClientId}
          initialProduct={selectedProduct}
          mlConnected={mlConnected}
          onClose={() => setSelectedProductId(null)}
          onChanged={() => void fetchListings()}
        />
      )}

      <SelectProductToAnnounceModal
        open={showSelectProductModal}
        products={unannouncedProducts}
        onClose={() => setShowSelectProductModal(false)}
        onSelect={handleSelectProductToAnnounce}
      />

      {announceTarget != null && systemClientId != null && (
        <AnnounceProductModal
          open={announceTarget != null}
          product={announceTarget}
          systemClientId={systemClientId}
          onClose={() => {
            if (!announceSubmitting) {
              setAnnounceTarget(null)
              setAnnounceError(null)
            }
          }}
          onSubmit={handleAnnounce}
          submitting={announceSubmitting}
          errorMessage={announceError}
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
  syncBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#333333',
    backgroundColor: '#ffe600',
    cursor: 'pointer',
  },
  announceBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  syncBtnDisabled: {
    opacity: 0.5,
    cursor: 'default' as const,
  },
  spinIcon: {
    animation: 'spin 0.8s linear infinite',
  },

  /* Header */
  header: {
    marginBottom: '28px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  mlLogoWrap: {
    padding: '8px 12px',
    backgroundColor: '#fffde7',
    borderRadius: '10px',
    border: '1px solid #fde68a',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  mlLogo: {
    height: '22px',
    objectFit: 'contain' as const,
  },
  title: {
    fontSize: '26px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '4px',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '14px',
    lineHeight: 1.5,
    color: '#6b7280',
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
  /* Empty states */
  emptyWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    textAlign: 'center' as const,
    gap: '12px',
    marginBottom: '24px',
  },
  emptyIconCircle: {
    width: '76px',
    height: '76px',
    borderRadius: '50%',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  emptyTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: '#111827',
  },
  emptySubtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
    maxWidth: '400px',
  },
  syncCtaBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
    padding: '10px 22px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#333333',
    backgroundColor: '#ffe600',
    cursor: 'pointer',
  },
  emptyActions: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '10px',
    justifyContent: 'center',
    marginTop: '4px',
  },
  announceCtaBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 22px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },

  /* Tabs */
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '20px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
    width: 'fit-content',
  },
  tabBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 20px',
    border: 'none',
    borderRight: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
    cursor: 'pointer',
  },
  tabBtnActive: {
    backgroundColor: '#f3f4f6',
    color: '#111827',
    fontWeight: 600,
  },
  tabCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    height: '20px',
    padding: '0 6px',
    borderRadius: '999px',
    backgroundColor: '#f3f4f6',
    fontSize: '11px',
    fontWeight: 700,
    color: '#6b7280',
  },
  tabCountActive: {
    backgroundColor: '#e5e7eb',
    color: '#111827',
  },

  /* Loading */
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '64px 0',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#ffe600',
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
    marginBottom: '16px',
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

  /* Item ID */
  itemIdLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#4f46e5',
    textDecoration: 'none',
    fontFamily: 'monospace',
  },
  itemIdText: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
    fontFamily: 'monospace',
  },

  /* Available */
  availableText: {
    fontSize: '14px',
    fontWeight: 600,
  },

  /* Price */
  priceText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },

  /* Date */
  dateText: {
    fontSize: '13px',
    color: '#6b7280',
  },

  /* Status badge */
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap' as const,
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
  ellipsis: {
    fontSize: '14px',
    color: '#9ca3af',
    padding: '0 4px',
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
