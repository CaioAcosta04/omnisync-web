import { API_BASE_URL } from '../config/api'
import { throwApiError } from '../lib/apiError'
import { apiFetch } from '../lib/apiFetch'
import type { RegisterUserRequest, UserDto, UserUpdateRequest } from '../types/user'

function resolveUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalized}`
}

export async function listUsers(): Promise<UserDto[]> {
  const res = await apiFetch('/api/users')
  if (!res.ok) await throwApiError(res, 'Não foi possível carregar os usuários.')
  return (await res.json()) as UserDto[]
}

export async function updateUser(id: number, data: UserUpdateRequest): Promise<UserDto> {
  const res = await apiFetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) await throwApiError(res, 'Não foi possível atualizar o usuário.')
  return (await res.json()) as UserDto
}

export async function updateUserStatus(id: number, active: boolean): Promise<UserDto> {
  const res = await apiFetch(`/api/users/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  })
  if (!res.ok) await throwApiError(res, 'Não foi possível atualizar o status do usuário.')
  return (await res.json()) as UserDto
}

/**
 * Cria usuário via registro sem substituir os cookies da sessão do admin.
 */
export async function registerUser(data: RegisterUserRequest): Promise<void> {
  const res = await fetch(resolveUrl('/api/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'omit',
  })
  if (!res.ok) await throwApiError(res, 'Não foi possível criar o usuário.')
}
