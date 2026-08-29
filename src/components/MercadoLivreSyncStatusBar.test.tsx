import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '../App'
import { MercadoLivreSyncStatusBar } from './MercadoLivreSyncStatusBar'

const mocks = vi.hoisted(() => ({
  state: {
    phase: 'idle',
    isSyncing: false,
    lastResult: null as null | { message: string; syncedProducts: number },
    warning: null as string | null,
    dismissNotice: vi.fn(),
  },
  auth: {
    user: null as null | { id: number; systemClientId: number; name: string; email: string },
    status: 'ready' as const,
    skipAuth: false,
    logout: vi.fn(),
  },
}))

vi.mock('../contexts/MercadoLivreSyncContext', () => ({
  MercadoLivreSyncProvider: ({ children }: { children: ReactNode }) => children,
  useMercadoLivreSync: () => ({
    ...mocks.state,
    catalogRevision: 0,
    syncNow: vi.fn(),
  }),
}))
vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => mocks.auth,
}))

beforeEach(() => {
  mocks.state = {
    phase: 'idle',
    isSyncing: false,
    lastResult: null,
    warning: null,
    dismissNotice: vi.fn(),
  }
  mocks.auth.user = null
  mocks.auth.logout.mockReset()
})

describe('MercadoLivreSyncStatusBar', () => {
  it('does not occupy authenticated layout space while idle', () => {
    const { container } = render(<MercadoLivreSyncStatusBar />)
    expect(container).toBeEmptyDOMElement()
  })

  it('announces progress without blocking interaction', () => {
    mocks.state.phase = 'syncing'
    mocks.state.isSyncing = true
    render(<MercadoLivreSyncStatusBar />)
    expect(screen.getByRole('status')).toHaveTextContent('Sincronizando…')
  })

  it('announces the successful result and can be dismissed', async () => {
    mocks.state.phase = 'success'
    mocks.state.lastResult = { message: 'Catálogo atualizado', syncedProducts: 3 }
    render(<MercadoLivreSyncStatusBar />)

    expect(screen.getByRole('status')).toHaveTextContent('Catálogo atualizado')
    await userEvent.click(screen.getByRole('button', { name: 'Dispensar aviso de sincronização' }))
    expect(mocks.state.dismissNotice).toHaveBeenCalledOnce()
  })

  it('shows one accessible, generic and dismissible failure warning', async () => {
    mocks.state.phase = 'error'
    mocks.state.warning = 'Não foi possível sincronizar agora.'
    render(<MercadoLivreSyncStatusBar />)

    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível sincronizar agora.')
    await userEvent.click(screen.getByRole('button', { name: 'Dispensar aviso de sincronização' }))
    expect(mocks.state.dismissNotice).toHaveBeenCalledOnce()
  })

  it('is absent from the login layout even when the shared phase is syncing', () => {
    mocks.state.phase = 'syncing'
    mocks.state.isSyncing = true
    render(<AppShell />)

    expect(screen.getByRole('main')).toBeVisible()
    expect(screen.queryByText('Sincronizando…')).not.toBeInTheDocument()
  })
})
