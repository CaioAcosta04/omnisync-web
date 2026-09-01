import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FiHelpCircle,
  FiPackage,
  FiShoppingBag,
  FiShoppingCart,
  FiSmartphone,
  FiTruck,
} from 'react-icons/fi'
import { MarketplaceCard, type MarketplaceCardData } from '../components/MarketplaceCard'
import { useAuth } from '../contexts/AuthContext'
import { useMercadoLivreOAuth } from '../contexts/MercadoLivreOAuthContext'
import {
  readMercadoLivreIntegration,
  clearMercadoLivreIntegration,
  writeMercadoLivreIntegrationFromStatus,
} from '../lib/mercadoLivreStorage'
import { logMlEvent } from '../lib/mlOAuthDebug'
import { fetchMercadoLivreConnectUrl, getMercadoLivreStatus } from '../services/mercadoLivreApi'

type TabId = 'all' | 'connected' | 'pending'

const TAB_ITEMS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'connected', label: 'Conectado' },
  { id: 'pending', label: 'Pendente' },
]

type MarketplaceBase = {
  id: string
  name: string
  apiType: string
  icon: React.ReactNode
}

/** IDs dos marketplaces com integração real disponível. */
const SUPPORTED_MARKETPLACE_IDS = new Set(['mercadolivre'])

const MARKETPLACE_LIST: MarketplaceBase[] = [
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

function formatExpiresAt(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function MarketplacesScreen() {
  const { user } = useAuth()
  const { status: mlStatus } = useMercadoLivreOAuth()
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [connectError, setConnectError] = useState<string | null>(null)
  const [connectLoading, setConnectLoading] = useState(false)
  const [stored, setStored] = useState(() => readMercadoLivreIntegration())

  const reloadStored = useCallback(() => {
    setStored(readMercadoLivreIntegration())
  }, [])

  // Busca o status real no backend quando monta ou após fluxo OAuth
  useEffect(() => {
    let cancelled = false

    const effect = async () => {
      if (user != null) {
        await fetchAndStoreStatus()
        if (cancelled) return
        // Estado foi atualizado via reloadStored() dentro de fetchAndStoreStatus
      }
    }

    void effect()

    return () => {
      cancelled = true
    }
  }, [user, fetchAndStoreStatus])

  // Re-busca após concluir o fluxo OAuth
  useEffect(() => {
    let cancelled = false

    const effect = async () => {
      if (mlStatus === 'success') {
        await fetchAndStoreStatus()
        if (cancelled) return
        // Estado foi atualizado via reloadStored() dentro de fetchAndStoreStatus
      }
    }

    void effect()

    return () => {
      cancelled = true
    }
  }, [user, mlStatus])

  const systemClientId = user?.systemClientId
  const connected =
    stored != null &&
    systemClientId != null &&
    Number(stored.systemClientId) === Number(systemClientId) &&
    stored.active === true

  const allCards = useMemo<MarketplaceCardData[]>(() => {
    return MARKETPLACE_LIST.map((m) => {
      if (!SUPPORTED_MARKETPLACE_IDS.has(m.id)) {
        return {
          ...m,
          connected: false,
          integrationActive: false,
          lastSyncLabel: '—',
          // disabled é injetado no render — não armazenado aqui
        }
      }

      // Mercado Livre — único suportado por enquanto
      const lastSyncLabel =
        connected && stored?.expiresAt
          ? `Token até ${formatExpiresAt(stored.expiresAt)}`
          : '—'
      return {
        ...m,
        connected,
        integrationActive: connected,
        lastSyncLabel,
      }
    })
  }, [connected, stored])

  const filtered = useMemo(() => {
    const isSupported = (m: MarketplaceCardData) => SUPPORTED_MARKETPLACE_IDS.has(m.id)
    if (activeTab === 'connected') return allCards.filter((m) => isSupported(m) && m.connected)
    if (activeTab === 'pending') return allCards.filter((m) => isSupported(m) && !m.connected)
    return allCards
  }, [activeTab, allCards])

  const handleConnect = async () => {
    if (systemClientId == null) {
      setConnectError('Não foi possível identificar o cliente. Faça login novamente.')
      return
    }
    setConnectError(null)
    setConnectLoading(true)
    try {
      const { authorizationUrl } = await fetchMercadoLivreConnectUrl(systemClientId)
      window.location.assign(authorizationUrl)
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Erro ao iniciar conexão com o Mercado Livre.'
      setConnectError(msg)
      setConnectLoading(false)
    }
  }

  const handleDisconnect = () => {
    clearMercadoLivreIntegration()
    reloadStored()
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerText}>
          <h1 style={styles.title}>Integrações de Marketplace</h1>
          <p style={styles.subtitle}>
            Conecte e gerencie seus canais de venda. O Mercado Livre está disponível via OAuth 2.0.
            Os demais marketplaces estarão disponíveis em breve.
          </p>
        </div>
      </header>

      {connectError ? (
        <div style={styles.inlineError} role="alert">
          {connectError}
        </div>
      ) : null}

      <nav style={styles.tabs} aria-label="Filtros">
        {TAB_ITEMS.map((tab) => {
          const isActive = tab.id === activeTab
          const count =
            tab.id === 'all'
              ? allCards.length
              : tab.id === 'connected'
                ? connected
                  ? 1
                  : 0
                : connected
                  ? 0
                  : 1
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
        {filtered.length === 0 ? (
          <p style={styles.empty}>Nenhum item nesta aba.</p>
        ) : (
          filtered.map((m) => {
            // disabled é calculado aqui, no momento do render, diretamente da constante imutável.
            // Nunca passa por memo ou state — garantia absoluta de imutabilidade.
            const disabled = !SUPPORTED_MARKETPLACE_IDS.has(m.id)
            return (
              <div key={m.id} role="listitem">
                <MarketplaceCard
                  marketplace={{ ...m, disabled }}
                  onConnect={disabled ? undefined : handleConnect}
                  onDisconnect={disabled ? undefined : handleDisconnect}
                />
              </div>
            )
          })
        )}
      </div>

      {connectLoading ? (
        <p style={styles.loadingHint}>Redirecionando para o Mercado Livre…</p>
      ) : null}

      <footer style={styles.helpBanner}>
        <div style={styles.helpLeft}>
          <FiHelpCircle size={22} color="#6d28d9" />
          <span style={styles.helpText}>
            O link de autorização é gerado pela API com seu <strong>systemClientId</strong> no
            state. Use a mesma conta OmniSync ao concluir o login no Mercado Livre.
          </span>
        </div>
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
    maxWidth: '560px',
  },
  inlineError: {
    padding: '12px 14px',
    borderRadius: '10px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    fontSize: '14px',
    marginBottom: '16px',
    border: '1px solid #fecaca',
  },
  loadingHint: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
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
  empty: {
    fontSize: '14px',
    color: '#6b7280',
    padding: '24px 0',
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
    alignItems: 'flex-start',
    gap: '12px',
  },
  helpText: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#4c1d95',
    lineHeight: 1.5,
  },
} as const
