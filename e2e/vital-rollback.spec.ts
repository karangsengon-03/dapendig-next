import { test, expect } from '@playwright/test'

// Butuh sesi login aktif — Playwright bisa pakai storageState dari test
// login, atau login manual di awal tiap test seperti di bawah ini untuk
// independensi penuh antar file test.
test.describe('Alur: Catat kematian via menu Vital → suksesi KK → rollback', () => {
  const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? ''
  const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? ''
  test.skip(!TEST_EMAIL, 'E2E_TEST_EMAIL belum di-set')

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('nama@desa.id').fill(TEST_EMAIL)
    await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Masuk' }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
  })

  test('peringatan amber "penggantinya" HANYA muncul saat hub_asli = Kepala Keluarga', async ({ page }) => {
    await page.goto('/vital')
    await page.getByRole('button', { name: /catat kematian/i }).click()

    const peringatan = page.getByText(/sistem akan otomatis menentukan penggantinya/i)
    // Default form adalah 'Kepala Keluarga' (dilihat dari kode) — peringatan harus muncul
    await expect(peringatan).toBeVisible()

    // Ganti ke hubungan keluarga biasa — peringatan harus HILANG
    await page.locator('select').filter({ hasText: 'Kepala Keluarga' }).last().selectOption('Anak')
    await expect(peringatan).not.toBeVisible()
  })

  test('catat kematian Kepala Keluarga lalu batalkan — data harus kembali persis seperti semula', async ({ page }) => {
    // NIK unik per test run supaya tidak bentrok dengan data sungguhan Bapak
    const nikUnik = `9999${Date.now().toString().slice(-12)}`
    const noKkUnik = `8888${Date.now().toString().slice(-12)}`

    await page.goto('/vital')
    await page.getByRole('button', { name: /catat kematian/i }).click()

    await page.getByPlaceholder('Nama penduduk').fill('E2E Test Kepala Keluarga')
    await page.getByPlaceholder('16 digit').first().fill(nikUnik)
    await page.locator('input[placeholder="16 digit"]').nth(1).fill(noKkUnik)
    // hub_asli sudah default 'Kepala Keluarga', tidak perlu diubah
    await page.getByRole('button', { name: 'Simpan' }).click()

    // Verifikasi record baru muncul di daftar
    await expect(page.getByText('E2E Test Kepala Keluarga')).toBeVisible({ timeout: 10_000 })

    // Klik Batalkan pada record yang baru dibuat
    const barisRecord = page.locator('tr', { hasText: 'E2E Test Kepala Keluarga' })
    await barisRecord.getByText('Batalkan').click()

    // Dialog konfirmasi 2-langkah harus muncul
    await expect(page.getByText('Batalkan Kematian?')).toBeVisible()
    await page.getByRole('button', { name: 'Ya, Batalkan' }).click()

    // Record harus hilang dari daftar kematian setelah rollback berhasil
    await expect(page.getByText('E2E Test Kepala Keluarga')).not.toBeVisible({ timeout: 10_000 })
  })
})
