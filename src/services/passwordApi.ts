import { apiFetch } from '../lib/apiFetch'

export type PasswordOperation =
  | { kind: 'recovery'; token: string }
  | { kind: 'own' }
  | { kind: 'admin'; userId: number }

export class PasswordRequestError extends Error {}

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (!password.trim() || password.length < 6 || password.length > 100)
    return 'A nova senha deve ter entre 6 e 100 caracteres.'
  if (new TextEncoder().encode(password).length > 72)
    return 'A nova senha deve ter no máximo 72 bytes (acentos podem ocupar mais de um byte).'
  if (password !== confirmation) return 'A confirmação deve ser igual à nova senha.'
  return null
}

export async function savePassword(operation: PasswordOperation, password: string, confirmation: string, current: string): Promise<void> {
  const path = operation.kind === 'recovery' ? '/api/auth/reset-password'
    : operation.kind === 'own' ? '/api/users/me/password' : `/api/users/${operation.userId}/password`
  const body = operation.kind === 'recovery' ? { token: operation.token, newPassword: password }
    : { new_password: password, new_password_confirmation: confirmation,
      ...(operation.kind === 'own' ? { current_password: current } : {}) }
  let response: Response
  try {
    response = await apiFetch(path, {
      method: operation.kind === 'recovery' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
    })
  } catch {
    throw new PasswordRequestError('Não foi possível conectar. Verifique sua conexão e tente novamente.')
  }
  if (response.ok) return
  // Never display response bodies/errors: a proxy or server may echo submitted credentials.
  const message = response.status === 400
    ? operation.kind === 'recovery' ? 'Link inválido, utilizado ou expirado. Solicite um novo e-mail de recuperação.'
      : operation.kind === 'own' ? 'Não foi possível alterar a senha. Confira a senha atual e os novos dados.'
        : 'Não foi possível redefinir a senha. Confira os dados e use Configurações para alterar sua própria senha.'
    : response.status === 401 ? 'Sua sessão expirou. Entre novamente.'
    : response.status === 403 ? 'Você não tem permissão para redefinir senhas.'
    : response.status === 404 ? 'Usuário não encontrado ou indisponível para esta empresa.'
    : response.status === 429 ? 'Muitas tentativas. Aguarde e tente novamente.'
    : 'Não foi possível concluir a operação. Tente novamente mais tarde.'
  throw new PasswordRequestError(message)
}
