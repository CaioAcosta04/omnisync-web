export type SaleChannel = 'MERCADO_LIVRE' | 'SHOPEE' | 'AMAZON' | 'PHYSICAL' | 'MANUAL'

export type SaleStatus = 'CONFIRMED' | 'CANCELLED'

export type SaleCreateRequest = {
  systemClientId: number
  productId: number
  quantity: number
  totalValue: number
  channel: SaleChannel
  externalReferenceId?: string | null
  resource?: Record<string, unknown> | null
}

export type SaleLogDto = {
  id: number
  sale_id: number
  system_client_id: number
  action: string
  previous_status: string | null
  new_status: string | null
  resource: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export type SaleDto = {
  id: number
  system_client_id: number
  product_id: number
  quantity: number
  total_value: number
  resource: Record<string, unknown> | null
  channel: SaleChannel
  external_reference_id: string | null
  status: SaleStatus
  created_at: string
  logs?: SaleLogDto[]
}
