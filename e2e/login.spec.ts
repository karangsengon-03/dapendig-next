import { test, expect } from '@playwright/test'

// CATATAN: test ini butuh kredensial Firebase Auth sungguhan untuk skenario
// sukses. Ganti E2E_TEST_EMAIL/E2E_TEST_PASSWORD di .env.local (atau env
// CI) dengan akun test yang sudah ada di salah satu 5 UID allowlist.
const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? ''
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? ''

test.describe('Login', () => {
  test('menampilkan pesan error untuk kredensial salah', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('nama@desa.id').fill('salah@test.local')
    await page.getByPlaceholder('••••••••').fill('passwordsalah')
    await page.getByRole('button', { name: 'Masuk' }).click()

    await expect(page.getByText(/email atau kata sandi salah/i)).toBeVisible({ timeout: 10_000 })
    // Harus TETAP di halaman login, tidak redirect
    await expect(page).toHaveURL(/\/login/)
  })

  test.skip(!TEST_EMAIL, 'E2E_TEST_EMAIL belum di-set — skip skenario login sukses')
  test('login sukses melakukan hard-redirect ke /dashboard (verifikasi window.location.href yang kita bahas)', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('nama@desa.id').fill(TEST_EMAIL)
    await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Masuk' }).click()

    // window.location.href = hard navigation — Playwright waitForURL
    // menangkap ini sama seperti navigasi client-side biasa, karena dari
    // sudut pandang browser toh sama-sama "URL berubah".
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    await expect(page.getByText('Beranda')).toBeVisible()
  })
})
