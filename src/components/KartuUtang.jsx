import { namaBulan, rupiah } from '../lib/format'
import { cx } from './ui'

/**
 * Ringkasan utang dalam bentuk "kartu bank":
 * hitam + cahaya lime di mode terang, gradasi lavender di mode gelap.
 */
export default function KartuUtang({ utang, className }) {
  const persen = Math.floor(utang.persen)
  return (
    <div
      className={cx(
        'relative isolate overflow-hidden rounded-[1.5rem] p-5 text-white',
        'bg-[linear-gradient(135deg,#1c2017_0%,#0c0e0a_100%)]',
        'dark:bg-[linear-gradient(135deg,#6f60d6_0%,#a493ff_55%,#d9cfff_100%)] dark:text-ink',
        className,
      )}
    >
      <div className="absolute -right-12 -bottom-20 -z-10 size-60 rounded-full bg-brand-300/45 blur-3xl dark:bg-white/40" />
      <div className="absolute -top-16 -left-10 -z-10 size-40 rounded-full bg-brand-300/10 blur-2xl dark:bg-lav-200/40" />

      <div className="flex items-start justify-between">
        <svg viewBox="0 0 40 30" className="h-7 w-9 opacity-90" aria-hidden="true">
          <rect x="1" y="1" width="38" height="28" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M1 11h12M27 11h12M1 19h12M27 19h12M13 1v28M27 1v28" stroke="currentColor" strokeWidth="1.6" fill="none" />
        </svg>
        <span className="text-lg font-bold tracking-tight italic">SPinjam</span>
      </div>

      <p className="mt-5 text-xs opacity-70">Sisa utang</p>
      <p className="text-3xl font-medium tracking-tight">{rupiah(utang.sisa)}</p>
      <p className="mt-1 font-mono text-sm tracking-[0.2em] opacity-80">
        •••• •••• <span className="tracking-normal">Lunas {persen}%</span>
      </p>

      <div className="mt-5 flex items-end justify-between text-xs">
        <div>
          <p className="opacity-60">Cicilan aktif</p>
          <p className="text-sm font-semibold">{utang.aktif}</p>
        </div>
        <div className="text-right">
          <p className="opacity-60">Target lunas</p>
          <p className="text-sm font-semibold">{utang.lunasBulan ? namaBulan(utang.lunasBulan) : 'Lunas! 🎉'}</p>
        </div>
      </div>
    </div>
  )
}
