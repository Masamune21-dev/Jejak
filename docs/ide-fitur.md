# Ide fitur Jejak

Daftar ini disusun dari kebutuhan nyata pelari dan pesepeda di Indonesia, dimulai dari yang paling berdampak untuk pemakaian sehari-hari. Ukuran usaha: **kecil** (beberapa jam), **sedang** (1–3 hari), **besar** (lebih dari seminggu). Kolom "Butuh build" berarti fitur memakai modul native yang tidak ada di Expo Go, sehingga perlu APK baru.

## Sudah ada

| Fitur | Catatan |
| --- | --- |
| Bagikan ke foto | 4 template (Nomor dada, Rute, Patok KM, Rambu), format postingan 4:5 dan story 9:16, foto dari galeri atau kamera, simpan ke galeri atau bagikan langsung. |
| Ekspor GPX | File GPX 1.1 standar, bisa diimpor ke Strava, Garmin Connect, Komoot. |

## Disarankan berikutnya

### 1. Petunjuk suara bahasa Indonesia
Saat berlari, mata jarang ke layar. Suara membacakan "Kilometer tiga. Pace lima menit dua belas detik" di setiap km, dan "Seratus meter lagi belok kiri ke Jalan Pemuda" saat mengikuti rute.
- Cara: `expo-speech` (ada di Expo Go) dipanggil dari perekam saat split baru dan saat belokan mendekat.
- Usaha: kecil. Butuh build: tidak.

### 2. Notifikasi saat rekor direbut
"Fajar merebut rekormu di Sprint Jalan Pemuda (2:58)". Ini yang membuat orang kembali berlari, dan juga berlaku untuk kudos dan komentar.
- Cara: Expo Push Notifications + token per pengguna di server; kirim saat segment effort baru menggeser peringkat #1, atau saat ada kudos/komentar.
- Usaha: sedang. Butuh build: ya (notifikasi push perlu build sendiri di Android).

### 3. Antrean unggah otomatis
Sekarang rekaman tersimpan lokal bila unggah gagal, tapi pengguna harus menekan Simpan lagi. Lebih baik: tersimpan sebagai "menunggu sinyal" dan terunggah sendiri saat internet kembali (penting di jalur desa/pegunungan).
- Cara: antrean di AsyncStorage + `@react-native-community/netinfo`, coba ulang saat aplikasi dibuka atau sinyal kembali.
- Usaha: kecil. Butuh build: tidak.

## Komunitas

### 4. Klub dan tantangan bulanan
Grup seperti "Wonogiri Runners" dengan papan peringkat jarak mingguan dan tantangan ("100 km Oktober", "Lari Subuh 10 kali").
- Usaha: sedang (tabel `clubs`, `club_members`, `challenges` + layar klub).

### 5. Rute bersama
Simpan rute teman, rute favorit klub, dan "rute populer di sekitar" berdasarkan berapa kali dilewati.
- Usaha: sedang.

### 6. Halaman publik untuk tautan
`jejak.masamune.my.id/a/123` menampilkan peta dan statistik tanpa login, dengan gambar pratinjau (Open Graph) supaya tautan di WhatsApp langsung bergambar.
- Usaha: sedang (render gambar OG di server).

## Latihan

### 7. Target pace dan interval
Atur target ("5:30/km") dengan getar saat terlalu cepat atau lambat; latihan interval (mis. 6×400 m dengan istirahat 90 detik) dengan suara aba-aba.
- Usaha: sedang. Butuh build: tidak.

### 8. Grafik ketinggian dan tanjakan akurat
Ketinggian GPS HP kurang akurat. Ambil ketinggian dari data elevasi terbuka (SRTM/Open-Elevation) di server, lalu tampilkan grafik elevasi dan kemiringan per segmen.
- Usaha: sedang.

### 9. Impor dari jam pintar
Impor file GPX/FIT dari Garmin, Coros, Huawei, Amazfit; nantinya sinkron otomatis lewat Health Connect (Android).
- Usaha: sedang untuk impor file, besar untuk sinkron. Butuh build: ya untuk Health Connect.

### 10. Detak jantung
Sambungkan sabuk/gelang detak jantung lewat Bluetooth, lalu tampilkan zona detak jantung di aktivitas.
- Usaha: besar. Butuh build: ya.

## Keamanan dan privasi

### 11. Zona privasi rumah
Sembunyikan 200–500 m pertama dan terakhir rute di sekitar rumah dari orang lain, supaya alamat tidak terbaca dari peta.
- Usaha: kecil–sedang (pemotongan track saat ditampilkan ke selain pemilik).

### 12. Visibilitas aktivitas
Pilihan publik, teman saja, atau pribadi untuk setiap aktivitas.
- Usaha: kecil.

### 13. Lacak langsung (beacon)
Kirim tautan lokasi langsung ke keluarga saat lari malam atau gowes jauh; berhenti otomatis saat rekaman selesai.
- Usaha: sedang.

## Motivasi

### 14. Lencana lokal
"Pelari Subuh" (mulai sebelum 05.30), "Penakluk Tanjakan" (tanjakan > 300 m sebulan), "Rantai Mingguan" (aktif 4 minggu berturut-turut). Tampil di profil dan bisa ikut dibagikan ke foto.
- Usaha: kecil–sedang.

### 15. Template bagikan tambahan
"Struk belanja" (statistik seperti struk minimarket, sedang tren), "Tiket kereta" (asal dan tujuan rute), dan video singkat garis rute yang tergambar perlahan.
- Usaha: kecil per template; video besar.

### 16. Peta jejak pribadi
Semua jalur yang pernah dilewati ditumpuk jadi satu peta (heatmap), sehingga terlihat jalan mana yang belum pernah dijelajahi.
- Usaha: sedang.
