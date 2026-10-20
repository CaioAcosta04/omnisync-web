import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('../lib/apiFetch', () => ({ apiFetch: mocks.apiFetch }))

import { getActivitySummary, normalizeActivitySummary } from './activityApi'

describe('getActivitySummary', () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset().mockResolvedValue({
      ok: true,
      json: async () => ({
        salesByHour: [
          { hour: 8, count: 2, total: '420.00' },
          { hour: 9, count: 1, total: '780.00' },
        ],
      }),
    })
  })

  it('consulta o endpoint com systemClientId e date e normaliza o retorno', async () => {
    const result = await getActivitySummary(12, '2026-10-20')
    expect(mocks.apiFetch).toHaveBeenCalledWith('/api/activity/12/summary?date=2026-10-20')
    expect(result.salesByHour).toHaveLength(2)
    expect(result.salesByHour[0]).toEqual({ hour: 8, count: 2, total: 420 })
    expect(result.salesByHour[1]).toEqual({ hour: 9, count: 1, total: 780 })
  })

  it('adiciona o parâmetro marketplace quando fornecido', async () => {
    await getActivitySummary(12, '2026-10-20', 'MERCADO_LIVRE')
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      '/api/activity/12/summary?date=2026-10-20&marketplace=MERCADO_LIVRE',
    )
  })

  it('ignora marketplace quando vazio ou null', async () => {
    await getActivitySummary(12, '2026-10-20', '')
    expect(mocks.apiFetch).toHaveBeenCalledWith('/api/activity/12/summary?date=2026-10-20')
  })
})

describe('normalizeActivitySummary', () => {
  it('retorna salesByHour vazio para inputs inválidos', () => {
    expect(normalizeActivitySummary(null)).toEqual({ salesByHour: [] })
    expect(normalizeActivitySummary({})).toEqual({ salesByHour: [] })
    expect(normalizeActivitySummary({ salesByHour: 'invalid' })).toEqual({ salesByHour: [] })
  })

  it('coage números com segurança', () => {
    const res = normalizeActivitySummary({
      salesByHour: [
        { hour: '14', count: '5', total: '150.75' },
        { hour: null, count: undefined, total: 'abc' },
      ],
    })
    expect(res.salesByHour).toEqual([
      { hour: 14, count: 5, total: 150.75 },
      { hour: 0, count: 0, total: 0 },
    ])
  })
})

