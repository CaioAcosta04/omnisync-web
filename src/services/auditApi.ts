import { throwApiError } from '../lib/apiError'
import { apiFetch } from '../lib/apiFetch'
import type { AuditFilterParams, AuditPageDto } from '../types/audit'

/**
 * Converte data em string (ex: '2026-09-01' ou '2026-09-01T15:30:00')
 * para o formato ISO-8601 UTC sem offset esperado pelo backend (ex: '2026-09-01T00:00:00').
 */
export function formatAuditFilterDate(value?: string, isEnd = false): string | undefined {
  if (!value || !value.trim()) return undefined
  const raw = value.trim()

  // Se já tiver T e formato LocalDateTime completo sem offset:
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
    const parts = raw.split(':')
    if (parts.length === 2) return `${raw}:00`
    return raw
  }

  // Se for apenas data YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return isEnd ? `${raw}T23:59:59` : `${raw}T00:00:00`
  }

  // Caso contenha fuso/Z, converte para UTC e remove o offset
  const parsed = new Date(raw)
  if (!isNaN(parsed.getTime())) {
    const iso = parsed.toISOString() // YYYY-MM-DDTHH:mm:ss.sssZ
    return iso.slice(0, 19)
  }

  return raw
}

export async function listAuditLogs(
  systemClientId: number,
  params: AuditFilterParams = {}
): Promise<AuditPageDto> {
  const query = new URLSearchParams()

  if (params.userId != null && params.userId > 0) {
    query.set('userId', String(params.userId))
  }
  if (params.role && params.role.trim()) {
    query.set('role', params.role.trim())
  }
  if (params.action && params.action.trim()) {
    query.set('action', params.action.trim())
  }
  if (params.entityType && params.entityType.trim()) {
    query.set('entityType', params.entityType.trim())
  }

  const fromUtc = formatAuditFilterDate(params.from, false)
  if (fromUtc) {
    query.set('from', fromUtc)
  }

  const toUtc = formatAuditFilterDate(params.to, true)
  if (toUtc) {
    query.set('to', toUtc)
  }

  if (params.offset != null && params.offset >= 0) {
    query.set('offset', String(params.offset))
  }
  if (params.limit != null && params.limit > 0) {
    query.set('limit', String(params.limit))
  }

  const queryString = query.toString()
  const path = `/api/audit-logs/${systemClientId}${queryString ? `?${queryString}` : ''}`

  const res = await apiFetch(path)
  if (!res.ok) {
    await throwApiError(res, 'Não foi possível carregar os registros de auditoria.')
  }

  return (await res.json()) as AuditPageDto
}

