const MESSAGE_KEYS = ['message', 'error', 'detail', 'title'] as const

type ParsedApiError = {
  message: string
  code: string | null
  retryAfterSeconds: number | null
}

export class ApiClientError extends Error {
  readonly status: number
  readonly code: string | null
  readonly retryAfterSeconds: number | null

  constructor(options: {
    message: string
    status: number
    code?: string | null
    retryAfterSeconds?: number | null
  }) {
    super(options.message)
    this.name = 'ApiClientError'
    this.status = options.status
    this.code = options.code ?? null
    this.retryAfterSeconds = options.retryAfterSeconds ?? null
  }
}

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

function parseApiError(body: string, fallbackMessage: string): ParsedApiError {
  const message = parseApiErrorBody(body, fallbackMessage)
  try {
    const value = JSON.parse(body) as Record<string, unknown>
    const retry = Number(value.retryAfterSeconds)
    return {
      message,
      code: typeof value.code === 'string' && value.code.trim() ? value.code.trim() : null,
      retryAfterSeconds: Number.isInteger(retry) && retry > 0 ? retry : null,
    }
  } catch {
    return { message, code: null, retryAfterSeconds: null }
  }
}

function logApiErrorResponse(res: Response, parsed: ParsedApiError): void {
  console.error('[apiError]', {
    status: res.status,
    url: res.url,
    code: parsed.code,
    message: parsed.message,
  })
}

/** Lê o corpo da resposta, loga o erro completo e retorna só a mensagem para o usuário. */
export async function readApiErrorMessage(
  res: Response,
  fallbackMessage: string,
): Promise<string> {
  const body = await res.text()
  const parsed = parseApiError(body, fallbackMessage)
  logApiErrorResponse(res, parsed)
  return parsed.message
}

/** Lança Error com mensagem amigável; o JSON completo vai apenas para o console. */
export async function throwApiError(
  res: Response,
  fallbackMessage: string,
): Promise<never> {
  const body = await res.text()
  const parsed = parseApiError(body, fallbackMessage)
  logApiErrorResponse(res, parsed)
  const headerRetry = Number(res.headers.get('Retry-After'))
  throw new ApiClientError({
    message: parsed.message,
    status: res.status,
    code: parsed.code,
    retryAfterSeconds:
      parsed.retryAfterSeconds ??
      (Number.isInteger(headerRetry) && headerRetry > 0 ? headerRetry : null),
  })
}
