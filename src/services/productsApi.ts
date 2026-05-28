import { apiFetch } from '../lib/apiFetch'
import type { MercadoLivreSyncResponse, PageResponse, ProductCreateRequest, ProductDto } from '../types/product'

export async function listProducts(
  systemClientId: number,
  offset = 0,
  limit = 200
): Promise<PageResponse<ProductDto>> {
  const res = await apiFetch(
    `/api/products/${systemClientId}?offset=${offset}&limit=${limit}`
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Não foi possível carregar os produtos.')
  }
  return (await res.json()) as PageResponse<ProductDto>
}

export async function syncMercadoLivreProducts(
  systemClientId: number
): Promise<MercadoLivreSyncResponse> {
  const res = await apiFetch(
    `/api/integrations/mercadolivre/catalog/${systemClientId}/sync`,
    { method: 'POST' }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Falha ao sincronizar os produtos do Mercado Livre.')
  }
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
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Não foi possível criar o produto.')
  }
  return (await res.json()) as ProductDto
}

export async function getProduct(
  systemClientId: number,
  id: number
): Promise<ProductDto> {
  const res = await apiFetch(`/api/products/${systemClientId}/${id}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Não foi possível carregar o produto.')
  }
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
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Não foi possível atualizar o produto.')
  }
  return (await res.json()) as ProductDto
}

export async function deleteProduct(
  systemClientId: number,
  id: number
): Promise<ProductDto> {
  const res = await apiFetch(`/api/products/${systemClientId}/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Não foi possível remover o produto.')
  }
  return (await res.json()) as ProductDto
}
