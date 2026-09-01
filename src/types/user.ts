export type UserDto = {
  id: number
  systemClientId: number
  name: string
  email: string
  resource: Record<string, unknown> | null
  active: boolean
  createdAt: string
  role?: string
  permissions?: string[]
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
  role?: string
  permissions?: string[]
}

export type Permission =
  | 'PRODUCT_READ'
  | 'PRODUCT_WRITE'
  | 'LISTING_PUBLISH'
  | 'SALE_READ'
  | 'SALE_WRITE'
  | 'USER_MANAGE'
  | 'INTEGRATION_MANAGE'
  | 'SETTINGS_MANAGE'

export type UserRole = 'ADMIN' | 'MANAGER' | 'SELLER' | 'VIEWER'
