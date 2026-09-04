import type { MercadoLivreSyncResponse } from '../types/product'

const STORAGE_PREFIX = 'omnisync.mercadolivre.sync.v1.'
const FUTURE_TOLERANCE_MS = 60_000
const memoryStorage = new Map<string, string>()

export type MercadoLivreSyncOutcome = 'running' | 'success' | 'error'

export type StoredMercadoLivreSyncReferenceV1 = {
  version: 1
  systemClientId: number
  attemptId: string
  lastAttemptAt: number
  lastSyncAt: number | null
  outcome: MercadoLivreSyncOutcome
  lastResult?: MercadoLivreSyncResponse
}

export function buildMercadoLivreSyncStorageKey(systemClientId: number): string {
  return `${STORAGE_PREFIX}${systemClientId}`
}

export function isMercadoLivreSyncStorageKey(key: string | null): boolean {
  return Boolean(key?.startsWith(STORAGE_PREFIX))
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isValidTimestamp(value: unknown, now: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= now + FUTURE_TOLERANCE_MS
}

function isSyncResult(value: unknown): value is MercadoLivreSyncResponse {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<MercadoLivreSyncResponse>
  return (
    typeof candidate.message === 'string' &&
    typeof candidate.syncedProducts === 'number' &&
    Number.isInteger(candidate.syncedProducts) &&
    candidate.syncedProducts >= 0
  )
}

export function parseMercadoLivreSyncReference(
  raw: string | null,
  expectedSystemClientId: number,
  now = Date.now()
): StoredMercadoLivreSyncReferenceV1 | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<StoredMercadoLivreSyncReferenceV1>
    if (
      parsed.version !== 1 ||
      !isPositiveInteger(parsed.systemClientId) ||
      parsed.systemClientId !== expectedSystemClientId ||
      typeof parsed.attemptId !== 'string' ||
      !parsed.attemptId.trim() ||
      !isValidTimestamp(parsed.lastAttemptAt, now) ||
      !['running', 'success', 'error'].includes(parsed.outcome ?? '')
    ) {
      return null
    }

    if (parsed.lastSyncAt !== null && !isValidTimestamp(parsed.lastSyncAt, now)) return null
    if (parsed.lastResult !== undefined && !isSyncResult(parsed.lastResult)) return null
    if (parsed.outcome === 'success' && (parsed.lastSyncAt === null || !parsed.lastResult)) return null

    return parsed as StoredMercadoLivreSyncReferenceV1
  } catch {
    return null
  }
}

function resolveStorage(storage?: Storage | null): Storage | null {
  if (storage !== undefined) return storage
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function readMercadoLivreSyncReference(
  systemClientId: number,
  storage?: Storage | null,
  now = Date.now()
): StoredMercadoLivreSyncReferenceV1 | null {
  const key = buildMercadoLivreSyncStorageKey(systemClientId)
  const resolved = resolveStorage(storage)

  if (resolved) {
    try {
      return parseMercadoLivreSyncReference(resolved.getItem(key), systemClientId, now)
    } catch {
      // Storage pode ser negado pelo navegador; a memória mantém a aba funcional.
    }
  }

  return parseMercadoLivreSyncReference(memoryStorage.get(key) ?? null, systemClientId, now)
}

export function writeMercadoLivreSyncReference(
  reference: StoredMercadoLivreSyncReferenceV1,
  storage?: Storage | null
): boolean {
  const key = buildMercadoLivreSyncStorageKey(reference.systemClientId)
  const raw = JSON.stringify(reference)
  memoryStorage.set(key, raw)

  const resolved = resolveStorage(storage)
  if (!resolved) return false

  try {
    resolved.setItem(key, raw)
    return true
  } catch {
    return false
  }
}

export function resetMercadoLivreSyncMemoryStorage(): void {
  memoryStorage.clear()
}
