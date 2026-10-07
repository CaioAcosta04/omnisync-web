import { useEffect, useState } from 'react'
import { PasswordForm } from '../../../components/PasswordForm'
import { apiFetch } from '../../../lib/apiFetch'

export function ResetPasswordScreen() {
  // Kept only in component memory. Never pass the token through storage or navigation state.
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '')
  useEffect(() => {
    window.history.replaceState(null, '', '/reset-password')
  }, [])

  async function login() {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }) } catch { /* No credential logging. */ }
    window.location.replace('/')
  }

  return <main className="password-page"><section className="password-card" aria-labelledby="reset-title">
    <span>OmniSync</span>
    <h1 id="reset-title">Definir nova senha</h1>
    {token.trim() ? <PasswordForm operation={{ kind: 'recovery', token }} onSuccess={login} />
      : <p role="alert" className="password-error">Link de recuperação sem token. Solicite um novo e-mail na opção “Esqueci minha senha” do login.</p>}
    <button type="button" className="password-secondary" onClick={() => void login()}>Voltar para o login</button>
  </section></main>
}
