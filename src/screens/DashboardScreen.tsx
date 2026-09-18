import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiArrowUpRight,
  FiBox,
  FiClock,
  FiCornerUpLeft,
  FiDollarSign,
  FiFileText,
  FiPackage,
  FiRefreshCw,
  FiShoppingBag,
  FiShoppingCart,
} from 'react-icons/fi'
import type { ReactNode } from 'react'
import { ActivityEmptyState } from '../components/ActivityEmptyState'
import { GenerateReportModal } from '../components/GenerateReportModal'
import { useAppNavigation } from '../contexts/AppNavigationContext'
import { useAuth } from '../contexts/AuthContext'
import { useMercadoLivreSync } from '../contexts/MercadoLivreSyncContext'
import { formatRelative } from '../lib/relativeTime'
import { getDashboardSummary, type DashboardRange, type DashboardSummary } from '../services/dashboardApi'
import { listProducts } from '../services/productsApi'
import { listSales } from '../services/salesApi'
import type { SaleDto } from '../types/sale'

// ─── Config ──────────────────────────────────────────────────────────────────

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const NUM = new Intl.NumberFormat('pt-BR')
const PCT = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const WEEKDAY = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })

/** Mesmo critério do Estoque: disponível (stock - reservado) abaixo disso é alerta. */
const LOW_STOCK_THRESHOLD = 10
/** Quantos eventos mostrar no painel de atividade recente. */
const RECENT_LIMIT = 6
/** Página buscada em Vendas/Produtos para derivar atividade e estoque baixo. */
const SOURCE_PAGE_SIZE = 200

const RANGE_OPTIONS: { id: DashboardRange; label: string }[] = [
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
]

type ActivityRowData = {
  id: string
  type: 'order' | 'return'
  title: string
  description: string
  createdAt: string
}

const ACTIVITY_STYLE: Record<ActivityRowData['type'], { icon: ReactNode; bg: string; color: string }> = {
  order: { icon: <FiShoppingCart size={14} />, bg: '#dcfce7', color: '#16a34a' },
  return: { icon: <FiCornerUpLeft size={14} />, bg: '#fee2e2', color: '#dc2626' },
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${PCT.format(Math.abs(value))}%`
}

function weekdayLabel(dateStr: string): string {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr}T00:00:00` : dateStr
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return dateStr
  const label = WEEKDAY.format(date).replace('.', '')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function availableQty(p: { stock: number; reserved_stock: number }): number {
  return Math.max(0, p.stock - p.reserved_stock)
}

function saleToActivity(sale: SaleDto, productNames: Record<number, string>): ActivityRowData {
  const cancelled = sale.status === 'CANCELLED'
  const name = productNames[sale.product_id] ?? `Produto #${sale.product_id}`
  return {
    id: `sale-${sale.id}`,
    type: cancelled ? 'return' : 'order',
    title: cancelled ? `Venda cancelada #${sale.id}` : `Novo pedido #${sale.id}`,
    description: `${name} · ${BRL.format(Number(sale.total_value))}`,
    createdAt: sale.created_at,
  }
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function DashboardScreen() {
  const { user } = useAuth()
  const { navigateTo } = useAppNavigation()
  const { catalogRevision, syncNow, isSyncing } = useMercadoLivreSync()
  const systemClientId = user?.systemClientId ?? null

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [recentActivity, setRecentActivity] = useState<ActivityRowData[]>([])
  const [lowStockCount, setLowStockCount] = useState(0)
  const [range, setRange] = useState<DashboardRange>('7d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  const openReport = useCallback(() => setReportModalOpen(true), [])
  const closeReport = useCallback(() => setReportModalOpen(false), [])

  const load = useCallback(
    async (selectedRange: DashboardRange) => {
      if (systemClientId == null) return
      setLoading(true)
      setError(null)

      const [summaryResult, salesResult, productsResult] = await Promise.allSettled([
        getDashboardSummary(systemClientId, selectedRange),
        listSales(systemClientId, 0, SOURCE_PAGE_SIZE),
        listProducts(systemClientId, 0, SOURCE_PAGE_SIZE),
      ])

      // KPIs + gráfico são o núcleo: se o /summary falha, a tela mostra erro.
      if (summaryResult.status !== 'fulfilled') {
        const reason = summaryResult.reason
        setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o painel.')
        setLoading(false)
        return
      }
      setSummary(summaryResult.value)

      // Estoque baixo e atividade recente são complementares: se falharem,
      // degradam para vazio sem derrubar o painel.
      const products =
        productsResult.status === 'fulfilled' ? productsResult.value.content : []
      const productNames = Object.fromEntries(products.map((p) => [p.id, p.name]))
      setLowStockCount(products.filter((p) => availableQty(p) < LOW_STOCK_THRESHOLD).length)

      const sales = salesResult.status === 'fulfilled' ? salesResult.value.content : []
      const recent = [...sales]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, RECENT_LIMIT)
        .map((sale) => saleToActivity(sale, productNames))
      setRecentActivity(recent)

      setLoading(false)
    },
    [systemClientId],
  )

  // Espelha o range atual para o effect de recarga não precisar depender dele
  // (a troca de range recarrega imperativamente em handleRangeChange).
  const rangeRef = useRef(range)
  useEffect(() => {
    rangeRef.current = range
  }, [range])

  useEffect(() => {
    // catalogRevision é sinal de invalidação (sync do ML concluído), não parâmetro.
    void catalogRevision
    void load(rangeRef.current)
  }, [catalogRevision, load])

  const handleRangeChange = useCallback(
    (next: DashboardRange) => {
      setRange(next)
      void load(next)
    },
    [load],
  )

  const handleSync = useCallback(async () => {
    if (isSyncing) return
    await syncNow('manual')
    await load(range)
  }, [isSyncing, syncNow, load, range])

  const kpiCards = useMemo(() => {
    if (!summary) return []
    return [
      { id: 'products', label: 'Produtos', value: NUM.format(summary.totalProducts), trend: summary.totalProductsChangePct, icon: <FiPackage size={16} /> },
      { id: 'inventory', label: 'Estoque total', value: NUM.format(summary.totalStock), trend: summary.totalStockChangePct, icon: <FiBox size={16} /> },
      { id: 'listings', label: 'Anúncios ativos', value: NUM.format(summary.activeListings), trend: summary.activeListingsChangePct, icon: <FiShoppingBag size={16} /> },
      { id: 'revenue', label: 'Vendas (hoje)', value: BRL.format(summary.revenueToday), trend: summary.revenueTodayChangePct, icon: <FiDollarSign size={16} /> },
    ]
  }, [summary])

  const maxSalesValue = useMemo(() => {
    if (!summary || summary.salesByDay.length === 0) return 0
    return Math.max(...summary.salesByDay.map((p) => p.total))
  }, [summary])

  const isEmpty = useMemo(() => {
    if (!summary) return false
    return (
      summary.totalProducts === 0 &&
      summary.totalStock === 0 &&
      summary.activeListings === 0 &&
      summary.revenueToday === 0 &&
      lowStockCount === 0 &&
      recentActivity.length === 0 &&
      summary.salesByDay.every((p) => p.total === 0)
    )
  }, [summary, lowStockCount, recentActivity])

  const reportModal = (
    <GenerateReportModal
      key="generate-report-modal"
      open={reportModalOpen}
      onClose={closeReport}
      systemClientId={systemClientId}
    />
  )

  // ── Loading ──
  if (loading) {
    return (
      <div style={styles.page}>
        <DashboardHeader
          onSync={handleSync}
          isSyncing={isSyncing}
          onGenerateReport={openReport}
          disabled
        />
        <DashboardSkeleton />
        {reportModal}
      </div>
    )
  }

  // ── Erro ──
  if (error) {
    return (
      <div style={styles.page}>
        <DashboardHeader
          onSync={handleSync}
          isSyncing={isSyncing}
          onGenerateReport={openReport}
          disabled
        />
        <div style={styles.errorPanel} role="alert">
          <span style={styles.errorIcon}>
            <FiAlertCircle size={22} />
          </span>
          <p style={styles.errorTitle}>Não foi possível carregar o painel</p>
          <p style={styles.errorText}>{error}</p>
          <button type="button" style={styles.retryBtn} onClick={() => void load(range)}>
            <FiRefreshCw size={15} />
            Tentar novamente
          </button>
        </div>
        {reportModal}
      </div>
    )
  }

  if (!summary) return null

  return (
    <div style={styles.page}>
      <DashboardHeader onSync={handleSync} isSyncing={isSyncing} onGenerateReport={openReport} />

      <section style={styles.kpiGrid}>
        {kpiCards.map((card) => (
          <article key={card.id} style={styles.kpiCard}>
            <div style={styles.kpiTop}>
              <span style={styles.kpiIcon}>{card.icon}</span>
              <span
                style={{
                  ...styles.kpiChange,
                  ...(card.trend >= 0 ? styles.kpiChangePositive : styles.kpiChangeNegative),
                }}
              >
                <FiArrowUpRight
                  size={13}
                  style={{ transform: card.trend >= 0 ? 'none' : 'rotate(90deg)' }}
                />
                {formatPercent(card.trend)}
              </span>
            </div>
            <p style={styles.kpiLabel}>{card.label}</p>
            <strong style={styles.kpiValue}>{card.value}</strong>
          </article>
        ))}
      </section>

      {lowStockCount > 0 && (
        <section style={styles.lowStockBanner}>
          <div style={styles.lowStockLeft}>
            <span style={styles.lowStockIcon}>
              <FiAlertTriangle size={16} />
            </span>
            <div>
              <p style={styles.lowStockTitle}>Alertas de estoque baixo</p>
              <p style={styles.lowStockText}>
                {lowStockCount === 1
                  ? '1 item está abaixo do limite de segurança.'
                  : `${NUM.format(lowStockCount)} itens estão abaixo do limite de segurança.`}
              </p>
            </div>
          </div>
          <button type="button" style={styles.lowStockBtn} onClick={() => navigateTo('Estoque')}>
            Ver itens
          </button>
        </section>
      )}

      {isEmpty ? (
        <ActivityEmptyState
          onGoToMarketplaces={() => navigateTo('Marketplaces')}
          onGoToStock={() => navigateTo('Estoque')}
        />
      ) : (
        <section style={styles.bottomGrid}>
          <article style={styles.salesCard}>
            <div style={styles.sectionHead}>
              <h2 style={styles.sectionTitle}>Vendas por dia</h2>
              <div style={styles.rangeToggle}>
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    style={{
                      ...styles.rangeBtn,
                      ...(range === opt.id ? styles.rangeBtnActive : {}),
                    }}
                    onClick={() => handleRangeChange(opt.id)}
                    aria-pressed={range === opt.id}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {summary.salesByDay.length === 0 ? (
              <div style={styles.chartEmpty}>Sem vendas no período.</div>
            ) : (
              <div
                style={{
                  ...styles.chartArea,
                  gridTemplateColumns: `repeat(${summary.salesByDay.length}, minmax(0, 1fr))`,
                }}
              >
                {summary.salesByDay.map((point, index) => {
                  const barHeight =
                    maxSalesValue > 0 ? `${Math.max(6, (point.total / maxSalesValue) * 100)}%` : '6%'
                  const isHighlight = maxSalesValue > 0 && point.total === maxSalesValue
                  return (
                    <div key={`${point.date}-${index}`} style={styles.barCol}>
                      <div
                        style={{
                          ...styles.bar,
                          height: barHeight,
                          ...(isHighlight ? styles.barHighlight : {}),
                        }}
                        title={`${weekdayLabel(point.date)}: ${BRL.format(point.total)} · ${NUM.format(point.count)} venda(s)`}
                      />
                      <span style={styles.barLabel}>{weekdayLabel(point.date)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </article>

          <aside style={styles.eventsCard}>
            <div style={styles.sectionHead}>
              <h2 style={styles.sectionTitle}>Atividade recente</h2>
            </div>
            <div style={styles.eventsList}>
              {recentActivity.length === 0 ? (
                <div style={styles.eventsEmpty}>
                  <FiActivity size={20} color="#cbd5e1" />
                  <span>Nenhuma atividade recente.</span>
                </div>
              ) : (
                recentActivity.map((event) => {
                  const cfg = ACTIVITY_STYLE[event.type]
                  return (
                    <div key={event.id} style={styles.eventRow}>
                      <span style={{ ...styles.eventIcon, backgroundColor: cfg.bg, color: cfg.color }}>
                        {cfg.icon}
                      </span>
                      <div style={styles.eventBody}>
                        <p style={styles.eventTitle}>{event.title}</p>
                        <p style={styles.eventDesc}>{event.description}</p>
                        {event.createdAt && (
                          <p style={styles.eventTime}>
                            <FiClock size={12} />
                            {formatRelative(event.createdAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <button type="button" style={styles.viewHistoryBtn} onClick={() => navigateTo('Atividade')}>
              Ver todo o histórico
            </button>
          </aside>
        </section>
      )}
      {reportModal}
    </div>
  )
}

// ─── Subcomponentes ────────────────────────────────────────────────────────

function DashboardHeader({
  onSync,
  isSyncing,
  onGenerateReport,
  disabled = false,
}: {
  onSync: () => void
  isSyncing: boolean
  onGenerateReport: () => void
  disabled?: boolean
}) {
  return (
    <section style={styles.headerSection}>
      <div>
        <h1 style={styles.pageTitle}>Visão geral</h1>
        <p style={styles.pageSubtitle}>Métricas de estoque e sincronização em tempo real.</p>
      </div>
      <div style={styles.headerActions}>
        <button type="button" style={styles.btnSecondary} onClick={onGenerateReport}>
          <FiFileText size={15} />
          Gerar relatório
        </button>
        <button
          type="button"
          style={{ ...styles.btnPrimary, ...(isSyncing || disabled ? styles.btnDisabled : {}) }}
          onClick={onSync}
          disabled={isSyncing || disabled}
        >
          <FiRefreshCw size={15} style={isSyncing ? styles.spinIcon : undefined} />
          {isSyncing ? 'Sincronizando…' : 'Sincronizar lojas'}
        </button>
      </div>
    </section>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <section style={styles.kpiGrid}>
        {[0, 1, 2, 3].map((i) => (
          <article key={i} style={styles.kpiCard}>
            <div style={styles.kpiTop}>
              <span style={{ ...styles.skeletonBlock, width: '30px', height: '30px', borderRadius: '9px' }} />
              <span style={{ ...styles.skeletonBlock, width: '48px', height: '14px' }} />
            </div>
            <span style={{ ...styles.skeletonBlock, width: '90px', height: '13px' }} />
            <span style={{ ...styles.skeletonBlock, width: '120px', height: '24px' }} />
          </article>
        ))}
      </section>

      <section style={styles.bottomGrid}>
        <article style={styles.salesCard}>
          <div style={styles.sectionHead}>
            <span style={{ ...styles.skeletonBlock, width: '150px', height: '20px' }} />
            <span style={{ ...styles.skeletonBlock, width: '120px', height: '28px' }} />
          </div>
          <div style={styles.chartArea}>
            {[60, 80, 45, 70, 55, 90, 65].map((h, i) => (
              <div key={i} style={styles.barCol}>
                <div style={{ ...styles.skeletonBlock, width: '100%', height: `${h}%`, borderRadius: '10px 10px 0 0' }} />
              </div>
            ))}
          </div>
        </article>

        <aside style={styles.eventsCard}>
          <div style={styles.sectionHead}>
            <span style={{ ...styles.skeletonBlock, width: '140px', height: '20px' }} />
          </div>
          <div style={styles.eventsList}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={styles.eventRow}>
                <span style={{ ...styles.skeletonBlock, width: '26px', height: '26px', borderRadius: '999px' }} />
                <div style={{ ...styles.eventBody, flex: 1 }}>
                  <span style={{ ...styles.skeletonBlock, width: '80%', height: '13px' }} />
                  <span style={{ ...styles.skeletonBlock, width: '60%', height: '11px', marginTop: '6px' }} />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </>
  )
}

const styles = {
  page: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '18px',
    color: '#0f172a',
    paddingBottom: '32px',
  },
  headerSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  pageTitle: {
    margin: 0,
    fontSize: '26px',
    lineHeight: 1.2,
    fontWeight: 700,
    color: '#0f172a',
  },
  pageSubtitle: {
    margin: '8px 0 0',
    fontSize: '14px',
    color: '#64748b',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    border: 'none',
    borderRadius: '10px',
    height: '38px',
    padding: '0 16px',
    backgroundColor: '#5664f5',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  btnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    borderRadius: '10px',
    height: '38px',
    padding: '0 16px',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  spinIcon: {
    animation: 'spin 0.8s linear infinite',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  kpiCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #eef2f7',
    borderRadius: '14px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    boxShadow: '0 1px 1px rgba(15, 23, 42, 0.02)',
  },
  kpiTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiIcon: {
    width: '30px',
    height: '30px',
    borderRadius: '9px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    color: '#5664f5',
  },
  kpiChange: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    fontSize: '12px',
    fontWeight: 700,
  },
  kpiChangePositive: {
    color: '#10b981',
  },
  kpiChangeNegative: {
    color: '#ef4444',
  },
  kpiLabel: {
    margin: 0,
    color: '#64748b',
    fontSize: '13px',
    fontWeight: 500,
  },
  kpiValue: {
    fontSize: '24px',
    lineHeight: 1.1,
    fontWeight: 700,
    color: '#0f172a',
  },
  lowStockBanner: {
    borderRadius: '12px',
    border: '1px solid #fed7aa',
    backgroundColor: '#fff7ed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    padding: '12px 14px',
    flexWrap: 'wrap' as const,
  },
  lowStockLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  lowStockIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '999px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffedd5',
    color: '#f97316',
  },
  lowStockTitle: {
    margin: 0,
    fontSize: '16px',
    color: '#9a3412',
    fontWeight: 700,
  },
  lowStockText: {
    margin: '2px 0 0',
    fontSize: '13px',
    color: '#c2410c',
    fontWeight: 500,
  },
  lowStockBtn: {
    border: 'none',
    borderRadius: '9px',
    height: '34px',
    padding: '0 14px',
    backgroundColor: '#f97316',
    color: '#ffffff',
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    fontSize: '12px',
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2fr) minmax(290px, 1fr)',
    gap: '12px',
    alignItems: 'stretch',
  },
  salesCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #eef2f7',
    borderRadius: '14px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #f1f5f9',
    padding: '14px 16px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 700,
    color: '#0f172a',
  },
  rangeToggle: {
    display: 'flex',
    borderRadius: '9px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  rangeBtn: {
    border: 'none',
    height: '32px',
    padding: '0 12px',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontWeight: 600,
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  rangeBtnActive: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
  },
  chartArea: {
    height: '280px',
    padding: '20px 16px 12px',
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
    alignItems: 'end',
    gap: '10px',
    background:
      'linear-gradient(to top, rgba(15,23,42,0.02) 1px, transparent 1px) 0 0 / 100% 62px',
  },
  chartEmpty: {
    height: '280px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#94a3b8',
    fontSize: '14px',
  },
  barCol: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '8px',
  },
  bar: {
    width: '100%',
    borderRadius: '10px 10px 0 0',
    backgroundColor: '#c7d2fe',
    transition: 'height 0.2s ease',
  },
  barHighlight: {
    backgroundColor: '#6366f1',
  },
  barLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 600,
  },
  eventsCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #eef2f7',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  eventsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '8px 12px',
    gap: '8px',
    flex: 1,
  },
  eventsEmpty: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '32px 8px',
    textAlign: 'center' as const,
    color: '#94a3b8',
    fontSize: '13px',
  },
  eventRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '9px',
    padding: '8px 6px',
    borderRadius: '10px',
  },
  eventIcon: {
    width: '26px',
    height: '26px',
    borderRadius: '999px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  eventBody: {
    minWidth: 0,
  },
  eventTitle: {
    margin: 0,
    color: '#0f172a',
    fontSize: '13px',
    fontWeight: 700,
  },
  eventDesc: {
    margin: '2px 0 0',
    color: '#64748b',
    fontSize: '12px',
    lineHeight: 1.4,
  },
  eventTime: {
    margin: '6px 0 0',
    color: '#94a3b8',
    fontSize: '11px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  viewHistoryBtn: {
    border: 'none',
    borderTop: '1px solid #f1f5f9',
    backgroundColor: '#ffffff',
    color: '#4f46e5',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'inherit',
    cursor: 'pointer',
    padding: '14px',
  },

  /* Error */
  errorPanel: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '56px 24px',
    backgroundColor: '#ffffff',
    border: '1px solid #fecaca',
    borderRadius: '14px',
    textAlign: 'center' as const,
  },
  errorIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    marginBottom: '4px',
  },
  errorTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a',
  },
  errorText: {
    margin: 0,
    fontSize: '14px',
    color: '#64748b',
    maxWidth: '420px',
  },
  retryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
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

  /* Skeleton */
  skeletonBlock: {
    display: 'block',
    backgroundColor: '#e2e8f0',
    borderRadius: '6px',
    animation: 'dash-pulse 1.4s ease-in-out infinite',
  },
} as const
