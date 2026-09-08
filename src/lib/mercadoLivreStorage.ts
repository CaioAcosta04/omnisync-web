import type {
  MercadoLivreIntegrationResponse,
  MercadoLivreIntegrationStatusResponse,
} from '../types/mercadolivre'

const STORAGE_KEY = 'omnisync.mercadolivre.integration'

export type StoredMlIntegration = Pick<
  MercadoLivreIntegrationResponse,
  'systemClientId' | 'active' | 'expiresAt' | 'lastSyncAt'
>

export function readMercadoLivreIntegration(): StoredMlIntegration | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<StoredMlIntegration> & { systemClientId?: unknown }
    const systemClientId = Number(data.systemClientId)
    if (!Number.isFinite(systemClientId)) return null
    /* API / JSON às vezes manda Long como string; active pode vir omitido após sucesso */
    const rawActive = data.active as unknown
    const active =
      rawActive === false || String(rawActive).toLowerCase() === 'false'
        ? false
        : true
    const expiresAt =
      typeof data.expiresAt === 'string'
        ? data.expiresAt
        : data.expiresAt != null
          ? String(data.expiresAt)
          : ''
    const lastSyncAt = typeof data.lastSyncAt === 'string' ? data.lastSyncAt : null
    return { systemClientId, active, expiresAt, lastSyncAt }
  } catch {
    return null
  }
}

export function writeMercadoLivreIntegration(res: MercadoLivreIntegrationResponse): void {
  const systemClientId = Number(res.systemClientId)
  if (!Number.isFinite(systemClientId)) return

  const payload: StoredMlIntegration = {
    systemClientId,
    active: res.active !== false,
    expiresAt:
      typeof res.expiresAt === 'string'
        ? res.expiresAt
        : res.expiresAt != null
          ? String(res.expiresAt)
          : '',
    lastSyncAt: typeof res.lastSyncAt === 'string' ? res.lastSyncAt : null,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

/** Atualiza o cache a partir da resposta do GET /status (sem accessToken). */
export function writeMercadoLivreIntegrationFromStatus(
  status: MercadoLivreIntegrationStatusResponse
): void {
  if (!status.connected || status.systemClientId == null) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  const systemClientId = Number(status.systemClientId)
  if (!Number.isFinite(systemClientId)) return

  const payload: StoredMlIntegration = {
    systemClientId,
    active: status.active !== false,
    expiresAt:
      typeof status.expiresAt === 'string'
        ? status.expiresAt
        : status.expiresAt != null
          ? String(status.expiresAt)
          : '',
    lastSyncAt: typeof status.lastSyncAt === 'string' ? status.lastSyncAt : null,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function markMercadoLivreIntegrationInactive(systemClientId: number): void {
  const current = readMercadoLivreIntegration()
  if (!current || Number(current.systemClientId) !== Number(systemClientId)) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, active: false }))
}

export function clearMercadoLivreIntegration(): void {
  localStorage.removeItem(STORAGE_KEY)
}
