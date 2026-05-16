/**
 * Singleton simples pra capturar eventos do fluxo OAuth do Mercado Livre.
 * Usado pelo MercadoLivreDebugPanel pra visualizar a timeline em tempo real
 * sem precisar abrir o DevTools.
 *
 * Mantém um buffer circular dos últimos 50 eventos e notifica subscribers
 * via custom event 'omnisync-ml-debug'.
 */

export type MlDebugEvent = {
  timestamp: string
  category: 'mount' | 'auth' | 'oauth' | 'api' | 'storage' | 'ui'
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
  data?: Record<string, unknown>
}

const MAX_EVENTS = 50
const EVENT_NAME = 'omnisync-ml-debug'
let buffer: MlDebugEvent[] = []

export function logMlEvent(event: Omit<MlDebugEvent, 'timestamp'>): void {
  const fullEvent: MlDebugEvent = {
    ...event,
    timestamp: new Date().toISOString().substring(11, 23), // HH:MM:SS.mmm
  }
  buffer = [fullEvent, ...buffer].slice(0, MAX_EVENTS)

  // Log no console também — com prefixo unificado pra fácil filtragem
  const prefix = `[ml-debug:${event.category}]`
  const args: unknown[] = [prefix, event.message]
  if (event.data) args.push(event.data)
  switch (event.level) {
    case 'error':
      console.error(...args)
      break
    case 'warn':
      console.warn(...args)
      break
    case 'success':
      console.info(...args)
      break
    default:
      console.debug(...args)
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME))
  }
}

export function getMlEvents(): MlDebugEvent[] {
  return buffer
}

export function clearMlEvents(): void {
  buffer = []
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME))
  }
}

export function subscribeMlEvents(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT_NAME, listener)
  return () => window.removeEventListener(EVENT_NAME, listener)
}
