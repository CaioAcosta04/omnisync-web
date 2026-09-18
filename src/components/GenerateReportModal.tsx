import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiAlertCircle, FiCheckCircle, FiDownload, FiFileText, FiRefreshCw, FiX } from 'react-icons/fi'
import {
  generateReport,
  REPORT_FIELDS,
  REPORT_MARKETPLACE_OPTIONS,
  REPORT_TYPE_LABELS,
  reportSupportsMarketplaces,
  reportSupportsPeriod,
  type ReportRequestBody,
  type ReportTypeId,
} from '../services/reportsApi'

type GenerateReportModalProps = {
  open: boolean
  onClose: () => void
  systemClientId: number | null
  /** Tipo pré-selecionado ao abrir (ex.: 'INVENTORY' quando aberto pela tela de Estoque). */
  defaultType?: ReportTypeId
}

const REPORT_TYPES: ReportTypeId[] = ['SALES', 'INVENTORY', 'LISTINGS']

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/** Campos marcados por padrão: todos, na ordem do backend. */
function allFieldsOf(type: ReportTypeId): Set<string> {
  return new Set(REPORT_FIELDS[type].map((f) => f.key))
}

export function GenerateReportModal({
  open,
  onClose,
  systemClientId,
  defaultType = 'SALES',
}: GenerateReportModalProps) {
  const [reportType, setReportType] = useState<ReportTypeId>(defaultType)
  const [selectedFields, setSelectedFields] = useState<Set<string>>(() => allFieldsOf(defaultType))
  const [marketplaces, setMarketplaces] = useState<Set<string>>(new Set())
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Reinicia o formulário sempre que o modal abre, no tipo padrão da tela de origem.
  useEffect(() => {
    if (!open) return
    setReportType(defaultType)
    setSelectedFields(allFieldsOf(defaultType))
    setMarketplaces(new Set())
    setStart(daysAgoIso(29))
    setEnd(todayIso())
    setLoading(false)
    setError(null)
    setSuccess(false)
  }, [open, defaultType])

  const handleTypeChange = useCallback((type: ReportTypeId) => {
    setReportType(type)
    setSelectedFields(allFieldsOf(type))
    setMarketplaces(new Set())
    setError(null)
    setSuccess(false)
  }, [])

  const toggleField = useCallback((key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    setSuccess(false)
  }, [])

  const toggleMarketplace = useCallback((value: string) => {
    setMarketplaces((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
    setSuccess(false)
  }, [])

  const fields = REPORT_FIELDS[reportType]
  const allSelected = selectedFields.size === fields.length
  const showPeriod = reportSupportsPeriod(reportType)
  const showMarketplaces = reportSupportsMarketplaces(reportType)

  const toggleSelectAll = useCallback(() => {
    setSelectedFields((prev) =>
      prev.size === fields.length ? new Set() : new Set(fields.map((f) => f.key)),
    )
    setSuccess(false)
  }, [fields])

  const validationError = useMemo(() => {
    if (selectedFields.size === 0) return 'Selecione ao menos um campo.'
    if (showPeriod) {
      const hasStart = start.trim() !== ''
      const hasEnd = end.trim() !== ''
      if (hasStart !== hasEnd) return 'Preencha as duas datas do período ou deixe ambas em branco.'
      if (hasStart && hasEnd && end < start) return 'A data final não pode ser anterior à inicial.'
    }
    return null
  }, [selectedFields, showPeriod, start, end])

  const handleGenerate = useCallback(async () => {
    if (systemClientId == null) {
      setError('Não foi possível identificar o cliente. Faça login novamente.')
      return
    }
    if (validationError) {
      setError(validationError)
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      // Preserva a ordem do backend nos campos selecionados.
      const orderedFields = fields.map((f) => f.key).filter((key) => selectedFields.has(key))
      const usePeriod = showPeriod && start.trim() !== '' && end.trim() !== ''
      const body: ReportRequestBody = {
        report_type: reportType,
        format: 'PDF',
        marketplaces: showMarketplaces ? Array.from(marketplaces) : [],
        fields: orderedFields,
        ...(usePeriod ? { period: { start, end } } : {}),
      }
      await generateReport(systemClientId, body)
      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível gerar o relatório.')
    } finally {
      setLoading(false)
    }
  }, [
    systemClientId,
    validationError,
    fields,
    showPeriod,
    showMarketplaces,
    start,
    end,
    reportType,
    marketplaces,
    selectedFields,
  ])

  if (!open) return null

  return (
    <div style={styles.overlay} onClick={loading ? undefined : onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <span style={styles.headerIcon}>
              <FiFileText size={18} />
            </span>
            <div>
              <h2 style={styles.title}>Gerar relatório</h2>
              <p style={styles.subtitle}>Escolha o tipo, os campos e os filtros. Exportado em PDF.</p>
            </div>
          </div>
          <button
            type="button"
            style={styles.closeBtn}
            onClick={onClose}
            disabled={loading}
            aria-label="Fechar"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Tipo */}
        <div style={styles.section}>
          <label style={styles.sectionLabel}>Tipo de relatório</label>
          <div style={styles.typeGrid}>
            {REPORT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeChange(type)}
                style={{
                  ...styles.typeBtn,
                  ...(reportType === type ? styles.typeBtnActive : {}),
                }}
                aria-pressed={reportType === type}
              >
                {REPORT_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Campos */}
        <div style={styles.section}>
          <div style={styles.sectionHead}>
            <label style={styles.sectionLabel}>Campos do relatório</label>
            <button type="button" style={styles.linkBtn} onClick={toggleSelectAll}>
              {allSelected ? 'Limpar todos' : 'Selecionar todos'}
            </button>
          </div>
          <div style={styles.checkGrid}>
            {fields.map((field) => {
              const checked = selectedFields.has(field.key)
              return (
                <label key={field.key} style={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleField(field.key)}
                    style={styles.checkbox}
                  />
                  <span style={styles.checkLabel}>{field.label}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Período (só Vendas) */}
        {showPeriod && (
          <div style={styles.section}>
            <label style={styles.sectionLabel}>Período (opcional)</label>
            <div style={styles.periodRow}>
              <div style={styles.periodField}>
                <span style={styles.periodHint}>Início</span>
                <input
                  type="date"
                  value={start}
                  max={end || undefined}
                  onChange={(e) => {
                    setStart(e.target.value)
                    setSuccess(false)
                  }}
                  style={styles.input}
                />
              </div>
              <div style={styles.periodField}>
                <span style={styles.periodHint}>Fim</span>
                <input
                  type="date"
                  value={end}
                  min={start || undefined}
                  onChange={(e) => {
                    setEnd(e.target.value)
                    setSuccess(false)
                  }}
                  style={styles.input}
                />
              </div>
            </div>
            <p style={styles.fieldHint}>Deixe ambas em branco para incluir todo o histórico.</p>
          </div>
        )}

        {/* Marketplaces (Vendas/Anúncios) */}
        {showMarketplaces && (
          <div style={styles.section}>
            <label style={styles.sectionLabel}>
              {reportType === 'SALES' ? 'Filtrar por canal' : 'Filtrar por marketplace'} (opcional)
            </label>
            <div style={styles.checkGrid}>
              {REPORT_MARKETPLACE_OPTIONS[reportType].map((opt) => {
                const checked = marketplaces.has(opt.value)
                return (
                  <label key={opt.value} style={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMarketplace(opt.value)}
                      style={styles.checkbox}
                    />
                    <span style={styles.checkLabel}>{opt.label}</span>
                  </label>
                )
              })}
            </div>
            <p style={styles.fieldHint}>Nenhum selecionado inclui todos.</p>
          </div>
        )}

        {error && (
          <div style={styles.errorBox} role="alert">
            <FiAlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {success && !error && (
          <div style={styles.successBox} role="status">
            <FiCheckCircle size={16} />
            <span>Relatório gerado. O download foi iniciado.</span>
          </div>
        )}

        <div style={styles.footer}>
          <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={loading}>
            Fechar
          </button>
          <button
            type="button"
            style={{ ...styles.primaryBtn, ...(loading ? styles.primaryBtnDisabled : {}) }}
            onClick={() => void handleGenerate()}
            disabled={loading}
          >
            {loading ? (
              <>
                <FiRefreshCw size={16} style={styles.spinIcon} />
                Gerando…
              </>
            ) : (
              <>
                <FiDownload size={16} />
                Gerar PDF
              </>
            )}
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
    padding: '24px',
  },
  modal: {
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    padding: '24px 28px 28px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '20px',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  headerIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    color: '#5664f5',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a',
  },
  subtitle: {
    margin: '3px 0 0',
    fontSize: '13px',
    color: '#64748b',
  },
  closeBtn: {
    border: 'none',
    background: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '4px',
    display: 'inline-flex',
    borderRadius: '8px',
  },
  section: {
    marginBottom: '18px',
  },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  sectionLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 700,
    color: '#334155',
    marginBottom: '10px',
  },
  linkBtn: {
    border: 'none',
    background: 'none',
    color: '#4f46e5',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  typeGrid: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  typeBtn: {
    flex: 1,
    minWidth: '110px',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  typeBtnActive: {
    borderColor: '#5664f5',
    backgroundColor: '#eef2ff',
    color: '#4338ca',
  },
  checkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '8px',
  },
  checkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    borderRadius: '9px',
    border: '1px solid #eef2f7',
    backgroundColor: '#f8fafc',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#5664f5',
    cursor: 'pointer',
    flexShrink: 0,
  },
  checkLabel: {
    fontSize: '13px',
    color: '#334155',
  },
  periodRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  periodField: {
    flex: 1,
    minWidth: '150px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  periodHint: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 600,
  },
  input: {
    padding: '9px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'inherit',
    color: '#0f172a',
    outline: 'none',
    backgroundColor: '#ffffff',
  },
  fieldHint: {
    margin: '8px 0 0',
    fontSize: '12px',
    color: '#94a3b8',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '11px 14px',
    borderRadius: '10px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    fontSize: '13px',
    marginBottom: '16px',
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '11px 14px',
    borderRadius: '10px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#16a34a',
    fontSize: '13px',
    marginBottom: '16px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '4px',
  },
  cancelBtn: {
    padding: '10px 18px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#5664f5',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  spinIcon: {
    animation: 'spin 0.8s linear infinite',
  },
} as const
