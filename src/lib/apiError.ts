const MESSAGE_KEYS = ['message', 'error', 'detail', 'title'] as const

function extractMessageFromValue(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }
  if (typeof value !== 'object') return null

  const obj = value as Record<string, unknown>

  for (const key of MESSAGE_KEYS) {
    const candidate = obj[key]
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim()
    }
  }

  if (Array.isArray(obj.errors) && obj.errors.length > 0) {
    const first = obj.errors[0]
    const nested = extractMessageFromValue(first)
    if (nested) return nested
    if (first != null && typeof first === 'object') {
      const fieldError = first as Record<string, unknown>
      if (typeof fieldError.defaultMessage === 'string' && fieldError.defaultMessage.trim()) {
        return fieldError.defaultMessage.trim()
      }
    }
  }

  return null
}

/** Extrai mensagem amigável do corpo de erro da API (JSON ou texto). */
export function parseApiErrorBody(body: string, fallbackMessage: string): string {
  const trimmed = body.trim()
  if (!trimmed) return fallbackMessage

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      return extractMessageFromValue(parsed) ?? fallbackMessage
    } catch {
      return fallbackMessage
    }
  }

  return trimmed
}

function logApiErrorResponse(res: Response, body: string): void {
  const trimmed = body.trim()
  if (!trimmed) {
    console.error('[apiError]', res.status, res.url, '(empty body)')
    return
  }

  try {
    console.error('[apiError]', res.status, res.url, JSON.parse(trimmed))
  } catch {
    console.error('[apiError]', res.status, res.url, trimmed)
  }
}

/** Lê o corpo da resposta, loga o erro completo e retorna só a mensagem para o usuário. */
export async function readApiErrorMessage(
  res: Response,
  fallbackMessage: string,
): Promise<string> {
  const body = await res.text()
  logApiErrorResponse(res, body)
  return parseApiErrorBody(body, fallbackMessage)
}

/** Lança Error com mensagem amigável; o JSON completo vai apenas para o console. */
export async function throwApiError(
  res: Response,
  fallbackMessage: string,
): Promise<never> {
  throw new Error(await readApiErrorMessage(res, fallbackMessage))
}
