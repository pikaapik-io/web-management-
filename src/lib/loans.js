import { addMonths, dateInMonth, diffDays, monthKey } from './dates'

/*
 * Model cicilan:
 *  - mulaiBulan   : bulan cicilan ke-1 ("YYYY-MM")
 *  - tenorTotal   : jumlah cicilan
 *  - tenorTerbayar: cicilan ke-1..tenorTerbayar dianggap sudah lunas
 *  - riwayatBayar : [{ bulan, tanggalBayar, nominal }] untuk pembayaran yang dicatat lewat aplikasi.
 *    Cicilan yang lunas tapi tidak ada di riwayat = dibayar sebelum pakai aplikasi (tidak memengaruhi saldo).
 */

/** Daftar semua cicilan (per bulan) untuk satu pinjaman. */
export function jadwal(loan) {
  const riwayat = loan.riwayatBayar || []
  const out = []
  for (let i = 0; i < loan.tenorTotal; i++) {
    const bulan = addMonths(loan.mulaiBulan, i)
    const paid = i < loan.tenorTerbayar
    out.push({
      loanId: loan.id,
      nama: loan.nama,
      ke: i + 1,
      bulan,
      due: dateInMonth(bulan, loan.tanggalJatuhTempo),
      nominal: loan.nominalPerBulan,
      paid,
      payment: paid ? riwayat.find((r) => r.bulan === bulan) || null : null,
    })
  }
  return out
}

export const semuaJadwal = (loans) => loans.flatMap(jadwal)

/** Sudah lunas sebelum hari D dimulai? */
export const lunasSebelum = (inst, D) => inst.paid && (!inst.payment || inst.payment.tanggalBayar < D)
/** Sudah lunas sampai akhir hari D? */
export const lunasPada = (inst, D) => inst.paid && (!inst.payment || inst.payment.tanggalBayar <= D)

export function cicilanBerikutnya(loan) {
  return jadwal(loan).find((i) => !i.paid) || null
}

/** Semua cicilan yang belum dibayar, urut dari jatuh tempo terdekat. */
export function belumDibayar(loans) {
  return semuaJadwal(loans)
    .filter((i) => !i.paid)
    .sort((a, b) => a.due.localeCompare(b.due) || a.loanId - b.loanId)
}

/**
 * Status satu pinjaman relatif ke hari ini.
 * kode: lunas | telat | dekat (≤3 hari) | sudah (lunas bulan ini) | belum
 */
export function statusCicilan(loan, today) {
  const list = jadwal(loan)
  const next = list.find((i) => !i.paid)
  if (!next) return { kode: 'lunas', label: 'Lunas 🎉', next: null, hari: null }
  const hari = diffDays(next.due, today)
  if (hari < 0) return { kode: 'telat', label: `Telat ${-hari} hari`, next, hari }
  if (hari <= 3) {
    const label = hari === 0 ? 'Jatuh tempo hari ini' : hari === 1 ? 'Jatuh tempo besok' : `Jatuh tempo ${hari} hari lagi`
    return { kode: 'dekat', label, next, hari }
  }
  const bulanIni = monthKey(today)
  if (list.some((i) => i.paid && i.bulan === bulanIni)) {
    return { kode: 'sudah', label: 'Lunas bulan ini', next, hari }
  }
  return { kode: 'belum', label: 'Belum bayar', next, hari }
}

export function ringkasanUtang(loans) {
  let total = 0
  let dibayar = 0
  let lunasBulan = null
  for (const l of loans) {
    const terbayar = Math.min(l.tenorTerbayar, l.tenorTotal)
    total += l.nominalPerBulan * l.tenorTotal
    dibayar += l.nominalPerBulan * terbayar
    if (terbayar < l.tenorTotal) {
      const akhir = addMonths(l.mulaiBulan, l.tenorTotal - 1)
      if (!lunasBulan || akhir > lunasBulan) lunasBulan = akhir
    }
  }
  return {
    total,
    dibayar,
    sisa: total - dibayar,
    persen: total ? (dibayar / total) * 100 : 100,
    lunasBulan,
    aktif: loans.filter((l) => l.tenorTerbayar < l.tenorTotal).length,
  }
}

/** Rekap per bulan: [{ bulan, jumlah, total, jumlahDibayar, dibayar }] */
export function rekapPerBulan(loans) {
  const map = new Map()
  for (const i of semuaJadwal(loans)) {
    const m = map.get(i.bulan) || { bulan: i.bulan, jumlah: 0, total: 0, jumlahDibayar: 0, dibayar: 0 }
    m.jumlah++
    m.total += i.nominal
    if (i.paid) {
      m.jumlahDibayar++
      m.dibayar += i.nominal
    }
    map.set(i.bulan, m)
  }
  return [...map.values()].sort((a, b) => a.bulan.localeCompare(b.bulan))
}

/** Rekap bulan ini; kalau bulan ini tidak ada cicilan, pakai bulan berikutnya yang ada cicilannya. */
export function rekapBulanAktif(loans, today) {
  const rekap = rekapPerBulan(loans)
  const bulanIni = monthKey(today)
  return rekap.find((r) => r.bulan === bulanIni) || rekap.find((r) => r.bulan > bulanIni) || null
}

/** Semua pembayaran yang tercatat: [{ loanId, bulan, tanggalBayar, nominal }] */
export function pembayaran(loans) {
  return loans.flatMap((l) => (l.riwayatBayar || []).map((r) => ({ ...r, loanId: l.id, nama: l.nama })))
}

/** Tandai cicilan berikutnya sudah dibayar. */
export function tandaiBayar(loan, { tanggalBayar, nominal }) {
  const next = cicilanBerikutnya(loan)
  if (!next) return loan
  const riwayat = (loan.riwayatBayar || []).filter((r) => r.bulan !== next.bulan)
  return {
    ...loan,
    tenorTerbayar: loan.tenorTerbayar + 1,
    riwayatBayar: [...riwayat, { bulan: next.bulan, tanggalBayar, nominal }],
  }
}

/** Batalkan tanda bayar untuk cicilan terakhir yang lunas. */
export function batalBayarTerakhir(loan) {
  if (loan.tenorTerbayar <= 0) return loan
  const bulan = addMonths(loan.mulaiBulan, loan.tenorTerbayar - 1)
  return {
    ...loan,
    tenorTerbayar: loan.tenorTerbayar - 1,
    riwayatBayar: (loan.riwayatBayar || []).filter((r) => r.bulan !== bulan),
  }
}

/** Buang riwayat yang tidak lagi cocok (misal setelah tenor/bulan mulai diedit). */
export function rapikanRiwayat(loan) {
  const lunas = new Set()
  for (let i = 0; i < Math.min(loan.tenorTerbayar, loan.tenorTotal); i++) lunas.add(addMonths(loan.mulaiBulan, i))
  return { ...loan, riwayatBayar: (loan.riwayatBayar || []).filter((r) => lunas.has(r.bulan)) }
}
