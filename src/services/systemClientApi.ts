import { throwApiError } from '../lib/apiError'
import { apiFetch } from '../lib/apiFetch'
import type { SystemClientDto, SystemClientUpdateRequest } from '../types/systemClient'

export async function getSystemClient(id: number): Promise<SystemClientDto> {
  const res = await apiFetch(`/api/client/${id}`)
  if (!res.ok) await throwApiError(res, 'Não foi possível carregar os dados da empresa.')
  return (await res.json()) as SystemClientDto
}

export async function updateSystemClient(id: number, data: SystemClientUpdateRequest): Promise<SystemClientDto> {
  const res = await apiFetch(`/api/client/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) await throwApiError(res, 'Não foi possível atualizar os dados da empresa.')
  return (await res.json()) as SystemClientDto
}
