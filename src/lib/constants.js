export const KEBUTUHAN_POKOK = 'Kebutuhan Pokok'

export const KATEGORI = [
  {
    id: 'Makan',
    warna: 'var(--kat-1)',
    emoji: '🍛',
    jenis: 'butuh',
    ide: 'Masak sendiri, atau beli di warteg/warung yang lebih murah.',
  },
  {
    id: 'Kafe/Nongkrong',
    warna: 'var(--kat-2)',
    emoji: '☕',
    jenis: 'pengen',
    ide: 'Nugas di perpustakaan, kampus, atau rumah, terus bawa kopi sendiri dari rumah.',
  },
  {
    id: 'Belanja Barang',
    warna: 'var(--kat-3)',
    emoji: '🛍️',
    jenis: 'pengen',
    ide: 'Masukin wishlist dulu, tunggu beberapa hari. Kalau masih kepikiran, baru beli.',
  },
  {
    id: 'Transport',
    warna: 'var(--kat-4)',
    emoji: '🛵',
    jenis: 'butuh',
    ide: 'Bisa jalan kaki, naik angkutan umum, atau nebeng teman yang searah?',
  },
  {
    id: KEBUTUHAN_POKOK,
    warna: 'var(--kat-5)',
    emoji: '🧺',
    jenis: 'butuh',
    ide: 'Bandingin harga di toko lain, atau beli kemasan besar biar lebih awet.',
  },
  {
    id: 'Lainnya',
    warna: 'var(--kat-6)',
    emoji: '📦',
    jenis: 'butuh',
    ide: 'Tunggu sehari dulu. Kalau besok masih perlu, baru beli.',
  },
]

export const kategoriInfo = (id) => KATEGORI.find((k) => k.id === id) || KATEGORI[KATEGORI.length - 1]

export const SUMBER = [
  { id: 'Gaji', emoji: '💼' },
  { id: 'Uang Saku/Kiriman', emoji: '💌' },
  { id: 'Freelance/Sampingan', emoji: '💻' },
  { id: 'Bonus/Hadiah', emoji: '🎁' },
  { id: 'Lainnya', emoji: '➕' },
]

export const sumberInfo = (id) => SUMBER.find((s) => s.id === id) || SUMBER[SUMBER.length - 1]

export const DEFAULT_SETTINGS = {
  tema: 'sistem',
  jamPengingat: '21:00',
  wishlistTunggu: 3,
}

// Data awal cicilan dari brief (semua SPinjam, mulai bayar Desember 2026).
// [tanggal jatuh tempo, nominal per bulan, sisa bayar (termasuk Des 2026)]
const DATA_AWAL = [
  [1, 153751, 5], [1, 65893, 5], [3, 77270, 3], [3, 77270, 3], [4, 153751, 4],
  [4, 115905, 3], [4, 115905, 3], [5, 65893, 5], [7, 193176, 1], [8, 109822, 5],
  [8, 87857, 5], [8, 65893, 6], [8, 65893, 6], [9, 109822, 4], [13, 109822, 3],
  [13, 43929, 6], [15, 153751, 4], [15, 65893, 6], [17, 87863, 5], [18, 135223, 2],
  [18, 109822, 4], [20, 65897, 5], [21, 109822, 4], [26, 87857, 4], [28, 98840, 4],
  [28, 98840, 4],
]

export const SEED_LOANS = DATA_AWAL.map(([tgl, nominal, sisa], i) => ({
  nama: `SPinjam #${i + 1}`,
  nominalPerBulan: nominal,
  tanggalJatuhTempo: tgl,
  tenorTotal: sisa,
  tenorTerbayar: 0,
  mulaiBulan: '2026-12',
  catatan: '',
  riwayatBayar: [],
}))
