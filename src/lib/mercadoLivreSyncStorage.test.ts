import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildMercadoLivreSyncStorageKey,
  readMercadoLivreSyncReference,
  resetMercadoLivreSyncMemoryStorage,
  writeMercadoLivreSyncReference,
  type StoredMercadoLivreSyncReferenceV1,
} from './mercadoLivreSyncStorage'

const reference = (
  overrides: Partial<StoredMercadoLivreSyncReferenceV1> = {}
): StoredMercadoLivreSyncReferenceV1 => ({
  version: 1,
  systemClientId: 7,
  attemptId: 'attempt-1',
  lastAttemptAt: 1_000,
  lastSyncAt: 1_100,
  outcome: 'success',
  lastResult: { message: 'ok', syncedProducts: 0 },
  ...overrides,
})

beforeEach(() => resetMercadoLivreSyncMemoryStorage())

describe('Mercado Livre sync storage', () => {
  it('isolates records by tenant', () => {
    writeMercadoLivreSyncReference(reference(), localStorage)
    writeMercadoLivreSyncReference(
      reference({ systemClientId: 8, attemptId: 'attempt-2' }),
      localStorage
    )

    expect(readMercadoLivreSyncReference(7, localStorage, 2_000)?.attemptId).toBe('attempt-1')
    expect(readMercadoLivreSyncReference(8, localStorage, 2_000)?.attemptId).toBe('attempt-2')
  })

  it('accepts zero synced products as a successful result', () => {
    writeMercadoLivreSyncReference(reference(), localStorage)
    expect(readMercadoLivreSyncReference(7, localStorage, 2_000)?.lastResult).toEqual({
      message: 'ok',
      syncedProducts: 0,
    })
  })

  it('rejects corrupt JSON and tenant mismatches', () => {
    localStorage.setItem(buildMercadoLivreSyncStorageKey(7), '{broken')
    expect(readMercadoLivreSyncReference(7, localStorage, 2_000)).toBeNull()

    localStorage.setItem(buildMercadoLivreSyncStorageKey(7), JSON.stringify(reference({ systemClientId: 8 })))
    expect(readMercadoLivreSyncReference(7, localStorage, 2_000)).toBeNull()
  })

  it('rejects invalid and far-future timestamps', () => {
    localStorage.setItem(
      buildMercadoLivreSyncStorageKey(7),
      JSON.stringify(reference({ lastAttemptAt: Number.NaN }))
    )
    expect(readMercadoLivreSyncReference(7, localStorage, 2_000)).toBeNull()

    localStorage.setItem(
      buildMercadoLivreSyncStorageKey(7),
      JSON.stringify(reference({ lastAttemptAt: 100_000 }))
    )
    expect(readMercadoLivreSyncReference(7, localStorage, 2_000)).toBeNull()
  })

  it('falls back to memory when Storage throws', () => {
    const unavailable = {
      getItem: () => {
        throw new Error('unavailable')
      },
      setItem: () => {
        throw new Error('unavailable')
      },
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    } satisfies Storage

    expect(writeMercadoLivreSyncReference(reference(), unavailable)).toBe(false)
    expect(readMercadoLivreSyncReference(7, unavailable, 2_000)?.attemptId).toBe('attempt-1')
  })
})
