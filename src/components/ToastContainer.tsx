/**
 * ToastContainer
 *
 * Container para exibir notificações de toast na aplicação.
 * Posicionado no topo da árvore de componentes para capturar notificações
 * de qualquer lugar na aplicação.
 */

export function ToastContainer() {
  return (
    <div
      id="toast-container"
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        pointerEvents: 'none',
      }}
      aria-live="polite"
      aria-atomic="false"
    />
  )
}
