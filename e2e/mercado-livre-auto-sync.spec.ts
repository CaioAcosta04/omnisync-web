import { expect, test, type BrowserContext, type Route } from '@playwright/test'

type SyncResponse = 'success' | 'failure' | 'pending' | 'reauth' | 'in-progress' | 'rate-limited'

type ApiHarness = {
  getSyncCount: () => number
  getSyncCountFor: (systemClientId: number) => number
  setTenant: (systemClientId: number) => void
  releasePendingSyncs: () => void
}

const emptyPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 200,
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

async function installAuthenticatedApi(
  context: BrowserContext,
  options: { active?: boolean; syncResponses?: SyncResponse[] } = {},
): Promise<ApiHarness> {
  let tenantId = 7
  let active = options.active ?? true
  let connected = active
  let lastSyncAt: string | null = null
  const responses = [...(options.syncResponses ?? ['success'])]
  const counts = new Map<number, number>()
  const pendingResolvers: Array<() => void> = []

  await context.addInitScript(({ initialTenantId }) => {
    localStorage.setItem(
      'omnisync.mercadolivre.integration',
      JSON.stringify({ systemClientId: initialTenantId, active: true, expiresAt: '' }),
    )
  }, { initialTenantId: tenantId })

  await context.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname

    if (pathname === '/api/users/me') {
      await json(route, {
        id: tenantId,
        systemClientId: tenantId,
        name: `Tenant ${tenantId}`,
        email: `tenant-${tenantId}@local.test`,
        resource: { role: 'admin' },
        role: 'admin',
        active: true,
        createdAt: '2026-08-28T12:00:00',
      })
      return
    }

    if (pathname === '/api/integrations/mercadolivre/status') {
      await json(route, {
        connected,
        active: connected ? active : null,
        systemClientId: tenantId,
        expiresAt: null,
        marketplace: active ? 'MERCADO_LIVRE' : null,
        lastSyncAt,
      })
      return
    }

    const syncMatch = pathname.match(/^\/api\/integrations\/mercadolivre\/catalog\/(\d+)\/sync$/)
    if (syncMatch && request.method() === 'POST') {
      const requestedTenant = Number(syncMatch[1])
      counts.set(requestedTenant, (counts.get(requestedTenant) ?? 0) + 1)
      const response = responses.shift() ?? 'success'
      if (response === 'pending') {
        await new Promise<void>((resolve) => pendingResolvers.push(resolve))
      }
      if (response === 'failure') {
        await json(route, { message: 'detalhe externo que não deve chegar à interface' }, 503)
        return
      }
      if (response === 'reauth') {
        connected = true
        active = false
        await json(route, {
          message: 'Reconecte sua conta do Mercado Livre para sincronizar novamente.',
          code: 'ML_REAUTH_REQUIRED',
        }, 409)
        return
      }
      if (response === 'in-progress') {
        await json(route, { message: 'Sync em andamento', code: 'ML_SYNC_IN_PROGRESS', lastSyncAt }, 202)
        return
      }
      if (response === 'rate-limited') {
        await json(route, {
          message: 'Aguarde', code: 'ML_RATE_LIMITED', retryAfterSeconds: 30,
        }, 429)
        return
      }
      lastSyncAt = '2026-09-08T15:00:00Z'
      await json(route, {
        message: 'Catálogo atualizado',
        syncedProducts: 0,
        createdProducts: 0,
        updatedProducts: 0,
        lastSyncAt,
      })
      return
    }

    if (/^\/api\/products\/\d+$/.test(pathname) || /^\/api\/sales\/\d+$/.test(pathname)) {
      await json(route, emptyPage)
      return
    }

    await json(route, {})
  })

  return {
    getSyncCount: () => [...counts.values()].reduce((total, count) => total + count, 0),
    getSyncCountFor: (systemClientId) => counts.get(systemClientId) ?? 0,
    setTenant: (nextTenantId) => {
      tenantId = nextTenantId
    },
    releasePendingSyncs: () => pendingResolvers.splice(0).forEach((resolve) => resolve()),
  }
}

test('deduplicates the automatic sync across three reloads', async ({ context, page }) => {
  const api = await installAuthenticatedApi(context)
  await page.goto('/')
  await expect.poll(api.getSyncCount).toBe(1)

  await page.reload()
  await page.reload()
  await page.reload()

  await expect(page.getByText('Visão geral')).toBeVisible()
  await expect.poll(api.getSyncCount).toBe(1)
})

test('coordinates two tabs while the first request is pending', async ({ context }) => {
  const api = await installAuthenticatedApi(context, { syncResponses: ['pending'] })
  const first = await context.newPage()
  const second = await context.newPage()

  await Promise.all([first.goto('/'), second.goto('/')])
  await expect.poll(api.getSyncCount).toBe(1)
  await expect(first.getByRole('status')).toContainText('Sincronizando…')
  await expect(second.getByRole('status')).toContainText('Sincronizando…')

  api.releasePendingSyncs()
  await expect(first.getByRole('status')).toContainText('Catálogo atualizado')
  await expect(second.getByRole('status')).toContainText('Catálogo atualizado')
  expect(api.getSyncCount()).toBe(1)
})

test('keeps cooldown references isolated by tenant', async ({ context, page }) => {
  const api = await installAuthenticatedApi(context)
  await page.goto('/')
  await expect.poll(() => api.getSyncCountFor(7)).toBe(1)

  api.setTenant(8)
  await page.reload()

  await expect.poll(() => api.getSyncCountFor(8)).toBe(1)
  expect(api.getSyncCount()).toBe(2)
})

test('does not call sync for an inactive integration', async ({ context, page }) => {
  const api = await installAuthenticatedApi(context, { active: false })
  await page.goto('/')

  await expect(page.getByText('Visão geral')).toBeVisible()
  await page.waitForTimeout(200)
  expect(api.getSyncCount()).toBe(0)
})

test('keeps navigation available during a pending sync', async ({ context, page }) => {
  const api = await installAuthenticatedApi(context, { syncResponses: ['pending'] })
  await page.goto('/')
  await expect.poll(api.getSyncCount).toBe(1)
  await expect(page.getByRole('status')).toContainText('Sincronizando…')

  await page.getByText('Estoque', { exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Visão do estoque' })).toBeVisible()

  api.releasePendingSyncs()
  await expect(page.getByRole('status')).toContainText('Catálogo atualizado')
})

test('contains a 503 and permits a successful manual retry', async ({ context, page }) => {
  const pageErrors: Error[] = []
  page.on('pageerror', (error) => pageErrors.push(error))
  const api = await installAuthenticatedApi(context, {
    syncResponses: ['failure', 'success'],
  })
  await page.goto('/')

  await expect(page.getByRole('alert')).toContainText('Não foi possível sincronizar agora')
  expect(api.getSyncCount()).toBe(1)

  await page.getByText('Anúncios', { exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Anúncios do Mercado Livre' })).toBeVisible()
  await page.getByRole('button', { name: 'Sincronizar ML' }).click()

  await expect(page.getByRole('status')).toContainText('Catálogo atualizado')
  expect(api.getSyncCount()).toBe(2)
  expect(pageErrors).toEqual([])

  await page.reload()
  await page.waitForTimeout(200)
  expect(api.getSyncCount()).toBe(2)
})

test('turns 409 into a non-blocking reconnect journey', async ({ context, page }) => {
  await installAuthenticatedApi(context, { syncResponses: ['reauth'] })
  await page.goto('/')

  const reconnect = page.getByRole('button', { name: 'Reconectar Mercado Livre' })
  await expect(reconnect).toBeVisible()
  await reconnect.click()
  await expect(page.getByRole('heading', { name: 'Integrações de Marketplace' })).toBeVisible()
  await expect(page.getByText('Reconexão necessária')).toBeVisible()
})

test('keeps the canonical successful timestamp after navigation and reload', async ({ context, page }) => {
  await installAuthenticatedApi(context)
  await page.goto('/')
  await expect(page.getByRole('status')).toContainText('Catálogo atualizado')

  await page.getByText('Marketplaces', { exact: true }).click()
  await expect(page.getByText('ÚLTIMA SINCRONIZAÇÃO').first()).toBeVisible()
  await expect(page.getByText('Ainda não sincronizado')).toHaveCount(0)
  await expect(page.getByText(/Token até/i)).toHaveCount(0)
  await page.reload()
  await page.getByText('Marketplaces', { exact: true }).click()
  await expect(page.getByText('Ainda não sincronizado')).toHaveCount(0)
})
