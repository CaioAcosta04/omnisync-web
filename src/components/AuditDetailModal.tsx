import {
  FiActivity,
  FiCalendar,
  FiCheckCircle,
  FiDatabase,
  FiInfo,
  FiLayers,
  FiShield,
  FiUser,
  FiX,
} from 'react-icons/fi'
import type { AuditLogDto } from '../types/audit'

type AuditDetailModalProps = {
  log: AuditLogDto | null
  onClose: () => void
}

const SENSITIVE_KEY_PATTERN = /(password|token|secret|credential|hash|auth|bearer|private)/i

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key)
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Verdadeiro' : 'Falso'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function computeDiff(
  previousData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
): { key: string; prev: unknown; curr: unknown }[] {
  const prev = previousData ?? {}
  const next = newData ?? {}
  const allKeys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)]))

  const diffs: { key: string; prev: unknown; curr: unknown }[] = []

  for (const key of allKeys) {
    if (isSensitiveKey(key)) continue

    const prevVal = prev[key]
    const nextVal = next[key]

    // Compara igualdade
    const prevStr = JSON.stringify(prevVal)
    const nextStr = JSON.stringify(nextVal)

    if (prevStr !== nextStr) {
      diffs.push({
        key,
        prev: prevVal,
        curr: nextVal,
      })
    }
  }

  return diffs
}

export function AuditDetailModal({ log, onClose }: AuditDetailModalProps) {
  if (!log) return null

  const diffs = computeDiff(log.previous_data, log.new_data)
  const hasDiffs = diffs.length > 0

  const createdAtDate = new Date(log.created_at)
  const formattedDate = !isNaN(createdAtDate.getTime())
    ? createdAtDate.toLocaleString('pt-BR', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    : log.created_at

  const source = log.metadata?.source ? String(log.metadata.source) : 'WEB'

  return (
    <div style={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitleWrap}>
            <span style={styles.badgeAction}>{log.action}</span>
            <span style={styles.badgeEntity}>{log.entity_type}</span>
            <h2 style={styles.title}>Evento #{log.id}</h2>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Fechar modal">
            <FiX size={20} />
          </button>
        </div>

        {/* Resumo da ação */}
        {log.description && (
          <div style={styles.descriptionBox}>
            <FiInfo size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={styles.descriptionText}>{log.description}</span>
          </div>
        )}

        {/* Informações gerais do evento */}
        <div style={styles.gridInfo}>
          {/* Responsável */}
          <div style={styles.infoCard}>
            <div style={styles.infoCardHeader}>
              <FiUser size={15} color="#6b7280" />
              <span style={styles.infoCardTitle}>Responsável pela Ação</span>
            </div>
            <div style={styles.infoCardBody}>
              <div style={styles.actorName}>{log.user?.name || 'Sistema'}</div>
              {log.user?.email && <div style={styles.actorEmail}>{log.user.email}</div>}
              <div style={styles.actorMeta}>
                <span style={styles.actorRoleBadge}>
                  <FiShield size={12} />
                  {log.user?.role || 'SYSTEM'}
                </span>
                {log.user?.id && <span style={styles.actorId}>ID: {log.user.id}</span>}
              </div>
            </div>
          </div>

          {/* Contexto / Origem / Data */}
          <div style={styles.infoCard}>
            <div style={styles.infoCardHeader}>
              <FiActivity size={15} color="#6b7280" />
              <span style={styles.infoCardTitle}>Data & Origem</span>
            </div>
            <div style={styles.infoCardBody}>
              <div style={styles.metaRow}>
                <FiCalendar size={14} color="#6b7280" />
                <span style={styles.metaText}>{formattedDate}</span>
              </div>
              <div style={styles.metaRow}>
                <FiLayers size={14} color="#6b7280" />
                <span style={styles.metaText}>
                  Origem do evento: <strong>{source}</strong>
                </span>
              </div>
              {log.entity_id && (
                <div style={styles.metaRow}>
                  <FiDatabase size={14} color="#6b7280" />
                  <span style={styles.metaText}>
                    ID da Entidade: <code>{log.entity_id}</code>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detalhes da Alteração / Diff */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Alterações Realizadas</h3>
            <span style={styles.sectionSubtitle}>
              {hasDiffs
                ? `${diffs.length} ${diffs.length === 1 ? 'campo alterado' : 'campos alterados'}`
                : 'Nenhum campo com dados anteriores para comparação'}
            </span>
          </div>

          {hasDiffs ? (
            <div style={styles.diffTableWrap}>
              <table style={styles.diffTable}>
                <thead>
                  <tr>
                    <th style={{ ...styles.diffTh, width: '25%' }}>CAMPO</th>
                    <th style={{ ...styles.diffTh, width: '37.5%' }}>VALOR ANTERIOR</th>
                    <th style={{ ...styles.diffTh, width: '37.5%' }}>VALOR NOVO</th>
                  </tr>
                </thead>
                <tbody>
                  {diffs.map((d) => (
                    <tr key={d.key} style={styles.diffTr}>
                      <td style={styles.diffTdKey}>
                        <code>{d.key}</code>
                      </td>
                      <td style={{ ...styles.diffTd, ...styles.diffTdPrev }}>
                        <span style={styles.diffLabelPrev}>Antes:</span>
                        <pre style={styles.diffPre}>{formatValue(d.prev)}</pre>
                      </td>
                      <td style={{ ...styles.diffTd, ...styles.diffTdCurr }}>
                        <span style={styles.diffLabelCurr}>Depois:</span>
                        <pre style={styles.diffPre}>{formatValue(d.curr)}</pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.emptyDiffBox}>
              <FiCheckCircle size={18} color="#10b981" />
              <span>
                {log.action === 'CREATE'
                  ? 'Registro recém-criado. Consulte os novos dados ou metadados.'
                  : log.action === 'DELETE'
                  ? 'Registro removido.'
                  : 'Nenhuma diferença identificada entre os estados.'}
              </span>
            </div>
          )}
        </div>

        {/* Novos dados completos se for CREATE ou não houver diff */}
        {(!hasDiffs || log.action === 'CREATE') && log.new_data && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Dados Atuais / Criados</h3>
            <div style={styles.codeBlock}>
              <pre style={styles.codePre}>
                {JSON.stringify(
                  Object.fromEntries(
                    Object.entries(log.new_data).filter(([k]) => !isSensitiveKey(k))
                  ),
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}

        {/* Metadados adicionais */}
        {log.metadata && Object.keys(log.metadata).length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Metadados Adicionais</h3>
            <div style={styles.codeBlock}>
              <pre style={styles.codePre}>
                {JSON.stringify(
                  Object.fromEntries(
                    Object.entries(log.metadata).filter(([k]) => !isSensitiveKey(k))
                  ),
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <button type="button" style={styles.closeModalBtn} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    width: '100%',
    maxWidth: '780px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    padding: '24px 28px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    borderBottom: '1px solid #f3f4f6',
    paddingBottom: '14px',
  },
  headerTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  badgeAction: {
    display: 'inline-block',
    padding: '3px 9px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#1e40af',
    backgroundColor: '#dbeafe',
  },
  badgeEntity: {
    display: 'inline-block',
    padding: '3px 9px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#374151',
    backgroundColor: '#f3f4f6',
  },
  closeBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  descriptionBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '10px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
  },
  descriptionText: {
    fontSize: '14px',
    color: '#1e3a8a',
    fontWeight: 500,
  },
  gridInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '14px',
  },
  infoCard: {
    padding: '14px 16px',
    borderRadius: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #f3f4f6',
  },
  infoCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  infoCardTitle: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#6b7280',
  },
  infoCardBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  actorName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
  },
  actorEmail: {
    fontSize: '13px',
    color: '#6b7280',
  },
  actorMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  actorRoleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
  },
  actorId: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#374151',
  },
  metaText: {
    fontSize: '13px',
    color: '#374151',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: '12px',
    color: '#6b7280',
  },
  diffTableWrap: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  diffTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
  },
  diffTh: {
    padding: '10px 14px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    textAlign: 'left' as const,
    fontSize: '11px',
    fontWeight: 600,
    color: '#6b7280',
    letterSpacing: '0.04em',
  },
  diffTr: {
    borderBottom: '1px solid #f3f4f6',
  },
  diffTdKey: {
    padding: '12px 14px',
    verticalAlign: 'top' as const,
    backgroundColor: '#ffffff',
    fontWeight: 600,
    color: '#374151',
  },
  diffTd: {
    padding: '10px 14px',
    verticalAlign: 'top' as const,
  },
  diffTdPrev: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
  },
  diffTdCurr: {
    backgroundColor: '#f0fdf4',
    color: '#166534',
  },
  diffLabelPrev: {
    display: 'block',
    fontSize: '10px',
    fontWeight: 700,
    color: '#b91c1c',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
  },
  diffLabelCurr: {
    display: 'block',
    fontSize: '10px',
    fontWeight: 700,
    color: '#15803d',
    marginBottom: '4px',
    textTransform: 'uppercase' as const,
  },
  diffPre: {
    margin: 0,
    fontFamily: 'monospace',
    fontSize: '12px',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  emptyDiffBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px 16px',
    borderRadius: '10px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    fontSize: '13px',
    color: '#4b5563',
  },
  codeBlock: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '12px 16px',
    maxHeight: '200px',
    overflowY: 'auto' as const,
  },
  codePre: {
    margin: 0,
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#334155',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    borderTop: '1px solid #f3f4f6',
    paddingTop: '16px',
  },
  closeModalBtn: {
    padding: '9px 20px',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    fontFamily: 'inherit',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    cursor: 'pointer',
  },
} as const
