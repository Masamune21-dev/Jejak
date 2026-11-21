# Replica: audit paritas Jejak vs Strava

Folder ini **bukan bagian aplikasi**. Isinya alat bantu untuk mengukur dan
memprioritaskan pengembangan Jejak. Yang diambil dari Strava hanya fitur dan
alurnya, bukan kode, merek, teks, atau asetnya.

## Status awal (22 November 2026)

| Ukuran | Hasil |
| --- | --- |
| Fitur Strava yang dinilai | 84 |
| Skor paritas fitur | **62,1 / 100** |
| Must-have selesai | **31 / 31** |
| Ulasan Strava terkumpul | **1.177 unik** (App Store US/GB/ID, 2017–2026) |
| Ulasan 1–3 bintang | 672 |
| Ekstra Jejak (tidak dinilai) | Postingan, pesan langsung, diskusi segmen, simulasi GPS |

Artinya: **alur inti sudah setara Strava**. Semua yang wajib untuk sekadar
"bisa dipakai seperti Strava" sudah ada. Celahnya ada di ekosistem dan
kedalaman: perangkat (0%), keamanan (0%), latihan (8%), motivasi (13%),
notifikasi (43%), privasi (50%), platform (54%).

## Isi folder

| Berkas | Isi |
| --- | --- |
| `features.csv` | Matrix fitur. Satu baris per fitur Strava, dengan status Jejak: `yes`, `partial`, `no`, atau `skip`. |
| `parity.md` | Laporan skor dan daftar celah, dibuat ulang dari `features.csv`. |
| `reviews.csv` | 1.200 ulasan App Store (1.177 unik), dengan sumber, tanggal, rating, dan teks asli. |
| `themes-strava.json` | Tema keluhan khusus Strava, termasuk pola bahasa Indonesia. |
| `feedback.md` | Hasil `reviews.py`: tema berperingkat, kutipan berlink, permintaan pengguna. |
| `fixes.md` | Tiga daftar, rencana perbaikan 8 item, dan tiga opsi positioning. |

## Cara menghitung ulang

Dari akar repo:

```bash
python3 .claude/skills/replica-diff/parity.py replica/features.csv
python3 .claude/skills/replica-diff/parity.py replica/features.csv --markdown > replica/parity.md
```

Setiap kali sebuah fitur selesai, ubah kolom `clone` di `features.csv` dari
`no`/`partial` menjadi `yes`, lalu jalankan ulang. Jangan mengubah kolom
`priority` hanya supaya skornya naik.

Untuk menjalankan ulang riset ulasan:

```bash
python3 .claude/skills/replica-entrepreneur/reviews.py replica/reviews.csv \
  --themes replica/themes-strava.json --out replica/feedback.md
```

Sumber ulasan saat ini adalah feed RSS resmi Apple untuk tiga toko (US, GB, ID).
Apple tidak memberi tautan permanen per ulasan, jadi kolom `url` menuju halaman
ulasan aplikasi di toko yang sama. Tambahkan Google Play dan Reddit sebelum
mengambil keputusan produk yang besar.

## Cara membaca prioritas

- **must** — tanpa ini, pengguna Strava akan langsung merasa ada yang hilang.
- **should** — bikin pengguna betah; kebanyakan celah Jejak ada di sini.
- **could** — pemanis; kerjakan setelah must dan should beres.
- **skip** — sengaja tidak dikerjakan, dengan alasan di kolom `notes`.

## Langkah berikutnya yang disarankan

1. Baca `replica/fixes.md`. Pilih 1–2 perbaikan, mulai dari antrean unggah
   otomatis dan hapus/ekspor akun.
2. Tambahkan perbaikan terpilih ke `features.csv` sebagai baris baru dengan
   `original=no`, supaya tidak mengubah skor paritas.
3. Perbarui `docs/ide-fitur.md` dengan bukti dan kutipan dari `fixes.md`.
4. Tambahkan ulasan Google Play dan Reddit sebelum mengambil keputusan besar.
   Sampel sekarang hanya App Store.
5. Sebelum rilis, jalankan pemeriksaan merek:

   ```bash
   python3 .claude/skills/replica-brand/sweep.py app/src --avoid "Strava" --domains "strava.com"
   ```

## Hasil pemeriksaan merek

Per 22 November 2026, `sweep.py` menemukan **0 sisa merek** di `app/src`.
Empat komentar kode yang sebelumnya menyebut Strava sudah diganti dengan
istilah netral ("stiker transparan gaya aplikasi olahraga"). Nama Strava masih
muncul di `docs/` dan `replica/` sebagai bahan riset, bukan teks yang tampil
di aplikasi.

## Batas yang perlu dijaga

- **Jangan mengejar kemiripan visual.** Skor paritas mengukur fungsi, bukan
  layout. Jejak sudah punya identitas sendiri (aspal + marka kuning).
  `imgdiff.py` tidak dipakai untuk menandingkan layar Strava.
- **Jangan kloning data jaringan Strava.** Segmen, klub, tantangan, dan peta
  panas global adalah datanya, bukan fiturnya. Jejak memakai segmen sendiri.
- **Jangan klaim afiliasi.** Jangan pakai nama, logo, atau warna Strava di
  aplikasi, toko, atau iklan.
- **Cek ulang baris yang berubah.** Beberapa baris bertanda "Perlu verifikasi"
  karena fitur Strava bisa berubah atau dibatasi.
