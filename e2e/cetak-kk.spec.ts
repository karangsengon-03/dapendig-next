import { test, expect } from '@playwright/test'

test.describe('Cetak KK Sementara — Tanggal Cetak bisa diubah (fitur v2.7.2)', () => {
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

  test('input tanggal cetak default ke hari ini dan bisa diubah manual', async ({ page }) => {
    await page.goto('/penduduk')
    // Buka detail penduduk pertama di tabel, lalu buka modal Cetak KK
    await page.locator('table tbody tr').first().click()
    await page.getByRole('button', { name: /cetak kk sementara/i }).click()

    const inputTanggal = page.locator('#tgl-cetak-kk')
    await expect(inputTanggal).toBeVisible()

    const hariIni = new Date().toISOString().slice(0, 10)
    await expect(inputTanggal).toHaveValue(hariIni)

    // Ubah ke tanggal lain — verifikasi input menerima perubahan
    await inputTanggal.fill('2026-01-15')
    await expect(inputTanggal).toHaveValue('2026-01-15')
  })

  test('klik Unduh PDF A4 memicu event download sungguhan', async ({ page }) => {
    await page.goto('/penduduk')
    await page.locator('table tbody tr').first().click()
    await page.getByRole('button', { name: /cetak kk sementara/i }).click()

    // Playwright waitForEvent('download') menangkap download NYATA dari
    // browser — ini yang tidak mungkin diverifikasi lewat unit test karena
    // seluruh alurnya (window.open + document.write + html2canvas + jsPDF
    // + pdf.save) murni efek samping browser, bukan return value function.
    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
    await page.getByRole('button', { name: /unduh pdf a4/i }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/^KK_Sementara_.*\.pdf$/)
  })
})
