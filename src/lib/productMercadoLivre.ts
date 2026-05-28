import type { ProductDto } from '../types/product'

export type MercadoLivreProductInfo = {
  itemId: string
  status: string | null
  permalink: string | null
  categoryId: string | null
}

export function getMercadoLivreInfo(product: ProductDto): MercadoLivreProductInfo | null {
  const ml = product.resource?.mercado_livre as Record<string, unknown> | undefined
  if (ml?.item_id == null) return null
  return {
    itemId: String(ml.item_id),
    status: ml.status != null ? String(ml.status) : null,
    permalink: ml.permalink != null ? String(ml.permalink) : null,
    categoryId: ml.category_id != null ? String(ml.category_id) : null,
  }
}

export function hasMercadoLivreListing(product: ProductDto): boolean {
  return getMercadoLivreInfo(product) != null
}

export function buildProductUpdatePayload(
  product: ProductDto,
  fields: {
    name: string
    sku: string
    description: string
    stock: number
    reserved_stock: number
    price: number
  },
  mlStatus?: 'active' | 'paused'
): ProductDto {
  const resource = product.resource ? { ...product.resource } : {}
  if (mlStatus != null) {
    const currentMl = (resource.mercado_livre as Record<string, unknown> | undefined) ?? {}
    resource.mercado_livre = { ...currentMl, status: mlStatus }
  }
  return {
    ...product,
    ...fields,
    resource,
  }
}
