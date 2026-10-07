import { useEffect, useId, useRef, useState } from 'react'
import { PasswordRequestError, savePassword, validateNewPassword, type PasswordOperation } from '../services/passwordApi'
import './PasswordForm.css'

export function PasswordForm({ operation, onSuccess, onLocked }: {
  operation: PasswordOperation
  onSuccess: () => void | Promise<void>
  onLocked?: (locked: boolean) => void
}) {
  const id = useId()
  const inFlight = useRef(false)
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [status, setStatus] = useState<'idle' | 'pending' | 'success'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (status !== 'success') return
    const timer = window.setTimeout(() => { void onSuccess() }, 1500)
    return () => window.clearTimeout(timer)
  }, [status, onSuccess])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (inFlight.current) return
    const invalid = operation.kind === 'own' && !current.trim() ? 'Informe sua senha atual.'
      : validateNewPassword(password, confirmation)
    if (invalid) { setError(invalid); return }
    inFlight.current = true
    onLocked?.(true)
    setStatus('pending')
    setError('')
    try {
      await savePassword(operation, password, confirmation, current)
      setCurrent(''); setPassword(''); setConfirmation('')
      setStatus('success')
    } catch (error) {
      setError(error instanceof PasswordRequestError ? error.message : 'Não foi possível concluir a operação.')
      setStatus('idle')
      inFlight.current = false
      onLocked?.(false)
    }
  }

  return <form className="password-form" onSubmit={submit} noValidate aria-busy={status === 'pending'}>
    {status === 'success' ? <p role="status" className="password-success">Senha atualizada com sucesso! Redirecionando para o login…</p> : <>
      <p id={`${id}-help`}>Use de 6 a 100 caracteres, respeitando o limite de 72 bytes. Acentos podem ocupar mais de um byte.</p>
      <fieldset disabled={status === 'pending'}>
        {operation.kind === 'own' && <label htmlFor={`${id}-current`}>Senha atual
          <input id={`${id}-current`} type="password" autoComplete="current-password" required value={current} onChange={e => { setCurrent(e.target.value); setError('') }} />
        </label>}
        <label htmlFor={`${id}-new`}>Nova senha
          <input id={`${id}-new`} type="password" autoComplete="new-password" required aria-describedby={`${id}-help`} value={password} onChange={e => { setPassword(e.target.value); setError('') }} />
        </label>
        <label htmlFor={`${id}-confirmation`}>Confirmar nova senha
          <input id={`${id}-confirmation`} type="password" autoComplete="new-password" required value={confirmation} onChange={e => { setConfirmation(e.target.value); setError('') }} />
        </label>
        {error && <p role="alert" className="password-error">{error}</p>}
        <button className="password-primary" type="submit">{status === 'pending' ? 'Salvando…' : operation.kind === 'own' ? 'Alterar senha' : 'Redefinir senha'}</button>
      </fieldset>
      <p>Após salvar, você será direcionado ao login.</p>
    </>}
  </form>
}
