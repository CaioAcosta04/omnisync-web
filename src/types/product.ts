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
  announcement?: boolean
}

export type { PageResponse } from './page'

export type MercadoLivreSyncResponse = {
  message: string
  syncedProducts: number
}

export type MercadoLivreProductMetadata = {
  category_id: string
  condition: 'new' | 'used'
  pictures: { source: string }[]
  attributes?: Array<{ id: string; value_name?: string; value_id?: string }>
}

export type ProductCreateRequest = {
  system_client_id: number
  name: string
  sku: string
  description: string
  stock: number
  reserved_stock: number
  price: number
  announcement: boolean
  resource: { mercado_livre?: MercadoLivreProductMetadata } | Record<string, never>
}
