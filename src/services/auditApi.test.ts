import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../config/api', () => ({ API_BASE_URL: 'http://api.test' }))

describe('listAuditLogs API service', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.resetModules()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('formata query params e datas UTC corretamente', async () => {
    const mockResponse = {
      content: [],
      offset: 0,
      limit: 15,
      total_elements: 0,
      has_next: false,
    }
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const { listAuditLogs } = await import('./auditApi')
    const result = await listAuditLogs(7, {
      userId: 12,
      role: 'ADMIN',
      action: 'UPDATE',
      entityType: 'PRODUCT',
      from: '2026-09-01',
      to: '2026-09-10',
      offset: 0,
      limit: 15,
    })

    expect(result).toEqual(mockResponse)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const calledUrl = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toContain('/api/audit-logs/7')
    expect(calledUrl).toContain('userId=12')
    expect(calledUrl).toContain('role=ADMIN')
    expect(calledUrl).toContain('action=UPDATE')
    expect(calledUrl).toContain('entityType=PRODUCT')
    expect(calledUrl).toContain('from=2026-09-01T00%3A00%3A00')
    expect(calledUrl).toContain('to=2026-09-10T23%3A59%3A59')
    expect(calledUrl).toContain('offset=0')
    expect(calledUrl).toContain('limit=15')
  })
})

