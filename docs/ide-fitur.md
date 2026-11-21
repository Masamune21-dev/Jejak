# Ide fitur Jejak

Daftar ini disusun dari kebutuhan nyata pelari dan pesepeda di Indonesia, dimulai dari yang paling berdampak untuk pemakaian sehari-hari. Ukuran usaha: **kecil** (beberapa jam), **sedang** (1–3 hari), **besar** (lebih dari seminggu). Kolom "Butuh build" berarti fitur memakai modul native yang tidak ada di Expo Go, sehingga perlu APK baru.

## Sudah ada

| Fitur | Catatan |
| --- | --- |
| Bagikan ke foto | 5 stiker transparan ala Strava (Samping, Daftar, Tumpuk, Ringkas, Baris) dan 4 template berlatar (Nomor dada, Rute, Patok KM, Rambu) dalam galeri geser, format story 9:16 dan postingan 4:5, foto dari galeri atau kamera, simpan, salin ke papan klip, atau bagikan langsung. |
| Ekspor GPX | File GPX 1.1 standar, bisa diimpor ke Strava, Garmin Connect, Komoot. |
| Foto profil dan sampul (0.2.0) | Dipotong dan diperkecil di HP, lokasi GPS dibuang, hanya terlihat oleh pengguna yang masuk. |
| Pengikut dan mengikuti (0.2.0) | Daftar per profil, bisa ikuti langsung dari daftar. |
| Postingan dan Diskusi segmen (0.2.0) | Teks + sampai 4 foto, suka, balasan, laporan; postingan bertanda segmen tampil di halaman segmen. |
| Pesan dan blokir (0.2.0) | Chat 1-lawan-1 sesama yang saling mengikuti, dengan polling (tanpa notifikasi push). |
| Tema dan warna (0.2.0) | Gelap, terang, atau ikuti HP, dengan 5 warna aksen. |
| Zona privasi rumah | 300 m pertama dan terakhir jalur disembunyikan dari orang lain (paling banyak seperempat jarak), supaya alamat tidak terbaca dari peta. |
| Antrean unggah otomatis (belum rilis) | Rekaman yang gagal diunggah saat sinyal buruk disimpan di HP, lalu dicoba lagi otomatis saat app dibuka atau kembali aktif. Kartu di Beranda menampilkan sisa antrean dengan tombol coba lagi dan hapus. `clientId` membuat unggahan ulang tidak menghasilkan aktivitas ganda. |
| Visibilitas aktivitas (belum rilis) | Publik, pengikut, atau pribadi untuk setiap aktivitas, plus sakelar sembunyikan peta. Aktivitas pribadi tidak muncul di feed, statistik orang lain, atau leaderboard. |
| Ekspor data dan hapus akun (belum rilis) | Unduh semua data sebagai satu berkas JSON dari layar Akun; hapus akun beserta seluruh datanya dari dalam app. |
| Jeda otomatis (belum rilis) | Stopwatch berhenti setelah diam sekitar 10 detik dan lanjut saat bergerak lagi minimal 8 m. Bisa dimatikan di layar rekam. |
| Impor GPX/FIT (belum rilis) | Baca berkas GPX atau FIT dari jam GPS, pilih jenis dan judul, lalu unggah seperti rekaman biasa. Tanpa sinyal masuk antrean unggah. |

## Disarankan berikutnya

### 1. Petunjuk suara bahasa Indonesia
Saat berlari, mata jarang ke layar. Suara membacakan "Kilometer tiga. Pace lima menit dua belas detik" di setiap km, dan "Seratus meter lagi belok kiri ke Jalan Pemuda" saat mengikuti rute.
- Cara: `expo-speech` (ada di Expo Go) dipanggil dari perekam saat split baru dan saat belokan mendekat.
- Usaha: kecil. Butuh build: tidak.

### 2. Notifikasi saat rekor direbut
"Fajar merebut rekormu di Sprint Jalan Pemuda (2:58)". Ini yang membuat orang kembali berlari, dan juga berlaku untuk like dan komentar.
- Cara: Expo Push Notifications + token per pengguna di server; kirim saat segment effort baru menggeser peringkat #1, atau saat ada like/komentar.
- Usaha: sedang. Butuh build: ya (notifikasi push perlu build sendiri di Android).

## Komunitas

### 3. Klub dan tantangan bulanan
Grup seperti "Wonogiri Runners" dengan papan peringkat jarak mingguan dan tantangan ("100 km Oktober", "Lari Subuh 10 kali").
- Usaha: sedang (tabel `clubs`, `club_members`, `challenges` + layar klub).

### 4. Rute bersama
Simpan rute teman, rute favorit klub, dan "rute populer di sekitar" berdasarkan berapa kali dilewati.
- Usaha: sedang.

### 5. Halaman publik untuk tautan
`jejak.masamune.my.id/a/123` menampilkan peta dan statistik tanpa login, dengan gambar pratinjau (Open Graph) supaya tautan di WhatsApp langsung bergambar.
- Usaha: sedang (render gambar OG di server).

## Latihan

### 6. Target pace dan interval
Atur target ("5:30/km") dengan getar saat terlalu cepat atau lambat; latihan interval (mis. 6×400 m dengan istirahat 90 detik) dengan suara aba-aba.
- Usaha: sedang. Butuh build: tidak.

### 7. Grafik ketinggian dan tanjakan akurat
Ketinggian GPS HP kurang akurat. Ambil ketinggian dari data elevasi terbuka (SRTM/Open-Elevation) di server, lalu tampilkan grafik elevasi dan kemiringan per segmen.
- Usaha: sedang.

### 8. Detak jantung
Sambungkan sabuk/gelang detak jantung lewat Bluetooth, lalu tampilkan zona detak jantung di aktivitas.
- Usaha: besar. Butuh build: ya.

## Keamanan dan privasi

### 9. Lacak langsung (beacon)
Kirim tautan lokasi langsung ke keluarga saat lari malam atau gowes jauh; berhenti otomatis saat rekaman selesai.
- Usaha: sedang.

## Motivasi

### 10. Lencana lokal
"Pelari Subuh" (mulai sebelum 05.30), "Penakluk Tanjakan" (tanjakan > 300 m sebulan), "Rantai Mingguan" (aktif 4 minggu berturut-turut). Tampil di profil dan bisa ikut dibagikan ke foto.
- Usaha: kecil–sedang.

### 11. Template bagikan tambahan
"Struk belanja" (statistik seperti struk minimarket, sedang tren), "Tiket kereta" (asal dan tujuan rute), dan video singkat garis rute yang tergambar perlahan.
- Usaha: kecil per template; video besar.

### 12. Peta jejak pribadi
Semua jalur yang pernah dilewati ditumpuk jadi satu peta (heatmap), sehingga terlihat jalan mana yang belum pernah dijelajahi.
- Usaha: sedang.
