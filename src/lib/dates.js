// Semua tanggal disimpan sebagai string lokal "YYYY-MM-DD", bulan sebagai "YYYY-MM".
// Perbandingan string-nya otomatis urut secara kronologis.

const pad = (n) => String(n).padStart(2, '0')

export function toYMD(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseYMD(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const utc = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Selisih hari a - b (positif kalau a setelah b). */
export function diffDays(a, b) {
  return Math.round((utc(a) - utc(b)) / 86400000)
}

export function addDays(s, n) {
  const d = parseYMD(s)
  d.setDate(d.getDate() + n)
  return toYMD(d)
}

export const monthKey = (s) => s.slice(0, 7)

export function addMonths(mk, n) {
  const [y, m] = mk.split('-').map(Number)
  const t = y * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`
}

/** Jumlah hari dalam bulan "YYYY-MM". */
export function daysInMonth(mk) {
  const [y, m] = mk.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/**
 * Tanggal ke-`day` di bulan `mk`. Kalau bulannya lebih pendek (misal tgl 31 di Februari),
 * digeser ke tanggal terakhir bulan itu.
 */
export function dateInMonth(mk, day) {
  return `${mk}-${pad(Math.min(day, daysInMonth(mk)))}`
}

/** Senin di minggu yang sama. */
export function startOfWeek(s) {
  const dow = (parseYMD(s).getDay() + 6) % 7 // Senin = 0
  return addDays(s, -dow)
}

export function startOfMonth(s) {
  return `${monthKey(s)}-01`
}

export function endOfMonth(s) {
  const mk = monthKey(s)
  return `${mk}-${pad(daysInMonth(mk))}`
}

/** "HH:MM" dari Date. */
export function toHM(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
