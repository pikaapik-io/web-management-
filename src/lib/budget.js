import { KEBUTUHAN_POKOK } from './constants'
import { addDays, addMonths, dateInMonth, diffDays, monthKey, startOfWeek } from './dates'
import { lunasPada, lunasSebelum, pembayaran, semuaJadwal } from './loans'

const jumlah = (arr, f = (x) => x.nominal) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0)

/**
 * Periode anggaran yang memuat hari D: dari pemasukan rutin terakhir (≤ D)
 * sampai pemasukan rutin berikutnya (> D). Tanpa pemasukan rutin, periodenya per bulan kalender.
 */
export function periode(D, recurringIncomes = []) {
  const mk = monthKey(D)
  const rutin = recurringIncomes.filter((r) => r.tanggalTiapBulan >= 1)
  if (!rutin.length) {
    return { mulai: `${mk}-01`, berikut: `${addMonths(mk, 1)}-01`, sumber: null }
  }
  let mulai = null
  let berikut = null
  let sumber = null
  for (const r of rutin) {
    for (const off of [-1, 0, 1]) {
      const t = dateInMonth(addMonths(mk, off), r.tanggalTiapBulan)
      if (t <= D && (!mulai || t > mulai)) mulai = t
      if (t > D && (!berikut || t < berikut)) {
        berikut = t
        sumber = r
      }
    }
  }
  return { mulai, berikut, sumber }
}

/**
 * Hitung anggaran untuk hari D.
 *
 * Jatah harian dihitung dari kondisi di AWAL hari D (pemasukan hari D ikut dihitung),
 * supaya angkanya stabil sepanjang hari: "Hari ini Rp45.000 dari jatah Rp60.000".
 * Pengeluaran hari ini baru memengaruhi jatah besok.
 *
 * Uang yang dikunci:
 *  - cicilan yang jatuh tempo sebelum pemasukan berikutnya dan belum dibayar (termasuk yang telat)
 *  - kebutuhan pokok, dikurangi pengeluaran kategori "Kebutuhan Pokok" di periode ini
 */
export function hitungAnggaran(data, D) {
  const { incomes = [], expenses = [], loans = [], recurringIncomes = [], fixedNeeds = [] } = data
  const p = periode(D, recurringIncomes)
  const sisaHari = Math.max(1, diffDays(p.berikut, D))
  const hariTerakhir = addDays(p.berikut, -1)

  const bayar = pembayaran(loans)
  const pemasukan = jumlah(incomes.filter((i) => i.tanggal <= D))
  const keluarSebelum = jumlah(expenses.filter((e) => e.tanggal < D))
  const keluarHariIniList = expenses.filter((e) => e.tanggal === D)
  const keluarHariIni = jumlah(keluarHariIniList)
  const bayarSebelum = jumlah(bayar.filter((b) => b.tanggalBayar < D))
  const bayarHariIni = jumlah(bayar.filter((b) => b.tanggalBayar === D))

  const uangAwalHari = pemasukan - keluarSebelum - bayarSebelum
  const uangSekarang = uangAwalHari - keluarHariIni - bayarHariIni

  // Cicilan yang harus disiapkan sebelum pemasukan berikutnya
  const jadwalPeriode = semuaJadwal(loans).filter((i) => i.due < p.berikut)
  const kunciCicilanAwal = jumlah(jadwalPeriode.filter((i) => !lunasSebelum(i, D)))
  const cicilanDikunci = jadwalPeriode.filter((i) => !lunasPada(i, D)).sort((a, b) => a.due.localeCompare(b.due))
  const kunciCicilan = jumlah(cicilanDikunci)

  // Kebutuhan pokok
  const totalPokok = jumlah(fixedNeeds)
  const pokokDiPeriode = expenses.filter((e) => e.kategori === KEBUTUHAN_POKOK && e.tanggal >= p.mulai)
  const pokokSebelum = jumlah(pokokDiPeriode.filter((e) => e.tanggal < D))
  const pokokHariIni = jumlah(keluarHariIniList.filter((e) => e.kategori === KEBUTUHAN_POKOK))
  const kunciPokokAwal = Math.max(0, totalPokok - pokokSebelum)
  const kunciPokok = Math.max(0, kunciPokokAwal - pokokHariIni)
  // Bagian pengeluaran pokok hari ini yang ditanggung dana pokok tidak memotong jatah harian
  const pokokDitanggung = Math.min(pokokHariIni, kunciPokokAwal)

  const bebasAwal = uangAwalHari - kunciCicilanAwal - kunciPokokAwal
  const jatah = bebasAwal > 0 ? Math.floor(bebasAwal / sisaHari) : 0
  const terpakai = keluarHariIni - pokokDitanggung
  const sisaJatah = jatah - terpakai

  const bebas = uangSekarang - kunciCicilan - kunciPokok
  const jatahBesok = sisaHari > 1 ? Math.max(0, Math.floor(bebas / (sisaHari - 1))) : null
  const kurangCicilan = Math.max(0, kunciCicilan - uangSekarang)
  const kurangPokok = kurangCicilan > 0 ? 0 : Math.max(0, kunciCicilan + kunciPokok - uangSekarang)

  return {
    periode: p,
    sisaHari,
    hariTerakhir,
    uangAwalHari,
    uangSekarang,
    bebasAwal,
    bebas,
    kunciCicilan,
    cicilanDikunci,
    kunciPokok,
    totalPokok,
    pokokDitanggung,
    jatah,
    terpakai,
    sisaJatah,
    jatahBesok,
    kurangCicilan,
    kurangPokok,
  }
}

/** Jatah harian rata-rata kalau ada pengeluaran tambahan sebesar `harga` di periode ini. */
export function jatahSetelahBeli(anggaran, harga) {
  const sisa = anggaran.bebasAwal - harga
  return sisa > 0 ? Math.floor(sisa / anggaran.sisaHari) : 0
}

/** Pengeluaran per kategori dalam minggu (Senin–Minggu) yang memuat D. */
export function pemakaianMingguan(expenses, kategori, D) {
  const mulai = startOfWeek(D)
  const akhir = addDays(mulai, 6)
  return jumlah(expenses.filter((e) => e.kategori === kategori && e.tanggal >= mulai && e.tanggal <= akhir))
}

/** Status budget kategori: aman | hampir (≥80%) | lewat (>100%). */
export function statusBudget(terpakai, batas) {
  if (!batas) return null
  const rasio = terpakai / batas
  return {
    rasio,
    sisa: batas - terpakai,
    kode: rasio > 1 ? 'lewat' : rasio >= 0.8 ? 'hampir' : 'aman',
  }
}

/** Total butuh vs pengen di rentang [mulai, akhir]. */
export function butuhVsPengen(expenses, mulai, akhir) {
  const list = expenses.filter((e) => e.tanggal >= mulai && e.tanggal <= akhir)
  return {
    butuh: jumlah(list.filter((e) => e.jenis !== 'pengen')),
    pengen: jumlah(list.filter((e) => e.jenis === 'pengen')),
  }
}

export { jumlah }
