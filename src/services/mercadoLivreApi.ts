import { throwApiError } from '../lib/apiError'
import { apiFetch } from '../lib/apiFetch'
import type {
  MercadoLivreConnectUrlResponse,
  MercadoLivreExchangeRequest,
  MercadoLivreIntegrationResponse,
  MercadoLivreIntegrationStatusResponse,
} from '../types/mercadolivre'

/**
 * Fluxo OAuth ML. A API aceita JWT por cookie (credentials) ou Authorization Bearer;
 * usamos apiFetch para manter cookies httpOnly.
 */
export async function getMercadoLivreStatus(): Promise<MercadoLivreIntegrationStatusResponse> {
  const res = await apiFetch('/api/integrations/mercadolivre/status')
  if (!res.ok) await throwApiError(res, 'Não foi possível consultar o status da integração.')
  return (await res.json()) as MercadoLivreIntegrationStatusResponse
}

export async function fetchMercadoLivreConnectUrl(
  systemClientId: number
): Promise<MercadoLivreConnectUrlResponse> {
  const res = await apiFetch(
    `/api/integrations/mercadolivre/connect-url?systemClientId=${encodeURIComponent(String(systemClientId))}`
  )
  if (!res.ok) await throwApiError(res, 'Não foi possível obter o link do Mercado Livre.')
  return (await res.json()) as MercadoLivreConnectUrlResponse
}

export async function exchangeMercadoLivreCode(
  body: MercadoLivreExchangeRequest
): Promise<MercadoLivreIntegrationResponse> {
  const res = await apiFetch('/api/integrations/mercadolivre/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) await throwApiError(res, 'Falha ao conectar a conta do Mercado Livre.')
  return (await res.json()) as MercadoLivreIntegrationResponse
}
