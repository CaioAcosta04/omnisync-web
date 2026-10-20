import { throwApiError } from '../lib/apiError'
import { apiFetch } from '../lib/apiFetch'

export type ActivitySalesHour = {
  hour: number
  count: number
  total: number
}

export type ActivitySummaryResponse = {
  salesByHour: ActivitySalesHour[]
}

export type ActivityMarketplace = 'MERCADO_LIVRE' | 'SHOPEE' | 'AMAZON'

export const ACTIVITY_MARKETPLACE_OPTIONS: { value: '' | ActivityMarketplace; label: string }[] = [
  { value: '', label: 'Todos os marketplaces' },
  { value: 'MERCADO_LIVRE', label: 'Mercado Livre' },
  { value: 'SHOPEE', label: 'Shopee' },
  { value: 'AMAZON', label: 'Amazon' },
]

export function normalizeActivitySummary(raw: unknown): ActivitySummaryResponse {
  if (!raw || typeof raw !== 'object') {
    return { salesByHour: [] }
  }
  const data = raw as { salesByHour?: unknown[] }
  const salesByHour = Array.isArray(data.salesByHour)
    ? data.salesByHour.map((item) => {
        const row = (item ?? {}) as { hour?: unknown; count?: unknown; total?: unknown }
        const hour = Number(row.hour)
        const count = Number(row.count)
        const total = Number(row.total)
        return {
          hour: Number.isFinite(hour) ? hour : 0,
          count: Number.isFinite(count) ? count : 0,
          total: Number.isFinite(total) ? total : 0,
        }
      })
    : []

  return { salesByHour }
}

/**
 * Consome `GET /api/activity/{systemClientId}/summary?date={date}&marketplace={marketplace}`.
 *
 * @param systemClientId ID do tenant autenticado
 * @param date Data no formato YYYY-MM-DD
 * @param marketplace Marketplace opcional ('MERCADO_LIVRE' | 'SHOPEE' | 'AMAZON')
 */
export async function getActivitySummary(
  systemClientId: number,
  date: string,
  marketplace?: string | null,
): Promise<ActivitySummaryResponse> {
  const params = new URLSearchParams()
  params.set('date', date)
  if (marketplace && marketplace.trim()) {
    params.set('marketplace', marketplace.trim())
  }

  const response = await apiFetch(
    `/api/activity/${encodeURIComponent(systemClientId)}/summary?${params.toString()}`,
  )
  if (!response.ok) {
    await throwApiError(response, 'Falha ao carregar atividade de vendas por hora.')
  }

  const json = (await response.json()) as unknown
  return normalizeActivitySummary(json)
}

