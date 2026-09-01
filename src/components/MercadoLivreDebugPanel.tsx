import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useMercadoLivreOAuth } from '../contexts/MercadoLivreOAuthContext'
import {
  clearMlEvents,
  getMlEvents,
  subscribeMlEvents,
  type MlDebugEvent,
} from '../lib/mlOAuthDebug'
import { readMercadoLivreIntegration } from '../lib/mercadoLivreStorage'

/**
 * Painel flutuante de debug do fluxo OAuth do Mercado Livre.
 * Sempre visível em DEV; em produção, só aparece com `?debug=ml` na URL.
 *
 * Mostra em tempo real:
 *  - URL atual (destaca code/state)
 *  - status do MercadoLivreOAuthContext
 *  - user.systemClientId do AuthContext
 *  - cache em localStorage
 *  - timeline dos últimos eventos OAuth
 */
export function MercadoLivreDebugPanel() {
  const { user, status: authStatus, skipAuth } = useAuth()
  const ml = useMercadoLivreOAuth()
  const [open, setOpen] = useState(true)
  const [, force] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    return subscribeMlEvents(() => force((n) => n + 1))
  }, [])

  useEffect(() => {
    // Re-render leve a cada 1s pra atualizar a leitura da URL (caso o context limpe code/state)
    // cursor mudou o jeito de calcular esse 1 segundo, se quebrar é aqui que arruma
    const id = setInterval(() => force((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const search = typeof window !== 'undefined' ? window.location.search : ''
  const params = new URLSearchParams(search)
  const codeParam = params.get('code')
  const stateParam = params.get('state')
  const stored = readMercadoLivreIntegration()
  const events = getMlEvents()

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={styles.fab}
        title="Abrir debug do ML OAuth"
      >
        ML
      </button>
    )
  }

  return (
    <div style={styles.panel}>
      <header style={styles.header}>
        <span style={styles.headerTitle}>ML OAuth Debug</span>
        <div style={styles.headerActions}>
          <button type="button" style={styles.btnSmall} onClick={() => clearMlEvents()}>
            Limpar
          </button>
          <button type="button" style={styles.btnSmall} onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
      </header>

      <Section title="Estado">
        <Row label="OAuth status" value={<Badge level={statusLevel(ml.status)}>{ml.status}</Badge>} />
        {ml.message && <Row label="message" value={<code style={styles.code}>{ml.message}</code>} />}
        <Row label="auth.status" value={<code style={styles.code}>{authStatus}</code>} />
        <Row label="skipAuth" value={<code style={styles.code}>{String(skipAuth)}</code>} />
        <Row
          label="user.systemClientId"
          value={<code style={styles.code}>{user?.systemClientId ?? 'null'}</code>}
        />
      </Section>

      <Section title="URL">
        <Row label="code" value={<code style={styles.code}>{trunc(codeParam, 30) ?? '∅'}</code>} />
        <Row label="state" value={<code style={styles.code}>{trunc(stateParam, 30) ?? '∅'}</code>} />
      </Section>

      <Section title="localStorage cache">
        {stored ? (
          <>
            <Row label="systemClientId" value={<code style={styles.code}>{stored.systemClientId}</code>} />
            <Row label="active" value={<code style={styles.code}>{String(stored.active)}</code>} />
            <Row label="expiresAt" value={<code style={styles.code}>{stored.expiresAt || '∅'}</code>} />
          </>
        ) : (
          <p style={styles.empty}>(vazio)</p>
        )}
      </Section>

      <Section title={`Timeline (${events.length})`}>
        {events.length === 0 ? (
          <p style={styles.empty}>Nenhum evento registrado ainda.</p>
        ) : (
          <ul style={styles.timeline}>
            {events.map((e, i) => (
              <EventRow key={`${e.timestamp}-${i}`} event={e} />
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={styles.section}>
      <h4 style={styles.sectionTitle}>{title}</h4>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={styles.row}>
      <span style={styles.rowLabel}>{label}</span>
      <span style={styles.rowValue}>{value}</span>
    </div>
  )
}

function Badge({
  children,
  level,
}: {
  children: React.ReactNode
  level: 'info' | 'warn' | 'error' | 'success'
}) {
  return <span style={{ ...styles.badge, ...styles.badgeByLevel[level] }}>{children}</span>
}

function EventRow({ event }: { event: MlDebugEvent }) {
  return (
    <li style={styles.eventRow}>
      <span style={styles.eventTime}>{event.timestamp}</span>
      <span style={{ ...styles.eventCategory, ...styles.eventCategoryByLevel[event.level] }}>
        {event.category}
      </span>
      <span style={styles.eventMessage}>{event.message}</span>
      {event.data && (
        <pre style={styles.eventData}>{JSON.stringify(event.data, null, 0)}</pre>
      )}
    </li>
  )
}

function trunc(s: string | null, max: number): string | null {
  if (s == null) return null
  return s.length <= max ? s : s.substring(0, max) + '…'
}

function statusLevel(status: string): 'info' | 'warn' | 'error' | 'success' {
  switch (status) {
    case 'success':
      return 'success'
    case 'error':
      return 'error'
    case 'requires_login':
      return 'warn'
    case 'processing':
      return 'info'
    default:
      return 'info'
  }
}

const styles = {
  fab: {
    position: 'fixed' as const,
    bottom: '16px',
    right: '16px',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#ffe600',
    color: '#333',
    fontWeight: 800,
    fontSize: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    zIndex: 99998,
    fontFamily: 'inherit',
  },
  panel: {
    position: 'fixed' as const,
    bottom: '16px',
    right: '16px',
    width: '380px',
    maxHeight: '70vh',
    overflow: 'auto',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    borderRadius: '12px',
    padding: '0',
    fontSize: '11px',
    fontFamily:
      'ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace',
    boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
    zIndex: 99998,
    border: '1px solid #1e293b',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid #1e293b',
    backgroundColor: '#1e293b',
    borderRadius: '12px 12px 0 0',
    position: 'sticky' as const,
    top: 0,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#fbbf24',
    letterSpacing: '0.04em',
  },
  headerActions: {
    display: 'flex',
    gap: '6px',
  },
  btnSmall: {
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  section: {
    padding: '10px 14px',
    borderBottom: '1px solid #1e293b',
  },
  sectionTitle: {
    margin: '0 0 8px',
    fontSize: '10px',
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '3px 0',
    alignItems: 'center',
  },
  rowLabel: {
    color: '#94a3b8',
    flexShrink: 0,
  },
  rowValue: {
    textAlign: 'right' as const,
    wordBreak: 'break-all' as const,
    minWidth: 0,
  },
  code: {
    fontFamily: 'inherit',
    color: '#e2e8f0',
    fontSize: '11px',
  },
  empty: {
    color: '#64748b',
    fontStyle: 'italic' as const,
    margin: 0,
    fontSize: '11px',
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '10px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  },
  badgeByLevel: {
    info: { backgroundColor: '#1e40af', color: '#dbeafe' },
    warn: { backgroundColor: '#92400e', color: '#fef3c7' },
    error: { backgroundColor: '#7f1d1d', color: '#fee2e2' },
    success: { backgroundColor: '#14532d', color: '#dcfce7' },
  },
  timeline: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  eventRow: {
    display: 'grid',
    gridTemplateColumns: '70px 60px 1fr',
    gap: '6px',
    alignItems: 'start',
    padding: '4px 6px',
    borderRadius: '4px',
    backgroundColor: '#1e293b',
  },
  eventTime: {
    color: '#64748b',
    fontSize: '10px',
    whiteSpace: 'nowrap' as const,
  },
  eventCategory: {
    fontSize: '9px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    padding: '1px 4px',
    borderRadius: '3px',
    textAlign: 'center' as const,
    whiteSpace: 'nowrap' as const,
  },
  eventCategoryByLevel: {
    info: { backgroundColor: '#1e40af', color: '#dbeafe' },
    warn: { backgroundColor: '#92400e', color: '#fef3c7' },
    error: { backgroundColor: '#7f1d1d', color: '#fee2e2' },
    success: { backgroundColor: '#14532d', color: '#dcfce7' },
  },
  eventMessage: {
    color: '#e2e8f0',
    wordBreak: 'break-word' as const,
  },
  eventData: {
    gridColumn: '1 / -1',
    margin: '2px 0 0',
    padding: '4px 6px',
    backgroundColor: '#0f172a',
    color: '#94a3b8',
    borderRadius: '3px',
    fontSize: '9px',
    overflow: 'auto',
    maxHeight: '60px',
    fontFamily: 'inherit',
  },
} as const
