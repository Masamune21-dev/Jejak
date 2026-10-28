# Desain Jejak

Dokumen ini mencatat arah visual dan sistem desain Jejak. Arah sekarang mengikuti gambar referensi dari pemilik: aplikasi gelap kehijauan dengan aksen hijau mint yang menyala, kartu bergradasi halus, dan tombol tengah bulat yang bercahaya. Arah sebelumnya (tema jalan: marka kuning, patok merah, nomor dada) ditolak pemilik dan sudah diganti; hanya template bagikan foto yang masih memakai benda jalan.

## Subjek, pengguna, tugas utama

- **Subjek:** pencatat lari, gowes, dan jalan kaki untuk komunitas kecil di jalan kampung dan kota di Indonesia (mulai dari Wonogiri).
- **Pengguna:** pelari dan pesepeda rekreasi yang merekam dengan HP Android, sering pagi hari, satu tangan, tangan berkeringat.
- **Tugas utama:** merekam dengan andal, mengikuti rute tanpa tersesat, lalu membagikan hasil dengan bangga.

## Riset UI/UX

Temuan yang tetap dipakai:

1. **Angka besar yang mudah dilirik.** Layar rekam menampilkan paling banyak tiga angka (waktu, jarak, pace) dengan posisi tetap dan satuan jelas. ([screensdesign](https://screensdesign.com/articles/running-app-screen-design-examples/))
2. **Tombol besar di separuh bawah layar.** Tombol utama jauh di atas 44–48 px dengan jarak lega, supaya jari berkeringat tidak salah tekan. ([madegooddesigns](https://madegooddesigns.com/fitness-app-design/))
3. **Cegah salah tekan.** "Selesai" harus ditekan-tahan, karena salah mengakhiri rekaman lebih merugikan daripada salah menjeda.
4. **Umpan balik non-visual.** Getar saat mendekati belokan dan saat keluar rute, karena mata tidak selalu ke layar.
5. **Bagikan dengan foto.** Statistik dan garis rute ditempel di atas foto sendiri, lalu diunggah ke story. ([remove.bg](https://www.remove.bg/b/strava-overlay-for-instagram-stories-and-posts))

## Token

Semua token ada di `app/src/lib/theme.ts`. App selalu gelap, apa pun setelan HP.

### Warna

| Nama | Nilai | Peran |
| --- | --- | --- |
| `bg` | `#080D0B` | Latar layar, hitam kehijauan |
| `surface` / `surface2` | `#111916` / `#18221E` | Tab bar, panel bawah, kolom isian, tombol sekunder |
| `cardTop` → `cardBottom` | `#16211D` → `#0E1512` | Gradasi kartu |
| `line` | `#1E2A25` | Garis tepi tipis kartu dan tombol |
| `text` / `muted` | `#EEF4F1` / `#86958F` | Teks utama / sekunder |
| `accent` | `#2EE59D` | Aksi utama, tab aktif, garis aktivitas, angka penting; teks di atasnya `accentInk` `#03170E` |
| `accentSoft` | hijau 14 % | Latar pil dan kotak ikon |
| `route` | `#4DA3FF` | Garis rute rencana |
| `segment` | `#FFB547` | Sorotan segmen |
| `danger` | `#FF5C5C` | Rekaman berjalan, keluar rute, hapus |
| `gold` / `silver` / `bronze` | | Medali peringkat dan rekor |

Kartu utama (Minggu ini, hero profil, CTA rute, waktu terbaik segmen) memakai gradasi hijau tua `#16372A` → `#0E1A15` dengan garis tepi aksen 19 %.

### Cahaya

`glow(warna, kekuatan)` memberi bayangan berwarna tanpa geser di sekitar elemen: tombol utama, tombol Rekam di tengah tab bar, ikon kartu utama, avatar sendiri, kotak aksi aktif. Hanya satu sampai dua elemen bercahaya per layar.

### Tipe

- **Plus Jakarta Sans** untuk seluruh teks dan angka (400–800). Angka besar memakai 700 dengan jarak huruf sedikit dirapatkan.
- **Big Shoulders Display** hanya untuk template bagikan foto.
- Label memakai huruf kalimat biasa, tanpa huruf kapital semua.

### Bentuk

- Radius: kotak kecil 12, kotak aksi 16, kartu 22, panel bawah 28, tombol kapsul.
- Kartu: gradasi halus + garis tepi 1 px, tanpa bayangan hitam.
- Peta di dalam kartu: radius 16 dengan jarak 12 dari tepi kartu.

## Komponen khas

| Komponen | Isi |
| --- | --- |
| Tab bar (`TabBar.tsx`) | Latar `surface` bersudut atas 24; tombol Rekam bulat 62 px hijau bercahaya yang menonjol ke atas, berubah merah saat merekam; tab aktif ikon + label hijau, tanpa kotak |
| Kartu Minggu ini (`WeekCard.tsx`) | Angka km besar, pil perubahan dibanding minggu lalu, ikon jejak bercahaya |
| Aksi cepat (`ActionTile`) | Empat kotak ikon + label; yang aktif terisi hijau |
| Grafik mingguan (`WeeklyChart.tsx`) | Grafik area hijau bergradasi, garis halus yang tidak melewati nilai asli, gelembung nilai minggu ini |
| Banner petunjuk (`GuideBanner.tsx`) | Kartu gelap dengan kotak ikon belokan bercahaya dan jarak besar; merah saat keluar rute |
| Halaman masuk (`masuk.tsx`) | Peta rute Keliling Giripurwo memudar ke latar, logo hijau bercahaya, kartu form dengan pilihan Masuk / Daftar |

## Peta

Semua peta memakai ubin OpenStreetMap standar (jalan kecil dan gang lengkap, tanpa kunci API), lalu digelapkan supaya cocok dengan tema:

- Web dan cuplikan peta: filter `invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.88) saturate(0.6)` hanya pada lapisan ubin (`DARK_MAP_FILTER`); garis rute dan penanda tetap berwarna asli. iOS belum mendukung filter warna, jadi di sana ubin terang diredupkan dengan lapisan gelap.
- MapLibre di APK: cat raster `raster-brightness-min 0.92`, `raster-brightness-max 0.04`, `raster-hue-rotate 180`.

Google Maps asli butuh kunci API dan akun penagihan Google Cloud. Maps SDK untuk Android gratis tanpa batas pemakaian, tetapi akun penagihan tetap wajib, dan react-native-maps membawa WorkManager yang membuat APK tertutup sendiri setelah R8 (lihat [build-apk.md](build-apk.md)). Karena itu APK tetap memakai MapLibre + OpenStreetMap.

## Prinsip

1. **Satu sumber cahaya per layar:** hanya aksi utama yang bercahaya hijau; bagian lain tenang.
2. **Warna punya arti:** hijau = aksi dan kemajuan, biru = rute rencana, oranye = segmen, merah = rekaman berjalan atau peringatan.
3. **Tulisan apa adanya:** tombol menyebut hasilnya ("Simpan aktivitas", "Bagikan"), pesan kesalahan menjelaskan cara memperbaiki, waktu ditulis seperti kalimat ("Lari, kemarin pukul 06.12").
4. **Lapangan dulu:** layar rekam diuji dengan pertanyaan "apakah terbaca sambil berlari?"
