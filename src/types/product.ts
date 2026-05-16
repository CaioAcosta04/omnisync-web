export type ProductDto = {
  id: number
  sku: string
  name: string
  description: string
  stock: number
  reserved_stock: number
  price: number
  resource: Record<string, unknown> | null
  system_client_id: number
  active: boolean
  created_at: string
}

export type PageResponse<T> = {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
  numberOfElements: number
}

export type MercadoLivreSyncResponse = {
  message: string
  syncedProducts: number
}
