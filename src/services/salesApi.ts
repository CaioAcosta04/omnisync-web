import { apiFetch } from '../lib/apiFetch'
import type { PageResponse } from '../types/page'
import type { SaleCreateRequest, SaleDto } from '../types/sale'

export async function listSales(
  systemClientId: number,
  offset = 0,
  limit = 50,
): Promise<PageResponse<SaleDto>> {
  const res = await apiFetch(
    `/api/sales/${systemClientId}?offset=${offset}&limit=${limit}`,
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Não foi possível carregar a atividade.')
  }
  return (await res.json()) as PageResponse<SaleDto>
}

export async function getSaleById(
  systemClientId: number,
  id: number,
): Promise<SaleDto> {
  const res = await apiFetch(`/api/sales/${systemClientId}/${id}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Não foi possível carregar a venda.')
  }
  return (await res.json()) as SaleDto
}

export async function createSales(
  systemClientId: number,
  requests: SaleCreateRequest[],
): Promise<SaleDto[]> {
  const res = await apiFetch(`/api/sales/${systemClientId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requests),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Não foi possível registrar a venda.')
  }
  return (await res.json()) as SaleDto[]
}
