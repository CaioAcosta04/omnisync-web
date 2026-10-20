export type SystemClientDto = {
  id: number
  name: string
  document: string
  resource: Record<string, unknown> | null
  active: boolean
  createdAt: string
}

export type SystemClientUpdateRequest = {
  name?: string
  document?: string
}
