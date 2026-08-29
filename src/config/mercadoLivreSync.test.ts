import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ML_SYNC_COOLDOWN_MINUTES,
  parseMercadoLivreSyncCooldownMinutes,
} from './mercadoLivreSync'

describe('parseMercadoLivreSyncCooldownMinutes', () => {
  it('uses ten minutes by default', () => {
    expect(DEFAULT_ML_SYNC_COOLDOWN_MINUTES).toBe(10)
    expect(parseMercadoLivreSyncCooldownMinutes(undefined)).toBe(10)
  })

  it('accepts a positive finite override', () => {
    expect(parseMercadoLivreSyncCooldownMinutes('2.5')).toBe(2.5)
  })

  it.each(['', '0', '-1', 'NaN', 'Infinity'])('falls back for %s', (value) => {
    expect(parseMercadoLivreSyncCooldownMinutes(value)).toBe(10)
  })
})
