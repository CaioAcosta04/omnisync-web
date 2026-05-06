import { API_BASE_URL } from '../config/api'

const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === 'true'

/** Rotas em que 401/403 não dispara refresh (evita loop e comportamento estranho no login). */
const AUTH_PATHS_NO_REFRESH = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
])

function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalized}`
}

function requestPathname(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return new URL(path).pathname
  }
  return path.split('?')[0].split('#')[0]
}

function shouldRetryAfterRefresh(path: string, status: number): boolean {
  if (status !== 401 && status !== 403) return false
  const pathname = requestPathname(path)
  if (AUTH_PATHS_NO_REFRESH.has(pathname)) return false
  return pathname.startsWith('/api/')
}

let refreshInFlight: Promise<boolean> | null = null

/**
 * POST /api/auth/refresh usando o cookie REFRESH_TOKEN (o backend também aceita Bearer).
 * Deduplica chamadas simultâneas. Não usa apiFetch para evitar recursão.
 */
export function tryRefreshAccessToken(): Promise<boolean> {
  if (SKIP_AUTH) {
    return Promise.resolve(true)
  }
  refreshInFlight ??= (async (): Promise<boolean> => {
    try {
      const res = await fetch(resolveUrl('/api/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
      })
      return res.ok
    } catch {
      return false
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

function rawFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...init,
    credentials: init.credentials ?? 'include',
  })
}

/**
 * Fetch para a API OmniSync com cookies httpOnly (access/refresh).
 * Em 401/403 em rotas /api (exceto login/register/refresh/logout), tenta uma vez
 * POST /api/auth/refresh e repete a requisição original.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = resolveUrl(path)
  const exec = () => rawFetch(url, init)

  let res = await exec()
  if (!shouldRetryAfterRefresh(path, res.status)) {
    return res
  }

  const refreshed = await tryRefreshAccessToken()
  if (!refreshed) {
    return res
  }

  res = await exec()
  return res
}
