import {
  FiActivity,
  FiAlertTriangle,
  FiArrowUpRight,
  FiBox,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiPackage,
  FiShoppingBag,
  FiUsers,
} from 'react-icons/fi'
import type { ReactNode } from 'react'

type KpiCard = {
  id: string
  label: string
  value: string
  change: string
  positive: boolean
  icon: ReactNode
}

type SalesPoint = {
  day: string
  value: number
  highlight?: boolean
}

type RecentEvent = {
  id: string
  title: string
  description: string
  timeAgo: string
  icon: ReactNode
  tone: 'success' | 'warning' | 'neutral'
}

const KPI_CARDS: KpiCard[] = [
  {
    id: 'products',
    label: 'Total Products',
    value: '12,480',
    change: '+2.4%',
    positive: true,
    icon: <FiPackage size={16} />,
  },
  {
    id: 'inventory',
    label: 'Total Inventory',
    value: '452,102',
    change: '-0.8%',
    positive: false,
    icon: <FiBox size={16} />,
  },
  {
    id: 'listings',
    label: 'Active Listings',
    value: '8,234',
    change: '+5.1%',
    positive: true,
    icon: <FiShoppingBag size={16} />,
  },
  {
    id: 'sales',
    label: 'Sales (Today)',
    value: '$14,290',
    change: '+12.3%',
    positive: true,
    icon: <FiDollarSign size={16} />,
  },
]

const SALES_BY_DAY: SalesPoint[] = [
  { day: 'Mon', value: 42 },
  { day: 'Tue', value: 55 },
  { day: 'Wed', value: 74 },
  { day: 'Thu', value: 50 },
  { day: 'Fri', value: 66 },
  { day: 'Sat', value: 86, highlight: true },
  { day: 'Sun', value: 70 },
]

const RECENT_EVENTS: RecentEvent[] = [
  {
    id: '1',
    title: 'Amazon Sync Complete',
    description: 'Updated 240 listings across NA region.',
    timeAgo: '2 min ago',
    icon: <FiCheckCircle size={14} />,
    tone: 'success',
  },
  {
    id: '2',
    title: 'New User Joined',
    description: 'Sarah Miller added to Marketing team.',
    timeAgo: '3 hours ago',
    icon: <FiUsers size={14} />,
    tone: 'neutral',
  },
  {
    id: '3',
    title: 'Low Stock Detected',
    description: '12 SKUs dropped below safety threshold.',
    timeAgo: '5 hours ago',
    icon: <FiAlertTriangle size={14} />,
    tone: 'warning',
  },
  {
    id: '4',
    title: 'Warehouse Activity',
    description: 'Inbound shipment confirmed in Sao Paulo.',
    timeAgo: '8 hours ago',
    icon: <FiActivity size={14} />,
    tone: 'neutral',
  },
]

const MAX_SALES_VALUE = Math.max(...SALES_BY_DAY.map((p) => p.value))

const EVENT_TONE_STYLES: Record<RecentEvent['tone'], { bg: string; color: string }> = {
  success: { bg: '#dcfce7', color: '#16a34a' },
  warning: { bg: '#fef3c7', color: '#d97706' },
  neutral: { bg: '#eef2ff', color: '#4f46e5' },
}

export function DashboardScreen() {
  return (
    <div style={styles.page}>
      <section style={styles.headerSection}>
        <div>
          <h1 style={styles.pageTitle}>Dashboard Overview</h1>
          <p style={styles.pageSubtitle}>Real-time sync and inventory metrics from all channels.</p>
        </div>
        <div style={styles.headerActions}>
          <button type="button" style={styles.btnSecondary}>
            Export Report
          </button>
          <button type="button" style={styles.btnPrimary}>
            Sync All Stores
          </button>
        </div>
      </section>

      <section style={styles.kpiGrid}>
        {KPI_CARDS.map((card) => (
          <article key={card.id} style={styles.kpiCard}>
            <div style={styles.kpiTop}>
              <span style={styles.kpiIcon}>{card.icon}</span>
              <span
                style={{
                  ...styles.kpiChange,
                  ...(card.positive ? styles.kpiChangePositive : styles.kpiChangeNegative),
                }}
              >
                <FiArrowUpRight size={13} style={{ transform: card.positive ? 'none' : 'rotate(90deg)' }} />
                {card.change}
              </span>
            </div>
            <p style={styles.kpiLabel}>{card.label}</p>
            <strong style={styles.kpiValue}>{card.value}</strong>
          </article>
        ))}
      </section>

      <section style={styles.lowStockBanner}>
        <div style={styles.lowStockLeft}>
          <span style={styles.lowStockIcon}>
            <FiAlertTriangle size={16} />
          </span>
          <div>
            <p style={styles.lowStockTitle}>Low Stock Alerts</p>
            <p style={styles.lowStockText}>12 items are currently below safety threshold.</p>
          </div>
        </div>
        <button type="button" style={styles.lowStockBtn}>
          View Items
        </button>
      </section>

      <section style={styles.bottomGrid}>
        <article style={styles.salesCard}>
          <div style={styles.sectionHead}>
            <h2 style={styles.sectionTitle}>Sales per Marketplace</h2>
            <button type="button" style={styles.rangeBtn}>
              Last 7 Days
            </button>
          </div>
          <div style={styles.chartArea}>
            {SALES_BY_DAY.map((point) => {
              const barHeight = `${Math.max(22, (point.value / MAX_SALES_VALUE) * 100)}%`
              return (
                <div key={point.day} style={styles.barCol}>
                  <div
                    style={{
                      ...styles.bar,
                      height: barHeight,
                      ...(point.highlight ? styles.barHighlight : {}),
                    }}
                  />
                  <span style={styles.barLabel}>{point.day}</span>
                </div>
              )
            })}
          </div>
        </article>

        <aside style={styles.eventsCard}>
          <div style={styles.sectionHead}>
            <h2 style={styles.sectionTitle}>Recent Events</h2>
          </div>
          <div style={styles.eventsList}>
            {RECENT_EVENTS.map((event) => {
              const toneStyles = EVENT_TONE_STYLES[event.tone]
              return (
                <div key={event.id} style={styles.eventRow}>
                  <span style={{ ...styles.eventIcon, ...toneStyles }}>{event.icon}</span>
                  <div style={styles.eventBody}>
                    <p style={styles.eventTitle}>{event.title}</p>
                    <p style={styles.eventDesc}>{event.description}</p>
                    <p style={styles.eventTime}>
                      <FiClock size={12} />
                      {event.timeAgo}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <button type="button" style={styles.viewHistoryBtn}>
            View All History
          </button>
        </aside>
      </section>
    </div>
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
    border: 'none',
    borderRadius: '10px',
    height: '38px',
    padding: '0 14px',
    backgroundColor: '#5664f5',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  btnSecondary: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    height: '38px',
    padding: '0 14px',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
  rangeBtn: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    height: '32px',
    padding: '0 10px',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontWeight: 600,
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit',
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
} as const
