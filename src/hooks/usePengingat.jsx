import { useMemo } from 'react'
import { Button } from '../components/ui'
import { useApp } from '../context'
import { jumlah, pemakaianMingguan, statusBudget } from '../lib/budget'
import { kategoriInfo } from '../lib/constants'
import { addDays, addMonths, dateInMonth, diffDays, monthKey, toHM } from '../lib/dates'
import { rupiah, tanggal } from '../lib/format'
import { belumDibayar } from '../lib/loans'

export const namaSingkat = (items) =>
  items.length <= 2 ? items.map((i) => i.nama).join(' & ') : `${items[0].nama} + ${items.length - 1} lainnya`

/** Semua pengingat yang sedang aktif (dipakai banner Beranda & angka di ikon lonceng). */
export function usePengingat() {
  const { data, today, now, goTo, buka, setSetting } = useApp()
  const s = data.settings
  return useMemo(() => {
    const out = []
    const tutup = (key) => setSetting(key, true)

    // 1. Jatuh tempo: telat, hari H, H-1 ... H-3
    const perTanggal = new Map()
    for (const i of belumDibayar(data.loans)) {
      const hari = diffDays(i.due, today)
      if (hari > 3) break
      const key = hari < 0 ? 'telat' : i.due
      if (!perTanggal.has(key)) perTanggal.set(key, { hari, items: [] })
      perTanggal.get(key).items.push(i)
    }
    for (const [key, { hari, items }] of perTanggal) {
      const total = jumlah(items)
      const bayar = (
        <Button size="sm" variant={hari < 0 ? 'danger' : 'primary'} onClick={() => goTo('cicilan')}>
          Lihat & bayar
        </Button>
      )
      if (key === 'telat') {
        out.push({
          id: 'telat',
          tone: 'danger',
          icon: '🔴',
          title: `${items.length} cicilan telat (${rupiah(total)})`,
          body: `${namaSingkat(items)}. Yuk bayar secepatnya biar dendanya nggak nambah. Kamu pasti bisa!`,
          actions: bayar,
        })
      } else {
        const kapan = hari === 0 ? 'Hari ini' : hari === 1 ? 'Besok' : `${hari} hari lagi`
        out.push({
          id: key,
          tone: hari <= 1 ? 'warn' : 'info',
          icon: hari === 0 ? '⏰' : '🔔',
          title: `${kapan} jatuh tempo: ${rupiah(total)}`,
          body: namaSingkat(items),
          actions: bayar,
        })
      }
    }

    // 2. Pemasukan rutin: "Sudah terima gaji?"
    for (const r of data.recurringIncomes) {
      let occ = dateInMonth(monthKey(today), r.tanggalTiapBulan)
      if (occ > today) occ = dateInMonth(addMonths(monthKey(today), -1), r.tanggalTiapBulan)
      if (diffDays(today, occ) > 7) continue
      const key = `tutup:pemasukan:${r.id}:${occ}:${today}`
      const sudah = data.incomes.some(
        (i) => (i.recurringId === r.id || i.sumber === r.sumber) && i.tanggal >= addDays(occ, -5) && i.tanggal <= today,
      )
      if (sudah || s[key]) continue
      out.push({
        id: `rutin-${r.id}`,
        tone: 'ok',
        icon: '💰',
        title: `Sudah terima ${r.nama}? Catat sekarang`,
        body: r.perkiraanNominal ? `Perkiraan ${rupiah(r.perkiraanNominal)}, tanggal ${tanggal(occ, { pendek: true, tahun: false })}.` : null,
        actions: (
          <>
            <Button
              size="sm"
              onClick={() =>
                buka.pemasukan({ nominal: r.perkiraanNominal, sumber: r.sumber, catatan: r.nama, recurringId: r.id, tanggal: today })
              }
            >
              Catat
            </Button>
            <Button size="sm" variant="ghost" onClick={() => tutup(key)}>
              Belum, nanti
            </Button>
          </>
        ),
      })
    }

    // 3. Wishlist yang sudah lewat masa tunggu
    const tunggu = Number(s.wishlistTunggu) || 0
    const siap = data.wishlist.filter((w) => w.status === 'menunggu' && addDays(w.tanggalDitambah, tunggu) <= today)
    if (siap.length) {
      out.push({
        id: 'wishlist',
        tone: 'info',
        icon: '🤔',
        title: `${siap.length} barang di wishlist udah lewat masa tunggu`,
        body: 'Masih butuh, atau udah nggak kepikiran?',
        actions: (
          <Button size="sm" variant="secondary" onClick={() => goTo('wishlist')}>
            Cek wishlist
          </Button>
        ),
      })
    }

    // 4. Budget kategori ≥ 80%
    for (const b of data.categoryBudgets) {
      const st = statusBudget(pemakaianMingguan(data.expenses, b.kategori, today), b.batasMingguan)
      if (!st || st.kode === 'aman') continue
      out.push({
        id: `budget-${b.kategori}`,
        tone: st.kode === 'lewat' ? 'danger' : 'warn',
        icon: kategoriInfo(b.kategori).emoji,
        title:
          st.kode === 'lewat'
            ? `Budget ${b.kategori} minggu ini lewat ${rupiah(-st.sisa)}`
            : `Budget ${b.kategori} minggu ini tinggal ${rupiah(st.sisa)}`,
        body: st.kode === 'lewat' ? 'Gapapa, sisa minggu ini kita rem dulu ya 🙏' : `Udah kepakai ${Math.round(st.rasio * 100)}%. Pelan-pelan ya ☝️`,
      })
    }

    // 5. Pengingat malam
    const kunciMalam = `tutup:malam:${today}`
    if (toHM(now) >= (s.jamPengingat || '21:00') && !s[kunciMalam] && !data.expenses.some((e) => e.tanggal === today)) {
      out.push({
        id: 'malam',
        tone: 'info',
        icon: '📝',
        title: 'Udah catat pengeluaran hari ini?',
        actions: (
          <>
            <Button size="sm" onClick={() => buka.pengeluaran()}>
              Catat
            </Button>
            <Button size="sm" variant="ghost" onClick={() => tutup(kunciMalam)}>
              Hari ini nggak jajan 😎
            </Button>
          </>
        ),
      })
    }
    return out
  }, [data, today, now, goTo, buka, s, setSetting])
}
