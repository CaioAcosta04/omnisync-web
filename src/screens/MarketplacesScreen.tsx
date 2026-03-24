import { useMemo, useState } from 'react'
import {
  FiHelpCircle,
  FiPackage,
  FiPlus,
  FiShoppingBag,
  FiShoppingCart,
  FiSmartphone,
  FiTruck,
} from 'react-icons/fi'
import {
  MarketplaceCard,
  type MarketplaceCardData,
} from '../components/MarketplaceCard'

type TabId = 'all' | 'connected' | 'pending'

const TAB_ITEMS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All Marketplaces' },
  { id: 'connected', label: 'Connected' },
  { id: 'pending', label: 'Pending' },
]

/** Lista mockada — Até conseguirmos o endpoint da lista de marketplaces */
const MOCK_MARKETPLACES_BASE: Omit<MarketplaceCardData, 'connected' | 'integrationActive' | 'lastSyncLabel'>[] =
  [
    {
      id: 'mercadolivre',
      name: 'Mercado Livre',
      apiType: 'OAUTH 2.0',
      icon: <FiShoppingCart size={34} strokeWidth={1.5} />,
    },
    {
      id: 'shopee',
      name: 'Shopee',
      apiType: 'OFFICIAL API',
      icon: <FiShoppingBag size={34} strokeWidth={1.5} />,
    },
    {
      id: 'amazon',
      name: 'Amazon',
      apiType: 'MWS API',
      icon: <FiTruck size={34} strokeWidth={1.5} />,
    },
    {
      id: 'magazineluiza',
      name: 'Magazine Luiza',
      apiType: 'OFFICIAL API',
      icon: <FiPackage size={34} strokeWidth={1.5} />,
    },
    {
      id: 'americanas',
      name: 'Americanas / B2W',
      apiType: 'OFFICIAL API',
      icon: <FiShoppingBag size={34} strokeWidth={1.5} />,
    },
    {
      id: 'tiktokshop',
      name: 'TikTok Shop',
      apiType: 'OAUTH 2.0',
      icon: <FiSmartphone size={34} strokeWidth={1.5} />,
    },
  ]

export function MarketplacesScreen() {
  const [activeTab, setActiveTab] = useState<TabId>('all')

  const marketplaces = useMemo<MarketplaceCardData[]>(
    () =>
      MOCK_MARKETPLACES_BASE.map((m) => ({
        ...m,
        connected: false,
        integrationActive: false,
        lastSyncLabel: 'Never',
      })),
    []
  )

  const filtered = useMemo(() => {
    if (activeTab === 'connected') {
      return marketplaces.filter((m) => m.connected)
    }
    if (activeTab === 'pending') {
      return marketplaces.filter((m) => !m.connected)
    }
    return marketplaces
  }, [activeTab, marketplaces])

  const allCount = marketplaces.length

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerText}>
          <h1 style={styles.title}>Marketplace Integrations</h1>
          <p style={styles.subtitle}>
            Connect and manage your sales channels via secure OAuth protocol to
            keep your inventory in sync.
          </p>
        </div>
        <button type="button" style={styles.addApiBtn}>
          <FiPlus size={18} />
          Add Custom API
        </button>
      </header>

      <nav style={styles.tabs} aria-label="Marketplace filters">
        {TAB_ITEMS.map((tab) => {
          const isActive = tab.id === activeTab
          const count =
            tab.id === 'all'
              ? allCount
              : tab.id === 'connected'
                ? marketplaces.filter((m) => m.connected).length
                : marketplaces.filter((m) => !m.connected).length
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              style={styles.tabBtn}
              onClick={() => setActiveTab(tab.id)}
            >
              <span style={{ ...styles.tabLabel, ...(isActive ? styles.tabLabelActive : {}) }}>
                {tab.label}
              </span>
              <span style={styles.tabBadge}>{count}</span>
              {isActive ? <span style={styles.tabUnderline} /> : null}
            </button>
          )
        })}
      </nav>

      <div style={styles.list} role="list">
        {filtered.map((m) => (
          <div key={m.id} role="listitem">
            <MarketplaceCard marketplace={m} />
          </div>
        ))}
      </div>

      <footer style={styles.helpBanner}>
        <div style={styles.helpLeft}>
          <FiHelpCircle size={22} color="#6d28d9" />
          <span style={styles.helpText}>Need help connecting your accounts?</span>
        </div>
        <button type="button" style={styles.docLink}>
          View Documentation
        </button>
      </footer>
    </div>
  )
}

const styles = {
  page: {
    width: '100%',
    maxWidth: '920px',
    margin: '0 auto',
    padding: '32px 28px 40px',
    fontSize: '16px',
    fontWeight: 400,
    color: '#111827',
    alignSelf: 'stretch',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '20px',
    flexWrap: 'wrap' as const,
    marginBottom: '28px',
  },
  headerText: {
    flex: '1 1 280px',
    minWidth: 0,
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '8px',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '14px',
    lineHeight: 1.5,
    color: '#6b7280',
    maxWidth: '520px',
  },
  addApiBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '10px',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#2563eb',
    cursor: 'pointer',
    flexShrink: 0,
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '24px',
  },
  tabBtn: {
    position: 'relative' as const,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 4px 14px',
    marginRight: '20px',
    border: 'none',
    background: 'none',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  tabLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
  },
  tabLabelActive: {
    color: '#111827',
  },
  tabBadge: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '2px 8px',
    borderRadius: '999px',
  },
  tabUnderline: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: -1,
    height: '2px',
    backgroundColor: '#7c3aed',
    borderRadius: '2px 2px 0 0',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    marginBottom: '28px',
  },
  helpBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap' as const,
    padding: '16px 20px',
    borderRadius: '12px',
    backgroundColor: '#f5f3ff',
    border: '1px solid #ede9fe',
  },
  helpLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  helpText: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#4c1d95',
  },
  docLink: {
    border: 'none',
    background: 'none',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#6d28d9',
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
  },
} as const
