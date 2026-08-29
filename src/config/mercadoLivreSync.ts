export const DEFAULT_ML_SYNC_COOLDOWN_MINUTES = 10

export function parseMercadoLivreSyncCooldownMinutes(value: string | undefined): number {
  if (!value?.trim()) return DEFAULT_ML_SYNC_COOLDOWN_MINUTES

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ML_SYNC_COOLDOWN_MINUTES
}

export const MERCADO_LIVRE_SYNC_COOLDOWN_MS =
  parseMercadoLivreSyncCooldownMinutes(import.meta.env.VITE_ML_SYNC_COOLDOWN_MINUTES) * 60_000
