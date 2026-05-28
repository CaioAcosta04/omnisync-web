import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronDown,
  FiChevronRight,
  FiClipboard,
  FiCornerUpLeft,
  FiDownload,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiShoppingCart,
  FiTrendingUp,
} from 'react-icons/fi'
import { ActivityEmptyState } from '../components/ActivityEmptyState'
import { useAppNavigation } from '../contexts/AppNavigationContext'
import { useAuth } from '../contexts/AuthContext'
import { formatRelative } from '../lib/relativeTime'
import { listProducts } from '../services/productsApi'
import { getSaleById, listSales } from '../services/salesApi'
import type { SaleChannel, SaleDto } from '../types/sale'

// ─── Domain types ────────────────────────────────────────────────────────────

type DayBucket = 'today' | 'yesterday' | 'older'
type TimeFilter = 'all' | 'today' | '7d'
type EventType = 'order' | 'low_stock' | 'listing_sync' | 'return' | 'bulk_update'

type ActivityEvent = {
  id: string
  type: EventType
  title: string
  description: string
  time: string
  day: DayBucket
  isoDate: string
  badge?: { label: string; bg: string; color: string }
  actionBtn?: { label: string }
  price?: { amount: string; status: string }
  marketplaceBadges?: { letter: string; color: string }[]
  marketplaceNames?: string
  progressBar?: { percent: number; color: string }
  successLabel?: string
  linkedText?: string
  highlightedName?: string
  source?: string
}

// ─── Static config ────────────────────────────────────────────────────────────

const EVENT_STYLE: Record<EventType, { borderColor: string; iconBg: string; iconColor: string }> = {
  order: { borderColor: '#22c55e', iconBg: '#dcfce7', iconColor: '#16a34a' },
  low_stock: { borderColor: '#f59e0b', iconBg: '#fef3c7', iconColor: '#d97706' },
  listing_sync: { borderColor: '#3b82f6', iconBg: '#dbeafe', iconColor: '#2563eb' },
  return: { borderColor: '#ef4444', iconBg: '#fee2e2', iconColor: '#dc2626' },
  bulk_update: { borderColor: '#8b5cf6', iconBg: '#ede9fe', iconColor: '#7c3aed' },
}

const EVENT_ICONS: Record<EventType, React.ReactNode> = {
  order: <FiShoppingCart size={20} />,
  low_stock: <FiAlertTriangle size={20} />,
  listing_sync: <FiRefreshCw size={20} />,
  return: <FiCornerUpLeft size={20} />,
  bulk_update: <FiClipboard size={20} />,
}

const HEALTH_ITEMS = [
  { name: 'Amazon', color: '#f59e0b', status: '#22c55e' },
  { name: 'Shopify', color: '#22c55e', status: '#22c55e' },
  { name: 'eBay', color: '#a3e635', status: '#f59e0b' },
]

const CHANNEL_DISPLAY: Record<SaleChannel, { label: string; letter: string; color: string }> = {
  MERCADO_LIVRE: { label: 'Mercado Livre', letter: 'M', color: '#ffe600' },
  SHOPEE: { label: 'Shopee', letter: 'S', color: '#f97316' },
  AMAZON: { label: 'Amazon', letter: 'A', color: '#f59e0b' },
  PHYSICAL: { label: 'Loja física', letter: 'P', color: '#9ca3af' },
  MANUAL: { label: 'Manual', letter: 'M', color: '#8b5cf6' },
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const PAGE_SIZE = 50

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDayBucket(isoString: string): DayBucket {
  const now = new Date()
  const date = new Date(isoString)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000)
  if (date >= todayStart) return 'today'
  if (date >= yesterdayStart) return 'yesterday'
  return 'older'
}

function getDaysDiff(isoString: string): number {
  const diff = Date.now() - new Date(isoString).getTime()
  return Math.floor(diff / 86_400_000)
}

function saleToEvents(
  sale: SaleDto,
  productNamesById: Record<number, string>,
): ActivityEvent[] {
  const events: ActivityEvent[] = []
  const ch = CHANNEL_DISPLAY[sale.channel] ?? { label: sale.channel, letter: '?', color: '#9ca3af' }
  const productName = productNamesById[sale.product_id] ?? `Produto #${sale.product_id}`
  const isCancelled = sale.status === 'CANCELLED'
  const day = getDayBucket(sale.created_at)

  const mainEvent: ActivityEvent = {
    id: `sale-${sale.id}`,
    type: isCancelled ? 'return' : 'order',
    title: isCancelled ? `Venda cancelada #${sale.id}` : `Novo pedido #${sale.id}`,
    description: isCancelled ? 'Pedido cancelado para' : 'Cliente comprou',
    linkedText: productName,
    time: formatRelative(sale.created_at),
    isoDate: sale.created_at,
    day,
    source: ch.label,
    price: {
      amount: BRL.format(Number(sale.total_value)),
      status: isCancelled ? 'Cancelado' : 'Pago',
    },
    marketplaceBadges: [{ letter: ch.letter, color: ch.color }],
    marketplaceNames: ch.label,
  }
  events.push(mainEvent)

  if (sale.logs) {
    for (const log of sale.logs) {
      const logDay = getDayBucket(log.created_at)
      const statusChanged =
        log.previous_status != null &&
        log.new_status != null &&
        log.previous_status !== log.new_status

      const logEvent: ActivityEvent = {
        id: `log-${log.id}`,
        type: log.new_status === 'CANCELLED' ? 'return' : 'listing_sync',
        title: log.action,
        description: statusChanged
          ? `Status: ${log.previous_status ?? '—'} → ${log.new_status ?? '—'}`
          : `Venda #${sale.id} atualizada`,
        time: formatRelative(log.created_at),
        isoDate: log.created_at,
        day: logDay,
        source: ch.label,
      }
      events.push(logEvent)
    }
  }

  return events
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ActivityScreen() {
  const { user } = useAuth()
  const { navigateTo } = useAppNavigation()
  const systemClientId = user?.systemClientId ?? null

  const [sales, setSales] = useState<SaleDto[]>([])
  const [productNames, setProductNames] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalElements, setTotalElements] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')

  const fetchActivity = useCallback(async () => {
    if (systemClientId == null) return
    setLoading(true)
    setError(null)
    try {
      const page = await listSales(systemClientId, 0, PAGE_SIZE)
      setTotalElements(page.totalElements)

      if (page.content.length === 0) {
        setSales([])
        return
      }

      const [detailed, productsPage] = await Promise.all([
        Promise.all(page.content.map((s) => getSaleById(systemClientId, s.id))),
        listProducts(systemClientId, 0, 200),
      ])

      setSales(detailed)
      setProductNames(
        Object.fromEntries(productsPage.content.map((p) => [p.id, p.name])),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar atividade.')
    } finally {
      setLoading(false)
    }
  }, [systemClientId])

  const handleLoadMore = useCallback(async () => {
    if (systemClientId == null || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await listSales(systemClientId, sales.length, PAGE_SIZE)

      if (page.content.length === 0) return

      const [detailed, productsPage] = await Promise.all([
        Promise.all(page.content.map((s) => getSaleById(systemClientId, s.id))),
        listProducts(systemClientId, 0, 200),
      ])

      setSales((prev) => [...prev, ...detailed])
      setProductNames((prev) => ({
        ...prev,
        ...Object.fromEntries(productsPage.content.map((p) => [p.id, p.name])),
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar mais atividade.')
    } finally {
      setLoadingMore(false)
    }
  }, [systemClientId, sales.length, loadingMore])

  const handleSync = useCallback(async () => {
    if (systemClientId == null || syncing || loading) return
    setSyncing(true)
    setError(null)
    try {
      const page = await listSales(systemClientId, 0, PAGE_SIZE)
      setTotalElements(page.totalElements)

      if (page.content.length === 0) {
        setSales([])
        return
      }

      const [detailed, productsPage] = await Promise.all([
        Promise.all(page.content.map((s) => getSaleById(systemClientId, s.id))),
        listProducts(systemClientId, 0, 200),
      ])

      setSales(detailed)
      setProductNames(
        Object.fromEntries(productsPage.content.map((p) => [p.id, p.name])),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao sincronizar atividade.')
    } finally {
      setSyncing(false)
    }
  }, [systemClientId, syncing, loading])

  useEffect(() => {
    void fetchActivity()
  }, [fetchActivity])

  const allEvents = useMemo<ActivityEvent[]>(() => {
    const events = sales.flatMap((sale) => saleToEvents(sale, productNames))
    events.sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime())
    return events
  }, [sales, productNames])

  const filteredEvents = useMemo(() => {
    let events = allEvents

    if (timeFilter === 'today') {
      events = events.filter((e) => e.day === 'today')
    } else if (timeFilter === '7d') {
      events = events.filter((e) => getDaysDiff(e.isoDate) <= 7)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.linkedText && e.linkedText.toLowerCase().includes(q)) ||
          (e.source && e.source.toLowerCase().includes(q)),
      )
    }

    return events
  }, [allEvents, searchQuery, timeFilter])

  const todayEvents = filteredEvents.filter((e) => e.day === 'today')
  const yesterdayEvents = filteredEvents.filter((e) => e.day === 'yesterday')
  const olderEvents = filteredEvents.filter((e) => e.day === 'older')

  const hasMore = sales.length < totalElements

  const renderEventCard = (event: ActivityEvent) => {
    const cfg = EVENT_STYLE[event.type]
    const icon = EVENT_ICONS[event.type]

    return (
      <div key={event.id} style={{ ...styles.card, borderLeftColor: cfg.borderColor }}>
        <div style={{ ...styles.cardIcon, backgroundColor: cfg.iconBg, color: cfg.iconColor }}>
          {icon}
        </div>

        <div style={styles.cardBody}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>{event.title}</h3>
            <span style={styles.cardTime}>{event.time}</span>
            {event.actionBtn && (
              <button type="button" style={styles.actionBtn}>
                {event.actionBtn.label}
              </button>
            )}
          </div>

          <p style={styles.cardDesc}>
            {event.source && (
              <>
                <strong>{event.source}</strong>:{' '}
              </>
            )}
            {event.description}
            {event.highlightedName && <strong> {event.highlightedName}</strong>}
            {event.linkedText && (
              <span style={styles.link}> {event.linkedText}</span>
            )}
          </p>

          {event.price && (
            <div style={styles.priceRow}>
              <span style={styles.priceAmount}>{event.price.amount}</span>
              <span
                style={{
                  ...styles.pricePaid,
                  backgroundColor: event.price.status === 'Cancelado' ? '#fee2e2' : '#dcfce7',
                  color: event.price.status === 'Cancelado' ? '#991b1b' : '#166534',
                }}
              >
                {event.price.status}
              </span>
            </div>
          )}

          {event.progressBar && (
            <div style={styles.progressWrap}>
              <div
                style={{
                  ...styles.progressBar,
                  width: `${event.progressBar.percent}%`,
                  backgroundColor: event.progressBar.color,
                }}
              />
            </div>
          )}

          {event.badge && (
            <span
              style={{
                ...styles.badge,
                backgroundColor: event.badge.bg,
                color: event.badge.color,
              }}
            >
              {event.badge.label}
            </span>
          )}

          {event.marketplaceBadges && (
            <div style={styles.mpRow}>
              <div style={styles.mpBadges}>
                {event.marketplaceBadges.map((b, i) => (
                  <span
                    key={`${event.id}-${b.letter}-${i}`}
                    style={{
                      ...styles.mpBadge,
                      backgroundColor: b.color,
                      color: b.color === '#ffe600' ? '#333333' : '#ffffff',
                    }}
                  >
                    {b.letter}
                  </span>
                ))}
              </div>
              {event.marketplaceNames && (
                <span style={styles.mpNames}>{event.marketplaceNames}</span>
              )}
            </div>
          )}

          {event.successLabel && (
            <div style={styles.successRow}>
              <FiCheckCircle size={14} color="#16a34a" />
              <span style={styles.successText}>{event.successLabel}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.mainCol}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>Eventos e atividade</h1>
            <span style={styles.liveBadge}>
              <span style={styles.liveDot} />
              Ao vivo
            </span>
          </div>
          <div style={styles.headerRight}>
            <div style={styles.searchWrap}>
              <FiSearch size={16} color="#9ca3af" />
              <input
                type="text"
                placeholder="Buscar eventos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <button
              type="button"
              style={styles.iconBtn}
              aria-label="Sincronizar atividades"
              onClick={() => void handleSync()}
              disabled={syncing || loading}
              title="Sincronizar atividades"
            >
              <FiRefreshCw
                size={18}
                color={syncing ? '#4f46e5' : '#6b7280'}
                style={syncing ? styles.spinIcon : undefined}
              />
            </button>
            <button type="button" style={styles.iconBtn} aria-label="Ver registros">
              <FiFileText size={18} color="#6b7280" />
            </button>
            <button type="button" style={styles.exportBtn}>
              <FiDownload size={16} />
              Exportar relatório
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filters}>
          <div style={styles.timeFilters}>
            {([
              { id: 'all', label: 'Todo período' },
              { id: 'today', label: 'Hoje' },
              { id: '7d', label: 'Últimos 7 dias' },
            ] as const).map((t) => (
              <button
                key={t.id}
                type="button"
                style={{
                  ...styles.timeBtn,
                  ...(timeFilter === t.id ? styles.timeBtnActive : {}),
                }}
                onClick={() => setTimeFilter(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button type="button" style={styles.dropdownBtn}>
            <FiTrendingUp size={14} color="#6b7280" />
            Marketplace: Todos
            <FiChevronDown size={14} color="#6b7280" />
          </button>

          <button type="button" style={styles.dropdownBtn}>
            <FiShoppingCart size={14} color="#6b7280" />
            Produto: Todos
            <FiChevronDown size={14} color="#6b7280" />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={styles.loadingWrap}>
            <div style={styles.spinner} aria-label="Carregando atividade" />
            <span style={styles.loadingText}>Carregando atividade…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={styles.errorBanner} role="alert">
            <FiAlertCircle size={16} color="#dc2626" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && totalElements === 0 && (
          <ActivityEmptyState
            onGoToMarketplaces={() => navigateTo('Marketplaces')}
            onGoToStock={() => navigateTo('Estoque')}
          />
        )}

        {/* Timeline */}
        {!loading && !error && totalElements > 0 && (
          <>
            {todayEvents.length > 0 && (
              <>
                <div style={styles.dayDivider}>
                  <span style={styles.dayLabel}>HOJE</span>
                  <div style={styles.dayLine} />
                </div>
                <div style={styles.eventList}>
                  {todayEvents.map(renderEventCard)}
                </div>
              </>
            )}

            {yesterdayEvents.length > 0 && (
              <>
                <div style={styles.dayDivider}>
                  <span style={styles.dayLabel}>ONTEM</span>
                  <div style={styles.dayLine} />
                </div>
                <div style={styles.eventList}>
                  {yesterdayEvents.map(renderEventCard)}
                </div>
              </>
            )}

            {olderEvents.length > 0 && (
              <>
                <div style={styles.dayDivider}>
                  <span style={styles.dayLabel}>ANTERIORES</span>
                  <div style={styles.dayLine} />
                </div>
                <div style={styles.eventList}>
                  {olderEvents.map(renderEventCard)}
                </div>
              </>
            )}

            {filteredEvents.length === 0 && (
              <div style={styles.noResults}>
                Nenhum evento encontrado para os filtros selecionados.
              </div>
            )}

            {hasMore && (
              <button
                type="button"
                style={styles.loadMoreBtn}
                onClick={() => void handleLoadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? 'Carregando…' : 'Carregar atividade anterior'}
                {!loadingMore && <FiChevronDown size={16} />}
              </button>
            )}
          </>
        )}
      </div>

      {/* Right sidebar */}
      <aside style={styles.sidebar}>
        <h3 style={styles.sidebarSectionTitle}>ESTATÍSTICAS EM TEMPO REAL</h3>

        {/* Sales Velocity */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>Velocidade de vendas</span>
            <span style={styles.statTrend}>+12%</span>
          </div>
          <div style={styles.statValue}>
            <span style={styles.statBigNumber}>42</span>
            <span style={styles.statUnit}>pedidos/h</span>
          </div>
          <div style={styles.barChart}>
            {[35, 50, 40, 55, 45, 60, 80].map((h, i) => (
              <div
                key={i}
                style={{
                  ...styles.bar,
                  height: `${h}%`,
                  backgroundColor: i === 6 ? '#6366f1' : '#c7d2fe',
                }}
              />
            ))}
          </div>
        </div>

        {/* Health Status */}
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Status de saúde</span>
          <div style={styles.healthList}>
            {HEALTH_ITEMS.map((item) => (
              <div key={item.name} style={styles.healthRow}>
                <div style={styles.healthLeft}>
                  <span
                    style={{
                      ...styles.healthSquare,
                      backgroundColor: item.color,
                    }}
                  />
                  <span style={styles.healthName}>{item.name}</span>
                </div>
                <span
                  style={{
                    ...styles.healthDot,
                    backgroundColor: item.status,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <h3 style={{ ...styles.sidebarSectionTitle, marginTop: '24px' }}>ATALHOS</h3>
        <div style={styles.quickLinks}>
          {['Registros de auditoria', 'Configurações de sync'].map((link) => (
            <button key={link} type="button" style={styles.quickLinkBtn}>
              <span>{link}</span>
              <FiChevronRight size={16} color="#9ca3af" />
            </button>
          ))}
        </div>
      </aside>
    </div>
  )
}

const styles = {
  page: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '28px 28px 40px',
    display: 'flex',
    gap: '28px',
    alignSelf: 'flex-start',
    color: '#111827',
  },
  mainCol: {
    flex: 1,
    minWidth: 0,
  },

  /* Header */
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '26px',
    fontWeight: 700,
    color: '#111827',
  },
  liveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '999px',
    border: '1px solid #bbf7d0',
    backgroundColor: '#f0fdf4',
    fontSize: '12px',
    fontWeight: 600,
    color: '#16a34a',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    minWidth: '180px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: '13px',
    color: '#111827',
    backgroundColor: 'transparent',
  },
  iconBtn: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  spinIcon: {
    animation: 'spin 0.8s linear infinite',
  },
  exportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 18px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#4f46e5',
    cursor: 'pointer',
  },

  /* Filters */
  filters: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '28px',
    flexWrap: 'wrap' as const,
  },
  timeFilters: {
    display: 'flex',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  },
  timeBtn: {
    padding: '8px 16px',
    border: 'none',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
    cursor: 'pointer',
    borderRight: '1px solid #e5e7eb',
  },
  timeBtnActive: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontWeight: 600,
  },
  dropdownBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
  },

  /* Loading */
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
    padding: '60px 0',
  },
  spinner: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '3px solid #e5e7eb',
    borderTopColor: '#4f46e5',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: '#6b7280',
  },

  /* Error */
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 18px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#dc2626',
    marginBottom: '16px',
  },

  /* Day divider */
  dayDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    marginTop: '8px',
  },
  dayLabel: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#6b7280',
    flexShrink: 0,
  },
  dayLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e5e7eb',
  },

  /* Event list */
  eventList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
    marginBottom: '20px',
  },

  /* No results */
  noResults: {
    textAlign: 'center' as const,
    padding: '40px 0',
    fontSize: '14px',
    color: '#9ca3af',
  },

  /* Event card */
  card: {
    display: 'flex',
    gap: '16px',
    padding: '18px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    borderLeft: '4px solid transparent',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  cardIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#111827',
    flex: 1,
  },
  cardTime: {
    fontSize: '12px',
    color: '#9ca3af',
    flexShrink: 0,
  },
  cardDesc: {
    fontSize: '13px',
    lineHeight: 1.55,
    color: '#4b5563',
  },
  link: {
    color: '#4f46e5',
    textDecoration: 'underline' as const,
    textUnderlineOffset: '2px',
    cursor: 'pointer',
  },

  /* Price */
  priceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  priceAmount: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#111827',
  },
  pricePaid: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 10px',
    borderRadius: '999px',
    backgroundColor: '#dcfce7',
    color: '#166534',
  },

  /* Progress bar */
  progressWrap: {
    width: '100%',
    maxWidth: '320px',
    height: '6px',
    borderRadius: '3px',
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s',
  },

  /* Badge */
  badge: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: '999px',
    alignSelf: 'flex-start' as const,
  },

  /* Action button */
  actionBtn: {
    padding: '5px 14px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '12px',
    fontWeight: 600,
    color: '#374151',
    cursor: 'pointer',
    flexShrink: 0,
  },

  /* Marketplace badges */
  mpRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  mpBadges: {
    display: 'flex',
    gap: '4px',
  },
  mpBadge: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    color: '#ffffff',
  },
  mpNames: {
    fontSize: '12px',
    color: '#6b7280',
  },

  /* Success */
  successRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  successText: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#16a34a',
  },

  /* Load more */
  loadMoreBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '14px',
    marginTop: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#4f46e5',
    cursor: 'pointer',
    textDecoration: 'underline' as const,
    textUnderlineOffset: '3px',
  },

  /* Sidebar */
  sidebar: {
    width: '260px',
    flexShrink: 0,
  },
  sidebarSectionTitle: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#6b7280',
    marginBottom: '14px',
  },

  /* Stat card */
  statCard: {
    padding: '18px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    marginBottom: '14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  statHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#6b7280',
  },
  statTrend: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#16a34a',
  },
  statValue: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
  },
  statBigNumber: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1,
  },
  statUnit: {
    fontSize: '14px',
    color: '#6b7280',
  },
  barChart: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '6px',
    height: '48px',
    marginTop: '4px',
  },
  bar: {
    flex: 1,
    borderRadius: '3px',
    minWidth: '12px',
  },

  /* Health */
  healthList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginTop: '4px',
  },
  healthRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  healthLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  healthSquare: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
  },
  healthName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  healthDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },

  /* Quick links */
  quickLinks: {
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  quickLinkBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    border: 'none',
    borderBottom: '1px solid #f3f4f6',
    backgroundColor: 'transparent',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
  },
} as const
