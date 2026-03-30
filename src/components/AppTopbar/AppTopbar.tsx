import './AppTopbar.css'
import logo from '../../assets/omni_logo.png'
import { useUserAuthNavigation } from '../../contexts/UserAuthNavigationContext'

export type AppTopbarVariant = 'login' | 'create' | 'changePassword'

type Props = {
  variant: AppTopbarVariant
}

export function AppTopbar({ variant }: Props) {
  const { goToLogin, goToCreateAccount } = useUserAuthNavigation()

  return (
    <header className="app-topbar" role="banner">
      <div className="app-topbar-brand">
        <img src={logo} alt="" width={40} height={40} className="app-topbar-logo" />
        <span className="app-topbar-title">OmniSync</span>
      </div>

      <nav
        className="app-topbar-nav"
        role="navigation"
        aria-label="Navegação entre telas de autenticação"
      >
        {variant === 'create' && (
          <div className="app-topbar-actions">
            <span className="app-topbar-hint">Já tem uma conta?</span>
            <button type="button" className="app-topbar-cta" onClick={goToLogin}>
              Logar
            </button>
          </div>
        )}
        {variant === 'login' && (
          <div className="app-topbar-actions">
            <span className="app-topbar-hint">Não tem uma conta?</span>
            <button type="button" className="app-topbar-cta" onClick={goToCreateAccount}>
              Criar conta
            </button>
          </div>
        )}
        {variant === 'changePassword' && (
          <div className="app-topbar-actions">
            <button type="button" className="app-topbar-cta" onClick={goToLogin}>
              Já tenho uma conta
            </button>
          </div>
        )}
      </nav>
    </header>
  )
}
