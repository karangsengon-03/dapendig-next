import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast: () => {} }) }))
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (q: string) => ({ matches: q.includes('min-width'), media: q, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }),
})

import { CetakKKModal } from '@/components/penduduk/CetakKKModal'
import type { Penduduk } from '@/types'

const WILAYAH = { desa: 'Karang Sengon', kecamatan: 'Klabang', kabupaten: 'Bondowoso', provinsi: 'Jawa Timur', kode_pos: '68282', nama_kades: 'Sutrisno' } as never

let nomor = 0
function p(o: Partial<Penduduk>): Penduduk {
  nomor++
  return {
    id: 'x' + nomor, nama_lengkap: 'Budi', nik: String(3511140109480000 + nomor), no_kk: '3511030000001826', jenis_kelamin: 'Laki-laki', agama: 'Islam',
    hubungan_keluarga: 'Kepala Keluarga', nama_ayah: 'AYAH-' + nomor, nama_ibu: 'IBU-' + nomor, pendidikan: 'SMA/Sederajat', pekerjaan: 'Petani/Pekebun',
    rt: '003', rw: '001', status: 'aktif', status_perkawinan: 'Kawin', tanggal_lahir: '1985-04-10', tempat_lahir: 'JEMBER',
    alamat: 'DUSUN PESANGGRAHAN', golongan_darah: 'O', ...o,
  } as Penduduk
}

/** Klik "Unduh PDF A4" dan tangkap HTML yang ditulis ke jendela cetak (jalur yang sama dengan pengguna). */
function ambilHtml(anggota: Penduduk[], wilayah: unknown = WILAYAH, noKk = '3511030000001826'): string {
  const tulis = vi.fn()
  vi.spyOn(window, 'open').mockReturnValue({ document: { open: vi.fn(), write: tulis, close: vi.fn() } } as never)
  render(<CetakKKModal noKk={noKk} anggota={anggota} wilayah={wilayah as never} onClose={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /Unduh PDF A4/ }))
  expect(tulis).toHaveBeenCalledTimes(1)
  return String(tulis.mock.calls[0][0])
}
const barisDengan = (html: string, kunci: string) => html.split('<tr class="dr">').find((b) => b.includes(kunci)) ?? ''
const rtRwTercetak = (html: string) => /RT\/RW<\/span><span class="ic">:<\/span><span class="iv">([^<]*)<\/span>/.exec(html)?.[1]

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('Cetak KK (HTML yang dicetak) — RT/RW 3 digit', () => {
  it('RT/RW data lama ("3", "1") dicetak 003/001', () => {
    expect(rtRwTercetak(ambilHtml([p({ rt: '3', rw: '1' })]))).toBe('003/001')
  })
  it('"01"/"001" dan angka sama-sama 3 digit', () => {
    expect(rtRwTercetak(ambilHtml([p({ rt: '01', rw: '001' })]))).toBe('001/001')
    expect(rtRwTercetak(ambilHtml([p({ rt: 4 as never, rw: 2 as never })]))).toBe('004/002')
  })
  it('RT/RW Kepala Keluarga kosong → diambil dari anggota lain yang punya (3 digit)', () => {
    const html = ambilHtml([p({ rt: '', rw: '' }), p({ hubungan_keluarga: 'Anak', nama_lengkap: 'Anak', rt: '5', rw: '2' })])
    expect(rtRwTercetak(html)).toBe('005/002')
  })
  it('RT/RW kosong di semua anggota → "-/-"', () => {
    expect(rtRwTercetak(ambilHtml([p({ rt: '', rw: '' })]))).toBe('-/-')
  })
  it('RT saja yang kosong: hanya bagian itu yang "-"', () => {
    expect(rtRwTercetak(ambilHtml([p({ rt: '', rw: '2' })]))).toBe('-/002')
  })
})

describe('Cetak KK (HTML yang dicetak) — kolom kosong dicetak "-"', () => {
  it('alamat kosong di semua anggota → "-"', () => {
    const html = ambilHtml([p({ alamat: '' })])
    expect(html).toMatch(/Alamat<\/span><span class="ic">:<\/span><span class="iv">-<\/span>/)
  })
  it('alamat diambil dari anggota lain bila Kepala Keluarga kosong', () => {
    const html = ambilHtml([p({ alamat: '  ' }), p({ hubungan_keluarga: 'Anak', alamat: 'ALAMAT ANGGOTA' })])
    expect(html).toMatch(/Alamat<\/span><span class="ic">:<\/span><span class="iv">ALAMAT ANGGOTA<\/span>/)
  })
  it('tempat lahir, golongan darah, ayah, ibu, tanggal lahir kosong → "-" (bukan sel kosong)', () => {
    const a = p({ tempat_lahir: '', golongan_darah: '', nama_ayah: '', nama_ibu: '   ', tanggal_lahir: '' })
    const html = ambilHtml([a])
    const tabel1 = barisDengan(html, a.nik)
    expect(tabel1).toContain(`<td class="ctr">${a.nik}</td>`)
    // tempat lahir, tanggal lahir, golongan darah kosong semuanya menjadi "-"
    expect((tabel1.match(/<td>-<\/td>/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(tabel1).not.toMatch(/<td><\/td>/)
    // ayah dan ibu: baris tabel 2 untuk anggota ini (satu-satunya baris yang memuat status "Kawin")
    const tabel2 = html.split('<tr class="dr">').find((b) => b.includes('>KAWIN<') || b.includes('>Kawin<')) ?? ''
    expect(tabel2.match(/<td>-<\/td>/g)?.length ?? 0).toBeGreaterThanOrEqual(3) // kolom tetap "-", ayah "-", ibu "-"
  })
  it('data terisi dicetak apa adanya (tidak jadi "-")', () => {
    const a = p({ tempat_lahir: 'BONDOWOSO', golongan_darah: 'AB', nama_ayah: 'PAK ANDI', nama_ibu: 'BU SITI' })
    const html = ambilHtml([a])
    expect(html).toContain('BONDOWOSO')
    expect(html).toContain('PAK ANDI')
    expect(html).toContain('BU SITI')
    expect(barisDengan(html, a.nik)).toContain('<td>AB</td>')
  })
})

describe('Cetak KK (HTML yang dicetak) — keamanan dan halaman', () => {
  it('karakter HTML pada nama/alamat di-escape (tidak dieksekusi di jendela cetak)', () => {
    const html = ambilHtml([p({ nama_lengkap: '<img src=x onerror=alert(1)>', alamat: 'JL. "A" & <B>' })])
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('JL. &quot;A&quot; &amp; &lt;B&gt;')
  })
  it('nama Kepala Keluarga di kolom tanda tangan, Kepala Desa, wilayah, dan No. KK juga di-escape', () => {
    const jahat = '<script>alert(1)</script>'
    const html = ambilHtml(
      [p({ nama_lengkap: jahat })],
      { ...(WILAYAH as object), nama_kades: '<b>Kades</b>', desa: 'Desa<i>', kecamatan: 'Kec&A', kabupaten: 'Kab"B', nip_kades: '<u>1</u>' },
      '3511<x>0000001826',
    )
    // satu-satunya <script> yang boleh ada adalah skrip cetak milik aplikasi (html2canvas, jsPDF, dan pembuat PDF)
    expect(html).not.toContain(jahat)
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<b>Kades</b>')
    expect(html).toContain('&lt;b&gt;Kades&lt;/b&gt;')
    expect(html).not.toContain('Desa<i>')
    expect(html).toContain('Kec&amp;A')
    expect(html).toContain('Kab&quot;B')
    expect(html).not.toContain('3511<x>0000001826')
    expect(html).toContain('3511&lt;x&gt;0000001826')
    expect(html).toContain("KK_Sementara_3511_x_0000001826.pdf") // nama berkas aman, bukan entity HTML
  })
  it('data normal (tanpa karakter khusus) tercetak apa adanya, termasuk nama berkas PDF', () => {
    const html = ambilHtml([p({ nama_lengkap: 'SITI AMINAH' })])
    expect(html).toContain('SITI AMINAH')
    expect(html).toContain('KK_Sementara_3511030000001826.pdf')
    expect(html).toContain('<title>KK Sementara — 3511030000001826</title>')
  })
  it('sampai 10 anggota = 1 halaman; 11 anggota = 2 halaman, tanda tangan hanya di halaman terakhir', () => {
    const anggota = (n: number) => [p({}), ...Array.from({ length: n - 1 }, (_, i) => p({ hubungan_keluarga: 'Anak', nama_lengkap: 'Anak ' + (i + 1) }))]
    const satu = ambilHtml(anggota(10))
    expect((satu.match(/<div class="halaman">/g) ?? []).length).toBe(1)
    expect(satu).not.toContain('Halaman lanjutan')
    cleanup()
    const dua = ambilHtml(anggota(11))
    expect((dua.match(/<div class="halaman">/g) ?? []).length).toBe(2)
    expect((dua.match(/Halaman lanjutan/g) ?? []).length).toBe(1)
    expect((dua.match(/Dikeluarkan Tanggal/g) ?? []).length).toBe(1)
  })
  it('wilayah dan nama Kepala Desa tercetak', () => {
    const html = ambilHtml([p({})])
    expect(html).toContain('KARANG SENGON')
    expect(html).toContain('Sutrisno')
  })
})
