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
}

export type RegisterUserRequest = {
  systemClientId: number
  name: string
  email: string
  password: string
  role: string
  resource?: Record<string, unknown>
}

export type RoleDefinitionDto = {
  code: 'ADMIN' | 'MANAGER' | 'SELLER' | 'VIEWER'
  label: string
  description: string
  permissions: string[]
  limitations: string[]
}
