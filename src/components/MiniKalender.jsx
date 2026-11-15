import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { hitungAnggaran } from '../lib/budget'
import { addMonths, daysInMonth, monthKey, parseYMD } from '../lib/dates'
import { HARI_PENDEK, namaBulan } from '../lib/format'
import { cx } from './ui'

const URUTAN_HARI = [1, 2, 3, 4, 5, 6, 0] // Senin dulu

/**
 * Kalender kecil: hijau = di bawah jatah, merah = lewat jatah.
 */
export default function MiniKalender({ data, today, bulan, onBulan, dipilih, onPilih }) {
  const mulaiPakai = data.settings.mulaiPakai || today
  const hari = useMemo(() => {
    const n = daysInMonth(bulan)
    const pertama = parseYMD(`${bulan}-01`).getDay()
    const offset = (pertama + 6) % 7
    const out = Array.from({ length: offset }, () => null)
    const adaPengeluaran = new Set(data.expenses.map((e) => e.tanggal))
    for (let d = 1; d <= n; d++) {
      const tgl = `${bulan}-${String(d).padStart(2, '0')}`
      let status = null
      if (tgl <= today && (tgl >= mulaiPakai || adaPengeluaran.has(tgl))) {
        const a = hitungAnggaran(data, tgl)
        status = a.terpakai > a.jatah ? 'lewat' : 'aman'
        if (tgl === today && status === 'aman' && !adaPengeluaran.has(tgl)) status = 'hariIni'
      }
      out.push({ tgl, d, status })
    }
    return out
  }, [data, today, bulan, mulaiPakai])

  const bisaMaju = bulan < monthKey(today)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Bulan sebelumnya" className="grid size-9 place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => onBulan(addMonths(bulan, -1))}>
          <ChevronLeft size={20} />
        </button>
        <p className="font-semibold">{namaBulan(bulan)}</p>
        <button
          type="button"
          aria-label="Bulan berikutnya"
          disabled={!bisaMaju}
          className="grid size-9 place-items-center rounded-full hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
          onClick={() => onBulan(addMonths(bulan, 1))}
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {URUTAN_HARI.map((h) => (
          <div key={h} className="pb-1 text-[11px] font-semibold text-zinc-400">
            {HARI_PENDEK[h]}
          </div>
        ))}
        {hari.map((h, i) =>
          h ? (
            <button
              key={h.tgl}
              type="button"
              disabled={h.tgl > today}
              onClick={() => onPilih(h.tgl)}
              aria-label={`${h.d} ${namaBulan(bulan)}${h.status === 'lewat' ? ', lewat jatah' : h.status === 'aman' ? ', di bawah jatah' : ''}`}
              aria-pressed={dipilih === h.tgl}
              className={cx(
                'tabular aspect-square rounded-xl text-sm font-semibold transition disabled:opacity-30 lg:aspect-auto lg:h-10',
                h.status === 'lewat' && 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
                (h.status === 'aman' || h.status === 'hariIni') && 'bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200',
                !h.status && 'text-zinc-500 dark:text-zinc-400',
                dipilih === h.tgl && 'ring-2 ring-zinc-900 dark:ring-white',
                h.tgl === today && 'underline decoration-2 underline-offset-2',
              )}
            >
              {h.d}
            </button>
          ) : (
            <div key={`k${i}`} />
          ),
        )}
      </div>
      <div className="mt-2 flex justify-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-brand-200 dark:bg-brand-800" /> Di bawah jatah
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-rose-200 dark:bg-rose-800" /> Lewat jatah
        </span>
      </div>
    </div>
  )
}
