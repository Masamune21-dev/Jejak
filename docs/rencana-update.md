# Rencana update berikutnya

Rencana untuk tujuh permintaan pemilik (28 Oktober 2026). Statusnya **rencana**: belum ada yang dikerjakan. Keputusan pemilik sudah masuk (lihat [Keputusan pemilik](#keputusan-pemilik)). Ukuran usaha memakai skala yang sama dengan [ide-fitur.md](ide-fitur.md): **kecil** (beberapa jam), **sedang** (1–3 hari), **besar** (lebih dari seminggu). "Butuh APK baru" berarti fitur memakai modul native baru, jadi harus dibangun ulang lewat EAS (lihat [build-apk.md](build-apk.md)); perubahan tanpa modul native cukup lewat deploy web dan APK berikutnya.

## Daftar isi

1. [Ringkasan dan urutan](#ringkasan-dan-urutan)
2. [Foto profil dan foto sampul](#1-foto-profil-dan-foto-sampul)
3. [Daftar pengikut dan mengikuti](#2-daftar-pengikut-dan-mengikuti)
4. [Postingan ala X](#3-postingan-ala-x)
5. [Chat teman](#4-chat-teman)
6. [Tema terang/gelap dan warna tema](#5-tema-teranggelap-dan-warna-tema)
7. [Info aplikasi](#6-info-aplikasi)
8. [Template bagikan ala Strava](#7-template-bagikan-ala-strava)
9. [Perubahan data](#perubahan-data)
10. [Dependensi baru](#dependensi-baru)
11. [Keamanan dan privasi](#keamanan-dan-privasi)
12. [Tahapan rilis](#tahapan-rilis)
13. [Keputusan pemilik](#keputusan-pemilik)

---

## Ringkasan dan urutan

| # | Fitur | Usaha | Butuh APK baru | Bergantung pada |
| --- | --- | --- | --- | --- |
| 6 | Info aplikasi (versi, pembuat) | kecil | ya (`expo-application`) | layar Pengaturan baru |
| 2 | Daftar pengikut dan mengikuti | kecil | tidak | — |
| 5 | Tema terang/gelap dan warna tema | sedang–besar | tidak | layar Pengaturan baru |
| 1 | Foto profil dan foto sampul | sedang | ya (`expo-image-manipulator`, `expo-blur`) | infrastruktur unggah foto (baru) |
| 3 | Postingan ala X | sedang–besar | tidak (memakai modul dari #1) | unggah foto (#1) bila postingan boleh berfoto |
| 4 | Chat teman | sedang–besar | tidak | — |
| 7 | Template bagikan ala Strava (stiker transparan) | sedang | ya (`expo-clipboard`) | — (hanya app) |

Urutan yang disarankan, dari yang paling murah dan paling banyak dipakai ulang:

0. **Template bagikan ala Strava** bisa dirilis paling dulu dan terpisah (0.1.1). Hanya menyentuh layar Bagikan dan `ShareTemplates.tsx`, tanpa perubahan server, dan tidak bertabrakan dengan pekerjaan lain.
1. **Info aplikasi + daftar pengikut/mengikuti.** Kecil, cepat terasa. Sekalian membuat layar **Pengaturan** yang nanti juga menampung pilihan tema.
2. **Tema.** Dikerjakan **sebelum** layar-layar baru, karena tema menyentuh hampir semua layar. Kalau dikerjakan belakangan, layar foto, postingan, dan chat harus dirombak lagi.
3. **Foto profil dan sampul.** Membangun infrastruktur unggah foto (simpan, sajikan, batas ukuran, buang data lokasi di foto) yang dipakai ulang oleh postingan dan chat.
4. **Postingan.**
5. **Chat.** Paling besar dan paling sensitif secara privasi.

---

## 1. Foto profil dan foto sampul

**Yang dilihat pengguna**

- Di Profil sendiri, ketuk avatar untuk mengganti foto profil (galeri atau kamera, dipotong persegi). Ketuk area atas hero untuk mengganti foto sampul (dipotong 16:9). Ada pilihan **Hapus foto** untuk kembali ke inisial / gradasi bawaan.
- Foto sampul tampil di bagian atas hero profil. **Bagian bawah foto sampul, tepat di belakang baris Aktivitas / Jarak / Waktu, diberi blur dan sedikit gelap** supaya angka tetap terbaca di atas foto apa pun. Ke atas, blur memudar sehingga foto terlihat jelas.
- Foto profil menggantikan inisial di semua tempat: kartu feed, komentar, leaderboard, cari teman, daftar pengikut, chat.

**Server**

- Kolom baru di `users`: `avatar` dan `cover` (nama berkas, boleh kosong). Ditambah lewat migrasi `alter table … add column` saat server mulai, seperti migrasi sesi.
- Endpoint: `PUT /me/avatar`, `PUT /me/cover` (body: gambar), `DELETE /me/avatar`, `DELETE /me/cover`. `UserSummary` dan `Profile` mendapat `avatarUrl` (dan `coverUrl` di `Profile`).
- Penyimpanan: `data/uploads/` di server. Service `jejak` hanya boleh menulis di `data/` (`ReadWritePaths` di `deploy/jejak.service`), dan folder itu tertutup untuk nginx (izin 700). Jadi foto **disajikan oleh API**: `GET /media/:nama`. Nama berkas acak (32 byte), jadi tidak bisa ditebak.
- **Hanya untuk yang login** (keputusan pemilik). Tag gambar di web tidak bisa mengirim header `Authorization`, jadi API memberi **URL bertanda tangan**: `avatarUrl`/`coverUrl` berisi `?exp=…&sig=…` (HMAC-SHA256 dengan kunci rahasia server). URL hanya muncul di respons API untuk pengguna yang login dan kedaluwarsa setelah 7 hari. `exp` dibulatkan ke akhir minggu, jadi URL tetap sama selama seminggu dan cache gambar di HP tetap terpakai. `GET /media/:nama` menolak tanda tangan yang salah atau kedaluwarsa (403) dan mengirim `Cache-Control: private, max-age=604800`.
- Validasi: hanya JPEG/PNG/WebP (dicek dari *magic bytes*, bukan ekstensi), maksimal 2 MB setelah dikompres di HP, lebar/tinggi wajar. Berkas lama dihapus saat diganti.

**App**

- `expo-image-picker` (sudah ada) dengan `allowsEditing` dan rasio 1:1 / 16:9.
- `expo-image-manipulator` (baru): perkecil (avatar 512 px, sampul 1600 px), simpan ulang sebagai JPEG kualitas 0,8. Penyimpanan ulang ini juga **membuang metadata EXIF, termasuk lokasi GPS** tempat foto diambil.
- `expo-blur` (baru): foto sampul dibungkus `BlurTargetView`; `BlurView` dengan `blurMethod="dimezisBlurViewSdk31Plus"` hanya di bagian bawah, ditambah `LinearGradient` gelap. Di Android 11 ke bawah blur otomatis tidak aktif dan yang tersisa gradasi gelap. Ini tetap terbaca, cukup sebagai cadangan.
- Komponen `Avatar` di `ui.tsx` menampilkan `expo-image` bila ada `avatarUrl`, inisial bila tidak.

**Uji:** ganti/hapus foto profil dan sampul; foto berlokasi dari kamera, lalu pastikan berkas di server tidak berisi EXIF GPS; foto 20 MB ditolak dengan pesan jelas; tampilan hero dengan foto sangat terang dan sangat gelap.

---

## 2. Daftar pengikut dan mengikuti

**Yang dilihat pengguna:** di Profil (sendiri maupun orang lain), ketuk "12 pengikut" atau "8 mengikuti" untuk membuka layar dengan dua tab **Pengikut / Mengikuti**. Tiap baris: avatar, nama, @username, dan tombol **Ikuti / Mengikuti**. Ketuk baris untuk membuka profilnya.

**Server:** `GET /users/:id/followers?before=` dan `GET /users/:id/following?before=`, 30 per halaman, urut dari yang terbaru mengikuti. Respons `UserListItem[]` (sudah ada, termasuk `isFollowing` untuk pengguna yang sedang login).

**App:** layar baru `atlet/[id]/koneksi.tsx` dengan `Segmented` dan `FlatList` bergulir tak terbatas. Baris pengguna memakai komponen yang sama dengan `cari.tsx`.

**Uji:** daftar kosong, lebih dari 30 orang (halaman kedua), ikuti/berhenti mengikuti dari daftar memperbarui angka di profil.

---

## 3. Postingan ala X

Permintaan pemilik: "bisa posting apa pun di segmen, seperti X". **Dikonfirmasi pemilik:** postingan muncul di feed Beranda (dari orang yang diikuti) dan di tab Diskusi halaman segmen. Tidak ada lini masa umum berisi postingan semua orang.

**Yang dilihat pengguna**

- Tombol **Tulis** untuk membuat postingan: teks maksimal 500 karakter, opsional 1–4 foto, opsional menandai **satu segmen** (atau satu aktivitas sendiri).
- Postingan dari orang yang diikuti muncul di **feed Beranda** bersama aktivitas, urut waktu.
- Halaman segmen mendapat tab **Diskusi** berisi postingan yang menandai segmen itu: kondisi jalan, tips, ajakan lari bareng. Tab ini terbuka untuk semua pengguna.
- Postingan bisa disukai (seperti kudos), dibalas (seperti komentar), dan dihapus pemiliknya. Ada **Laporkan** untuk postingan orang lain.

**Server:** tabel `posts`, `post_photos`, `post_likes`, `post_replies` (lihat [Perubahan data](#perubahan-data)). Endpoint `POST /posts`, `GET /posts/:id`, `DELETE /posts/:id`, `GET /segments/:id/posts?before=`, suka/batal suka, balasan, dan `POST /posts/:id/report`. `GET /feed` menggabungkan aktivitas dan postingan berdasarkan waktu.

**App:** layar `tulis.tsx` (form + pilih foto + pilih segmen), kartu `PostCard` di feed, tab Diskusi di `segmen/[id].tsx`, layar detail postingan dengan balasan.

**Moderasi minimal:** batas laju menulis (zona `jejak_write` sudah ada: 30 per menit), panjang teks, laporan masuk ke tabel `reports` untuk ditinjau pemilik. Teks ditampilkan sebagai teks biasa (React Native tidak menjalankan HTML), jadi aman dari injeksi skrip.

**Uji:** posting teks saja, dengan foto, dengan segmen; muncul di feed pengikut tapi tidak di feed orang lain; muncul di tab Diskusi segmen; hapus; laporkan.

---

## 4. Chat teman

**Yang dilihat pengguna**

- Ikon **pesan** di kepala Beranda (dengan angka pesan belum dibaca) membuka daftar percakapan: avatar, nama, potongan pesan terakhir, waktu, tanda belum dibaca.
- Percakapan 1-lawan-1: gelembung pesan, kolom ketik di bawah yang **ikut naik saat keyboard muncul** (pelajaran dari halaman masuk), status terkirim/dibaca.
- Tombol **Kirim pesan** di profil teman.
- Tahap 2: kirim foto (memakai infrastruktur unggah dari #1).

**Siapa boleh mengirim pesan:** hanya **sesama yang saling mengikuti** (keputusan pemilik), untuk menekan spam dan pesan dari orang asing. Ada **Blokir** di profil. Bila salah satu berhenti mengikuti, riwayat tetap bisa dibaca tapi pesan baru ditolak.

**Realtime**

| Tahap | Cara | Kelebihan / kekurangan |
| --- | --- | --- |
| 1 | **Polling**: saat percakapan terbuka ambil pesan baru tiap 3 detik; angka belum dibaca tiap 30 detik saat app terbuka | Sederhana, jalan di balik nginx + Cloudflare tanpa ubahan. Pesan tertunda paling lama 3 detik. |
| Nanti, bila perlu | **WebSocket** (`@hono/node-ws`, nginx `Upgrade`, WebSocket di Cloudflare) | Instan, lebih hemat. Lebih rumit di server, nginx, dan app. Dikerjakan hanya bila polling terasa lambat. |

**Notifikasi push tidak dipakai** (keputusan pemilik). Pesan baru terlihat lewat angka belum dibaca saat app dibuka; tidak ada pemberitahuan saat app tertutup.

**Server:** tabel `messages` dan `blocks`. Endpoint `GET /chats` (daftar percakapan + jumlah belum dibaca), `GET /chats/:userId?before=`, `GET /chats/:userId?after=` (untuk polling), `POST /chats/:userId`, `POST /chats/:userId/read`, `POST/DELETE /users/:id/block`. Hanya dua peserta yang bisa membaca percakapan.

**App:** layar `pesan/index.tsx` (daftar) dan `pesan/[id].tsx` (percakapan, `FlatList` terbalik + `KeyboardAvoidingView`), badge di ikon Beranda.

**Privasi:** pesan **tidak** terenkripsi ujung-ke-ujung; tersimpan di server dan ikut backup database. Ini perlu disebut jelas di layar Tentang/Privasi. Hapus pesan sendiri didukung.

**Uji:** dua akun saling kirim; pengguna yang tidak saling mengikuti ditolak; blokir; percakapan panjang (gulir ke atas memuat pesan lama); keyboard tidak menutup kolom ketik.

---

## 5. Tema terang/gelap dan warna tema

**Yang dilihat pengguna:** di **Pengaturan → Tampilan**:

- **Tema:** Ikuti sistem / Gelap / Terang.
- **Warna aksen** (5 pilihan, dikonfirmasi pemilik): **Kuning marka** (bawaan, `#FFC629`), **Hijau mint** (`#2EE59D`), **Biru** (`#4DA3FF`), **Oranye** (`#FF8A4C`), **Merah muda** (`#FF5C8A`). Pratinjau langsung di layar pengaturan. Karena biru sama dengan warna garis rute rencana, saat aksen biru dipilih garis rute memakai warna lain (misalnya ungu muda) supaya tetap beda dari garis aktivitas.

Pilihan disimpan di HP dan berlaku segera tanpa membuka ulang app.

**Cara**

- `theme.ts` mendapat dua palet dasar: **gelap** (yang sekarang, aspal) dan **terang** (beton, diambil dari desain jalan versi terang di riwayat git commit `b668024`). Setiap warna aksen membawa pasangan `accentInk` (teks di atas aksen) dan `accentText` (aksen sebagai teks). Di latar terang, kuning terlalu pucat untuk teks, jadi `accentText` memakai versi gelapnya, misalnya `#8F6400`.
- `ThemeProvider` (context) membaca pilihan dari AsyncStorage **sebelum layar pembuka ditutup**, supaya tidak berkedip dari gelap ke terang. `useColors()` membaca context ini. `app.json` sudah `userInterfaceStyle: "automatic"`.
- Perlu dirombak:
  - StyleSheet statis yang memakai `palette` (Profil, detail segmen, layar crash) diubah jadi gaya dinamis.
  - Konstanta di luar React (warna latar peta MapLibre, warna notifikasi rekaman) membaca tema saat dipakai.
  - Peta: filter gelap (`DARK_MAP_FILTER`, cat raster MapLibre, gaya react-native-maps) **hanya di mode gelap**. Di mode terang ubin OSM tampil asli.
  - Cahaya (`glow`) dibuat lebih lembut di mode terang.
  - Status bar dan tema navigasi mengikuti mode.
  - Template bagikan foto tidak ikut, karena memakai warna jalan yang tetap.

**Uji:** tangkapan layar semua layar utama di 2 mode × 5 warna; kontras teks minimal WCAG AA (4,5:1); ganti tema saat merekam tidak mengganggu perekam.

---

## 6. Info aplikasi

**Yang dilihat pengguna:** ikon **pengaturan** (roda gigi) di kepala Profil, di samping ikon tambah teman, membuka layar **Pengaturan**:

- **Tampilan:** tema dan warna (#5).
- **Tentang aplikasi:**
  - nama dan logo Jejak;
  - **versi** (`expo.version`, misalnya 0.2.0) dan **nomor build** Android (dari `expo-application`);
  - **pembuat**: "Dibuat oleh Masamune" (keputusan pemilik, tanpa kontak);
  - alamat server;
  - atribusi peta © OpenStreetMap dan rute OSRM (FOSSGIS).
- **Keluar** (dipindah dari ikon di kepala Profil supaya tidak tertekan tidak sengaja).

**Versi:** setiap rilis menaikkan `expo.version` di `app/app.json` (rilis berikutnya 0.2.0). Nomor build Android sudah naik otomatis di EAS untuk profil `production`; profil `preview` perlu dinaikkan manual atau diubah ke `autoIncrement`.

**Uji:** angka versi dan build sesuai dengan yang tampil di halaman build EAS.

---

## 7. Template bagikan ala Strava

Permintaan pemilik: template bagikan dibuat mirip Strava (contoh dari layar "Bagikan Aktivitas" Strava). Intinya **stiker transparan**: garis rute dan angka tanpa latar, untuk ditempel di atas foto sendiri di Instagram Story atau aplikasi lain. Yang ditiru tata letak dan gayanya, **bukan merek**: semua template memakai wordmark **jejak.**, bukan logo Strava.

**Yang dilihat pengguna**

- Layar Bagikan berganti menjadi **galeri geser** (swipe kiri/kanan) dengan titik penanda halaman di bawahnya, seperti Strava. Template stiker ditampilkan di atas **pola kotak-kotak** yang menandakan bagian transparan. Pola ini hanya di pratinjau, tidak ikut tersimpan.
- Baris **Bagikan ke** di bawah: **Simpan** (ke galeri), **Salin** (ke papan klip, untuk ditempel sebagai stiker), **Lainnya** (lembar berbagi sistem, termasuk Instagram dan WhatsApp).
- **Pilih foto** tetap ada: bila foto dipilih, stiker ditempel di atas foto dan hasilnya gambar biasa (tidak transparan).
- Pilihan warna garis rute: oranye terang (bawaan, mirip contoh), putih, atau warna aksen tema.

**Lima tata letak stiker** (meniru contoh pemilik)

| Nama | Isi |
| --- | --- |
| **Samping** | Garis rute di tengah, wordmark kiri atas, angka berpasangan diputar 90° di tepi kanan (Jarak/Kecepatan, Kenaikan/Kec. maks, Waktu/Elev. maks). |
| **Daftar** | Garis rute besar, di bawahnya wordmark dan daftar angka dengan titik-titik penuntun: "Jarak ………… 7,07 km". |
| **Tumpuk** | Angka besar bertumpuk di tengah (label kecil di atas angka), garis rute besar di belakangnya. |
| **Ringkas** | Tiga angka besar bertumpuk (Jarak, Kenaikan, Waktu), garis rute kecil di bawahnya, wordmark paling bawah. |
| **Baris** | Garis rute, wordmark, lalu tiga angka sebaris (Jarak, Kenaikan, Waktu) dan ikon jenis aktivitas. |

Angka menyesuaikan jenis aktivitas: lari dan jalan kaki memakai **Pace** (mis. 5:42 /km), sepeda memakai **Kecepatan** (km/j). **Elev. maks** dihitung dari ketinggian tertinggi di jejak (sudah ada di data jejak); bila ketinggian tidak tersedia, baris itu tidak ditampilkan. Huruf angka memakai Plus Jakarta Sans ExtraBold dengan bayangan tipis supaya terbaca di atas foto terang maupun gelap.

Empat template lama (Nomor dada, Rute, Patok KM, Rambu) tetap ada di akhir galeri, karena dibuat dengan latar.

**Cara**

- `ShareTemplates.tsx`: tambah lima komponen stiker. Wadah yang diekspor dibuat **tanpa warna latar**; pola kotak-kotak digambar di wadah induk.
- Ekspor: `captureRef` (sudah dipakai) dengan `format: 'png'` menghasilkan PNG dengan kanal transparan, ukuran 1080 × 1920 untuk Story. Format Postingan 4:5 tetap tersedia.
- Galeri geser: `FlatList` horizontal dengan `pagingEnabled` (tanpa paket baru).
- **Salin ke papan klip:** `expo-clipboard` (`setImageAsync`). Di iPhone, gambar transparan bisa langsung ditempel sebagai stiker di Instagram Story. Di Android hasilnya bergantung versi Instagram, jadi **Simpan** lalu pilih dari galeri di Instagram tetap jadi jalan utama.
- **Tombol "Instagram Stories" langsung** seperti Strava *tidak* masuk tahap ini: Instagram mewajibkan Facebook App ID terdaftar dan modul native tambahan. Bisa ditambahkan nanti bila pemilik mendaftarkan app di Meta for Developers.

**Uji:** kelima template untuk lari dan sepeda; aktivitas tanpa data ketinggian; simpan PNG lalu buka di galeri, bagian transparan harus tetap transparan (bukan hitam/putih); tempel di Instagram Story; dengan foto latar; rute sangat pendek dan sangat panjang.

---

## Perubahan data

| Tabel / kolom | Isi | Fitur |
| --- | --- | --- |
| `users.avatar`, `users.cover` | Nama berkas di `data/uploads/`, boleh kosong | #1 |
| `posts` | `id`, `user_id`, `body`, `segment_id` (boleh kosong), `activity_id` (boleh kosong), `created_at` | #3 |
| `post_photos` | `post_id`, `file`, `position` | #3 |
| `post_likes` | `post_id`, `user_id`, `created_at` | #3 |
| `post_replies` | `id`, `post_id`, `user_id`, `body`, `created_at` | #3 |
| `reports` | `id`, `reporter_id`, `post_id`, `reason`, `created_at` | #3 |
| `messages` | `id`, `from_id`, `to_id`, `body`, `photo` (boleh kosong), `created_at`, `read_at` | #4 |
| `blocks` | `blocker_id`, `blocked_id`, `created_at` | #4 |

Semua tabel baru dibuat dengan `create table if not exists`, kolom baru lewat migrasi saat server mulai. Database lama tetap terbaca dan tidak ada data yang hilang. [data.md](data.md) dan [api.md](api.md) diperbarui di setiap tahap.

## Dependensi baru

Dipasang dengan `npx expo install <paket>` supaya versinya cocok dengan SDK 58.

| Paket | Untuk | Ada di Expo Go |
| --- | --- | --- |
| `expo-image-manipulator` | Perkecil foto dan buang EXIF | ya |
| `expo-blur` | Blur bagian bawah foto sampul | ya |
| `expo-application` | Nomor build di Tentang aplikasi | ya |
| `expo-clipboard` | Salin stiker ke papan klip (#7) | ya |

Server tidak butuh paket baru; HMAC untuk URL foto memakai `node:crypto`. WebSocket (bila nanti dibutuhkan untuk chat) butuh `@hono/node-ws`. Notifikasi push tidak dipakai, jadi `expo-notifications` tidak dipasang.

## Keamanan dan privasi

- **Lokasi di foto:** foto dari kamera menyimpan koordinat GPS di EXIF. App menyimpan ulang foto sebelum unggah sehingga EXIF hilang. Server menolak JPEG yang masih membawa blok EXIF, sebagai pengaman kedua. Ini penting setelah zona privasi jejak dibuat: foto tidak boleh membocorkan lokasi rumah.
- **Unggahan:**
  - Hanya tipe gambar yang dicek dari isinya, dengan batas ukuran.
  - Nama berkas acak.
  - Zona batas laju unggah tersendiri di nginx (usulan 10 per menit).
  - Folder `data/uploads/` ikut backup (perbarui [deploy.md](deploy.md)).
  - Perkiraan ruang: 1.000 pengguna × (avatar 60 KB + sampul 300 KB) ≈ 360 MB, belum termasuk foto postingan.
- **Postingan:** batas laju, laporan, hapus oleh pemilik. Pemilik app butuh cara meninjau laporan (tahap awal cukup lewat database).
- **Foto dan postingan hanya untuk yang login:** URL foto bertanda tangan dan kedaluwarsa 7 hari (lihat #1); kunci HMAC disimpan di environment service (`deploy/jejak.service`), bukan di repo. Postingan hanya bisa diambil lewat API yang butuh login.
- **Chat:** hanya peserta yang bisa membaca; hanya sesama yang saling mengikuti; blokir; tidak terenkripsi ujung-ke-ujung (diumumkan ke pengguna).
- **Daftar pengikut:** terlihat oleh semua pengguna yang login, seperti Strava (keputusan pemilik). Mengikuti tetap tidak membuka zona privasi jejak.

## Tahapan rilis

| Rilis | Isi | Deploy | APK baru |
| --- | --- | --- | --- |
| **0.1.1** | Template bagikan ala Strava: 5 stiker transparan, galeri geser, simpan/salin/bagikan | web | ya |
| **0.2.0** | Layar Pengaturan, Info aplikasi, daftar pengikut/mengikuti, tema terang/gelap + warna | server + web | ya |
| **0.3.0** | Foto profil dan sampul, infrastruktur unggah | server + web | ya |
| **0.4.0** | Postingan, tab Diskusi segmen | server + web | ya (layar baru) |
| **0.5.0** | Chat dengan polling, blokir | server + web | ya |

Notifikasi push tidak masuk rencana (keputusan pemilik).

Setiap rilis: `npm run check` lolos, uji di HP dengan APK `preview`, backup database sebelum deploy server, lalu merge ke `main` dan push.

## Keputusan pemilik

Dijawab pemilik pada 28 Oktober 2026.

| # | Pertanyaan | Keputusan |
| --- | --- | --- |
| 1 | Arti "posting di segmen kaya X" | Postingan di feed Beranda (dari yang diikuti) + tab **Diskusi** di halaman segmen. Tanpa lini masa umum. |
| 2 | Siapa boleh dikirimi pesan | Hanya **sesama yang saling mengikuti**. |
| 3 | Notifikasi chat saat app tertutup | **Tidak pakai notifikasi push.** |
| 4 | Warna aksen | **5 pilihan:** kuning marka (bawaan), hijau mint, biru, oranye, merah muda. |
| 5 | Siapa bisa melihat foto dan postingan | **Hanya pengguna yang login.** |
| 6 | Siapa bisa melihat daftar pengikut | **Semua pengguna** yang login. |
| 7 | Pembuat di Tentang aplikasi | **"Dibuat oleh Masamune"**, tanpa kontak. |
| 8 | Template bagikan | **Mirip Strava**: stiker transparan dengan tata letak seperti contoh pemilik, memakai merek jejak. |
