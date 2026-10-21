import { throwApiError } from '../lib/apiError'
import { apiFetch } from '../lib/apiFetch'
import type { RegisterUserRequest, RoleDefinitionDto, UserDto, UserUpdateRequest } from '../types/user'

export async function listRoleDefinitions(): Promise<RoleDefinitionDto[]> {
  const res = await apiFetch('/api/roles')
  if (!res.ok) await throwApiError(res, 'Não foi possível carregar os perfis de acesso.')
  return (await res.json()) as RoleDefinitionDto[]
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

export async function updateOwnProfile(data: Pick<UserUpdateRequest, 'name' | 'email'>): Promise<UserDto> {
  const res = await apiFetch('/api/users/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) await throwApiError(res, 'Não foi possível atualizar o perfil.')
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
 * Cria um membro autenticado na empresa atual, preservando os cookies do administrador.
 */
export async function registerUser(data: RegisterUserRequest): Promise<void> {
  const res = await apiFetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) await throwApiError(res, 'Não foi possível criar o usuário.')
}
