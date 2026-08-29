import type { MercadoLivreSyncResponse } from '../types/product'
import {
  readMercadoLivreSyncReference,
  writeMercadoLivreSyncReference,
  type StoredMercadoLivreSyncReferenceV1,
} from './mercadoLivreSyncStorage'

export type MercadoLivreSyncMode = 'automatic' | 'manual'

export type MercadoLivreSyncRunResult =
  | {
      status: 'success'
      attemptId: string
      result: MercadoLivreSyncResponse
      startedAt: number
      completedAt: number
    }
  | {
      status: 'error'
      attemptId: string
      error: unknown
      startedAt: number
      completedAt: number
    }
  | {
      status: 'skipped'
      reason: 'cooldown' | 'locked'
      reference: StoredMercadoLivreSyncReferenceV1 | null
    }

export interface MercadoLivreLockManager {
  request<T>(
    name: string,
    options: { mode: 'exclusive'; ifAvailable: true },
    callback: (lock: object | null) => Promise<T> | T
  ): Promise<T>
}

type RunMercadoLivreSyncOptions = {
  systemClientId: number
  mode: MercadoLivreSyncMode
  cooldownMs: number
  sync: () => Promise<MercadoLivreSyncResponse>
  now?: () => number
  storage?: Storage | null
  lockManager?: MercadoLivreLockManager | null
  createAttemptId?: () => string
}

const inFlight = new Map<number, Promise<MercadoLivreSyncRunResult>>()

function defaultAttemptId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `ml-sync-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function defaultLockManager(): MercadoLivreLockManager | null {
  if (typeof navigator === 'undefined' || !('locks' in navigator)) return null
  return navigator.locks as unknown as MercadoLivreLockManager
}

function isInsideCooldown(
  reference: StoredMercadoLivreSyncReferenceV1 | null,
  now: number,
  cooldownMs: number
): boolean {
  return Boolean(reference && now - reference.lastAttemptAt < cooldownMs)
}

async function executeInsideLock(
  options: RunMercadoLivreSyncOptions
): Promise<MercadoLivreSyncRunResult> {
  const now = options.now ?? Date.now
  const startedAt = now()
  const current = readMercadoLivreSyncReference(options.systemClientId, options.storage, startedAt)

  if (options.mode === 'automatic' && isInsideCooldown(current, startedAt, options.cooldownMs)) {
    return { status: 'skipped', reason: 'cooldown', reference: current }
  }

  const attemptId = (options.createAttemptId ?? defaultAttemptId)()
  writeMercadoLivreSyncReference(
    {
      version: 1,
      systemClientId: options.systemClientId,
      attemptId,
      lastAttemptAt: startedAt,
      lastSyncAt: current?.lastSyncAt ?? null,
      outcome: 'running',
      ...(current?.lastResult ? { lastResult: current.lastResult } : {}),
    },
    options.storage
  )

  try {
    const result = await options.sync()
    const completedAt = now()
    writeMercadoLivreSyncReference(
      {
        version: 1,
        systemClientId: options.systemClientId,
        attemptId,
        lastAttemptAt: startedAt,
        lastSyncAt: completedAt,
        outcome: 'success',
        lastResult: result,
      },
      options.storage
    )
    return { status: 'success', attemptId, result, startedAt, completedAt }
  } catch (error) {
    const completedAt = now()
    writeMercadoLivreSyncReference(
      {
        version: 1,
        systemClientId: options.systemClientId,
        attemptId,
        lastAttemptAt: startedAt,
        lastSyncAt: current?.lastSyncAt ?? null,
        outcome: 'error',
        ...(current?.lastResult ? { lastResult: current.lastResult } : {}),
      },
      options.storage
    )
    return { status: 'error', attemptId, error, startedAt, completedAt }
  }
}

async function executeWithCoordination(
  options: RunMercadoLivreSyncOptions
): Promise<MercadoLivreSyncRunResult> {
  const lockManager = options.lockManager === undefined ? defaultLockManager() : options.lockManager
  if (!lockManager) return executeInsideLock(options)

  return lockManager.request(
    `omnisync:mercadolivre:sync:${options.systemClientId}`,
    { mode: 'exclusive', ifAvailable: true },
    (lock) => {
      if (!lock) {
        return {
          status: 'skipped',
          reason: 'locked',
          reference: readMercadoLivreSyncReference(options.systemClientId, options.storage),
        } satisfies MercadoLivreSyncRunResult
      }
      return executeInsideLock(options)
    }
  )
}

export function runMercadoLivreSync(
  options: RunMercadoLivreSyncOptions
): Promise<MercadoLivreSyncRunResult> {
  const existing = inFlight.get(options.systemClientId)
  if (existing) return existing

  const operation = executeWithCoordination(options)
  inFlight.set(options.systemClientId, operation)
  void operation.finally(() => {
    if (inFlight.get(options.systemClientId) === operation) {
      inFlight.delete(options.systemClientId)
    }
  })
  return operation
}

export function resetMercadoLivreSyncCoordinator(): void {
  inFlight.clear()
}
