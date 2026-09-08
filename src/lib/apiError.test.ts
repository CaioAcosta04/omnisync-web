import { describe, expect, it, vi } from 'vitest'
import { ApiClientError, throwApiError } from './apiError'

describe('ApiClientError', () => {
  it('preserves safe status, code and retry metadata', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = new Response(
      JSON.stringify({ message: 'Aguarde', code: 'ML_RATE_LIMITED', retryAfterSeconds: 15 }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )

    await expect(throwApiError(response, 'fallback')).rejects.toMatchObject({
      name: 'ApiClientError',
      message: 'Aguarde',
      status: 429,
      code: 'ML_RATE_LIMITED',
      retryAfterSeconds: 15,
    })
  })

  it('remains compatible with instanceof Error', () => {
    expect(new ApiClientError({ message: 'safe', status: 409 })).toBeInstanceOf(Error)
  })
})
