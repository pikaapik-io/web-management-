import { diffDays, parseYMD } from './dates'

export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
export const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
export const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

/** 1250000 -> "1.250.000" */
export function ribuan(n) {
  return String(Math.abs(Math.round(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** 1250000 -> "Rp1.250.000", -5000 -> "-Rp5.000" */
export function rupiah(n) {
  const v = Math.round(n || 0)
  return `${v < 0 ? '-' : ''}Rp${ribuan(v)}`
}

/** Ambil angka dari teks input ("Rp1.250.000" -> 1250000). */
export function parseAngka(s) {
  const digits = String(s ?? '').replace(/\D/g, '')
  return digits ? Number(digits) : 0
}

/**
 * Format tanggal Indonesia.
 * tanggal('2026-12-01') -> "1 Desember 2026"
 * tanggal('2026-12-01', { pendek: true, tahun: false }) -> "1 Des"
 * tanggal('2026-12-01', { hari: true }) -> "Selasa, 1 Desember 2026"
 */
export function tanggal(s, { pendek = false, tahun = true, hari = false } = {}) {
  if (!s) return ''
  const d = parseYMD(s)
  const bulan = (pendek ? BULAN_PENDEK : BULAN)[d.getMonth()]
  let out = `${d.getDate()} ${bulan}${tahun ? ` ${d.getFullYear()}` : ''}`
  if (hari) out = `${(pendek ? HARI_PENDEK : HARI)[d.getDay()]}, ${out}`
  return out
}

/** "2026-12" -> "Desember 2026" */
export function namaBulan(mk, { pendek = false } = {}) {
  const [y, m] = mk.split('-').map(Number)
  return `${(pendek ? BULAN_PENDEK : BULAN)[m - 1]} ${y}`
}

/** Teks hitung mundur dari jumlah hari. */
export function hitungMundur(hari) {
  if (hari === 0) return 'Hari ini'
  if (hari === 1) return 'Besok'
  if (hari > 1) return `${hari} hari lagi`
  return `Telat ${-hari} hari`
}

/** Label relatif untuk sebuah tanggal dibanding hari ini. */
export function labelHari(s, today) {
  const n = diffDays(s, today)
  if (n === 0) return 'Hari ini'
  if (n === -1) return 'Kemarin'
  if (n === 1) return 'Besok'
  return tanggal(s, { hari: true, pendek: true, tahun: false })
}

export function persen(x) {
  if (!Number.isFinite(x)) return '0%'
  return `${Math.round(x)}%`
}
