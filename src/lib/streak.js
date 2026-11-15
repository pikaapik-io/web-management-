import { addDays } from './dates'

/**
 * Streak hari hemat: hari tanpa pengeluaran berjenis "pengen".
 * Dihitung dari tanggal mulai pakai aplikasi sampai hari ini (hari ini ikut dihitung
 * selama belum ada pengeluaran "pengen").
 */
export function hitungStreak(expenses, mulaiPakai, today) {
  const hariPengen = new Set(expenses.filter((e) => e.jenis === 'pengen').map((e) => e.tanggal))
  let mulai = mulaiPakai || today
  if (mulai > today) mulai = today
  let jalan = 0
  let terbaik = 0
  for (let d = mulai; d <= today; d = addDays(d, 1)) {
    if (hariPengen.has(d)) jalan = 0
    else terbaik = Math.max(terbaik, ++jalan)
  }
  return { sekarang: jalan, terbaik, hariIniPengen: hariPengen.has(today) }
}
