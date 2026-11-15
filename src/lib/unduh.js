import { buatICS } from './ics'

export function unduhFile(namaFile, isi, tipe) {
  const blob = new Blob([isi], { type: tipe })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaFile
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Unduh jadwal cicilan .ics. Mengembalikan jumlah acara (0 kalau tidak ada yang perlu diekspor). */
export function unduhICS(loans, today) {
  const { isi, jumlahAcara } = buatICS(loans, today)
  if (jumlahAcara) unduhFile(`jadwal-cicilan-${today}.ics`, isi, 'text/calendar;charset=utf-8')
  return jumlahAcara
}
