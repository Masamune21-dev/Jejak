# Panduan fitur

Panduan pemakaian Jejak per layar, sesuai perilaku kode saat ini. Nama berkas layar ada di `app/src/app/`.

## Daftar isi

1. [Navigasi utama](#navigasi-utama)
2. [Daftar dan masuk](#daftar-dan-masuk)
3. [Beranda (feed)](#beranda-feed)
4. [Rekam aktivitas](#rekam-aktivitas)
5. [Mengikuti rute saat merekam](#mengikuti-rute-saat-merekam)
6. [Rute: daftar dan detail](#rute-daftar-dan-detail)
7. [Membuat rute](#membuat-rute)
8. [Detail aktivitas](#detail-aktivitas)
9. [Bagikan ke foto](#bagikan-ke-foto)
10. [Ekspor GPX](#ekspor-gpx)
11. [Membuat segmen](#membuat-segmen)
12. [Segmen dan leaderboard](#segmen-dan-leaderboard)
13. [Profil dan statistik](#profil-dan-statistik)
14. [Cari dan ikuti teman](#cari-dan-ikuti-teman)

App selalu gelap dengan aksen hijau mint (lihat [desain.md](desain.md)): **hijau** untuk aksi utama, jalur rekaman, dan petunjuk arah, **biru** untuk rute rencana, **oranye** untuk segmen, dan **merah** untuk rekaman yang sedang berjalan atau peringatan.

---

## Navigasi utama

Setelah masuk, app menampilkan lima tab (`app/src/app/(tabs)/`, tab bar di `components/TabBar.tsx`):

| Tab | Berkas | Isi |
| --- | --- | --- |
| Beranda | `index.tsx` | Ringkasan minggu ini dan feed aktivitas. |
| Rute | `rute.tsx` | Rute yang kamu simpan dan tombol membuat rute baru. |
| **Rekam** (tombol bulat di tengah) | `rekam.tsx` | Perekam GPS. |
| Segmen | `segmen.tsx` | Segmen terdekat atau paling ramai. |
| Profil | `profil.tsx` | Profil, statistik, rekor pribadi, aktivitasmu. |

Tombol Rekam di tengah tab bar berwarna hijau bercahaya saat tidak ada rekaman. Selama ada rekaman yang belum disimpan (sedang merekam, dijeda, atau menunggu disimpan), tombol berubah merah dengan ikon denyut dan label **Merekam**, jadi kamu selalu tahu masih ada rekaman yang terbuka walau sedang di tab lain.

Layar lain dibuka di atas tab: detail aktivitas (`aktivitas/[id]`), buat segmen (`aktivitas/[id]/segmen`), bagikan (`aktivitas/[id]/bagikan`), detail segmen (`segmen/[id]`), rute baru (`rute/baru`), detail rute (`rute/[id]`), profil atlet lain (`atlet/[id]`), dan cari teman (`cari`).

Semua layar itu hanya bisa dibuka setelah masuk. Selama belum masuk, satu-satunya layar adalah `masuk`.

---

## Daftar dan masuk

Layar `masuk.tsx` punya dua mode lewat pilihan **Masuk / Daftar**.

**Daftar** membutuhkan:

| Isian | Aturan (dicek server) |
| --- | --- |
| Username | 3–20 karakter, hanya huruf, angka, titik, dan garis bawah. Disimpan dalam huruf kecil, jadi `Dicky` dan `dicky` dianggap sama. |
| Nama tampilan | 1–50 karakter. |
| Kata sandi | 6–200 karakter. |

Bila username sudah dipakai, muncul pesan *Username sudah dipakai*.

**Masuk** cukup username dan kata sandi. Huruf besar/kecil pada username tidak berpengaruh. Bila salah: *Username atau kata sandi salah*.

Saat keyboard muncul, layar bergeser ke bawah sehingga kolom yang sedang diketik dan tombol **Masuk**/**Buat akun** tetap terlihat di atas keyboard.

Setelah berhasil, token sesi disimpan di HP (Keychain/Keystore) atau di `localStorage` pada versi web, sehingga kamu tetap masuk saat app dibuka lagi. Sesi berakhir saat kamu menekan **Keluar** di Profil, atau bila app tidak dipakai selama 90 hari (lalu kamu diminta masuk lagi).

Di bagian bawah layar masuk tertulis **Server: …**, alamat API yang dipakai app. Ini berguna untuk memastikan app terhubung ke server yang benar (produksi atau komputer sendiri).

---

## Beranda (feed)

Layar `(tabs)/index.tsx`.

- **Sapaan dan tanggal** dengan avatarmu (ketuk untuk membuka profil): "Selamat pagi" (sebelum 11.00), "siang" (sebelum 15.00), "sore" (sebelum 18.00), atau "malam", plus nama depanmu.
- **Kartu Minggu ini** (gradasi hijau tua): total jarak minggu berjalan (Senin–Minggu) dari semua jenis aktivitas, pil perbandingan dengan minggu lalu (misalnya *12% lebih jauh dari minggu lalu*), baris "N aktivitas, Xj Ym bergerak", dan ikon jejak bercahaya.
- **Aksi cepat**: empat kotak, yaitu **Rekam** (hijau), **Buat rute**, **Segmen**, dan **Teman** (cari teman).
- **Aktivitas terbaru**: aktivitasmu sendiri dan aktivitas orang yang kamu ikuti, terbaru di atas. Daftar memuat 20 aktivitas sekaligus dan memuat berikutnya otomatis saat digulir ke bawah. Tarik ke bawah untuk menyegarkan.
- Tombol **Cari teman** (ikon orang+) di kanan atas.

Setiap aktivitas tampil sebagai kartu bergradasi dengan peta bersudut bulat di dalamnya, dan menampilkan:

- nama atlet (ketuk untuk membuka profilnya) dan satu kalimat jenis + waktu, misalnya *Lari, hari ini pukul 06.12*, *Bersepeda, kemarin pukul 16.40*, *Jalan kaki, 3 hari lalu*, atau *Lari, 12 Okt 2026* untuk yang lebih dari seminggu;
- lencana **N PR** bila aktivitas itu memecahkan rekor pribadi atau rekor segmen;
- judul, **Jarak**, **Pace** (lari/jalan, menit per km) atau **Kecepatan** (sepeda, km/j), dan **Waktu** bergerak;
- cuplikan peta jalurnya;
- tombol **kudos** (jempol) dengan jumlahnya. Ketuk untuk memberi, ketuk lagi untuk membatalkan. Tombol ini nonaktif untuk aktivitasmu sendiri;
- jumlah komentar dan tautan **Lihat detail**.

Bila feed masih kosong, muncul ajakan **Mulai rekam** dan **Cari teman**.

---

## Rekam aktivitas

Layar `(tabs)/rekam.tsx`, dengan logika di `lib/recorder.ts`.

### Sebelum mulai

1. **Pilih jenis**: Lari, Bersepeda, atau Jalan kaki.
2. **Pilih rute** (opsional): ketuk baris **Rute**. Pilih *Bebas, tanpa rute* atau salah satu rute yang sudah kamu simpan (baris lalu bertuliskan *Nama rute, 5,20 km*). Jenis aktivitas otomatis mengikuti jenis rute yang dipilih.
3. Bila memilih rute, peta menampilkan garis rute (hijau) dan rambu hijau berisi nama rute serta posisimu terhadap rute: *Kamu sudah di rute. Total X* (dalam 40 m dari garis) atau *Titik terdekat rute X dari sini. Total Y*.
4. Ketuk tombol besar **Mulai lari / bersepeda / jalan kaki**.

Saat pertama kali, app meminta izin lokasi. Di APK yang dibangun sendiri, app juga menanyakan izin lokasi latar (*Izinkan sepanjang waktu*) **satu kali saja**. Di Android 11 ke atas permintaan ini membuka halaman Pengaturan.

Bila izin ditolak atau GPS gagal menyala, pesan error tampil di panel dan rekaman **tidak** dimulai (status tetap seperti sebelum tombol ditekan). Hal yang sama berlaku untuk **Lanjut**.

### Saat merekam

- Pil di atas peta menunjukkan sumber lokasi dan akurasinya:
  - *GPS aktif, tetap merekam saat layar mati* (lokasi latar aktif);
  - *GPS aktif. Biarkan layar menyala* (tanpa izin latar atau di Expo Go; layar dicegah mati otomatis);
  - *Simulasi GPS, 8× lebih cepat* (mode uji).
  
  Angka dalam kurung, misalnya *(±6 m)*, adalah akurasi GPS. Titik hijau berarti akurasi 20 m atau lebih baik, titik kuning berarti lebih buruk.
- Panel bawah menampilkan **Waktu** (stopwatch waktu aktif, tidak termasuk jeda), **Jarak** (km), dan **Pace** atau **Kecepatan**.
- Peta mengikuti posisimu. Jalur yang sudah terekam digambar hijau.
- Tombol **Jeda** menghentikan GPS dan stopwatch.

Tidak ada jeda otomatis: berdiri diam tetap menambah stopwatch. Namun saat aktivitas disimpan, server menghitung **waktu bergerak** terpisah (lihat [algoritma.md](algoritma.md#waktu-bergerak)).

### Saat dijeda

Label stopwatch berubah menjadi **Dijeda**. Pilih:

- **Lanjut**: merekam lagi. Jalur setelah jeda menjadi bagian baru, sehingga jarak dan waktu selama jeda tidak dihitung.
- **Tahan untuk selesai**: tombol hijau berbendera ini harus **ditekan dan ditahan** sekitar 0,6 detik, supaya rekaman tidak tertutup karena tersentuh tanpa sengaja. Bila hanya diketuk, labelnya berubah merah menjadi *Tekan lebih lama* selama 2,5 detik dan tidak terjadi apa-apa. Setelah ditahan, rekaman ditutup dan layar simpan terbuka.

### Simpan atau buang

Layar **Simpan aktivitas** menampilkan cuplikan peta, Jarak, Waktu, dan Pace/Kecepatan, lalu:

- **Judul**: boleh dikosongkan. Judul bawaan dibuat dari jenis dan jam mulai, misalnya *Lari pagi*, *Bersepeda sore*, *Jalan kaki malam* (pagi sebelum 11.00, siang sebelum 15.00, sore sebelum 18.00). Maksimal 100 karakter.
- **Simpan aktivitas**: mengunggah ke server. Setelah berhasil, app membuka detail aktivitas yang baru dan rekaman lokal dihapus. Bila gagal (misalnya tidak ada sinyal), rekaman tetap ada dan bisa dicoba lagi.
- **Lanjutkan**: kembali merekam (bagian baru).
- **Buang**: menghapus rekaman setelah konfirmasi. Tidak bisa dikembalikan.

Aktivitas butuh minimal 2 titik GPS. Rekaman yang terlalu pendek ditolak dengan pesan *Aktivitas terlalu pendek untuk disimpan*.

Rekaman yang kecepatannya mustahil, misalnya lari 1 km kurang dari 2 menit (biasanya karena lupa berhenti merekam saat naik kendaraan), ditolak dengan pesan *Kecepatan tidak masuk akal untuk lari (…)*. Begitu juga rekaman bertanggal sebelum 2020 atau di masa depan (jam HP salah). Rekamannya tetap ada di HP dan bisa dibuang. Batas lengkapnya ada di [api.md](api.md#post-activities).

### Bila app tertutup

Status perekam disimpan di HP setidaknya tiap 10 detik selama merekam, juga saat mulai, jeda, dan selesai. Bila app tertutup atau dimatikan sistem, rekaman dipulihkan saat app dibuka lagi **dalam keadaan Dijeda**. Ketuk **Lanjut** untuk meneruskan atau tekan-tahan **Tahan untuk selesai** untuk menyimpan.

Di APK dengan izin lokasi latar, titik GPS yang terkumpul selama app tertutup ikut dimasukkan saat rekaman dipulihkan. Di Expo Go, titik selama app tertutup tidak terekam.

### Simulasi GPS (mode uji)

Hanya muncul di mode pengembangan (`__DEV__`): sakelar **Simulasi GPS (mode uji)**. Bila aktif, posisi bergerak sendiri 8× lebih cepat dari waktu nyata:

- bila ada rute yang dipilih, simulasi menyusuri garis rute;
- bila tidak, simulasi berputar tiga kali mengelilingi persegi 500 m di sekitar posisimu (atau Alun-alun Pati bila posisi belum diketahui).

Kecepatan simulasi: lari 3,2 m/s, sepeda 7 m/s, jalan 1,4 m/s, dengan variasi acak ±15%. Detail lain ada di [pengembangan.md](pengembangan.md#mode-simulasi-gps).

---

## Mengikuti rute saat merekam

Ada dua cara memasang rute: memilihnya di layar Rekam (baris **Rute**), atau menekan **Ikuti rute ini** di detail rute. Rute hanya bisa dipasang selama belum ada rekaman yang berjalan.

Selama merekam dengan rute, petunjuk tampil sebagai **banner** di atas peta: kartu gelap dengan kotak ikon belokan yang bercahaya, jarak besar, dan teks petunjuk (komponen `components/GuideBanner.tsx`).

- **Banner hijau (belokan)** menampilkan jarak ke belokan berikutnya dalam angka besar (misalnya *120 m* atau *1,20 km*), teks petunjuknya (misalnya *Belok kiri ke Jalan Pemuda*), dan *Sisa X* jarak rute. Panah menyesuaikan teks: kiri, kanan, putar/bundaran, atau bendera untuk *Sampai di tujuan*. Bila tidak ada belokan lagi, tertulis *Ikuti garis rute*.
- Satu petunjuk tetap ditampilkan sampai kamu melewatinya sekitar 5 m, lalu berganti ke petunjuk berikutnya.
- **HP bergetar** (getaran kuat) sekali saat belokan berikutnya tinggal kurang dari 30 m.
- **Banner merah (keluar dari rute)**: bila posisimu lebih dari 40 m dari garis rute, banner berubah merah dengan ikon peringatan, bertuliskan *Keluar dari rute* dan *X dari garis rute, sisa Y*. HP bergetar (getaran peringatan) sekali setiap kali kamu mulai keluar jalur.
- Kemajuan di rute selalu dihitung maju: di rute putaran atau jalan yang dilewati pergi-pulang, posisi tidak meloncat ke bagian rute yang arahnya berlawanan.

Getaran tidak ada di versi web.

---

## Rute: daftar dan detail

**Tab Rute** (`(tabs)/rute.tsx`) berisi tombol **Buat rute baru** dan daftar **Rute saya** (hanya rute buatanmu). Tiap kartu menampilkan cuplikan peta, jenis, nama, **Jarak**, dan **Perkiraan** waktu tempuh.

Perkiraan dihitung dari jarak dibagi kecepatan rata-rata: lari 2,8 m/s, sepeda 5,5 m/s, jalan 1,3 m/s.

**Detail rute** (`rute/[id].tsx`) menampilkan:

- peta rute (garis biru) dengan pin hijau **A** (awal) dan pin merah **B** (akhir), atau satu pin **A/B** bila ujung-ujungnya berjarak kurang dari 30 m (rute putaran);
- nama, pembuat, **Jarak**, **Perkiraan**, dan **Belokan** (jumlah petunjuk, termasuk *Sampai di tujuan*);
- tombol **Ikuti rute ini**: memasang rute ke perekam lalu membuka tab Rekam. Nonaktif bila ada rekaman berjalan (*Selesaikan rekaman yang sedang berjalan dulu.*);
- **Petunjuk arah**: daftar belokan dengan jaraknya dari awal rute;
- **Hapus rute** (hanya untuk pembuatnya, dengan konfirmasi). Aktivitas yang pernah mengikuti rute itu tidak ikut terhapus.

---

## Membuat rute

Layar `rute/baru.tsx`.

1. Peta dibuka di posisimu.
2. **Ketuk peta** untuk menaruh titik. Semua titik bernomor; titik terakhir merah, yang lain hijau. Garis rute biru. Maksimal 50 titik.
3. Setiap kali titik berubah, app meminta rute yang **mengikuti jalan** ke server (OpenStreetMap lewat OSRM), ditunda 350 ms supaya ketukan beruntun tidak membanjiri server. Selama menunggu, garis sebelumnya tetap tampil dan petunjuk di atas peta bertuliskan *Menghitung rute…*.
4. Pilih jenis (Lari / Bersepeda / Jalan kaki). Lari dan jalan memakai profil pejalan kaki; sepeda memakai profil sepeda, jadi garisnya bisa berbeda.

Petunjuk di atas peta berubah sesuai keadaan: *Ketuk peta untuk titik awal*, *Ketuk lagi untuk titik berikutnya*, *Menghitung rute…*, *N titik. Ketuk untuk menambah*, atau *Layanan rute tidak tersedia, pakai garis lurus*.

Alat di panel bawah:

| Tombol | Fungsi |
| --- | --- |
| **Batal** | Menghapus titik terakhir. |
| **Pergi-pulang** | Menambahkan titik-titik yang sama dalam urutan terbalik, sehingga rute kembali ke awal lewat jalan yang sama. Total tetap dibatasi 50 titik. |
| **Ke awal** | Menambahkan titik awal di akhir, menutup rute menjadi putaran. |
| **Hapus** | Menghapus semua titik. |

Sakelar **Ikuti jalan (OpenStreetMap)**: bila dimatikan, rute dibuat garis lurus antar titik (digambar putus-putus) tanpa petunjuk belok. Bila layanan routing gagal, rute juga otomatis menjadi garis lurus putus-putus.

Isi **nama rute** (maksimal 80 karakter), lalu **Simpan rute**. Tombol aktif bila sudah ada minimal 2 titik, perhitungan rute selesai, dan nama terisi. Setelah tersimpan, app membuka detail rute tersebut.

---

## Detail aktivitas

Layar `aktivitas/[id]/index.tsx`.

**Peta** menampilkan jalur (hijau, tiap bagian setelah jeda digambar terpisah) dengan titik hijau di awal dan merah di akhir.

**Zona privasi**: di aktivitas orang lain, 300 m pertama dan terakhir jalur (paling banyak seperempat jaraknya) tidak ditampilkan, baik di detail maupun di kartu feed, supaya letak rumah tidak terlihat. Angka jarak, waktu, dan split tetap untuk seluruh aktivitas. Aktivitasmu sendiri selalu tampil utuh. Detail di [api.md](api.md#zona-privasi).

**Kepala**: atlet (ketuk untuk membuka profilnya), kalimat jenis + waktu (*Lari, hari ini pukul 06.12*), dan judul.

**Angka utama**:

| Label | Arti |
| --- | --- |
| Jarak | Total jarak tanpa perpindahan selama jeda. |
| Pace / Kecepatan | Dihitung dari jarak dan **waktu bergerak**. |
| Bergerak | Waktu saat benar-benar bergerak (kecepatan di atas 0,5 m/s, di luar jeda). |
| Tanjakan | Total naik (meter), setelah ketinggian GPS dihaluskan. |
| Total | Dari titik pertama sampai terakhir, **termasuk** jeda. |
| Kec. maks | Kecepatan tertinggi yang bertahan minimal 5 detik. |

Rumus lengkapnya ada di [algoritma.md](algoritma.md).

**Khusus pemilik**, tepat di bawah angka utama: tombol **Bagikan** (lihat [Bagikan ke foto](#bagikan-ke-foto)) dan **Ekspor GPX** (lihat [Ekspor GPX](#ekspor-gpx)).

**Kudos**: jumlah kudos dan nama depan pemberinya (hingga 50 terbaru). Untuk aktivitas orang lain ada tombol **Beri kudos** / **Sudah** (ketuk lagi untuk membatalkan).

**Segmen**: daftar segmen yang dilewati aktivitas ini, berurutan sesuai posisi di jalur. Tiap baris menampilkan nama segmen, panjang, pace/kecepatan, waktu, lencana **PR** bila memecahkan waktu terbaikmu sebelumnya di segmen itu, dan lencana **#peringkat**, yaitu peringkat waktu ini dibanding waktu terbaik atlet lain. Ketuk satu baris untuk menyorot potongan jalurnya di peta (oranye) dan memunculkan tombol **Lihat leaderboard**.

**Split per km**: satu baris per kilometer. Nomor km ditampilkan dalam bulatan kecil (hijau untuk km tercepat), diikuti pace (lari/jalan) atau km/j (sepeda) dan sebuah batang:

- panjang batang = kecepatan split itu dibanding split tercepat (`tercepat ÷ split × 100%`, minimal 12%), jadi selisih kecil tampak kecil, tidak dibesar-besarkan;
- batang **hijau** menandai km tercepat. Untuk penanda ini hanya split minimal 900 m yang dibandingkan, jadi kilometer terakhir yang pendek tidak dianggap tercepat;
- keterangan di bawahnya: *Pace per km. Batang hijau menandai km tercepat.* (sepeda: *Kecepatan per km dalam km/j. …*).

Sisa kilometer terakhir yang kurang dari 50 m tidak ditampilkan.

**Waktu terbaik**: waktu tercepat untuk jarak-jarak standar di mana saja dalam aktivitas ini:

| Jenis | Jarak |
| --- | --- |
| Lari | 400 m, 1 km, 5 km, 10 km, Setengah maraton (21,0975 km), Maraton (42,195 km) |
| Jalan kaki | 1 km, 5 km, 10 km |
| Bersepeda | 5 km, 10 km, 20 km, 40 km, 100 km |

Kotak gelap dengan piala berarti **PR**: lebih cepat dari waktu terbaikmu sebelumnya untuk jenis dan jarak yang sama. Rekor pertama kali belum dihitung PR. Status PR dicatat saat aktivitas diunggah dan tidak berubah sesudahnya.

**Komentar**: daftar komentar (lama ke baru) dan kotak tulis (maksimal 500 karakter). Tombol **×** muncul untuk penulis komentar dan pemilik aktivitas.

**Khusus pemilik**:

- **Buat segmen dari aktivitas ini** (lihat bagian berikut);
- **Hapus aktivitas**: kudos, komentar, waktu terbaik, dan waktu segmennya ikut terhapus.

---

## Bagikan ke foto

Layar `aktivitas/[id]/bagikan.tsx` (judul **Bagikan**), dibuka lewat tombol **Bagikan** di detail aktivitasmu sendiri. Hasil aktivitas ditempelkan di atas foto (atau latar polos) lalu dijadikan gambar PNG untuk dibagikan ke media sosial atau disimpan.

### Langkah

1. **Pratinjau** di bagian atas menunjukkan hasil akhirnya.
2. **Pilih template** dari deretan tombol: *Nomor dada* (bawaan), *Rute*, *Patok KM*, atau *Rambu*.
3. **Pilih format**: *Postingan 4:5* (bawaan) atau *Story 9:16*.
4. **Foto** (opsional):
   - **Pilih foto** membuka galeri (menjadi **Ganti foto** bila sudah ada foto);
   - **Kamera** membuka kamera (tidak ada di versi web). Bila izin kamera ditolak: *Izin kamera ditolak. Aktifkan kamera untuk Jejak di pengaturan HP.*;
   - tombol **×** menghapus foto.

   Foto diisi penuh ke bingkai (dipotong seperlunya). Tanpa foto, template memakai **latar aspal** dengan garis kontur samar dan garis rutemu yang pudar (template *Rute* menggambar garis rutenya sendiri).
5. Tekan **Bagikan** atau **Simpan ke galeri** (di web: **Unduh gambar**).

### Template

Semua template (`components/ShareTemplates.tsx`) memakai jarak, **waktu bergerak**, dan pace (lari/jalan) atau kecepatan (sepeda) yang sama dengan feed.

| Template | Isi |
| --- | --- |
| **Nomor dada** | Kertas nomor lomba putih yang sedikit miring dengan empat lubang peniti: pita merah berisi judul, jarak dalam angka raksasa, Waktu dan Pace/Kecepatan, lalu nama dan tanggal. Logo *jejak.* di kiri atas. |
| **Rute** | Garis rute putih besar berbayang dengan titik awal hijau dan titik akhir merah, plus pita gelap di bawah berisi Jarak, Pace/Kecepatan, dan Waktu. Logo di kiri atas. |
| **Patok KM** | Patok kilometer putih berkepala merah bertuliskan jenis aktivitas (*LARI*, *BERSEPEDA*, *JALAN*) dan jaraknya; di sampingnya judul, waktu, pace/kecepatan, dan tanggal. Logo di kanan atas. |
| **Rambu** | Papan petunjuk arah hijau berbingkai putih: panah ke atas dan judul, baris Jarak, Waktu, Pace/Kecepatan, lalu nama, tanggal, dan *jejak.* |

### Hasil

| | HP (Android/iOS) | Web |
| --- | --- | --- |
| Ukuran gambar | PNG lebar 1080 px: 1080 × 1350 (4:5) atau 1080 × 1920 (9:16), berapa pun ukuran pratinjau. | Sama. |
| **Bagikan** | Lembar berbagi sistem (WhatsApp, Instagram, dll.). Bila perangkat tidak mendukung: *Berbagi tidak tersedia di perangkat ini*. | Web Share bila browser mendukung berbagi berkas; bila tidak, gambar diunduh sebagai `jejak.png`. |
| **Simpan ke galeri** / **Unduh gambar** | Meminta izin foto, lalu menyimpan ke galeri: *Gambar tersimpan di galeri.* Bila izin ditolak: *Izin galeri ditolak. Aktifkan izin foto untuk Jejak di pengaturan HP.* | Mengunduh `jejak-<id>-<template>.png`: *Gambar diunduh.* |

Izin yang dipakai fitur ini (dari `app.json`): akses foto untuk memilih foto, kamera untuk memotret, dan izin menyimpan foto ke galeri. Mikrofon tidak diminta.

---

## Ekspor GPX

Tombol **Ekspor GPX** di detail aktivitasmu sendiri membuat berkas GPX 1.1 standar (`lib/gpx.ts`) yang bisa diimpor ke aplikasi atau layanan lain yang menerima GPX.

Isi berkas:

- `creator="Jejak"`, nama = judul aktivitas, waktu = waktu mulai;
- jenis track: `running`, `cycling`, atau `walking`;
- setiap bagian rekaman (dipisah jeda) menjadi satu `<trkseg>`;
- setiap titik: lintang/bujur 7 desimal, ketinggian (`<ele>`, 1 desimal) bila ada, dan waktu ISO.

Nama berkas: `jejak-<tanggal>-<judul>.gpx`, misalnya `jejak-2026-10-28-lari-pagi.gpx`. Judul diubah ke huruf kecil dengan karakter selain `a-z0-9` diganti tanda hubung; bila judul jadi kosong, dipakai id aktivitas. Tanggalnya diambil dari waktu mulai dalam UTC.

| | HP | Web |
| --- | --- | --- |
| Hasil | Berkas ditulis ke cache app lalu dibuka lewat lembar berbagi sistem (*Ekspor aktivitas*), sehingga bisa disimpan ke Files/Drive atau dikirim ke aplikasi lain. | Berkas langsung diunduh. |

Bila gagal, pesan error tampil di bawah tombol.

---

## Membuat segmen

Layar `aktivitas/[id]/segmen.tsx`, dibuka dari detail aktivitasmu sendiri.

Segmen adalah potongan jalan yang waktunya diadu. Kamu memilih potongan itu dari jalur aktivitasmu:

1. Jalur aktivitas digambar merah, potongan terpilih digambar oranye dengan pin hijau **S** (start) dan pin merah **F** (finish). Awalnya potongan diambil dari 25% sampai 75% jumlah titik.
2. Pilih ujung yang mau diatur: **Titik awal (S)** atau **Titik akhir (F)**.
3. **Ketuk peta** di dekat jalur: ujung yang aktif pindah ke titik jalur terdekat, lalu pilihan otomatis berpindah ke ujung lainnya.
4. Untuk penyesuaian halus pakai tombol **−20**, **−5**, **+5**, **+20 titik**.
5. Panel menampilkan **Panjang** potongan dan **Waktumu** di potongan itu.
6. Segmen minimal 100 m. Bila kurang, muncul peringatan merah dan tombol nonaktif.
7. Isi **nama segmen** (maksimal 80 karakter), lalu **Buat segmen**.

Setelah dibuat:

- semua aktivitas lama (milik siapa pun) yang melewati segmen ini langsung dicocokkan, sehingga leaderboard langsung terisi;
- aktivitas baru yang melewatinya otomatis mendapat waktu segmen saat diunggah.

Segmen dari aktivitas lari atau jalan kaki menjadi **segmen lari** dan berlaku untuk aktivitas lari maupun jalan kaki. Segmen dari aktivitas sepeda menjadi **segmen sepeda** dan hanya berlaku untuk aktivitas sepeda.

Sebuah aktivitas dianggap melewati segmen bila lewat dari S ke F **searah**, melalui semua titik kontrol di sepanjang segmen, dengan jarak tempuh yang wajar. Detailnya ada di [algoritma.md](algoritma.md#pencocokan-segmen).

---

## Segmen dan leaderboard

**Tab Segmen** (`(tabs)/segmen.tsx`):

- bila posisimu diketahui, menampilkan 50 segmen **Terdekat dari posisimu** (diukur ke titik awal segmen) beserta jaraknya dari sini;
- bila tidak, menampilkan 50 segmen **Paling ramai** (atlet terbanyak, lalu yang terbaru).

Setiap kartu: cuplikan peta (garis oranye), nama, lalu panjang dan jumlah atlet (*1,20 km, 4 atlet*).

**Detail segmen** (`segmen/[id].tsx`):

- peta segmen (garis oranye) dengan pin **S** dan **F** (atau satu pin **S/F** bila ujungnya berjarak kurang dari 30 m);
- jenis (lari/bersepeda), nama, pembuat;
- **Panjang**, **Atlet** (jumlah orang yang punya waktu di segmen ini), **Rekor** (waktu tercepat; hanya diisi pada filter *Semua*);
- kartu hijau tua **Waktu terbaikmu**: waktu (hijau), lalu *pace/kecepatan, tanggal*, dan **Peringkat** (bingkai emas untuk peringkat 1–3). Peringkat ini selalu dihitung terhadap semua atlet. Bila belum punya waktu: *Kamu belum punya waktu di sini. Lewati segmen ini dari S ke F saat merekam.*;
- **Leaderboard** dengan pilihan:
  - **Semua**: waktu terbaik tiap atlet;
  - **Yang kuikuti**: hanya kamu dan orang yang kamu ikuti.

  Setiap baris: peringkat (lingkaran emas, perak, perunggu untuk 1–3), nama (baris milikmu disorot dan diberi tanda *(kamu)*), tanggal, pace/kecepatan, dan waktu. Ketuk baris untuk membuka aktivitas yang mencatat waktu itu. Leaderboard menampilkan paling banyak 100 atlet.
- **Hapus segmen** (hanya pembuatnya). Leaderboard segmen ikut terhapus.

---

## Profil dan statistik

**Tab Profil** (`(tabs)/profil.tsx`) dan **profil atlet lain** (`atlet/[id].tsx`) memakai komponen yang sama (`components/ProfileView.tsx`).

Bagian atas (panel gelap):

- avatar inisial, nama, `@username`;
- jumlah **pengikut** dan **mengikuti**;
- tombol **Ikuti / Mengikuti** (hanya di profil orang lain);
- total semua jenis: **Aktivitas**, **Jarak**, **Waktu** bergerak;
- di tab Profil sendiri ada tombol **Cari teman** dan **Keluar** (dengan konfirmasi) di pojok kanan atas.

Statistik per jenis (pilih Lari / Bersepeda / Jalan kaki):

- grafik batang jarak **12 minggu terakhir** (minggu dimulai Senin, menurut zona waktu HP), dengan minggu ini disorot dan label puncak;
- **Minggu ini**, **Tahun ini**, dan **Total** (km).

**Rekor pribadi** untuk jenis yang dipilih: waktu terbaik sepanjang masa untuk tiap jarak standar (lihat tabel di [Detail aktivitas](#detail-aktivitas)) dan kotak **Terjauh** (aktivitas terpanjang). Ketuk kotak untuk membuka aktivitas asalnya.

Di bawahnya daftar **Aktivitas** milik atlet tersebut (semua jenis, 20 per muatan, terus dimuat saat digulir). Tarik ke bawah untuk menyegarkan.

---

## Cari dan ikuti teman

Layar `cari.tsx`, dibuka dari ikon orang+ di Beranda atau Profil.

- Ketik nama atau username. Pencarian berjalan 300 ms setelah berhenti mengetik, mencocokkan sebagian teks pada username maupun nama, dan menampilkan maksimal 30 orang (urut username). Kotak kosong menampilkan pengguna lain tanpa filter.
- Dirimu sendiri tidak ikut tampil.
- Ketuk nama untuk membuka profilnya, atau tombol **Ikuti / Mengikuti** untuk mengikuti atau berhenti mengikuti.

Mengikuti seseorang membuat aktivitasnya muncul di Beranda dan membuatnya masuk filter **Yang kuikuti** di leaderboard segmen. Mengikuti bersifat satu arah dan tidak perlu persetujuan.
