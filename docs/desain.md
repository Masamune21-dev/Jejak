# Desain Jejak

Dokumen ini mencatat riset UI/UX dan sistem desain Jejak. Prosesnya mengikuti skill [`frontend-design`](https://github.com/anthropics/skills/tree/main/skills/frontend-design) dari Anthropic (Apache 2.0, salinannya ada di `.claude/skills/frontend-design/`): tentukan subjek dulu, susun token, tinjau rencana terhadap pola "desain buatan AI" yang umum, baru dibangun.

## Subjek, pengguna, tugas utama

- **Subjek:** pencatat lari, gowes, dan jalan kaki untuk komunitas kecil di jalan kampung dan kota di Indonesia (mulai dari Wonogiri).
- **Pengguna:** pelari dan pesepeda rekreasi yang merekam dengan HP Android, sering pagi hari, di bawah matahari, satu tangan, tangan berkeringat.
- **Tugas utama:** merekam dengan andal, mengikuti rute tanpa tersesat, lalu membagikan hasil dengan bangga.

Kosakata visualnya diambil dari benda yang memang ditemui di jalan:

| Benda | Dipakai sebagai |
| --- | --- |
| Marka jalan kuning di aspal | Warna aksi utama (Mulai, tab aktif) |
| Patok kilometer (tugu putih, kepala merah) | Penanda split per km, warna rekor & garis aktivitas |
| Rambu petunjuk arah (papan hijau, bingkai putih) | Banner belok saat mengikuti rute, warna rute rencana |
| Nomor dada lomba (kertas putih, angka raksasa, lubang peniti) | Template bagikan foto |
| Aspal dan beton | Warna teks dan latar |

## Riset UI/UX

Temuan yang dipakai:

1. **Angka besar yang mudah dilirik.** Layar rekam menampilkan paling banyak tiga angka (waktu, jarak, pace) dengan posisi tetap dan satuan jelas; makin banyak angka, makin sulit dibaca sambil bergerak. ([screensdesign](https://screensdesign.com/articles/running-app-screen-design-examples/))
2. **Kontras tinggi di bawah matahari.** Hijau dan biru terang bisa "hilang" di sinar matahari langsung; teks penting memakai warna gelap pekat atau putih di atas warna jenuh, tanpa bayangan atau gradien di teks dan tombol. ([Adobe](https://blog.adobe.com/en/publish/2017/06/09/designing-for-the-great-outdoors-solving-the-ux-challenges-of-outdoor-app-use), [touch4it](https://www.touch4it.com/ux-design-for-wearables))
3. **Tombol besar di separuh bawah layar.** Tombol utama jauh di atas 44–48 px dengan jarak lega, supaya jari berkeringat tidak salah tekan. ([madegooddesigns](https://madegooddesigns.com/fitness-app-design/))
4. **Cegah salah tekan.** "Selesai" harus ditekan-tahan, karena salah mengakhiri rekaman lebih merugikan daripada salah menjeda. ([screensdesign](https://screensdesign.com/articles/running-app-screen-design-examples/))
5. **Umpan balik non-visual.** Getar saat mendekati belokan dan saat keluar rute, karena mata tidak selalu ke layar.
6. **Bagikan dengan foto.** Pola yang dikenal pengguna Strava: statistik dan garis rute ditempel di atas foto sendiri, lalu diunggah ke story. ([remove.bg](https://www.remove.bg/b/strava-overlay-for-instagram-stories-and-posts))

## Token

### Warna

| Nama | Terang | Gelap | Peran |
| --- | --- | --- | --- |
| Aspal | `#2A2D31` | `#F1F1EC` (teks) | Teks utama, panel gelap |
| Beton | `#EEEEEA` | `#1E2023` | Latar layar |
| Marka | `#FFC629` | `#FFC629` | Aksi utama; teks di atasnya selalu Aspal |
| Patok | `#D7332A` | `#F0554B` | Rekaman berjalan, rekor, garis aktivitas di peta |
| Rambu | `#0B7A55` | `#2FA77C` | Rute rencana, banner petunjuk arah |

Pendukung: putih `#FFFFFF` untuk permukaan, abu `#6B6E70` untuk teks sekunder, amber `#E08A00` untuk sorotan segmen di peta.

### Tipe

- **Plus Jakarta Sans** (Tokotype, Jakarta) untuk seluruh teks antarmuka. Huruf Indonesia untuk aplikasi Indonesia.
- **Big Shoulders Display** untuk angka dan wordmark: sans kondensed tebal yang mirip huruf papan nama dan nomor dada, sehingga angka jarak terasa seperti di garis finis.
- Skala teks: 12 / 14 / 16 / 20 / 26 / 32. Skala angka: 22 / 32 / 48 / 72.
- Label memakai huruf kalimat biasa, tanpa huruf kapital semua dan tanpa jarak huruf lebar.

### Tata letak

- Konten rata kiri; angka besar di layar rekam rata tengah karena dibaca sekilas.
- Feed: setiap aktivitas selebar layar, peta dari tepi ke tepi, dipisah garis tipis. Bukan tumpukan kartu bulat berbayang yang seragam.
- Radius mengikuti hierarki: tombol berbentuk kapsul, panel bawah 24, blok konten 14, peta dan foto di dalam blok 10.
- Bayangan hanya untuk benda yang melayang di atas peta (panel bawah, banner).

```
┌──────────────────────────────┐   Layar rekam
│ [rambu hijau: ← 120 m        ]│   ← banner petunjuk (benda paling berani)
│                              │
│            peta              │
│                              │
├──────────────────────────────┤
│           27:14              │   ← satu angka raksasa
│   5,32 km        5:07 /km    │
│     (Jeda)   (Tahan: Selesai)│   ← tombol bulat ≥ 72 px di bawah
└──────────────────────────────┘
```

## Prinsip

1. **Satu elemen berani:** banner petunjuk arah berbentuk rambu hijau dan template bagikan berbentuk benda nyata (nomor dada, patok, rambu). Bagian lain tenang.
2. **Warna punya arti:** kuning = aksi, merah = rekaman/rekor, hijau = rute. Tidak dipakai untuk hiasan.
3. **Tulisan apa adanya:** tombol menyebut hasilnya ("Simpan aktivitas", "Bagikan"), pesan kesalahan menjelaskan cara memperbaiki, informasi waktu ditulis seperti kalimat ("Lari, kemarin pukul 06.12").
4. **Lapangan dulu:** semua keputusan di layar rekam diuji dengan pertanyaan "apakah terbaca sambil berlari di bawah matahari?"

## Tinjauan terhadap pola umum

Desain sebelumnya (latar hampir hitam + satu aksen hijau neon, label huruf kapital di atas setiap judul, teks meta bersambung titik tengah, semua konten dalam kartu bulat dengan bayangan yang sama) persis masuk daftar pola bawaan yang disebut skill. Yang diubah:

| Sebelumnya | Sekarang | Alasan |
| --- | --- | --- |
| `#0E1114` + hijau volt `#C6F03C` | Aspal, beton, marka kuning, patok merah, rambu hijau | Warna diambil dari jalan, tiap warna punya arti |
| Inter + Barlow Condensed | Plus Jakarta Sans + Big Shoulders Display | Huruf lokal untuk teks, huruf papan nama untuk angka |
| Label `JARAK` huruf kapital berjarak | Label `Jarak` huruf kalimat | Mengurangi kesan template |
| `Lari · Hari ini 12.19` | `Lari, hari ini pukul 12.19` | Kalimat biasa lebih mudah dibaca |
| Kartu feed bulat berbayang | Aktivitas selebar layar dengan peta tepi ke tepi | Hierarki lebih jelas, peta jadi pusat |
| Banner belok kotak gelap | Banner rambu hijau berbingkai putih | Dikenali sekilas seperti rambu sungguhan |
| Tombol Selesai ditekan sekali | Tekan-tahan untuk Selesai | Mencegah rekaman berakhir tak sengaja |
