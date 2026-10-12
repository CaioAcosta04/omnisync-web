import { throwApiError } from '../lib/apiError'
import { apiFetch } from '../lib/apiFetch'

/**
 * Serviço do painel (Dashboard).
 *
 * Consome `GET /api/dashboard/{systemClientId}/summary?range=7d|30d`.
 * Consome `GET /api/dashboard/{systemClientId}/analytics?range=7d|30d`.
 *
 * O endpoint summary devolve KPIs (com variação % vs. período anterior), a
 * série de vendas por dia e os eventos recentes oriundos do audit_logs.
 * O endpoint analytics devolve o histórico de estoque por dia e vendas
 * patrocinadas (sponsoredSalesByDay sempre vazio enquanto não há fonte real).
 *
 * Semânticas (definidas pelo backend em DashboardService):
 * - totalStock:     soma de `stock` dos produtos ativos (unidades).
 * - activeListings: nº de produtos ativos anunciados no marketplace.
 * - revenueToday:   faturamento confirmado de hoje (BRL).
 * - *ChangePct:     variação % vs. período anterior (0.0 quando não há base).
 * - salesByDay:     série completa do range (dias sem venda vêm com total 0).
 * - inventoryByDay: série do range a partir do primeiro registro de histórico.
 * - sponsoredSalesByDay: vazio enquanto não há fonte real de dados patrocinados.
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

/** Histórico de estoque por dia. */
export type DashboardInventoryDay = {
  /** Data do snapshot (yyyy-mm-dd). */
  date: string
  /** Total de unidades em estoque no dia (produtos ativos). */
  quantity: number
  /** Valor total do estoque no dia (BRL). */
  value: number
}

/** Vendas via anúncios patrocinados por dia. Só é populado quando há fonte real. */
export type DashboardSponsoredSalesDay = {
  date: string
  count: number
  total: number
}

/** Resposta do endpoint /analytics. */
export type DashboardAnalytics = {
  inventoryByDay: DashboardInventoryDay[]
  /** Vazio enquanto não há integração real com dados de patrocínio. */
  sponsoredSalesByDay: DashboardSponsoredSalesDay[]
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

function normalizeInventoryByDay(raw: unknown): DashboardInventoryDay[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    const r = (item ?? {}) as Record<string, unknown>
    return {
      date: typeof r.date === 'string' ? r.date : String(index),
      quantity: toNumber(r.quantity),
      value: toNumber(r.value),
    }
  })
}

function normalizeSponsoredSalesByDay(raw: unknown): DashboardSponsoredSalesDay[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    const r = (item ?? {}) as Record<string, unknown>
    return {
      date: typeof r.date === 'string' ? r.date : String(index),
      count: toNumber(r.count),
      total: toNumber(r.total),
    }
  })
}

/** Converte o payload cru do endpoint /analytics no shape seguro. */
export function normalizeDashboardAnalytics(raw: unknown): DashboardAnalytics {
  const r = (raw ?? {}) as Record<string, unknown>
  return {
    inventoryByDay: normalizeInventoryByDay(r.inventoryByDay),
    sponsoredSalesByDay: normalizeSponsoredSalesByDay(r.sponsoredSalesByDay),
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

export async function getDashboardAnalytics(
  systemClientId: number,
  range: DashboardRange = '7d',
): Promise<DashboardAnalytics> {
  const url = `/api/dashboard/${systemClientId}/analytics?range=${range}`
  const res = await apiFetch(url)
  if (!res.ok) await throwApiError(res, 'Não foi possível carregar os dados analíticos.')
  return normalizeDashboardAnalytics(await res.json())
}
