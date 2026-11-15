import { CalendarDays, Download, Minus, Plus, Smartphone, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { hapusPokok, hapusRutin, simpanBudget, simpanPokok, simpanRutin } from '../actions'
import { Banner, Button, Card, CardTitle, Field, inputCls, MoneyInput, NumberInput, PilihanGrid, Row, Segmented, Sheet } from '../components/ui'
import { useApp } from '../context'
import { eksporData, imporData } from '../db'
import { jumlah } from '../lib/budget'
import { KATEGORI, SUMBER, sumberInfo } from '../lib/constants'
import { diffDays, toYMD } from '../lib/dates'
import { parseAngka, ribuan, rupiah, tanggal } from '../lib/format'
import { unduhFile, unduhICS } from '../lib/unduh'

export default function Pengaturan() {
  const { data, today, toast, setSetting } = useApp()
  const s = data.settings
  const [sheet, setSheet] = useState(null) // { jenis: 'rutin' | 'pokok', item? }
  const fileRef = useRef(null)
  const promptPasang = usePromptPasang()

  const ekspor = async () => {
    const json = await eksporData()
    unduhFile(`management-money-backup-${today}.json`, JSON.stringify(json, null, 2), 'application/json')
    await setSetting('backupTerakhir', today)
    toast('Backup diunduh 💾 Simpan file-nya di Google Drive atau kirim ke chat sendiri biar aman')
  }

  const impor = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const json = JSON.parse(await file.text())
      const tgl = json?.dibuat ? tanggal(toYMD(new Date(json.dibuat))) : 'tanggal tidak diketahui'
      if (!confirm(`Pulihkan backup dari ${tgl}?\n\nSemua data di HP ini akan DIGANTI dengan isi file backup.`)) return
      await imporData(json)
      toast('Data berhasil dipulihkan ✅')
    } catch (err) {
      alert(`Gagal impor: ${err.message || 'file tidak bisa dibaca'}`)
    }
  }

  const eksporKalender = () => {
    const n = unduhICS(data.loans, today)
    toast(n ? `File kalender diunduh (${n} jadwal) 📅` : 'Tidak ada jadwal cicilan ke depan')
  }

  const totalPokok = jumlah(data.fixedNeeds)
  const tunggu = Number(s.wishlistTunggu) || 0
  const hariSejakBackup = s.backupTerakhir ? diffDays(today, s.backupTerakhir) : null

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight lg:text-4xl">Pengaturan</h1>
      </header>

      {promptPasang && (
        <Banner
          tone="ok"
          icon={<Smartphone size={20} />}
          title="Pasang di layar utama"
          actions={
            <Button size="sm" onClick={() => promptPasang.prompt()}>
              Pasang aplikasi
            </Button>
          }
        >
          Biar bisa dibuka kayak aplikasi biasa, termasuk saat offline.
        </Banner>
      )}

      <div className="space-y-4 lg:columns-2 lg:gap-5 lg:space-y-0 [&>*]:break-inside-avoid lg:[&>*]:mb-5">
      {/* Profil & tampilan */}
      <Card>
        <CardTitle>Profil & tampilan</CardTitle>
        <div className="space-y-4">
          <NamaInput nilai={s.nama || ''} onSimpan={(v) => setSetting('nama', v)} />
          <Field grup label="Tema">
            <Segmented
              options={[
                { value: 'sistem', label: '📱 Ikut HP' },
                { value: 'terang', label: '☀️ Terang' },
                { value: 'gelap', label: '🌙 Gelap' },
              ]}
              value={s.tema || 'sistem'}
              onChange={(v) => setSetting('tema', v)}
            />
          </Field>
        </div>
      </Card>

      {/* Pemasukan rutin */}
      <Card>
        <CardTitle
          right={
            <Button size="sm" variant="soft" onClick={() => setSheet({ jenis: 'rutin' })}>
              <Plus size={16} /> Tambah
            </Button>
          }
        >
          Pemasukan rutin
        </CardTitle>
        {data.recurringIncomes.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Belum ada. Tambahkan misalnya "Gaji tiap tgl 25" supaya jatah harian dihitung sampai gajian berikutnya dan ada pengingat
            "Sudah terima gaji?". Tanpa ini, jatah dihitung sampai akhir bulan.
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.recurringIncomes.map((r) => (
              <Row
                key={r.id}
                left={sumberInfo(r.sumber).emoji}
                title={r.nama}
                subtitle={`Tiap tgl ${r.tanggalTiapBulan}${r.perkiraanNominal ? ` · ±${rupiah(r.perkiraanNominal)}` : ''}`}
                onClick={() => setSheet({ jenis: 'rutin', item: r })}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Kebutuhan pokok */}
      <Card>
        <CardTitle
          right={
            <Button size="sm" variant="soft" onClick={() => setSheet({ jenis: 'pokok' })}>
              <Plus size={16} /> Tambah
            </Button>
          }
        >
          Kebutuhan pokok
        </CardTitle>
        <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
          Uang yang disisihkan tiap periode (kos, transport, pulsa, dll). Catat pembayarannya dengan kategori "Kebutuhan Pokok" supaya
          tidak memotong jatah harian.
        </p>
        {data.fixedNeeds.length > 0 && (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.fixedNeeds.map((p) => (
              <Row
                key={p.id}
                left="🧺"
                title={p.nama}
                right={<span className="tabular font-semibold">{rupiah(p.nominal)}</span>}
                onClick={() => setSheet({ jenis: 'pokok', item: p })}
              />
            ))}
            <div className="tabular flex justify-between pt-2.5 text-sm font-semibold">
              <span>Total</span>
              <span>{rupiah(totalPokok)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Budget kategori */}
      <Card>
        <CardTitle>Batas mingguan per kategori</CardTitle>
        <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
          Kosongkan kalau tidak mau dibatasi. Kamu akan diingatkan saat sudah 80% dan saat lewat batas.
        </p>
        <div className="space-y-2">
          {KATEGORI.map((k) => (
            <BudgetRow
              key={k.id}
              kategori={k}
              batas={data.categoryBudgets.find((b) => b.kategori === k.id)?.batasMingguan || 0}
              onSimpan={async (v) => {
                await simpanBudget(k.id, v)
                toast(v ? `Batas ${k.id}: ${rupiah(v)}/minggu ✅` : `Batas ${k.id} dihapus`)
              }}
            />
          ))}
        </div>
      </Card>

      {/* Pengingat */}
      <Card>
        <CardTitle>Pengingat</CardTitle>
        <div className="space-y-4">
          <Field label="Pengingat malam catat pengeluaran" hint="Muncul di aplikasi setelah jam ini kalau hari ini belum ada catatan.">
            <input
              type="time"
              className={inputCls}
              value={s.jamPengingat || '21:00'}
              onChange={(e) => e.target.value && setSetting('jamPengingat', e.target.value)}
            />
          </Field>
          <div>
            <p className="mb-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400">Masa tunggu wishlist</p>
            <div className="flex items-center gap-3">
              <Button variant="secondary" aria-label="Kurangi" onClick={() => setSetting('wishlistTunggu', Math.max(1, tunggu - 1))}>
                <Minus size={18} />
              </Button>
              <span className="tabular flex-1 text-center text-lg font-semibold">{tunggu} hari</span>
              <Button variant="secondary" aria-label="Tambah" onClick={() => setSetting('wishlistTunggu', Math.min(30, tunggu + 1))}>
                <Plus size={18} />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Kalender */}
      <Card>
        <CardTitle>Pengingat di kalender HP</CardTitle>
        <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
          Aplikasi ini tidak bisa kirim notifikasi saat ditutup. Supaya tetap diingatkan, ekspor jadwal cicilan ke kalender (pengingat
          H-3 dan H-1, jam 09.00).
        </p>
        <Button variant="secondary" className="w-full" onClick={eksporKalender}>
          <CalendarDays size={18} /> Ekspor jadwal (.ics)
        </Button>
        <details className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          <summary className="cursor-pointer font-semibold text-zinc-700 dark:text-zinc-300">Cara impor ke Google Calendar</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Ketuk tombol di atas, file .ics akan terunduh.</li>
            <li>Buka file-nya dari notifikasi unduhan. Kalau muncul pilihan aplikasi, pilih Kalender.</li>
            <li>
              Kalau tidak bisa dibuka langsung: buka <b>calendar.google.com</b> di browser (mode desktop) → Setelan → Impor & ekspor →
              pilih file .ics-nya.
            </li>
            <li>Kalau notifikasinya tidak muncul, atur notifikasi default di setelan kalender tersebut.</li>
            <li>Setelah menambah/mengubah cicilan, ekspor ulang supaya jadwalnya ikut baru.</li>
          </ol>
        </details>
      </Card>

      {/* Backup */}
      <Card>
        <CardTitle>Backup data</CardTitle>
        {hariSejakBackup == null || hariSejakBackup > 14 ? (
          <Banner tone="warn" icon="💾" title={hariSejakBackup == null ? 'Belum pernah backup' : `Backup terakhir ${hariSejakBackup} hari lalu`}>
            Data cuma tersimpan di HP ini. Kalau cache browser terhapus atau ganti HP, data bisa hilang.
          </Banner>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Backup terakhir: {tanggal(s.backupTerakhir)} ✅</p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={ekspor}>
            <Download size={18} /> Ekspor
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={18} /> Impor
          </Button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={impor} />
      </Card>

      </div>

      <p className="pb-2 text-center text-xs text-zinc-400">
        Management Money v1.0 · Semua data tersimpan di HP ini, tanpa server.
        <br />
        Mulai dipakai {tanggal(s.mulaiPakai)}
      </p>

      {sheet?.jenis === 'rutin' && <RutinSheet item={sheet.item} onClose={() => setSheet(null)} />}
      {sheet?.jenis === 'pokok' && <PokokSheet item={sheet.item} onClose={() => setSheet(null)} />}
    </div>
  )
}

/** Tangkap event "beforeinstallprompt" supaya bisa tampilkan tombol pasang sendiri. */
function usePromptPasang() {
  const [prompt, setPrompt] = useState(() => window.__promptPasang || null)
  useEffect(() => {
    const ada = () => setPrompt(window.__promptPasang || null)
    const terpasang = () => setPrompt(null)
    window.addEventListener('bisa-pasang', ada)
    window.addEventListener('appinstalled', terpasang)
    return () => {
      window.removeEventListener('bisa-pasang', ada)
      window.removeEventListener('appinstalled', terpasang)
    }
  }, [])
  return prompt
}

function NamaInput({ nilai, onSimpan }) {
  const [nama, setNama] = useState(nilai)
  useEffect(() => setNama(nilai), [nilai])
  return (
    <Field label="Nama panggilan" hint="Dipakai di sapaan Beranda, misal “Selamat pagi, Rina”.">
      <input
        className={inputCls}
        value={nama}
        maxLength={24}
        placeholder="Misal: Rina"
        onChange={(e) => setNama(e.target.value)}
        onBlur={() => nama.trim() !== nilai && onSimpan(nama.trim())}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </Field>
  )
}

function BudgetRow({ kategori, batas, onSimpan }) {
  const [nilai, setNilai] = useState(batas)
  useEffect(() => setNilai(batas), [batas])
  const simpan = () => nilai !== batas && onSimpan(nilai)
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 text-center text-lg">{kategori.emoji}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{kategori.id}</span>
      <div className="flex h-11 w-36 items-center gap-1 rounded-xl bg-zinc-100 px-3 focus-within:ring-2 focus-within:ring-brand-500 dark:bg-zinc-800">
        <span className="text-sm text-zinc-400">Rp</span>
        <input
          inputMode="numeric"
          aria-label={`Batas mingguan ${kategori.id}`}
          className="tabular w-full min-w-0 bg-transparent text-right font-semibold outline-none placeholder:font-normal placeholder:text-zinc-400"
          placeholder="Tanpa batas"
          value={nilai ? ribuan(nilai) : ''}
          onChange={(e) => setNilai(parseAngka(e.target.value))}
          onBlur={simpan}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </div>
    </div>
  )
}

function RutinSheet({ item, onClose }) {
  const { toast } = useApp()
  const [nama, setNama] = useState(item?.nama || 'Gaji')
  const [sumber, setSumber] = useState(item?.sumber || 'Gaji')
  const [nominal, setNominal] = useState(item?.perkiraanNominal || 0)
  const [tgl, setTgl] = useState(item?.tanggalTiapBulan || '')
  const [error, setError] = useState('')

  const simpan = async () => {
    if (!nama.trim()) return setError('Kasih nama dulu, misal "Gaji"')
    if (!(tgl >= 1 && tgl <= 31)) return setError('Tanggal harus 1–31')
    await simpanRutin({ ...(item || {}), nama: nama.trim(), sumber, perkiraanNominal: nominal, tanggalTiapBulan: tgl })
    onClose()
    toast('Pemasukan rutin disimpan ✅')
  }
  const hapus = async () => {
    if (!confirm(`Hapus pemasukan rutin "${item.nama}"?`)) return
    await hapusRutin(item.id)
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={item ? 'Ubah pemasukan rutin' : 'Tambah pemasukan rutin'}
      footer={
        <div className="flex gap-2">
          {item && (
            <Button variant="dangerSoft" onClick={hapus} aria-label="Hapus">
              <Trash2 size={18} />
            </Button>
          )}
          <Button className="flex-1" size="lg" onClick={simpan}>
            Simpan
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Nama">
          <input className={inputCls} value={nama} onChange={(e) => (setNama(e.target.value), setError(''))} />
        </Field>
        <Field grup label="Sumber">
          <PilihanGrid items={SUMBER} value={sumber} onChange={setSumber} />
        </Field>
        <Field label="Perkiraan nominal" hint="Nanti tetap dikonfirmasi saat dicatat, karena nominalnya bisa beda.">
          <MoneyInput value={nominal} onChange={setNominal} />
        </Field>
        <Field label="Tanggal tiap bulan" hint="Tgl 29–31 otomatis geser ke akhir bulan kalau bulannya pendek.">
          <NumberInput value={tgl} onChange={(v) => (setTgl(v), setError(''))} min={1} max={31} placeholder="Misal: 25" />
        </Field>
        {error && <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    </Sheet>
  )
}

function PokokSheet({ item, onClose }) {
  const { toast } = useApp()
  const [nama, setNama] = useState(item?.nama || '')
  const [nominal, setNominal] = useState(item?.nominal || 0)
  const [error, setError] = useState('')

  const simpan = async () => {
    if (!nama.trim()) return setError('Kasih nama dulu, misal "Kos"')
    if (!nominal) return setError('Isi nominalnya')
    await simpanPokok({ ...(item || {}), nama: nama.trim(), nominal })
    onClose()
    toast('Kebutuhan pokok disimpan ✅')
  }
  const hapus = async () => {
    if (!confirm(`Hapus "${item.nama}"?`)) return
    await hapusPokok(item.id)
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={item ? 'Ubah kebutuhan pokok' : 'Tambah kebutuhan pokok'}
      footer={
        <div className="flex gap-2">
          {item && (
            <Button variant="dangerSoft" onClick={hapus} aria-label="Hapus">
              <Trash2 size={18} />
            </Button>
          )}
          <Button className="flex-1" size="lg" onClick={simpan}>
            Simpan
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Nama">
          <input className={inputCls} value={nama} autoFocus={!item} onChange={(e) => (setNama(e.target.value), setError(''))} placeholder="Misal: Kos" />
        </Field>
        <Field label="Nominal per periode">
          <MoneyInput value={nominal} onChange={(v) => (setNominal(v), setError(''))} />
        </Field>
        {error && <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    </Sheet>
  )
}
