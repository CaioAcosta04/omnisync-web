import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('../lib/apiFetch', () => ({ apiFetch: mocks.apiFetch }))

import { getDashboardSummary, getDashboardAnalytics, normalizeDashboardAnalytics } from './dashboardApi'

describe('getDashboardSummary', () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset().mockResolvedValue({
      ok: true,
      json: async () => ({
        totalProducts: 3,
        totalStock: 14,
        inventoryValue: '127.50',
        activeListings: 2,
        revenueToday: '40.00',
        salesTodayCount: 4,
        lowStockCount: 1,
        salesByDay: [{ date: '2026-09-28', total: '40.00', count: 4 }],
        recentEvents: [{ id: 'SALE:4', entityType: 'SALE', entityId: 4, action: 'CREATED', createdAt: '2026-09-28T09:00:00' }],
      }),
    })
  })

  it('consulta o endpoint de resumo pelo cliente e período e normaliza o payload real', async () => {
    const result = await getDashboardSummary(77, '30d')
    expect(mocks.apiFetch).toHaveBeenCalledWith('/api/dashboard/77/summary?range=30d')
    expect(result.inventoryValue).toBe(127.5)
    expect(result.salesTodayCount).toBe(4)
    expect(result.lowStockCount).toBe(1)
    expect(result.salesByDay[0].total).toBe(40)
    expect(result.recentEvents[0].entityId).toBe(4)
    // Não inclui totalProducts no payload esperado pelo frontend (ainda presente no tipo para compatibilidade)
    expect(result.totalProducts).toBe(3)
  })
})

describe('getDashboardAnalytics', () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset().mockResolvedValue({
      ok: true,
      json: async () => ({
        inventoryByDay: [
          { date: '2026-09-27', quantity: 50, value: '5000.00' },
          { date: '2026-09-28', quantity: 48, value: '4825.09' },
        ],
        sponsoredSalesByDay: [],
      }),
    })
  })

  it('consulta o endpoint de analytics pelo cliente e período', async () => {
    const result = await getDashboardAnalytics(77, '7d')
    expect(mocks.apiFetch).toHaveBeenCalledWith('/api/dashboard/77/analytics?range=7d')
    expect(result.inventoryByDay).toHaveLength(2)
    expect(result.inventoryByDay[0].quantity).toBe(50)
    expect(result.inventoryByDay[1].value).toBe(4825.09)
    expect(result.sponsoredSalesByDay).toHaveLength(0)
  })

  it('normaliza inventoryByDay com defaults seguros quando campos faltam', () => {
    const result = normalizeDashboardAnalytics({
      inventoryByDay: [{ date: '2026-09-28', quantity: null, value: undefined }],
      sponsoredSalesByDay: null,
    })
    expect(result.inventoryByDay[0].quantity).toBe(0)
    expect(result.inventoryByDay[0].value).toBe(0)
    expect(result.sponsoredSalesByDay).toEqual([])
  })

  it('normaliza sponsoredSalesByDay quando há dados reais', () => {
    const result = normalizeDashboardAnalytics({
      inventoryByDay: [],
      sponsoredSalesByDay: [{ date: '2026-09-28', count: '3', total: '600.00' }],
    })
    expect(result.sponsoredSalesByDay).toHaveLength(1)
    expect(result.sponsoredSalesByDay[0].count).toBe(3)
    expect(result.sponsoredSalesByDay[0].total).toBe(600)
  })

  it('retorna listas vazias quando o payload é nulo', () => {
    const result = normalizeDashboardAnalytics(null)
    expect(result.inventoryByDay).toEqual([])
    expect(result.sponsoredSalesByDay).toEqual([])
  })
})

