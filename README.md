# Management Money

Aplikasi pribadi (PWA) untuk melacak cicilan dan menahan belanja impulsif. Semua data tersimpan di HP (IndexedDB), tanpa server dan tanpa login.

Dibuat dengan React + Vite + Tailwind CSS + Dexie.js + vite-plugin-pwa.

## Fitur

**Tahap 1 (MVP)**
- **Cicilan**: tambah, ubah, dan hapus cicilan; tombol "Sudah bayar" (tanggal dan nominal bisa diubah, misalnya kalau kena denda); status otomatis (belum bayar, ≤ 3 hari (kuning), telat (merah), lunas bulan ini); sisa utang dan perkiraan lunas; rekap per bulan. Pertama kali dibuka, aplikasi langsung berisi 26 cicilan SPinjam dari brief.
- **Beranda**: cicilan terdekat dengan hitung mundur, jatah aman hari ini, tombol **"Mau beli sesuatu?"**, cicilan bulan ini, progres utang, streak, dan uang yang berhasil diselamatkan.
- **Catat**: pemasukan dan pengeluaran (nominal → kategori → simpan), label Butuh/Pengen, rekap harian ("Hari ini Rp45.000 dari jatah Rp60.000 ✅"), geser ke hari sebelumnya, kalender kecil berwarna, ringkasan Butuh vs Pengen per minggu/bulan, dan riwayat pemasukan per bulan.
- **Jatah harian**: uang untuk cicilan yang jatuh tempo sebelum pemasukan berikutnya otomatis dikunci, begitu juga kebutuhan pokok. Sisanya dibagi rata sampai pemasukan berikutnya, dan muncul peringatan kalau uang tidak cukup untuk cicilan.
- **Backup**: ekspor dan impor JSON.

**Tahap 2**
- **Wishlist** dengan masa tunggu (bawaan 3 hari, bisa diatur), lalu pertanyaan "Masih butuh?".
- **Batas mingguan per kategori**, dengan peringatan di 80% dan saat lewat batas.
- **Streak hari hemat** dan **total uang diselamatkan**.
- **Ekspor jadwal ke kalender (.ics)** dengan pengingat H-3 dan H-1.
- Pengingat di dalam aplikasi: banner H-3/H-1/hari H/telat, "Sudah terima gaji?", dan pengingat malam untuk mencatat pengeluaran.
- Mode terang/gelap, tombol kembali di Android menutup sheet, dan tombol "Pasang aplikasi".

**Tampilan**
- Di laptop, Beranda tampil sebagai dashboard multi-kolom: grafik batang cicilan, pengeluaran, dan pemasukan per bulan; donut pengeluaran per kategori; dan kartu utang bergaya kartu bank. Di HP, tampilannya satu kolom dengan navigasi bawah.
- Mode terang berwarna abu-abu muda dengan aksen hijau lime, sedangkan mode gelap berwarna biru-gelap dengan kartu utama bergradasi dan grafik berwarna lavender. Mode bisa diatur di Pengaturan (Ikut HP / Terang / Gelap), dan nama panggilan dipakai di sapaan.
- Warna kategori di donut sudah dicek supaya tetap bisa dibedakan oleh orang buta warna. Setiap grafik juga punya tabel/legenda berisi angka, jadi pembacaannya tidak bergantung pada warna saja.

Belum dibuat (Tahap 3): APK Capacitor untuk notifikasi terjadwal. Grafik bulanan sudah ada di Beranda.

## Menjalankan di laptop

Butuh Node.js 20 atau lebih baru.

```bash
npm install
npm run dev
```

Buka alamat yang muncul (misalnya `http://localhost:5173`). Karena `--host` aktif, HP yang tersambung ke Wi-Fi yang sama juga bisa membuka alamat "Network" yang muncul, misalnya `http://192.168.1.5:5173`. Catatan: fitur PWA (pasang dan offline) baru aktif lewat HTTPS, jadi untuk dipasang di HP, deploy dulu (lihat di bawah).

Perintah lain:

```bash
npm test          # unit test logika hitungan (termasuk cek total per bulan dari brief)
npm run build     # build produksi ke folder dist/
npm run preview   # coba hasil build secara lokal
```

## Deploy gratis supaya bisa dipasang di HP

### Pilihan 1: Vercel (paling gampang)
1. Push folder ini ke repo GitHub (boleh private).
2. Masuk ke https://vercel.com dengan akun GitHub → **Add New → Project** → pilih repo ini.
3. Vercel otomatis mendeteksi Vite (Build: `npm run build`, Output: `dist`). Klik **Deploy**.
4. Kamu akan dapat alamat seperti `https://management-money-xxx.vercel.app`.

Tanpa GitHub juga bisa: `npx vercel` di folder ini, lalu ikuti langkahnya.

### Pilihan 2: Netlify
Sama seperti Vercel: **Add new site → Import from Git** → Build command `npm run build`, publish directory `dist`.
Atau jalankan `npm run build`, lalu seret folder `dist/` ke https://app.netlify.com/drop.

### Pilihan 3: GitHub Pages
Karena alamatnya ada sub-folder (`https://username.github.io/nama-repo/`), build dengan:

```bash
BASE_PATH=/nama-repo/ npm run build
```

lalu upload isi `dist/` ke GitHub Pages.

### Pasang di Android
1. Buka alamat hasil deploy di **Chrome** Android.
2. Menu ⋮ → **Tambahkan ke layar utama / Instal aplikasi** (atau lewat tombol "Pasang aplikasi" di menu Pengaturan).
3. Setelah itu aplikasi bisa dibuka dari ikon di layar utama, termasuk saat offline.

## Penting soal data

- Data hanya ada di HP/browser tempat aplikasi dibuka. Data di laptop dan di HP **terpisah**.
- **Rutin backup** (Pengaturan → Backup data → Ekspor) lalu simpan file-nya di Google Drive atau kirim ke chat sendiri. Kalau ganti HP atau cache terhapus, pulihkan dengan Impor.
- Jangan "Hapus data situs" di Chrome untuk alamat aplikasi ini, karena semua data akan ikut terhapus.

## Cara hitung (singkatnya)

- **Periode** = dari pemasukan rutin terakhir sampai pemasukan rutin berikutnya (misal gaji tgl 25). Kalau belum ada pemasukan rutin, periodenya per bulan kalender.
- **Uang sekarang** = semua pemasukan − pengeluaran − cicilan yang ditandai dibayar lewat aplikasi.
- **Dikunci** = cicilan yang jatuh tempo sebelum pemasukan berikutnya dan belum dibayar (termasuk yang telat), ditambah kebutuhan pokok yang belum terpakai di periode ini.
- **Jatah hari ini** = (uang di awal hari − dikunci) ÷ sisa hari. Angkanya tetap sepanjang hari. Pengeluaran hari ini baru memengaruhi jatah besok.
- Pengeluaran kategori **Kebutuhan Pokok** diambil dari dana pokok dulu, jadi tidak memotong jatah harian.
- Jatuh tempo tgl 29–31 digeser ke tanggal terakhir di bulan yang lebih pendek.

## Asumsi data awal

- Tiap SPinjam dicatat dengan "cicilan ke-1" = Desember 2026, total tenor = sisa bayar di brief, dan 0 yang sudah dibayar. Akibatnya progres utang dimulai dari 0%. Kalau mau progres dari tenor aslinya, ubah per cicilan (Cicilan → ketuk nama → Ubah): isi total tenor asli, jumlah yang sudah dibayar, dan bulan cicilan pertama yang asli.
- Saat pertama kali dipakai, catat uang yang kamu pegang sebagai pemasukan "Saldo awal" supaya jatah harian benar.

## Struktur folder

```
src/
  lib/          logika murni (tanggal, format Rupiah, cicilan, anggaran, streak, .ics) + test
  components/   komponen UI & sheet (catat, mau beli, bayar cicilan, kalender kecil)
  pages/        Beranda, Cicilan, Catat, Wishlist, Pengaturan
  db.js         skema IndexedDB (Dexie), data awal, backup
  actions.js    semua operasi simpan/hapus
public/         ikon PWA (dibuat dari public/logo.svg)
```
