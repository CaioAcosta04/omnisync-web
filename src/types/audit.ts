export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'ACTIVATE'
  | 'DEACTIVATE'
  | 'DELETE'
  | 'CONNECT'
  | 'DISCONNECT'
  | 'SYNC'
  | 'PUBLISH'
  | 'CLOSE'

export type AuditEntityType = 'USER' | 'PRODUCT' | 'SALE' | 'INTEGRATION' | 'LISTING'

export type AuditRole = 'ADMIN' | 'MANAGER' | 'SELLER' | 'VIEWER' | 'SYSTEM'

export type AuditActor = {
  id: number | null
  name: string | null
  email: string | null
  role: string | null
}

export type AuditLogDto = {
  id: number
  system_client_id: number
  user: AuditActor
  action: AuditAction
  entity_type: AuditEntityType
  entity_id: string | null
  description: string | null
  previous_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export type AuditPageDto = {
  content: AuditLogDto[]
  offset: number
  limit: number
  total_elements: number
  has_next: boolean
}

export type AuditFilterParams = {
  userId?: number
  role?: string
  action?: string
  entityType?: string
  from?: string
  to?: string
  offset?: number
  limit?: number
}

