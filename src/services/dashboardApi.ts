import { throwApiError } from '../lib/apiError'
import { apiFetch } from '../lib/apiFetch'

/**
 * Serviço do painel (Dashboard).
 *
 * Consome `GET /api/dashboard/{systemClientId}/summary?range=7d|30d`.
 *
 * O endpoint devolve KPIs (com variação % vs. período anterior) e a série de
 * vendas por dia. Ele NÃO devolve "estoque baixo" nem "atividade recente" —
 * esses dois blocos da tela são montados no front reaproveitando `productsApi`
 * e `salesApi` (mesmas fontes de Estoque e Vendas), então os valores batem.
 *
 * Semânticas (definidas pelo backend em DashboardService):
 * - totalStock:     soma de `stock` dos produtos ativos (unidades).
 * - activeListings: nº de produtos ativos anunciados no marketplace.
 * - revenueToday:   faturamento confirmado de hoje (BRL).
 * - *ChangePct:     variação % vs. período anterior (0.0 quando não há base).
 * - salesByDay:     série completa do range (dias sem venda vêm com total 0).
 *
 * O normalizador coage números com defaults seguros para a tela nunca exibir NaN.
 */

export type DashboardRange = '7d' | '30d'

export type DashboardSalesDay = {
  /** Data do bucket em ISO (yyyy-mm-dd). */
  date: string
  /** Faturamento confirmado no dia (BRL). */
  total: number
  /** Quantidade de vendas no dia. */
  count: number
}

export type DashboardSummary = {
  totalProducts: number
  totalProductsChangePct: number
  totalStock: number
  totalStockChangePct: number
  activeListings: number
  activeListingsChangePct: number
  revenueToday: number
  revenueTodayChangePct: number
  salesByDay: DashboardSalesDay[]
}

function toNumber(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : (value as number)
  return typeof n === 'number' && Number.isFinite(n) ? n : 0
}

function normalizeSalesByDay(raw: unknown): DashboardSalesDay[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    const r = (item ?? {}) as Record<string, unknown>
    return {
      date: typeof r.date === 'string' ? r.date : String(index),
      total: toNumber(r.total),
      count: toNumber(r.count),
    }
  })
}

/** Converte o payload cru da API no shape seguro consumido pela tela. */
export function normalizeDashboardSummary(raw: unknown): DashboardSummary {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    totalProducts: toNumber(r.totalProducts),
    totalProductsChangePct: toNumber(r.totalProductsChangePct),
    totalStock: toNumber(r.totalStock),
    totalStockChangePct: toNumber(r.totalStockChangePct),
    activeListings: toNumber(r.activeListings),
    activeListingsChangePct: toNumber(r.activeListingsChangePct),
    revenueToday: toNumber(r.revenueToday),
    revenueTodayChangePct: toNumber(r.revenueTodayChangePct),
    salesByDay: normalizeSalesByDay(r.salesByDay),
  }
}

export async function getDashboardSummary(
  systemClientId: number,
  range: DashboardRange = '7d',
): Promise<DashboardSummary> {
  const url = `/api/dashboard/${systemClientId}/summary?range=${range}`
  console.log('[dashboard] GET', url)
  const res = await apiFetch(url)
  if (!res.ok) {
    // throwApiError também loga o corpo completo do erro em [apiError].
    console.error('[dashboard] summary HTTP error', { url, status: res.status })
    await throwApiError(res, 'Não foi possível carregar o painel.')
  }
  const raw = (await res.json()) as unknown
  console.log('[dashboard] summary RAW response', raw)
  const normalized = normalizeDashboardSummary(raw)
  console.log('[dashboard] summary NORMALIZED', normalized)
  return normalized
}
