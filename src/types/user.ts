export type UserDto = {
  id: number
  systemClientId: number
  name: string
  email: string
  resource: Record<string, unknown> | null
  active: boolean
  createdAt: string
}

export type UserUpdateRequest = {
  name?: string
  email?: string
  resource?: Record<string, unknown>
}

export type RegisterUserRequest = {
  systemClientId: number
  name: string
  email: string
  password: string
  resource?: Record<string, unknown>
}
