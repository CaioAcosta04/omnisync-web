import { test, expect, type Page } from '@playwright/test'

const nextPassword = 'NewSecret456'
async function installApi(page: Page, role = 'SELLER', permissions = ['USER_MANAGE']) {
  let authenticated = true
  const requests: { path: string; body: unknown }[] = []
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/password') || path === '/api/auth/reset-password') {
      requests.push({ path, body: route.request().postDataJSON() })
      await route.fulfill({ status: path === '/api/auth/reset-password' ? 200 : 204 })
    } else if (path === '/api/auth/logout') {
      authenticated = false
      await route.fulfill({ status: 204 })
    } else if (path === '/api/users/me') {
      await route.fulfill({ status: authenticated ? 200 : 401, json: { id: 1, systemClientId: 7, name: 'Operador', email: 'operator@example.invalid', role, permissions, resource: {}, active: true } })
    } else if (path === '/api/users') {
      await route.fulfill({ json: [1, 2].map(id => ({ id, systemClientId: 7, name: id === 1 ? 'Operador' : 'Colega', email: `user${id}@example.invalid`, role: 'SELLER', permissions: [], resource: {}, active: true, createdAt: '2026-09-01T00:00:00' })) })
    } else if (path.includes('/mercadolivre/status')) {
      await route.fulfill({ json: { connected: false, active: false, systemClientId: 7 } })
    } else {
      await route.fulfill({ status: 401, json: { message: 'Indisponível neste teste' } })
    }
  })
  return requests
}

async function fill(page: Page) {
  await page.getByLabel('Nova senha', { exact: true }).fill(nextPassword)
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill(nextPassword)
}

for (const width of [1280, 390]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })
    test('public recovery opens directly, clears URL and returns to login', async ({ page }) => {
      const requests = await installApi(page)
      await page.goto('/reset-password?token=synthetic-token')
      await expect(page.getByRole('heading', { name: 'Definir nova senha' })).toBeVisible()
      await expect(page).toHaveURL(/\/reset-password$/)
      await fill(page)
      const form = page.locator('.password-card')
      const bounds = await form.boundingBox()
      expect(bounds!.x).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
      await page.screenshot({ path: `test-results/password-recovery-${width}.png` })
      await page.getByRole('button', { name: 'Redefinir senha', exact: true }).click()
      await expect(page.getByRole('status')).toContainText('Senha atualizada')
      await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible()
      expect(requests).toEqual([{ path: '/api/auth/reset-password', body: { token: 'synthetic-token', newPassword: nextPassword } }])
      expect(await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]))).not.toContain('synthetic-token')
    })

    test('own change works in Settings without USER_MANAGE', async ({ page }) => {
      const requests = await installApi(page, 'VIEWER', [])
      await page.goto('/')
      await page.getByRole('button', { name: '×', exact: true }).click()
      await page.getByText('Configurações', { exact: true }).click()
      await page.getByRole('button', { name: 'Segurança', exact: true }).click()
      await fill(page)
      await page.getByRole('button', { name: 'Alterar senha', exact: true }).click()
      await expect(page.getByRole('alert')).toContainText('Informe sua senha atual')
      expect(requests).toHaveLength(0)
      await page.getByLabel('Senha atual', { exact: true }).fill('OldSecret123')
      const bounds = await page.getByLabel('Nova senha', { exact: true }).boundingBox()
      expect(bounds!.width).toBeGreaterThan(200)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
      await page.screenshot({ path: `test-results/password-settings-${width}.png` })
      await page.getByRole('button', { name: 'Alterar senha', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible()
      expect(requests).toEqual([{ path: '/api/users/me/password', body: { current_password: 'OldSecret123', new_password: nextPassword, new_password_confirmation: nextPassword } }])
    })

    test('SELLER with USER_MANAGE can reset another user, not himself', async ({ page }) => {
      const requests = await installApi(page)
      await page.goto('/')
      await page.getByRole('button', { name: '×', exact: true }).click()
      await page.getByText('Usuários', { exact: true }).first().click()
      await expect(page.getByRole('button', { name: 'Redefinir senha de Operador', exact: true })).toHaveCount(0)
      await page.getByRole('button', { name: 'Redefinir senha de Colega', exact: true }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await fill(page)
      const bounds = await page.getByRole('dialog').boundingBox()
      expect(bounds!.x).toBeGreaterThanOrEqual(0)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
      await page.screenshot({ path: `test-results/password-admin-${width}.png` })
      await page.getByRole('dialog').getByRole('button', { name: 'Redefinir senha', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible()
      expect(requests).toEqual([{ path: '/api/users/2/password', body: { new_password: nextPassword, new_password_confirmation: nextPassword } }])
    })
  })
}

test('ADMIN without USER_MANAGE cannot see a password reset action', async ({ page }) => {
  await installApi(page, 'ADMIN', [])
  await page.goto('/')
  await page.getByRole('button', { name: '×', exact: true }).click()
  await page.getByText('Usuários', { exact: true }).first().click()
  await expect(page.getByText('Colega', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Redefinir senha/ })).toHaveCount(0)
})

test('missing and rejected recovery links show safe messages', async ({ page }) => {
  await installApi(page)
  await page.goto('/reset-password')
  await expect(page.getByRole('alert')).toContainText('sem token')
  await page.route('**/api/auth/reset-password', route => route.fulfill({ status: 400, json: { message: 'synthetic-token SECRET-RESPONSE' } }))
  await page.goto('/reset-password?token=synthetic-token')
  await fill(page)
  await page.getByRole('button', { name: 'Redefinir senha', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Link inválido, utilizado ou expirado')
  await expect(page.getByRole('alert')).not.toContainText('SECRET-RESPONSE')
})
