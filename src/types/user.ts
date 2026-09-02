export type UserDto = {
  id: number
  systemClientId: number
  name: string
  email: string
  resource: Record<string, unknown> | null
  role?: string
  permissions?: string[]
  active: boolean
  createdAt: string
}

export type UserUpdateRequest = {
  name?: string
  email?: string
  resource?: Record<string, unknown>
  role?: string
  permissions?: string[]
}

export type RegisterUserRequest = {
  systemClientId: number
  name: string
  email: string
  password: string
  resource?: Record<string, unknown>
}
