export type ProductDto = {
  id: number
  sku: string
  name: string
  description: string
  stock: number
  reserved_stock: number
  minimum_stock: number
  available_stock?: number
  low_stock?: boolean
  price: number
  resource: Record<string, unknown> | null
  system_client_id: number
  active: boolean
  created_at: string
  announcement?: boolean
}

export type { PageResponse } from './page'

export type MercadoLivreSyncResponse = {
  message: string
  syncedProducts: number
  createdProducts?: number
  updatedProducts?: number
  lastSyncAt?: string
}

export type MercadoLivreProductMetadata = {
  category_id: string
  condition: 'new' | 'used'
  pictures: Array<{
    source?: string
    base64?: string
    content_type?: string
    file_name?: string
  }>
  attributes?: Array<{ id: string; value_name?: string; value_id?: string }>
}

export type ProductCreateRequest = {
  system_client_id: number
  name: string
  sku: string
  description: string
  stock: number
  reserved_stock: number
  minimum_stock: number
  price: number
  announcement: boolean
  resource: Record<string, unknown>
}

export type LowStockProductsResponse = {
  content: ProductDto[]
  offset: number
  limit: number
  total_elements: number
  has_next: boolean
}
