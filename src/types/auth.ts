/** Resposta de POST /api/auth/refresh (cookies de access também são atualizados). */
export type RefreshResponseBody = {
  message: string
  accessToken: string
}

/** Resposta de GET /api/users/me (JSON). */
export type UserMe = {
  id: number
  systemClientId: number
  name: string
  email: string
  resource: Record<string, unknown>
  active: boolean
  createdAt: string
  role?: string
  permissions?: string[]
}
