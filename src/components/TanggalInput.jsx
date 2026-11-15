import { addDays } from '../lib/dates'
import { cx, inputCls } from './ui'

/** Pilihan cepat "Hari ini" / "Kemarin" plus kalender bawaan HP. */
export default function TanggalInput({ value, onChange, today, max }) {
  const kemarin = addDays(today, -1)
  const chip = (aktif) =>
    cx(
      'h-12 shrink-0 rounded-full px-4 text-sm font-semibold transition',
      aktif ? 'bg-brand-300 text-ink' : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
    )
  return (
    <div className="flex gap-2">
      <button type="button" className={chip(value === today)} onClick={() => onChange(today)}>
        Hari ini
      </button>
      <button type="button" className={chip(value === kemarin)} onClick={() => onChange(kemarin)}>
        Kemarin
      </button>
      <input
        type="date"
        aria-label="Tanggal"
        className={cx(inputCls, 'min-w-0 flex-1 px-3')}
        value={value}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
      />
    </div>
  )
}
