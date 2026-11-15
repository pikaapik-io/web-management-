import { rupiah } from './format'
import { belumDibayar } from './loans'

const esc = (s) =>
  String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// Baris iCalendar maksimal 75 byte; sisanya dilipat dengan spasi di awal baris berikutnya.
function lipat(baris) {
  const enc = new TextEncoder()
  const out = []
  let cur = ''
  let bytes = 0
  for (const ch of baris) {
    const b = enc.encode(ch).length
    if (bytes + b > 75) {
      out.push(cur)
      cur = ` ${ch}`
      bytes = 1 + b
    } else {
      cur += ch
      bytes += b
    }
  }
  out.push(cur)
  return out.join('\r\n')
}

const tgl = (ymd) => ymd.replace(/-/g, '')

function stempelUTC(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
}

/**
 * Buat file .ics berisi jadwal cicilan yang belum dibayar (mulai hari ini).
 * Cicilan di tanggal yang sama digabung jadi satu acara jam 09.00,
 * dengan pengingat H-3 dan H-1.
 */
export function buatICS(loans, today, now = new Date()) {
  const perTanggal = new Map()
  for (const i of belumDibayar(loans)) {
    if (i.due < today) continue
    if (!perTanggal.has(i.due)) perTanggal.set(i.due, [])
    perTanggal.get(i.due).push(i)
  }

  const L = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Management Money//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Management Money',
  ]
  const stamp = stempelUTC(now)

  for (const [due, items] of perTanggal) {
    const total = items.reduce((s, i) => s + i.nominal, 0)
    const nama = items.map((i) => i.nama).join(', ')
    const rincian = items.map((i) => `- ${i.nama}: ${rupiah(i.nominal)} (cicilan ke-${i.ke})`).join('\n')
    L.push(
      'BEGIN:VEVENT',
      `UID:cicilan-${tgl(due)}@cicilan-hemat`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${tgl(due)}T090000`,
      `DTEND:${tgl(due)}T091500`,
      `SUMMARY:${esc(`Bayar cicilan ${rupiah(total)} (${nama})`)}`,
      `DESCRIPTION:${esc(`Jatuh tempo hari ini:\n${rincian}\n\nJangan lupa tandai "Sudah bayar" di aplikasi Management Money.`)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(`3 hari lagi bayar cicilan ${rupiah(total)}`)}`,
      'TRIGGER:-P3D',
      'END:VALARM',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(`Besok bayar cicilan ${rupiah(total)}`)}`,
      'TRIGGER:-P1D',
      'END:VALARM',
      'END:VEVENT',
    )
  }
  L.push('END:VCALENDAR')
  return { isi: L.map(lipat).join('\r\n') + '\r\n', jumlahAcara: perTanggal.size }
}
