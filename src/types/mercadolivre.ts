export type MercadoLivreIntegrationStatusResponse = {
  connected: boolean
  systemClientId: number | null
  active: boolean | null
  expiresAt: string | null
  marketplace: string | null
}

export type MercadoLivreConnectUrlResponse = {
  authorizationUrl: string
}

export type MercadoLivreExchangeRequest = {
  code: string
  state: string
}

export type MercadoLivreIntegrationResponse = {
  message: string
  systemClientId: number
  marketplace: string
  active: boolean
  expiresAt: string
  resource: Record<string, unknown>
}
