import { throwApiError } from '../lib/apiError'
import { apiFetch } from '../lib/apiFetch'
import type {
  MercadoLivreProductMetadata,
  MercadoLivreSyncResponse,
  PageResponse,
  ProductCreateRequest,
  ProductDto,
} from '../types/product'

export async function listProducts(
  systemClientId: number,
  offset = 0,
  limit = 200
): Promise<PageResponse<ProductDto>> {
  const res = await apiFetch(
    `/api/products/${systemClientId}?offset=${offset}&limit=${limit}`
  )
  if (!res.ok) await throwApiError(res, 'Não foi possível carregar os produtos.')
  return (await res.json()) as PageResponse<ProductDto>
}

export async function syncMercadoLivreProducts(
  systemClientId: number
): Promise<MercadoLivreSyncResponse> {
  const res = await apiFetch(
    `/api/integrations/mercadolivre/catalog/${systemClientId}/sync`,
    { method: 'POST' }
  )
  if (!res.ok) await throwApiError(res, 'Falha ao sincronizar os produtos do Mercado Livre.')
  return (await res.json()) as MercadoLivreSyncResponse
}

export async function createProduct(
  systemClientId: number,
  data: ProductCreateRequest
): Promise<ProductDto> {
  const res = await apiFetch(`/api/products/${systemClientId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) await throwApiError(res, 'Não foi possível criar o produto.')
  return (await res.json()) as ProductDto
}

export async function getProduct(
  systemClientId: number,
  id: number
): Promise<ProductDto> {
  const res = await apiFetch(`/api/products/${systemClientId}/${id}`)
  if (!res.ok) await throwApiError(res, 'Não foi possível carregar o produto.')
  return (await res.json()) as ProductDto
}

export async function updateProduct(
  systemClientId: number,
  id: number,
  data: ProductDto
): Promise<ProductDto> {
  const res = await apiFetch(`/api/products/${systemClientId}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) await throwApiError(res, 'Não foi possível atualizar o produto.')
  return (await res.json()) as ProductDto
}

export async function deleteProduct(
  systemClientId: number,
  id: number
): Promise<ProductDto> {
  const res = await apiFetch(`/api/products/${systemClientId}/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) await throwApiError(res, 'Não foi possível remover o produto.')
  return (await res.json()) as ProductDto
}

export async function announceProduct(
  systemClientId: number,
  id: number,
  mlMetadata: MercadoLivreProductMetadata
): Promise<ProductDto> {
  const res = await apiFetch(`/api/products/${systemClientId}/${id}/announce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mlMetadata),
  })
  if (!res.ok) await throwApiError(res, 'Não foi possível anunciar o produto no Mercado Livre.')
  return (await res.json()) as ProductDto
}
