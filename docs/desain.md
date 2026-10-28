# Desain Jejak

Dokumen ini mencatat arah visual dan sistem desain Jejak. Tata letaknya mengikuti gambar referensi dari pemilik: kartu bergradasi halus dan tombol tengah bulat yang bercahaya. Warnanya kembali ke warna desain jalan atas permintaan pemilik: aspal gelap dengan aksen **marka kuning** `#FFC629`. Sejak 0.2.0 pengguna bisa memilih tema **terang** (beton) dan satu dari **lima warna aksen** di Pengaturan; bawaannya tetap gelap + kuning. Hijau mint dari desain referensi kembali sebagai salah satu pilihan, bukan bawaan. Template bagikan lama tetap memakai benda jalan (nomor dada, patok, rambu) dengan warna tetap; stiker bagikan yang baru mengikuti gaya Strava.

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

Semua token ada di `app/src/lib/theme.ts`. Palet dibangun oleh `buildPalette(gelap, aksen)` dari dua hal yang dipilih pengguna di Pengaturan:

| Pilihan | Nilai | Bawaan |
| --- | --- | --- |
| Tema (`ThemeMode`) | `system` (Ikuti HP), `dark` (Gelap), `light` (Terang) | `dark` |
| Warna aksen (`AccentKey`) | `kuning`, `mint`, `biru`, `oranye`, `pink` | `kuning` |

Komponen membaca palet aktif lewat `useColors()` (dan `useIsDark()` bila perlu tahu modenya), sehingga semua layar langsung berganti warna tanpa membuka ulang app. Kode di luar React membaca state tema langsung: warna notifikasi rekaman lewat `currentColors()`, sedangkan `glow()` dan `shadow()` memakai warna aksen dan mode yang sedang aktif. `palette` hanya palet bawaan gelap + kuning untuk tampilan yang muncul sebelum tema dimuat, yaitu layar crash; jangan dipakai di layar biasa, karena tidak ikut pilihan pengguna. Cara penyimpanannya dijelaskan di [arsitektur.md](arsitektur.md#tema).

### Warna dasar

| Nama | Gelap (aspal) | Terang (beton) | Peran |
| --- | --- | --- | --- |
| `bg` | `#1E2023` | `#EEEEEA` | Latar layar |
| `surface` / `surface2` | `#2A2D31` / `#35393E` | `#FFFFFF` / `#E3E4DF` | Tab bar, panel bawah, kolom isian, tombol sekunder |
| `cardTop` → `cardBottom` | `#2E3135` → `#24272A` | `#FFFFFF` → `#F5F5F1` | Gradasi kartu |
| `heroTop` → `heroBottom` | aksen 12 % di atas `#25272A` → `#25272A` | aksen 22 % di atas putih → `#FFFFFF` | Gradasi kartu utama, latar bersemu aksen (lihat tabel di bawah) |
| `line` | `#3A3E43` | `#D9DAD4` | Garis tepi tipis kartu dan tombol |
| `text` / `muted` | `#F1F1EC` / `#A3A6A8` | `#2A2D31` / `#6B6E70` | Teks utama / sekunder |
| `route` | `#4DA3FF` | `#2F6BFF` | Garis rute rencana. Bila aksen **biru**: toska `#2EC5D6` / `#0E8A99`, supaya tidak tertukar dengan garis aktivitas. |
| `segment` | `#A07BFF` | `#7C4DFF` | Sorotan segmen (ungu, supaya tidak tertukar dengan garis aktivitas) |
| `start` / `finish` | `#2FA77C` / `#F0554B` | `#0B7A55` (rambu) / `#D7332A` (patok) | Pin awal dan akhir |
| `danger` | `#FF5C5C` | `#D7332A` | Rekaman berjalan, keluar rute, hapus, angka pesan belum dibaca |
| `gold` / `silver` / `bronze` | `#FFC94D` / `#B9C3BF` / `#D49A6A` | `#E8A800` / `#9EA3A8` / `#B8743F` | Medali peringkat dan rekor |
| `overlay` | hitam 60 % | aspal 50 % | Latar di belakang menu bawah (`Sheet`) dan tombol hapus foto |

`ink`, `inkText`, `slab`, dan `me` (sama dengan `route`) juga ada di palet tetapi belum dipakai komponen mana pun. Titik posisimu di peta (`map-markers.tsx`) masih memakai biru tetap `#2F6BFF`.

### Warna aksen

| Kunci | Nama di Pengaturan | `accent` | `accentDeep` | `accentInk` | Versi untuk latar terang (`onLight`) |
| --- | --- | --- | --- | --- | --- |
| `kuning` | Kuning marka (bawaan) | `#FFC629` | `#E0A800` | `#2A2D31` | `#8F6400` |
| `mint` | Hijau mint | `#2EE59D` | `#12B77A` | `#03170E` | `#0B7A55` |
| `biru` | Biru | `#4DA3FF` | `#2F7FE0` | `#06182E` | `#1F5FBF` |
| `oranye` | Oranye | `#FF8A4C` | `#E56A2A` | `#2A1206` | `#B04A10` |
| `pink` | Merah muda | `#FF5C8A` | `#E03A6A` | `#2A0612` | `#B8204F` |

Token turunan dari aksen:

| Token | Gelap | Terang | Dipakai untuk |
| --- | --- | --- | --- |
| `accent` | `accent` | `accent` | Latar tombol utama, tombol Rekam, kotak aksi aktif, gelembung chat sendiri, cahaya |
| `accentInk` | dari tabel aksen | dari tabel aksen | Teks dan ikon **di atas** latar aksen |
| `accentText` | `accent` | `onLight` | Aksen sebagai **teks atau ikon** di atas latar biasa (tab aktif, angka hero, waktu terbaik, tautan). Di latar terang warna aksen asli terlalu pucat untuk dibaca. |
| `accentSoft` | aksen 14 % | aksen 20 % | Latar pil dan kotak ikon |
| `track` | `accent` | `accentDeep` | Garis aktivitas di peta dan batang km tercepat; versi gelap aksen supaya terlihat di peta terang |

Gradasi kartu utama (`heroTop`) hasil campuran aksen dengan `heroBottom`:

| Aksen | Gelap | Terang |
| --- | --- | --- |
| `kuning` | `#3F3A2A` | `#FFF2D0` |
| `mint` | `#263E38` | `#D1F9E9` |
| `biru` | `#2A3644` | `#D8EBFF` |
| `oranye` | `#3F332E` | `#FFE5D8` |
| `pink` | `#3F2D36` | `#FFDBE5` |

Kartu utama (Minggu ini, hero profil tanpa foto sampul, CTA rute, waktu terbaik segmen) memakai gradasi `heroTop` → `heroBottom` dengan garis tepi aksen 19 %. Warna transparan dibuat dengan `alpha(warna, nilai)`; jangan menulis kode warna langsung di komponen. Pengecualian yang disengaja: warna benda nyata di template bagikan lama (`ROAD`: aspal, beton, marka, patok, rambu) dan warna putih stiker, yang tidak ikut tema.

### Cahaya dan bayangan

`glow(warna, kekuatan)` memberi bayangan berwarna tanpa geser di sekitar elemen: tombol utama, tombol Rekam di tengah tab bar, ikon kartu utama, avatar sendiri, kotak aksi aktif, bulatan aksen terpilih di Pengaturan. Hanya satu sampai dua elemen bercahaya per layar. Di tema terang cahaya lebih lembut (opasitas 0,35 dibanding 0,55), begitu juga `shadow()` (0,10/0,18 dibanding 0,35/0,55).

### Tipe

- **Plus Jakarta Sans** untuk seluruh teks dan angka (400–800), termasuk stiker bagikan. Angka besar memakai 700 dengan jarak huruf sedikit dirapatkan.
- **Big Shoulders Display** hanya untuk template bagikan lama (Nomor dada, Rute, Patok KM, Rambu).
- Label memakai huruf kalimat biasa, tanpa huruf kapital semua.

### Bentuk

- Radius: kotak kecil 12, kotak aksi 16, kartu 22, panel bawah 28, tombol kapsul.
- Kartu: gradasi halus + garis tepi 1 px, tanpa bayangan hitam.
- Peta di dalam kartu: radius 16 dengan jarak 12 dari tepi kartu.

## Komponen khas

| Komponen | Isi |
| --- | --- |
| Tab bar (`TabBar.tsx`) | Latar `surface` bersudut atas 24; tombol Rekam bulat 62 px berwarna aksen dan bercahaya (ikon titik rekam) yang menonjol ke atas, berubah merah saat merekam, dan redup tanpa cahaya saat layar Rekam sedang dibuka supaya tidak bersaing dengan tombol Mulai; tab aktif ikon + label `accentText`, tanpa kotak |
| Kartu Minggu ini (`WeekCard.tsx`) | Angka km besar, pil perubahan dibanding minggu lalu, ikon jejak bercahaya |
| Aksi cepat (`ActionTile`) | Empat kotak ikon + label (Rekam, Buat rute, Tulis, Segmen); yang aktif terisi warna aksen |
| Grafik mingguan (`WeeklyChart.tsx`) | Grafik area berwarna aksen bergradasi, garis halus yang tidak melewati nilai asli, gelembung nilai minggu ini di pita atas dengan garis putus-putus ke titiknya |
| Banner petunjuk (`GuideBanner.tsx`) | Kartu dengan kotak ikon belokan berwarna aksen yang bercahaya dan jarak besar; merah saat keluar rute |
| Halaman masuk (`masuk.tsx`) | Peta rute Keliling Alun-alun Pati memudar ke latar, logo berwarna aksen bercahaya, kartu form dengan pilihan Masuk / Daftar |
| Avatar (`Avatar` di `ui.tsx`) | Foto profil bulat (`expo-image`, cache memori + disk) bila ada; bila tidak, inisial di atas salah satu dari 8 warna tetap yang dipilih dari nama. Avatar sendiri di Beranda dan Profil diberi cincin aksen dan cahaya. |
| Hero profil (`ProfileView.tsx`) | Foto sampul sebagai latar dengan `LinearGradient` gelap dari `bg` 30 % ke 85 %; teks di atas foto diberi bayangan tipis. Baris Aktivitas / Jarak / Waktu di bawahnya diberi `BlurView` (`expo-blur`, `blurMethod="dimezisBlurViewSdk31Plus"`, intensitas 45) dari `BlurTargetView` yang membungkus foto. Tanpa foto sampul: gradasi `heroTop` → `heroBottom`. |
| Menu bawah (`Sheet.tsx`) | Panel `surface` bersudut atas 28 yang muncul dari bawah di atas `overlay`: judul kecil, baris ikon + label (merah untuk aksi berbahaya), dan **Batal**. Dipakai untuk ganti foto, Blokir, Hapus/Laporkan postingan. |
| Kartu postingan (`PostCard.tsx`) | Kartu biasa: avatar, nama, waktu, teks, petak foto (1 foto 4:3, 2/4 foto persegi, 3 foto dengan yang pertama 16:9), tanda segmen (bendera ungu) dalam pil, hati merah saat disukai |
| Gelembung chat (`pesan/[id].tsx`) | Pesan sendiri di kanan berlatar aksen dengan teks `accentInk`; pesan teman di kiri berlatar `surface` bergaris tepi. Sudut bawah di sisi pengirim dibuat lancip (radius 4). |

## Template bagikan

Layar Bagikan berupa galeri geser dengan dua jenis tata letak:

- **Stiker transparan** (`ShareStickers.tsx`): Samping, Daftar, Tumpuk, Ringkas, Baris. Meniru tata letak stiker Strava, tetapi dengan wordmark **jejak.** Isinya hanya garis rute dan angka, tanpa latar, diekspor sebagai PNG transparan untuk ditempel di atas foto sendiri. Teks putih dengan bayangan hitam 45 % radius 4; garis rute dengan bayangan hitam 25 % yang 3 px lebih tebal. Warna garis (dan titik di wordmark): oranye `#FF5A1F` (bawaan, mirip contoh Strava), putih, atau `accent`. Semua ukuran diskalakan dari lebar kanvas (desain dasar 360 px).
- **Template lama** (`ShareTemplates.tsx`): Nomor dada, Rute, Patok KM, Rambu. Memakai warna benda jalan yang tetap (`ROAD`) dan huruf Big Shoulders Display.

Di pratinjau, stiker tanpa foto digambar di atas pola papan catur abu-abu gelap (`#3A3B3D` / `#2B2C2E`, kotak 14 px) yang berada di luar wadah yang diekspor, jadi tidak ikut tersimpan. Detail per tata letak di [fitur.md](fitur.md#bagikan-ke-foto).

## Peta

Semua peta memakai ubin OpenStreetMap standar (jalan kecil dan gang lengkap, tanpa kunci API). Di **tema gelap** ubin digelapkan supaya cocok dengan tema; di **tema terang** ubin tampil asli tanpa filter:

- Web dan cuplikan peta: filter `invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.88) saturate(0.6)` hanya pada lapisan ubin (`DARK_MAP_FILTER`); garis rute dan penanda tetap berwarna asli. iOS belum mendukung filter warna, jadi di sana ubin terang diredupkan dengan lapisan gelap (juga hanya di tema gelap).
- MapLibre di APK: cat raster `raster-brightness-min 0.92`, `raster-brightness-max 0.04`, `raster-hue-rotate 180` di tema gelap; latar peta memakai `bg` tema aktif.
- react-native-maps (iOS dan Expo Go Android): `userInterfaceStyle` mengikuti tema; di Android gaya Google `NIGHT` untuk tema gelap dan `QUIET` (POI dan transit disembunyikan) untuk tema terang.

Garis aktivitas memakai `track` (di tema terang versi gelap aksen), garis rute memakai `route`, segmen memakai `segment`.

Google Maps asli butuh kunci API dan akun penagihan Google Cloud. Maps SDK untuk Android gratis tanpa batas pemakaian, tetapi akun penagihan tetap wajib, dan react-native-maps membawa WorkManager yang membuat APK tertutup sendiri setelah R8 (lihat [build-apk.md](build-apk.md)). Karena itu APK tetap memakai MapLibre + OpenStreetMap.

## Prinsip

1. **Satu sumber cahaya per layar:** hanya aksi utama yang bercahaya dengan warna aksen; bagian lain tenang.
2. **Warna punya arti:** warna aksen = aksi dan kemajuan, biru = rute rencana (toska bila aksennya biru), ungu = segmen, merah = rekaman berjalan atau peringatan. Arti ini sama di kelima warna aksen dan kedua tema.
3. **Tulisan apa adanya:** tombol menyebut hasilnya ("Simpan aktivitas", "Bagikan"), pesan kesalahan menjelaskan cara memperbaiki, waktu ditulis seperti kalimat ("Lari, kemarin pukul 06.12").
4. **Lapangan dulu:** layar rekam diuji dengan pertanyaan "apakah terbaca sambil berlari?"
