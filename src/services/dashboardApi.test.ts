import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('../lib/apiFetch', () => ({ apiFetch: mocks.apiFetch }))

import { getDashboardSummary } from './dashboardApi'

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
  })
})
