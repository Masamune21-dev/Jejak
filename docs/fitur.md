# Panduan fitur

Panduan pemakaian Jejak per layar, sesuai perilaku kode saat ini. Nama berkas layar ada di `app/src/app/`.

## Daftar isi

1. [Navigasi utama](#navigasi-utama)
2. [Halaman depan (versi web)](#halaman-depan-versi-web)
3. [Daftar dan masuk](#daftar-dan-masuk)
4. [Beranda (feed)](#beranda-feed)
5. [Rekam aktivitas](#rekam-aktivitas)
6. [Mengikuti rute saat merekam](#mengikuti-rute-saat-merekam)
7. [Rute: daftar dan detail](#rute-daftar-dan-detail)
8. [Membuat rute](#membuat-rute)
9. [Detail aktivitas](#detail-aktivitas)
10. [Bagikan ke foto](#bagikan-ke-foto)
11. [Ekspor GPX](#ekspor-gpx)
12. [Membuat segmen](#membuat-segmen)
13. [Segmen dan leaderboard](#segmen-dan-leaderboard)
14. [Profil dan statistik](#profil-dan-statistik)
15. [Pengikut dan mengikuti](#pengikut-dan-mengikuti)
16. [Cari dan ikuti teman](#cari-dan-ikuti-teman)
17. [Postingan](#postingan)
18. [Pesan (chat)](#pesan-chat)
19. [Pengaturan](#pengaturan)
20. [Notifikasi dan pembaruan](#notifikasi-dan-pembaruan)

Bawaannya app gelap (aspal) dengan aksen marka kuning. Sejak 0.2.0 tema (Ikuti HP / Gelap / Terang) dan warna aksen (kuning, mint, biru, oranye, pink) bisa diganti di [Pengaturan](#pengaturan) (lihat [desain.md](desain.md)). Arti warna tetap sama: **warna aksen** untuk aksi utama, jalur rekaman, dan petunjuk arah, **biru** untuk rute rencana (**toska** bila aksennya biru), **ungu** untuk segmen, dan **merah** untuk rekaman yang sedang berjalan atau peringatan. Di bawah, "warna aksen" berarti warna yang kamu pilih.

---

## Navigasi utama

Setelah masuk, app menampilkan lima tab (`app/src/app/(tabs)/`, tab bar di `components/TabBar.tsx`):

| Tab | Berkas | Isi |
| --- | --- | --- |
| Beranda | `index.tsx` | Ringkasan minggu ini dan feed aktivitas serta postingan. |
| Rute | `rute.tsx` | Rute yang kamu simpan dan tombol membuat rute baru. |
| **Rekam** (tombol bulat di tengah) | `rekam.tsx` | Perekam GPS. |
| Segmen | `segmen.tsx` | Segmen terdekat atau paling ramai. |
| Profil | `profil.tsx` | Profil, statistik, rekor pribadi, aktivitasmu. |

Tombol Rekam di tengah tab bar berwarna aksen dan bercahaya saat tidak ada rekaman. Selama ada rekaman yang belum disimpan (sedang merekam, dijeda, atau menunggu disimpan), tombol berubah merah dengan ikon denyut dan label **Merekam**, jadi kamu selalu tahu masih ada rekaman yang terbuka walau sedang di tab lain.

Layar lain dibuka di atas tab: detail aktivitas (`aktivitas/[id]`), buat segmen (`aktivitas/[id]/segmen`), bagikan (`aktivitas/[id]/bagikan`), detail segmen (`segmen/[id]`), rute baru (`rute/baru`), detail rute (`rute/[id]`), profil atlet lain (`atlet/[id]`), cari teman (`cari`), pengikut/mengikuti (`koneksi/[id]`), tulis postingan (`tulis`), detail postingan (`postingan/[id]`), daftar pesan (`pesan/index`), percakapan (`pesan/[id]`), dan pengaturan (`pengaturan`).

Semua layar itu hanya bisa dibuka setelah masuk. Selama belum masuk, layarnya hanya `masuk`, ditambah [halaman depan](#halaman-depan-versi-web) di alamat utama versi web.

---

## Halaman depan (versi web)

Pengunjung versi web yang belum masuk melihat halaman depan (`components/landing/Landing.tsx`) langsung di alamat utama `/`; pengguna yang sudah masuk melihat Beranda di alamat yang sama. Semua alamat lain yang butuh login, juga alamat lama `/sambut`, diarahkan ke `/`. Di aplikasi HP, pengguna yang belum masuk langsung ke halaman masuk. Dari halaman masuk versi web ada tautan *Kenali Jejak lebih dulu* untuk kembali ke halaman depan.

Isi halaman, dari atas:

| Bagian | Isi |
| --- | --- |
| Navigasi | Wordmark, tautan **Fitur**, **Cara pakai**, **Privasi**, **Unduh** (hanya di layar lebar, menggulir ke bagiannya), dan tombol **Masuk**. Menempel di atas saat digulir. |
| Hero | Setinggi satu layar, berlatar peta kota Pati (OSM versi gelap). Judul *Setiap jalan dekat rumah bisa jadi lintasanmu.*, penjelasan singkat, tombol **Unduh untuk Android** dan **Masuk atau daftar**. Rute Keliling Alun-alun Pati tergambar sendiri di peta latar pada lokasi aslinya selama ±9 detik (di kanan pada layar lebar, di atas judul pada HP), sementara kartu angka Waktu dan Jarak ikut berjalan, lalu berhenti dengan status *Tersimpan*. Bila perangkat memakai pengaturan "kurangi gerakan", rute langsung tampil utuh. |
| Fitur | Lima baris berselang-seling, masing-masing dengan potongan tampilan asli app: layar kunci dengan notifikasi rekaman, banner belok dan keluar rute, papan peringkat segmen, stiker transparan (komponen yang sama dengan layar Bagikan), dan gelembung chat. |
| Cara pakai | Tiga langkah berurutan di atas patok KM 0, 1, 2: pasang dan daftar, rekam, bagikan dan adu waktu. |
| Privasi | Papan rambu hijau: zona privasi 300 m, lokasi di foto dihapus, foto dan postingan hanya untuk yang masuk, pesan tidak terenkripsi ujung-ke-ujung. |
| Unduh | Latar beton. Versi, nomor build, dan ukuran APK dibaca dari `/unduh/versi.json` (bila belum ada, tertulis *Versi terbaru*). Tombol **Unduh APK**, diikuti tiga langkah pemasangan. |
| Sering ditanyakan | Lima pertanyaan yang bisa dibuka-tutup: gratis, kenapa tidak di Play Store, iPhone, izin lokasi "sepanjang waktu", dan garis yang melenceng dari jalan. |
| Kaki halaman | Hak cipta (tahun berjalan) dan "Gratis dan tanpa iklan", atribusi peta dan rute, tautan **Masuk**, **Daftar** (membuka form daftar), **Unduh APK**, dan **GitHub** (repo Jejak, di tab baru). |

Semua tombol unduh (hero, bagian Unduh, kaki halaman) membuka **modal donasi** (`components/landing/DonationModal.tsx`) dulu, bukan langsung mengunduh:

- judul *Bantu Jejak terus berlari* dan ajakan donasi berapa saja untuk server dan pengembangan;
- QR QRIS donasi di atas pelat putih (`app/public/donasi-qris.png`, tersaji di `/donasi-qris.png`: QR saja, hitam-putih, dipotong dari kartu QRIS pemilik), dengan keterangan bisa dipindai aplikasi bank atau dompet digital apa pun;
- **Simpan gambar QR** (mengunduh `qris-donasi-jejak.png`) dan petunjuk untuk yang membuka dari HP: simpan gambarnya lalu pilih dari galeri di aplikasi pembayaran;
- tombol unduh yang nonaktif dengan hitung mundur *Unduh APK dalam 10 detik* … *1 detik*, lalu menjadi **Unduh APK** (mengunduh `/unduh/jejak.apk?v=<versi>` dan menutup modal); di bawahnya *Donasi tidak wajib…*, lalu *Terima kasih sudah mencoba Jejak.*;
- ditutup dengan tombol ✕, ketuk di luar kartu, atau Esc. Hitung mundur mulai dari awal setiap modal dibuka.

Warna halaman depan tetap aspal + marka kuning, apa pun tema yang dipilih pengguna. Lebar 960 px ke atas memakai dua kolom; di bawahnya semua bertumpuk dan tombol di hero selebar layar.

---

## Daftar dan masuk

Layar `masuk.tsx` punya dua mode lewat pilihan **Masuk / Daftar**.

**Daftar** membutuhkan:

| Isian | Aturan (dicek server) |
| --- | --- |
| Username | 3–20 karakter, hanya huruf, angka, titik, dan garis bawah. Disimpan dalam huruf kecil, jadi `Dicky` dan `dicky` dianggap sama. |
| Nama tampilan | 1–50 karakter. |
| Kata sandi | 6–200 karakter, dan tidak boleh mudah ditebak: kata sandi umum (`123456`, `password`, `sayang`, …), satu huruf diulang, deret angka, atau memuat username. Pesannya *Kata sandi terlalu mudah ditebak*. |

Bila username sudah dipakai, muncul pesan *Username sudah dipakai*.

**Masuk** cukup username dan kata sandi. Huruf besar/kecil pada username tidak berpengaruh. Bila salah: *Username atau kata sandi salah*.

Saat keyboard muncul, layar bergeser ke bawah sehingga kolom yang sedang diketik dan tombol **Masuk**/**Buat akun** tetap terlihat di atas keyboard.

Kolom kata sandi punya tombol mata di kanan (*Tampilkan kata sandi* / *Sembunyikan kata sandi*), juga di layar [Akun](#pengaturan). Kolomnya memberi tahu pengelola kata sandi browser dan HP (`current-password` saat masuk, `new-password` saat daftar).

Setelah berhasil, token sesi disimpan di HP (Keychain/Keystore) atau di `localStorage` pada versi web, sehingga kamu tetap masuk saat app dibuka lagi. Sesi berakhir saat kamu menekan **Keluar** di [Pengaturan](#pengaturan), atau bila app tidak dipakai selama 90 hari (lalu kamu diminta masuk lagi).

Di bagian bawah layar masuk tertulis **Server: …**, alamat API yang dipakai app. Ini berguna untuk memastikan app terhubung ke server yang benar (produksi atau komputer sendiri).

---

## Beranda (feed)

Layar `(tabs)/index.tsx`.

- **Sapaan dan tanggal** dengan avatarmu (foto profil atau inisial; ketuk untuk membuka profil): "Selamat pagi" (sebelum 11.00), "siang" (sebelum 15.00), "sore" (sebelum 18.00), atau "malam", plus nama depanmu.
- Di kanan atas: ikon **Pesan** (gelembung chat) yang membuka [daftar pesan](#pesan-chat), dengan bulatan merah berisi jumlah pesan belum dibaca (*9+* bila lebih dari 9; dicek tiap 30 detik selama Beranda terbuka), dan tombol **Cari teman** (ikon orang+).
- **Kartu Minggu ini** (gradasi bersemu warna aksen): total jarak minggu berjalan (Senin–Minggu) dari semua jenis aktivitas, pil perbandingan dengan minggu lalu (misalnya *12% lebih jauh dari minggu lalu*), baris "N aktivitas, Xj Ym bergerak", dan ikon jejak bercahaya.
- **Aksi cepat**: empat kotak, yaitu **Rekam** (terisi warna aksen), **Buat rute**, **Tulis** (membuat [postingan](#postingan)), dan **Segmen**. Sebelum 0.2.0, kotak keempat adalah **Teman**; cari teman kini lewat ikon orang+ di kanan atas.
- **Terbaru dari teman**: aktivitas dan postingan milikmu sendiri dan orang yang kamu ikuti, digabung urut waktu, terbaru di atas. Daftar memuat 20 item sekaligus dan memuat berikutnya otomatis saat digulir ke bawah. Tarik ke bawah untuk menyegarkan.

Setiap aktivitas tampil sebagai kartu bergradasi dengan peta bersudut bulat di dalamnya, dan menampilkan:

- nama atlet (ketuk untuk membuka profilnya) dan satu kalimat jenis + waktu, misalnya *Lari, hari ini pukul 06.12*, *Bersepeda, kemarin pukul 16.40*, *Jalan kaki, 3 hari lalu*, atau *Lari, 12 Okt 2026* untuk yang lebih dari seminggu;
- lencana **N PR** bila aktivitas itu memecahkan rekor pribadi atau rekor segmen;
- judul, **Jarak**, **Pace** (lari/jalan, menit per km) atau **Kecepatan** (sepeda, km/j), dan **Waktu** bergerak;
- cuplikan peta jalurnya;
- tombol **kudos** (jempol) dengan jumlahnya. Ketuk untuk memberi, ketuk lagi untuk membatalkan. Tombol ini nonaktif untuk aktivitasmu sendiri;
- jumlah komentar dan tautan **Lihat detail**.

Postingan tampil sebagai kartu postingan (lihat [Postingan](#postingan)): penulis, waktu, teks, foto, tanda segmen, tombol suka dan jumlah balasan.

Bila feed masih kosong, muncul ajakan **Mulai rekam** dan **Cari teman**.

---

## Rekam aktivitas

Layar `(tabs)/rekam.tsx`, dengan logika di `lib/recorder.ts`.

### Sebelum mulai

1. **Pilih jenis**: Lari, Bersepeda, atau Jalan kaki.
2. **Pilih rute** (opsional): ketuk baris **Rute**. Pilih *Bebas, tanpa rute* atau salah satu rute yang sudah kamu simpan (baris lalu bertuliskan *Nama rute, 5,20 km*). Jenis aktivitas otomatis mengikuti jenis rute yang dipilih.
3. Bila memilih rute, peta menampilkan garis rute (biru) dan banner berwarna aksen berisi nama rute serta posisimu terhadap rute: *Kamu sudah di rute. Total X* (dalam 40 m dari garis) atau *Titik terdekat rute X dari sini. Total Y*.
4. Ketuk tombol besar **Mulai lari / bersepeda / jalan kaki**.

Saat pertama kali, app meminta izin lokasi. Di APK yang dibangun sendiri, app juga menanyakan izin lokasi latar (*Izinkan sepanjang waktu*) **satu kali saja**. Di Android 11 ke atas permintaan ini membuka halaman Pengaturan.

Bila izin ditolak atau GPS gagal menyala, pesan error tampil di panel dan rekaman **tidak** dimulai (status tetap seperti sebelum tombol ditekan). Hal yang sama berlaku untuk **Lanjut**.

### Saat merekam

- Pil di atas peta menunjukkan sumber lokasi dan akurasinya:
  - *GPS aktif, tetap merekam saat layar mati* (lokasi latar aktif);
  - *GPS aktif. Biarkan layar menyala* (tanpa izin latar atau di Expo Go; layar dicegah mati otomatis);
  - *Simulasi GPS, 8× lebih cepat* (mode uji);
  - *Menunggu GPS akurat sebelum mencatat…* (di awal rekaman, sampai akurasi 20 m atau lebih baik, paling lama 20 detik; jarak tetap 0 selama itu).
  
  Angka dalam kurung, misalnya *(±6 m)*, adalah akurasi GPS. Titik hijau berarti akurasi 20 m atau lebih baik, titik kuning berarti lebih buruk.
- Panel bawah menampilkan **Waktu** (stopwatch waktu aktif, tidak termasuk jeda), **Jarak** (km), dan **Pace** atau **Kecepatan**.
- Peta mengikuti posisimu. Jalur yang sudah terekam digambar dengan warna aksen.
- Tombol **Jeda** menghentikan GPS dan stopwatch.

Tidak ada jeda otomatis: berdiri diam tetap menambah stopwatch. Namun saat aktivitas disimpan, server menghitung **waktu bergerak** terpisah (lihat [algoritma.md](algoritma.md#waktu-bergerak)).

### Saat dijeda

Label stopwatch berubah menjadi **Dijeda**. Pilih:

- **Lanjut**: merekam lagi. Jalur setelah jeda menjadi bagian baru, sehingga jarak dan waktu selama jeda tidak dihitung.
- **Tahan untuk selesai**: tombol berbendera berwarna aksen ini harus **ditekan dan ditahan** sekitar 0,6 detik, supaya rekaman tidak tertutup karena tersentuh tanpa sengaja. Bila hanya diketuk, labelnya berubah merah menjadi *Tekan lebih lama* selama 2,5 detik dan tidak terjadi apa-apa. Setelah ditahan, rekaman ditutup dan layar simpan terbuka.

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

- **Banner berwarna aksen (belokan)** menampilkan jarak ke belokan berikutnya dalam angka besar (misalnya *120 m* atau *1,20 km*), teks petunjuknya (misalnya *Belok kiri ke Jalan Pemuda*), dan *Sisa X* jarak rute. Panah menyesuaikan teks: kiri, kanan, putar/bundaran, atau bendera untuk *Sampai di tujuan*. Bila tidak ada belokan lagi, tertulis *Ikuti garis rute*.
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
- tombol **Ekspor GPX** (sejak 0.3.0, untuk semua rute yang bisa dibuka): berkas GPX rute untuk diikuti di jam GPS, dengan keterangan *Buka berkas GPX di aplikasi jam GPS, misalnya Garmin Connect atau COROS* (lihat [Ekspor GPX](#ekspor-gpx));
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

**Peta** menampilkan jalur (warna aksen, tiap bagian setelah jeda digambar terpisah) dengan titik hijau di awal dan merah di akhir.

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

**Segmen**: daftar segmen yang dilewati aktivitas ini, berurutan sesuai posisi di jalur. Tiap baris menampilkan nama segmen, panjang, pace/kecepatan, waktu, lencana **PR** bila memecahkan waktu terbaikmu sebelumnya di segmen itu, dan lencana **#peringkat**, yaitu peringkat waktu ini dibanding waktu terbaik atlet lain. Ketuk satu baris untuk menyorot potongan jalurnya di peta (ungu) dan memunculkan tombol **Lihat leaderboard**.

**Split per km**: satu baris per kilometer. Nomor km ditampilkan dalam bulatan kecil (berwarna aksen untuk km tercepat), diikuti pace (lari/jalan) atau km/j (sepeda) dan sebuah batang:

- panjang batang = kecepatan split itu dibanding split tercepat (`tercepat ÷ split × 100%`, minimal 12%), jadi selisih kecil tampak kecil, tidak dibesar-besarkan;
- batang **berwarna aksen** menandai km tercepat. Untuk penanda ini hanya split minimal 900 m yang dibandingkan, jadi kilometer terakhir yang pendek tidak dianggap tercepat;
- keterangan di bawahnya: *Pace per km. Batang berwarna menandai km tercepat.* (sepeda: *Kecepatan per km dalam km/j. …*).

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

Layar `aktivitas/[id]/bagikan.tsx` (judul **Bagikan**), dibuka lewat tombol **Bagikan** di detail aktivitasmu sendiri. Hasil aktivitas dijadikan gambar PNG: sebagai **stiker transparan** untuk ditempel di atas foto sendiri (gaya Strava), atau ditempel langsung di atas foto atau latar polos.

### Langkah

1. **Geser kiri/kanan** di pratinjau untuk memilih tata letak. Galeri berisi 9 halaman: lima **stiker transparan** (*Samping*, *Daftar*, *Tumpuk*, *Ringkas*, *Baris*), lalu empat template lama yang punya latar sendiri (*Nomor dada*, *Rute*, *Patok KM*, *Rambu*). Titik-titik di bawah pratinjau menandai halaman yang terbuka, dan namanya tertulis di bawahnya (untuk stiker ditambah *· stiker transparan*). Yang terbuka pertama kali: *Samping*.
2. Stiker tanpa foto ditampilkan di atas **pola kotak-kotak** abu-abu. Pola ini hanya penanda bagian transparan dan tidak ikut tersimpan.
3. **Warna garis** (hanya untuk stiker): **Oranye** (bawaan, `#FF5A1F`), **Putih**, atau **Warna tema** (warna aksen pilihanmu). Warna ini dipakai untuk garis rute dan titik di wordmark *jejak.*
4. **Pilih format**: *Story 9:16* (bawaan) atau *Postingan 4:5*.
5. **Foto** (opsional):
   - **Pilih foto** membuka galeri (menjadi **Ganti foto** bila sudah ada foto);
   - **Kamera** membuka kamera (tidak ada di versi web). Bila izin kamera ditolak: *Izin kamera ditolak. Aktifkan kamera untuk Jejak di pengaturan HP.*;
   - tombol **×** menghapus foto.

   Foto diisi penuh ke bingkai (dipotong seperlunya), dan stiker atau template ditempel di atasnya; hasilnya gambar biasa tanpa bagian transparan. Tanpa foto, stiker tetap transparan, sedangkan template lama memakai **latar aspal** dengan garis kontur samar dan garis rutemu yang pudar (template *Rute* menggambar garis rutenya sendiri).
6. Pilih tujuan di baris **Bagikan ke**:
   - **Simpan** (di web: **Unduh**): simpan ke galeri;
   - **Salin** (hanya di HP): salin gambar ke papan klip, lalu tempel sebagai stiker di Story Instagram atau aplikasi lain (*Tersalin. Tempel sebagai stiker di Story atau aplikasi lain.*). Di iPhone gambar transparan bisa langsung ditempel sebagai stiker; di Android hasilnya bergantung versi aplikasi tujuan, jadi **Simpan** lalu pilih dari galeri tetap cara utama;
   - **Lainnya**: lembar berbagi sistem (Instagram, WhatsApp, dll.).

Selama satu tujuan diproses, tombol lain nonaktif. Belum ada tombol langsung ke Instagram Stories seperti di Strava, karena itu butuh Facebook App ID terdaftar.

### Stiker transparan

Lima stiker (`components/ShareStickers.tsx`) hanya berisi garis rute, angka, dan wordmark **jejak.**, tanpa latar. Merek yang dipakai tetap Jejak, bukan Strava. Teks putih dengan bayangan tipis dan garis rute berbayang gelap tipis, supaya terbaca di atas foto terang maupun gelap. Huruf: Plus Jakarta Sans.

Angka yang dipakai:

| Label | Isi |
| --- | --- |
| Jarak | Mis. *7,07 km*. |
| Kenaikan Elev. | Total tanjakan, dibulatkan ke meter. |
| Waktu | **Waktu bergerak**, ditulis seperti Strava: *25m 2d* (menit, detik) atau *1j 5m* (jam, menit). |
| Pace / Kecepatan | Pace untuk lari dan jalan kaki (mis. *5:42 /km*), kecepatan untuk sepeda (km/j), sama dengan feed. |
| Kecepatan Maks | Hanya sepeda. |
| Elev Maks | Ketinggian tertinggi di jejak. Tidak ditampilkan bila jejak tidak punya data ketinggian. |

| Stiker | Isi |
| --- | --- |
| **Samping** | Wordmark di kiri atas, garis rute di tengah, dan angka berpasangan yang diputar 90° di tepi kanan. Dari bawah ke atas: Jarak + Kenaikan Elev., Waktu + Pace/Kecepatan, lalu Kecepatan Maks + Elev Maks (yang tersedia). |
| **Daftar** | Garis rute besar di atas; di bawahnya wordmark dan semua angka dalam daftar dengan titik-titik penuntun (*Jarak ………… 7,07 km*). |
| **Tumpuk** | Wordmark lalu semua angka besar bertumpuk di tengah (label kecil di atas angka), dengan garis rute besar di belakangnya. |
| **Ringkas** | Tiga angka besar bertumpuk (Jarak, Kenaikan Elev., Waktu), garis rute kecil di bawahnya, wordmark paling bawah. |
| **Baris** | Garis rute, wordmark, tiga angka sebaris (Jarak, Kenaikan Elev., Waktu), lalu ikon jenis aktivitas. |

### Template lama

Empat template (`components/ShareTemplates.tsx`) ada di akhir galeri. Semuanya memakai jarak, **waktu bergerak**, dan pace (lari/jalan) atau kecepatan (sepeda) yang sama dengan feed, dan warnanya tetap (tidak ikut tema).

| Template | Isi |
| --- | --- |
| **Nomor dada** | Kertas nomor lomba putih yang sedikit miring dengan empat lubang peniti: pita merah berisi judul, jarak dalam angka raksasa, Waktu dan Pace/Kecepatan, lalu nama dan tanggal. Logo *jejak.* di kiri atas. |
| **Rute** | Garis rute putih besar berbayang dengan titik awal hijau dan titik akhir merah, plus pita gelap di bawah berisi Jarak, Pace/Kecepatan, dan Waktu. Logo di kiri atas. |
| **Patok KM** | Patok kilometer putih berkepala merah bertuliskan jenis aktivitas (*LARI*, *BERSEPEDA*, *JALAN*) dan jaraknya; di sampingnya judul, waktu, pace/kecepatan, dan tanggal. Logo di kanan atas. |
| **Rambu** | Papan petunjuk arah hijau berbingkai putih: panah ke atas dan judul, baris Jarak, Waktu, Pace/Kecepatan, lalu nama, tanggal, dan *jejak.* |

### Hasil

| | HP (Android/iOS) | Web |
| --- | --- | --- |
| Ukuran gambar | PNG lebar 1080 px: 1080 × 1920 (9:16) atau 1080 × 1350 (4:5), berapa pun ukuran pratinjau. Stiker tanpa foto: PNG dengan latar transparan. | Sama. |
| **Simpan** / **Unduh** | Meminta izin foto, lalu menyimpan ke galeri: *Gambar tersimpan di galeri.* Bila izin ditolak: *Izin galeri ditolak. Aktifkan izin foto untuk Jejak di pengaturan HP.* | Mengunduh `jejak-<id>-<tata letak>.png` (mis. `jejak-12-samping.png`, `jejak-12-bib.png`): *Gambar diunduh.* |
| **Salin** | Gambar disalin ke papan klip (`expo-clipboard`). | Tidak ada. |
| **Lainnya** | Lembar berbagi sistem (WhatsApp, Instagram, dll.). Bila perangkat tidak mendukung: *Berbagi tidak tersedia di perangkat ini*. | Web Share bila browser mendukung berbagi berkas; bila tidak, gambar diunduh sebagai `jejak.png`. |

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

**Rute** (sejak 0.3.0): tombol **Ekspor GPX** di detail rute membuat berkas untuk jam GPS. Jam dan aplikasinya (Garmin Connect, COROS, Suunto, Zepp) mengimpor track sebagai rute atau *course*, lalu rutenya bisa diikuti dari jam.

- Satu `<trk>` dengan satu `<trkseg>` berisi titik garis rute (lintang/bujur 7 desimal), tanpa waktu.
- Belum ada ketinggian (`<ele>`): garis rute dari OSRM tidak membawa data ketinggian. Aplikasi jam biasanya menghitung profil tanjakan sendiri.
- Nama dan jenis seperti GPX aktivitas; waktu di `<metadata>` = waktu rute dibuat.
- Nama berkas: `jejak-rute-<nama>.gpx`, misalnya `jejak-rute-keliling-waduk.gpx` (id rute bila nama jadi kosong). Di HP lembar berbaginya berjudul *Ekspor rute*.

---

## Membuat segmen

Layar `aktivitas/[id]/segmen.tsx`, dibuka dari detail aktivitasmu sendiri.

Segmen adalah potongan jalan yang waktunya diadu. Kamu memilih potongan itu dari jalur aktivitasmu:

1. Jalur aktivitas digambar dengan warna aksen, potongan terpilih digambar ungu dengan pin hijau **S** (start) dan pin merah **F** (finish). Awalnya potongan diambil dari 25% sampai 75% jumlah titik.
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

Setiap kartu: cuplikan peta (garis ungu), nama, lalu panjang dan jumlah atlet (*1,20 km, 4 atlet*).

**Detail segmen** (`segmen/[id].tsx`):

- peta segmen (garis ungu) dengan pin **S** dan **F** (atau satu pin **S/F** bila ujungnya berjarak kurang dari 30 m);
- jenis (lari/bersepeda), nama, pembuat;
- **Panjang**, **Atlet** (jumlah orang yang punya waktu di segmen ini), **Rekor** (waktu tercepat; hanya diisi pada filter *Semua*);
- kartu bergradasi bersemu warna aksen **Waktu terbaikmu**: waktu (warna aksen), lalu *pace/kecepatan, tanggal*, dan **Peringkat** (bingkai emas untuk peringkat 1–3). Peringkat ini selalu dihitung terhadap semua atlet. Bila belum punya waktu: *Kamu belum punya waktu di sini. Lewati segmen ini dari S ke F saat merekam.*;
- **Leaderboard** dengan pilihan:
  - **Semua**: waktu terbaik tiap atlet;
  - **Yang kuikuti**: hanya kamu dan orang yang kamu ikuti.

  Setiap baris: peringkat (lingkaran emas, perak, perunggu untuk 1–3), foto profil, nama (baris milikmu disorot dan diberi tanda *(kamu)*), tanggal, pace/kecepatan, dan waktu. Ketuk baris untuk membuka aktivitas yang mencatat waktu itu. Leaderboard menampilkan paling banyak 100 atlet.
- **Diskusi**: bagian di bawah leaderboard (bukan tab terpisah) berisi postingan yang menandai segmen ini, dari **semua pengguna**, bukan hanya yang kamu ikuti: kondisi jalan, tips, ajakan lari bareng. Postingan dari orang yang kamu blokir tidak tampil. Yang tampil 20 postingan terbaru. Tombol **Tulis** di kanan judul membuka layar [Tulis postingan](#menulis-postingan) dengan segmen ini sudah ditandai. Bila belum ada: *Belum ada diskusi. Bagikan kondisi jalan, tips, atau ajak lari bareng di segmen ini.*
- **Hapus segmen** (hanya pembuatnya). Leaderboard segmen ikut terhapus. Postingan di Diskusi tetap ada, tetapi tidak lagi bertanda segmen.

---

## Profil dan statistik

**Tab Profil** (`(tabs)/profil.tsx`) dan **profil atlet lain** (`atlet/[id].tsx`) memakai komponen yang sama (`components/ProfileView.tsx`).

Bagian atas (hero):

- **foto sampul** sebagai latar (bila ada) atau gradasi bersemu warna aksen. Di atas foto sampul ada gradasi gelap supaya teks terbaca, dan baris angka di bawah (Aktivitas / Jarak / Waktu) diberi **blur** dari foto di belakangnya. Blur memakai `expo-blur`; di Android 11 ke bawah blur tidak aktif dan yang tersisa lapisan tembus pandang serta gradasi gelap;
- **foto profil** (atau inisial berwarna bila belum ada foto), nama, `@username`;
- jumlah **pengikut** dan **mengikuti**. Ketuk salah satunya untuk membuka [daftar pengikut / mengikuti](#pengikut-dan-mengikuti);
- di profil orang lain: tombol **Ikuti / Mengikuti**, ikon **Kirim pesan** (hanya bila kalian saling mengikuti dan tidak ada blokir; membuka [percakapan](#pesan-chat)), dan ikon **…** berisi **Blokir** (dengan konfirmasi: *Blokir …? Kalian berhenti saling mengikuti dan tidak bisa saling mengirim pesan.*). Profil yang kamu blokir hanya menampilkan tombol **Buka blokir**;
- total semua jenis: **Aktivitas**, **Jarak**, **Waktu** bergerak;
- di tab Profil sendiri ada tombol **Cari teman** dan **Pengaturan** (roda gigi) di pojok kanan atas. **Keluar** pindah ke layar [Pengaturan](#pengaturan) sejak 0.2.0.

Statistik per jenis (pilih Lari / Bersepeda / Jalan kaki):

- grafik batang jarak **12 minggu terakhir** (minggu dimulai Senin, menurut zona waktu HP), dengan minggu ini disorot dan label puncak;
- **Minggu ini**, **Tahun ini**, dan **Total** (km).

**Rekor pribadi** untuk jenis yang dipilih: waktu terbaik sepanjang masa untuk tiap jarak standar (lihat tabel di [Detail aktivitas](#detail-aktivitas)) dan kotak **Terjauh** (aktivitas terpanjang). Ketuk kotak untuk membuka aktivitas asalnya.

Di bawahnya daftar **Aktivitas** milik atlet tersebut (semua jenis, 20 per muatan, terus dimuat saat digulir). Tarik ke bawah untuk menyegarkan.

### Foto profil dan sampul

Hanya di profilmu sendiri:

- ketuk **avatar** (ada lencana kamera kecil) untuk mengganti **foto profil**;
- ketuk ikon **gambar** di pojok kiri atas hero untuk mengganti **foto sampul**.

Keduanya membuka menu dari bawah: **Pilih dari galeri**, **Ambil foto** (tidak ada di web), dan **Hapus foto** (bila sudah ada foto). Foto profil dipotong persegi (1:1), foto sampul 16:9. Sebelum diunggah, app memperkecil foto (profil 512 px, sampul 1600 px) dan menyimpannya ulang sebagai JPEG, yang sekaligus **membuang data lokasi GPS** di foto. Server membuangnya sekali lagi sebagai pengaman. Selama unggah, lencana kamera berubah menjadi jam pasir. Bila gagal, pesan error tampil di bawah tombol profil.

Foto profil tampil di semua tempat yang menampilkan pengguna: Beranda, kartu aktivitas dan postingan, komentar, balasan, leaderboard, cari teman, daftar pengikut, dan pesan. Foto hanya bisa dilihat oleh pengguna yang sudah masuk.

---

## Pengikut dan mengikuti

Layar `koneksi/[id].tsx`, dibuka dengan mengetuk angka **pengikut** atau **mengikuti** di profil siapa pun (profilmu sendiri maupun orang lain). Judul layar = nama pemilik profil.

- Pilihan di atas: **N pengikut** / **N mengikuti**. Layar terbuka di pilihan yang diketuk.
- Tiap baris: foto profil, nama, `@username`, dan tombol **Ikuti / Mengikuti** (tidak ada di baris dirimu sendiri). Tombolnya menunjukkan apakah **kamu** mengikuti orang itu.
- Ketuk baris untuk membuka profilnya.
- Urut dari yang paling baru mulai mengikuti. Memuat 30 orang sekaligus, berikutnya dimuat otomatis saat digulir.
- Bila kosong: *Belum ada pengikut* atau *Belum mengikuti siapa pun* (dengan petunjuk mencari teman lewat ikon tambah teman di Beranda).

Daftar pengikut bisa dilihat semua pengguna yang sudah masuk, seperti di Strava. Mengikuti seseorang tidak membuka [zona privasi](#detail-aktivitas) jejaknya.

---

## Cari dan ikuti teman

Layar `cari.tsx`, dibuka dari ikon orang+ di Beranda atau Profil.

- Ketik nama atau username. Pencarian berjalan 300 ms setelah berhenti mengetik, mencocokkan sebagian teks pada username maupun nama, dan menampilkan maksimal 30 orang (urut username). Kotak kosong menampilkan pengguna lain tanpa filter.
- Dirimu sendiri tidak ikut tampil.
- Ketuk nama untuk membuka profilnya, atau tombol **Ikuti / Mengikuti** untuk mengikuti atau berhenti mengikuti.

Mengikuti seseorang membuat aktivitas dan postingannya muncul di Beranda dan membuatnya masuk filter **Yang kuikuti** di leaderboard segmen. Mengikuti bersifat satu arah dan tidak perlu persetujuan. Bila kalian **saling mengikuti**, kalian bisa saling mengirim [pesan](#pesan-chat). Orang yang memblokirmu atau yang kamu blokir tidak bisa diikuti.

---

## Postingan

Postingan pendek ala X: teks sampai 500 karakter, sampai 4 foto, dan bisa menandai satu segmen. Postingan tampil di Beranda kamu dan orang yang mengikutimu. Postingan yang menandai segmen juga tampil di bagian **Diskusi** halaman segmen itu untuk semua pengguna. Tidak ada lini masa umum berisi postingan semua orang.

### Menulis postingan

Layar `tulis.tsx` (judul **Tulis postingan**), dibuka dari kotak **Tulis** di Aksi cepat Beranda, atau dari tombol **Tulis** di bagian Diskusi halaman segmen.

1. Ketik teks. Penghitung *N/500* di kanan bawah kotak berubah merah bila lewat 500 karakter, dan tombol **Kirim** nonaktif.
2. **Foto (N/4)** membuka galeri, **Kamera** membuka kamera (tidak ada di web). Foto diperkecil ke lebar 1600 px dan disimpan ulang sebagai JPEG sebelum diunggah, jadi data lokasi GPS di foto terbuang. Foto tidak dipotong. Ketuk **×** di pojok foto untuk membatalkannya.
3. Bila dibuka dari halaman segmen, muncul tanda segmen (ikon bendera + nama). Ketuk **×** di tanda itu bila tidak ingin menandai segmen. Dari Beranda belum bisa memilih segmen.
4. Tekan **Kirim**. Tombol aktif bila ada teks atau minimal satu foto. Setelah terkirim, layar kembali ke halaman sebelumnya (atau ke Beranda) dan daftar postingan disegarkan.

Kotak keterangan di bawah mengingatkan siapa yang bisa melihat postingan dan bahwa lokasi di foto dihapus.

### Kartu postingan

Di Beranda, Diskusi segmen, dan layar detail postingan:

- foto profil dan nama penulis (ketuk untuk membuka profilnya) dan waktu (*Hari ini pukul 07.01*, *Kemarin pukul 16.40*, *3 hari lalu*, atau tanggal);
- teks (di feed dipotong 8 baris; lengkap di layar detail);
- foto: satu foto 4:3; dua atau empat foto berpetak persegi; tiga foto dengan foto pertama melebar 16:9;
- tanda **segmen** (ketuk untuk membuka segmen) dan, bila ada, tanda aktivitas;
- **suka** (hati, langsung berubah saat diketuk lalu disamakan dengan server) dan jumlah **balasan**;
- ikon **…**: **Hapus postingan** untuk postinganmu sendiri (dengan konfirmasi, permanen), atau **Laporkan** untuk postingan orang lain. Setelah melapor muncul *Terima kasih, laporan terkirim.* Laporan ditinjau pemilik app.

Ketuk kartu untuk membuka detailnya.

### Detail postingan dan balasan

Layar `postingan/[id].tsx` (judul **Postingan**): kartu postingan lengkap, lalu **Balasan** dari yang terlama ke terbaru. Kolom **Tulis balasan…** di bawah (maksimal 500 karakter) ikut naik saat keyboard muncul. Ikon tempat sampah muncul di balasan milikmu dan di semua balasan bila postingannya milikmu. Bila belum ada: *Belum ada balasan. Jadilah yang pertama.*

---

## Pesan (chat)

Pesan 1-lawan-1 dengan teman yang **saling mengikuti**. Pesan baru tidak dikirim sebagai notifikasi push: terlihat lewat angka di ikon Pesan Beranda saat app dibuka.

### Daftar pesan

Layar `pesan/index.tsx` (judul **Pesan**), dibuka dari ikon gelembung chat di Beranda. Tiap baris: foto profil, nama, waktu pesan terakhir, dan potongan pesan terakhir (diawali *Kamu:* bila kamu pengirimnya). Percakapan dengan pesan belum dibaca ditebalkan dan diberi bulatan berwarna aksen berisi jumlahnya. Daftar diperbarui tiap 15 detik selama layar terbuka, dan bisa ditarik ke bawah untuk menyegarkan.

Bila kosong: *Belum ada pesan* dengan tombol **Lihat yang kuikuti**.

### Percakapan

Layar `pesan/[id].tsx`, dibuka dari daftar pesan atau ikon **Kirim pesan** di profil teman. Judulnya foto profil + nama teman (ketuk untuk membuka profilnya).

- Gelembung pesanmu di kanan (warna aksen), pesan teman di kiri. Di bawah tiap pesan: jam (*06.12*), dan untuk pesanmu *· terkirim* atau *· dibaca*.
- Saat dibuka, 30 pesan terakhir dimuat; gulir ke atas untuk memuat pesan yang lebih lama. Pesan dari teman otomatis ditandai sudah dibaca.
- Pesan baru diambil **tiap 3 detik** selama layar ini terbuka.
- Kolom **Tulis pesan…** (maksimal 1000 karakter) ikut naik saat keyboard muncul. Tombol kirim aktif bila ada teks.
- Bila kalian tidak lagi saling mengikuti, kolom tulis diganti keterangan *Pesan hanya bisa dikirim ke teman yang saling mengikuti.* Bila kamu memblokir dia: *Kamu memblokir pengguna ini. Buka blokir dari profilnya untuk mengirim pesan.* Riwayat percakapan tetap bisa dibaca.

**Tekan lama** pesanmu sendiri untuk menghapusnya (setelah konfirmasi); pesan itu hilang juga dari layar temanmu. Pesan disimpan di server Jejak dan **tidak terenkripsi ujung-ke-ujung**.

### Blokir

Dari ikon **…** di profil orang lain. Blokir memutus saling mengikuti dari kedua arah, menolak pesan baru dari kedua arah, mencegah kalian saling mengikuti lagi, dan menyembunyikan postingannya dari Diskusi segmen yang kamu buka. Orang yang diblokir tidak diberi tahu. **Buka blokir** dari profilnya mengembalikan semuanya kecuali follow yang sudah terputus: kalian perlu saling mengikuti lagi.

---

## Pengaturan

Layar `pengaturan.tsx` (judul **Pengaturan**), dibuka dari ikon roda gigi di kanan atas tab Profil.

**Akun** (paling atas): kartu berisi nama dan @username dengan tulisan *Ganti nama atau kata sandi*, membuka layar `akun.tsx` (judul **Akun**, sejak 0.3.1):

- **Nama tampilan**: kolom nama (1–50 karakter) dan tombol **Simpan nama** (aktif bila nama berubah). Berhasil: *Nama disimpan.*; nama baru langsung dipakai di Beranda dan data lain diambil ulang. Di bawah kolom: *Username @… tidak bisa diganti.*
- **Kata sandi**: **Kata sandi sekarang**, **Kata sandi baru**, **Ulangi kata sandi baru**, dan tombol **Ganti kata sandi**. Aturan kata sandi baru sama dengan saat daftar, dan harus berbeda dari yang sekarang. Pesan bila gagal: *Kata sandi baru dan ulangannya tidak sama* (dicek app), *Kata sandi sekarang salah*, atau aturan kata sandi dari server. Berhasil: kolom dikosongkan dan tampil *Kata sandi diganti. HP dan browser lain yang masuk dengan akun ini sudah dikeluarkan.*; HP yang dipakai mengganti tetap masuk.

**Tampilan**:

| Pilihan | Isi |
| --- | --- |
| **Tema** | **Ikuti HP** (mengikuti mode gelap/terang sistem dan ikut berganti saat sistem berganti), **Gelap** (bawaan), atau **Terang**. |
| **Warna aksen** | Lima bulatan: **Kuning** (kuning marka, bawaan), **Mint**, **Biru**, **Oranye**, **Pink**. Yang terpilih diberi centang. |

Di bawahnya ada pratinjau kecil: tombol *Mulai lari* dan pil *6,12 km* dengan warna yang dipilih. Pilihan langsung berlaku di semua layar tanpa membuka ulang app, dan tersimpan di HP (tidak ikut akun, jadi tiap HP punya pilihan sendiri). Dengan tema terang, peta memakai ubin OpenStreetMap asli tanpa digelapkan. Template bagikan lama tidak ikut tema; stiker hanya ikut bila warna garis **Warna tema** dipilih.

**Tentang aplikasi**:

| Baris | Isi |
| --- | --- |
| Logo | *jejak.* dengan keterangan *Rekam lari dan gowes, buat rute, adu waktu dengan teman.* |
| **Versi** | Versi dari `app.json` dan nomor build Android dari APK yang terpasang, mis. *0.2.0 (build 7)*. Di web dan Expo Go hanya versinya, tanpa nomor build. |
| **Pembaruan** | Hanya di APK, setelah `versi.json` terbaca: *Sudah versi terbaru* atau *Jejak x.y.z tersedia* dengan tombol **Unduh Jejak x.y.z**. |
| **Pembuat** | *Dibuat oleh Masamune* |
| **Email** | *info@masamune.my.id*, diketuk membuka aplikasi email. |
| **GitHub** | *github.com/Masamune21-dev*, diketuk membuka browser. |
| **Server** | Alamat API yang dipakai, mis. *jejak.masamune.my.id/api*. |
| **Peta** | *© OpenStreetMap contributors* |
| **Rute** | *OSRM, routing.openstreetmap.de (FOSSGIS)* |

Ditambah catatan privasi: pesan chat tersimpan di server Jejak dan tidak terenkripsi ujung-ke-ujung, foto yang diunggah dibersihkan dari data lokasi sebelum disimpan, dan bila notifikasi dinyalakan, token notifikasi HP disimpan di server Jejak dan dikirim lewat Firebase Cloud Messaging (Google). Tombol **Kirim masukan** membuka email ke info@masamune.my.id dengan subjek *Masukan Jejak <versi>* dan teks awal berisi versi app, model HP, dan versi Android. Kontak diatur di `lib/contact.ts`.

**Notifikasi** (hanya APK; disembunyikan di web dan Expo Go), di atas Tentang aplikasi: sakelar **Info dan pembaruan**. Menyalakannya meminta izin notifikasi (Android 13+) lalu mendaftarkan HP ke server; mematikannya menghapus HP dari server. Bila izin ditolak di pengaturan HP, muncul keterangan merah dan tombol **Buka pengaturan HP**.

**Keluar**: tombol paling bawah, dengan konfirmasi *Keluar dari akun ini?*. Sesi di HP itu dihapus dan app kembali ke layar masuk. Rekaman yang belum disimpan tetap di HP.

## Notifikasi dan pembaruan

Mulai 0.3.0, hanya di APK.

- **Kartu Nyalakan notifikasi** di Beranda (di bawah salam) selama pengguna belum memilih: **Nyalakan** (minta izin, daftarkan HP) atau **Nanti** (dianggap mati; bisa dinyalakan di Pengaturan).
- **Notifikasi** datang dari server (`deploy/deploy.sh notif`) di kanal *Info dan pengumuman* atau *Pembaruan aplikasi*, juga saat app tertutup. Saat app terbuka tampil sebagai banner. Mengetuknya membuka layar app yang dituju atau alamat https (misalnya unduhan APK). Pesan chat, kudos, dan pengikut baru **tidak** dikirim sebagai notifikasi.
- **Pendaftaran:** token FCM terikat ke sesi. Setelah keluar, HP itu tidak menerima notifikasi akun tersebut; setelah masuk lagi, token didaftarkan ulang otomatis bila notifikasi masih dinyalakan.
- **Kartu pembaruan** di Beranda saat `/unduh/versi.json` memuat versi yang lebih baru dari versi app: *Jejak x.y.z tersedia*, versi yang sedang dipakai, ukuran unduhan, sampai empat butir catatan rilis, tombol **Unduh** (membuka unduhan APK di browser) dan **Nanti** (disembunyikan untuk versi itu). Dicek saat app dibuka dan saat kembali ke depan, paling sering sekali per 6 jam.
- **Wajib perbarui:** bila `versi.json` memuat `minimal` di atas versi app, seluruh app diganti layar *Perbarui Jejak dulu* dengan tombol unduh.
