export type MlSyncEvent =
  | 'ml_sync_eligibility'
  | 'ml_sync_started'
  | 'ml_sync_skipped'
  | 'ml_sync_succeeded'
  | 'ml_sync_failed'

type MlSyncEventFields = {
  systemClientId?: number
  mode?: 'automatic' | 'manual'
  reason?: string
  durationMs?: number
  syncedProducts?: number
}

export function logMlSyncEvent(event: MlSyncEvent, fields: MlSyncEventFields = {}): void {
  const entry = {
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  }

  if (event === 'ml_sync_failed') {
    console.warn('[MercadoLivreSync]', entry)
    return
  }
  console.info('[MercadoLivreSync]', entry)
}
