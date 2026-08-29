import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resetMercadoLivreSyncCoordinator,
  runMercadoLivreSync,
  type MercadoLivreLockManager,
} from './mercadoLivreSyncCoordinator'
import {
  readMercadoLivreSyncReference,
  resetMercadoLivreSyncMemoryStorage,
  writeMercadoLivreSyncReference,
} from './mercadoLivreSyncStorage'

beforeEach(() => {
  resetMercadoLivreSyncCoordinator()
  resetMercadoLivreSyncMemoryStorage()
})

describe('runMercadoLivreSync', () => {
  it('shares a single in-flight promise per tenant', async () => {
    let resolveSync!: (value: { message: string; syncedProducts: number }) => void
    const sync = vi.fn(
      () => new Promise<{ message: string; syncedProducts: number }>((resolve) => (resolveSync = resolve))
    )
    const options = {
      systemClientId: 7,
      mode: 'automatic' as const,
      cooldownMs: 600_000,
      now: () => 1_000,
      storage: localStorage,
      lockManager: null,
      createAttemptId: () => 'attempt-1',
      sync,
    }

    const first = runMercadoLivreSync(options)
    const second = runMercadoLivreSync(options)
    expect(first).toBe(second)
    expect(sync).toHaveBeenCalledTimes(1)

    resolveSync({ message: 'ok', syncedProducts: 1 })
    await expect(first).resolves.toMatchObject({ status: 'success' })
  })

  it('blocks automatic sync inside cooldown and allows the exact boundary', async () => {
    writeMercadoLivreSyncReference(
      {
        version: 1,
        systemClientId: 7,
        attemptId: 'old',
        lastAttemptAt: 1_000,
        lastSyncAt: 1_000,
        outcome: 'success',
        lastResult: { message: 'old', syncedProducts: 1 },
      },
      localStorage
    )
    const sync = vi.fn().mockResolvedValue({ message: 'new', syncedProducts: 2 })

    await expect(
      runMercadoLivreSync({
        systemClientId: 7,
        mode: 'automatic',
        cooldownMs: 600_000,
        now: () => 600_999,
        storage: localStorage,
        lockManager: null,
        sync,
      })
    ).resolves.toMatchObject({ status: 'skipped', reason: 'cooldown' })

    await expect(
      runMercadoLivreSync({
        systemClientId: 7,
        mode: 'automatic',
        cooldownMs: 600_000,
        now: () => 601_000,
        storage: localStorage,
        lockManager: null,
        createAttemptId: () => 'new',
        sync,
      })
    ).resolves.toMatchObject({ status: 'success' })
    expect(sync).toHaveBeenCalledTimes(1)
  })

  it('writes the attempt before invoking the HTTP operation', async () => {
    const sync = vi.fn().mockImplementation(async () => {
      expect(readMercadoLivreSyncReference(7, localStorage, 2_000)).toMatchObject({
        outcome: 'running',
        lastAttemptAt: 1_000,
      })
      return { message: 'ok', syncedProducts: 0 }
    })

    await runMercadoLivreSync({
      systemClientId: 7,
      mode: 'automatic',
      cooldownMs: 600_000,
      now: () => 1_000,
      storage: localStorage,
      lockManager: null,
      createAttemptId: () => 'attempt-1',
      sync,
    })
    expect(readMercadoLivreSyncReference(7, localStorage, 2_000)).toMatchObject({
      outcome: 'success',
      lastSyncAt: 1_000,
      lastResult: { syncedProducts: 0 },
    })
  })

  it('keeps a failed attempt in cooldown without claiming success', async () => {
    const sync = vi.fn().mockRejectedValue(new Error('external failure'))
    await expect(
      runMercadoLivreSync({
        systemClientId: 7,
        mode: 'automatic',
        cooldownMs: 600_000,
        now: () => 1_000,
        storage: localStorage,
        lockManager: null,
        createAttemptId: () => 'attempt-1',
        sync,
      })
    ).resolves.toMatchObject({ status: 'error' })

    expect(readMercadoLivreSyncReference(7, localStorage, 2_000)).toMatchObject({
      outcome: 'error',
      lastAttemptAt: 1_000,
      lastSyncAt: null,
    })

    await expect(
      runMercadoLivreSync({
        systemClientId: 7,
        mode: 'automatic',
        cooldownMs: 600_000,
        now: () => 2_000,
        storage: localStorage,
        lockManager: null,
        sync,
      })
    ).resolves.toMatchObject({ status: 'skipped', reason: 'cooldown' })
    expect(sync).toHaveBeenCalledTimes(1)
  })

  it('does not let one tenant suppress another', async () => {
    writeMercadoLivreSyncReference(
      {
        version: 1,
        systemClientId: 7,
        attemptId: 'tenant-a',
        lastAttemptAt: 1_000,
        lastSyncAt: 1_000,
        outcome: 'success',
        lastResult: { message: 'a', syncedProducts: 1 },
      },
      localStorage
    )
    const sync = vi.fn().mockResolvedValue({ message: 'b', syncedProducts: 1 })

    await runMercadoLivreSync({
      systemClientId: 8,
      mode: 'automatic',
      cooldownMs: 600_000,
      now: () => 2_000,
      storage: localStorage,
      lockManager: null,
      sync,
    })
    expect(sync).toHaveBeenCalledOnce()
  })

  it('skips when another document owns the Web Lock', async () => {
    const lockManager: MercadoLivreLockManager = {
      request: async (_name, _options, callback) => callback(null),
    }
    const sync = vi.fn()

    await expect(
      runMercadoLivreSync({
        systemClientId: 7,
        mode: 'automatic',
        cooldownMs: 600_000,
        now: () => 1_000,
        storage: localStorage,
        lockManager,
        sync,
      })
    ).resolves.toMatchObject({ status: 'skipped', reason: 'locked' })
    expect(sync).not.toHaveBeenCalled()
  })

  it('rechecks cooldown after obtaining the Web Lock', async () => {
    let releaseLock!: () => void
    const lockManager: MercadoLivreLockManager = {
      request: <T>(
        _name: string,
        _options: { mode: 'exclusive'; ifAvailable: true },
        callback: (lock: object | null) => Promise<T> | T,
      ) => {
        return new Promise<T>((resolve) => {
          releaseLock = () => {
            void Promise.resolve(callback({})).then(resolve)
          }
        })
      },
    }
    const sync = vi.fn().mockResolvedValue({ message: 'new', syncedProducts: 1 })

    const operation = runMercadoLivreSync({
      systemClientId: 7,
      mode: 'automatic',
      cooldownMs: 600_000,
      now: () => 2_000,
      storage: localStorage,
      lockManager,
      sync,
    })

    writeMercadoLivreSyncReference(
      {
        version: 1,
        systemClientId: 7,
        attemptId: 'other-document',
        lastAttemptAt: 1_500,
        lastSyncAt: null,
        outcome: 'running',
      },
      localStorage
    )
    releaseLock()

    await expect(operation).resolves.toMatchObject({ status: 'skipped', reason: 'cooldown' })
    expect(sync).not.toHaveBeenCalled()
  })

  it('lets a manual request bypass a recent automatic cooldown', async () => {
    writeMercadoLivreSyncReference(
      {
        version: 1,
        systemClientId: 7,
        attemptId: 'recent-auto',
        lastAttemptAt: 1_000,
        lastSyncAt: 1_000,
        outcome: 'success',
        lastResult: { message: 'old', syncedProducts: 1 },
      },
      localStorage
    )
    const sync = vi.fn().mockResolvedValue({ message: 'manual', syncedProducts: 2 })

    await expect(
      runMercadoLivreSync({
        systemClientId: 7,
        mode: 'manual',
        cooldownMs: 600_000,
        now: () => 2_000,
        storage: localStorage,
        lockManager: null,
        createAttemptId: () => 'manual-attempt',
        sync,
      })
    ).resolves.toMatchObject({ status: 'success', attemptId: 'manual-attempt' })
    expect(sync).toHaveBeenCalledOnce()
    expect(readMercadoLivreSyncReference(7, localStorage, 3_000)).toMatchObject({
      lastAttemptAt: 2_000,
      lastSyncAt: 2_000,
      lastResult: { message: 'manual', syncedProducts: 2 },
    })
  })

  it('joins an active automatic operation when a manual request arrives', async () => {
    let resolveSync!: (value: { message: string; syncedProducts: number }) => void
    const sync = vi.fn(
      () =>
        new Promise<{ message: string; syncedProducts: number }>((resolve) => {
          resolveSync = resolve
        })
    )
    const common = {
      systemClientId: 7,
      cooldownMs: 600_000,
      now: () => 1_000,
      storage: localStorage,
      lockManager: null,
      sync,
    }

    const automatic = runMercadoLivreSync({ ...common, mode: 'automatic' })
    const manual = runMercadoLivreSync({ ...common, mode: 'manual' })
    expect(manual).toBe(automatic)
    expect(sync).toHaveBeenCalledOnce()

    resolveSync({ message: 'shared', syncedProducts: 1 })
    await expect(manual).resolves.toMatchObject({ status: 'success' })
  })
})
