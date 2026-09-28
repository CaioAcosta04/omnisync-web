import { throwApiError } from '../lib/apiError'
import { apiFetch } from '../lib/apiFetch'

/**
 * Serviço do painel (Dashboard).
 *
 * Consome `GET /api/dashboard/{systemClientId}/summary?range=7d|30d`.
 *
 * O endpoint devolve KPIs (com variação % vs. período anterior), a série de
 * vendas por dia e os eventos recentes. Os itens de estoque baixo são carregados
 * sob demanda pelo endpoint paginado de produtos.
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
  inventoryValue: number
  activeListings: number
  activeListingsChangePct: number
  revenueToday: number
  revenueTodayChangePct: number
  salesTodayCount: number
  lowStockCount: number
  salesByDay: DashboardSalesDay[]
  recentEvents: DashboardRecentEvent[]
}

export type DashboardRecentEvent = {
  id: string
  entityType: string
  entityId: number
  action: string
  createdAt: string
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

function normalizeRecentEvents(raw: unknown): DashboardRecentEvent[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    const event = (item ?? {}) as Record<string, unknown>
    return {
      id: typeof event.id === 'string' ? event.id : String(index),
      entityType: typeof event.entityType === 'string' ? event.entityType : 'UNKNOWN',
      entityId: toNumber(event.entityId),
      action: typeof event.action === 'string' ? event.action : '',
      createdAt: typeof event.createdAt === 'string' ? event.createdAt : '',
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
    inventoryValue: toNumber(r.inventoryValue),
    activeListings: toNumber(r.activeListings),
    activeListingsChangePct: toNumber(r.activeListingsChangePct),
    revenueToday: toNumber(r.revenueToday),
    revenueTodayChangePct: toNumber(r.revenueTodayChangePct),
    salesTodayCount: toNumber(r.salesTodayCount),
    lowStockCount: toNumber(r.lowStockCount),
    salesByDay: normalizeSalesByDay(r.salesByDay),
    recentEvents: normalizeRecentEvents(r.recentEvents),
  }
}

export async function getDashboardSummary(
  systemClientId: number,
  range: DashboardRange = '7d',
): Promise<DashboardSummary> {
  const url = `/api/dashboard/${systemClientId}/summary?range=${range}`
  const res = await apiFetch(url)
  if (!res.ok) await throwApiError(res, 'Não foi possível carregar o painel.')
  return normalizeDashboardSummary(await res.json())
}
