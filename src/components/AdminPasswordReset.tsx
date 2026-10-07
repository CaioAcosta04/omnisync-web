import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { hasUserManagePermission } from '../lib/userResource'
import { PasswordForm } from './PasswordForm'
import { useUserAuthNavigation } from '../contexts/UserAuthNavigationContext'

function ResetDialog({ userId, name, close }: { userId: number; name: string; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [locked, setLocked] = useState(false)
  const { logout } = useUserAuthNavigation()
  useEffect(() => { ref.current?.showModal() }, [])
  return <dialog ref={ref} className="password-dialog" aria-label={`Redefinir senha de ${name}`} onCancel={event => { if (locked) event.preventDefault(); else close() }} onClose={close}>
    <h2>Redefinir senha</h2>
    <p>Defina uma nova senha para <strong>{name}</strong>. As permissões da conta serão mantidas.</p>
    <PasswordForm operation={{ kind: 'admin', userId }} onSuccess={logout} onLocked={setLocked} />
    <button className="password-secondary" type="button" disabled={locked} onClick={close}>Fechar</button>
  </dialog>
}

export function AdminPasswordReset({ userId, name }: { userId: number; name: string }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  if (!hasUserManagePermission(user) || userId === user?.id) return null
  return <>
    <button type="button" className="password-secondary" aria-label={`Redefinir senha de ${name}`} onClick={() => setOpen(true)}>Redefinir senha</button>
    {open && <ResetDialog userId={userId} name={name} close={() => setOpen(false)} />}
  </>
}
