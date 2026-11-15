import { useState } from 'react'
import { rupiah } from '../lib/format'
import { cx } from './ui'

/** Angka ringkas untuk sumbu: 500rb, 1jt, 1,5jt. */
export function rupiahSingkat(n) {
  if (!n) return '0'
  if (n >= 1e6) {
    const v = n / 1e6
    return `${Number.isInteger(v) ? v : v.toFixed(1).replace('.', ',')}jt`
  }
  if (n >= 1e3) return `${Math.round(n / 1e3)}rb`
  return String(n)
}

/** Kelipatan "bulat" untuk garis bantu: 1, 2, 2.5, 5 × 10^k. */
function langkahBulat(maks, jumlahGaris = 4) {
  const kasar = maks / jumlahGaris
  const pangkat = 10 ** Math.floor(Math.log10(kasar))
  const n = kasar / pangkat
  const pengali = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return pengali * pangkat
}

/**
 * Grafik batang per bulan, satu seri. Satu batang disorot (bulan aktif / yang disentuh),
 * sisanya abu-abu. Nilai batang yang disorot tampil sebagai label di atasnya;
 * semua nilai juga ada di tabel (bisa dibuka) supaya tidak bergantung pada hover.
 */
export function BarBulanan({ data, aktif, judul, className, isi = false }) {
  const [pilih, setPilih] = useState(null)
  const [tabel, setTabel] = useState(false)
  const sorot = pilih ?? aktif ?? data[data.length - 1]?.key
  const maks = Math.max(0, ...data.map((d) => d.nilai))
  const langkah = maks > 0 ? langkahBulat(maks) : 1
  const atas = maks > 0 ? Math.ceil(maks / langkah) * langkah : 4
  const garis = []
  for (let v = 0; v <= atas + 1e-6; v += langkah) garis.push(v)

  if (!data.length) return null

  return (
    <div className={cx('flex flex-col', className)}>
      <div className={cx('mt-10 flex gap-2', isi && 'min-h-44 flex-1 sm:min-h-52')} onMouseLeave={() => setPilih(null)}>
        {/* Sumbu Y */}
        <div className={cx('relative w-9 shrink-0', isi ? 'h-auto' : 'h-44 sm:h-52')}>
          {garis.map((v) => (
            <span
              key={v}
              className="tabular absolute right-0 translate-y-1/2 text-[11px] text-zinc-400 dark:text-zinc-500"
              style={{ bottom: `${(v / atas) * 100}%` }}
            >
              {rupiahSingkat(v)}
            </span>
          ))}
        </div>
        {/* Area plot */}
        <div className={cx('relative flex-1', isi ? 'h-auto' : 'h-44 sm:h-52')}>
          {garis.map((v) => (
            <div key={v} className="absolute inset-x-0 border-t border-zinc-200/80 dark:border-white/[0.07]" style={{ bottom: `${(v / atas) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex">
            {data.map((d) => {
              const tinggi = atas ? (d.nilai / atas) * 100 : 0
              const aktifIni = d.key === sorot
              return (
                <button
                  key={d.key}
                  type="button"
                  aria-label={`${d.labelPanjang || d.label}: ${rupiah(d.nilai)}`}
                  aria-pressed={aktifIni}
                  onMouseEnter={() => setPilih(d.key)}
                  onFocus={() => setPilih(d.key)}
                  onClick={() => setPilih(d.key)}
                  className="group relative flex h-full flex-1 items-end justify-center outline-none"
                >
                  {aktifIni && (
                    <span
                      className="tabular pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-white shadow-md dark:bg-white dark:text-ink"
                      style={{ bottom: `calc(${tinggi}% + 8px)` }}
                    >
                      {rupiah(d.nilai)}
                    </span>
                  )}
                  <span
                    className={cx(
                      'w-6 rounded-t transition-[height,background-color] duration-300 group-focus-visible:ring-2 group-focus-visible:ring-brand-500',
                      aktifIni ? 'bg-brand-400 dark:bg-lav-300' : 'bg-[#e2e2de] group-hover:bg-zinc-300 dark:bg-lav-700 dark:group-hover:bg-lav-500',
                    )}
                    style={{ height: `${Math.max(tinggi, d.nilai > 0 ? 1.5 : 0)}%` }}
                  />
                </button>
              )
            })}
          </div>
        </div>
      </div>
      {/* Sumbu X */}
      <div className="mt-2 flex gap-2">
        <div className="w-9 shrink-0" />
        <div className="flex flex-1">
          {data.map((d) => (
            <span
              key={d.key}
              className={cx(
                'flex-1 text-center text-xs',
                d.key === sorot ? 'font-semibold text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500',
              )}
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setTabel((v) => !v)}
        className="mt-3 self-end text-xs font-semibold text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
        aria-expanded={tabel}
      >
        {tabel ? 'Sembunyikan tabel' : 'Lihat tabel'}
      </button>
      {tabel && (
        <table className="tabular mt-2 w-full text-sm">
          <caption className="sr-only">{judul}</caption>
          <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.06]">
            {data.map((d) => (
              <tr key={d.key}>
                <th scope="row" className="py-1.5 text-left font-normal text-zinc-500 dark:text-zinc-400">
                  {d.labelPanjang || d.label}
                </th>
                {d.sub && <td className="py-1.5 text-center text-xs text-zinc-500 dark:text-zinc-400">{d.sub}</td>}
                <td className="py-1.5 text-right font-semibold">{rupiah(d.nilai)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

/**
 * Donut bagian-dari-keseluruhan (maks 6 segmen, warna kategori tetap per kategori).
 * Legenda selalu tampil dengan nama, nominal & persen, jadi identitas tidak hanya dari warna.
 */
export function Donut({ items, total, labelTengah = 'Total', bawahTengah }) {
  const [aktif, setAktif] = useState(null)
  const r = 46
  const C = 2 * Math.PI * r
  const celah = items.filter((i) => i.nilai > 0).length > 1 ? 2.2 : 0
  let offset = 0
  const segmen = items
    .filter((i) => i.nilai > 0)
    .map((i) => {
      const panjang = (i.nilai / total) * C
      const s = { ...i, dash: Math.max(0, panjang - celah), offset }
      offset += panjang
      return s
    })
  const dipilih = items.find((i) => i.id === aktif)

  return (
    <div className="@container">
    <div className="flex flex-col items-center gap-5 @lg:flex-row">
      <div className="relative size-44 shrink-0">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" role="img" aria-label={`${labelTengah} ${rupiah(total)}`}>
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="13" className="stroke-zinc-100 dark:stroke-white/[0.06]" />
          {segmen.map((s) => (
            <circle
              key={s.id}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={s.warna}
              strokeWidth={aktif === s.id ? 15 : 13}
              strokeDasharray={`${s.dash} ${C - s.dash}`}
              strokeDashoffset={-s.offset}
              className="cursor-pointer transition-[stroke-width,opacity] duration-200"
              style={{ opacity: aktif && aktif !== s.id ? 0.35 : 1 }}
              onMouseEnter={() => setAktif(s.id)}
              onMouseLeave={() => setAktif(null)}
              onClick={() => setAktif((a) => (a === s.id ? null : s.id))}
            >
              <title>{`${s.label}: ${rupiah(s.nilai)} (${Math.round((s.nilai / total) * 100)}%)`}</title>
            </circle>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{dipilih ? dipilih.label : labelTengah}</span>
          <span className="text-xl font-semibold tracking-tight">{rupiah(dipilih ? dipilih.nilai : total)}</span>
          {!dipilih && bawahTengah}
          {dipilih && <span className="text-xs font-semibold text-zinc-500">{Math.round((dipilih.nilai / total) * 100)}%</span>}
        </div>
      </div>
      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-3">
        {items.map((i) => {
          const pct = total ? Math.round((i.nilai / total) * 100) : 0
          return (
            <li
              key={i.id}
              className={cx('flex cursor-default gap-2 transition-opacity', aktif && aktif !== i.id && 'opacity-40')}
              onMouseEnter={() => i.nilai > 0 && setAktif(i.id)}
              onMouseLeave={() => setAktif(null)}
            >
              <span className="mt-1 h-7 w-1 shrink-0 rounded-full" style={{ background: i.warna }} />
              <span className="min-w-0">
                <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{i.label}</span>
                <span className="tabular block text-sm font-semibold whitespace-nowrap">
                  {pct}% <span className="font-normal text-zinc-500 dark:text-zinc-400">· {rupiahSingkat(i.nilai)}</span>
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
    </div>
  )
}
