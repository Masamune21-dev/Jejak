# Jejak

Aplikasi olahraga ala Strava: rekam lari, sepeda, dan jalan kaki dengan GPS, buat rute sendiri di peta lalu ikuti saat merekam, dan adu waktu di segmen bersama teman.

## Fitur

- **Rekam aktivitas**: lari, bersepeda, jalan kaki. Ada stopwatch, jarak, pace/kecepatan, jeda/lanjut, dan rekaman yang tetap aman walau app tertutup.
- **Buat rute sendiri**: ketuk titik-titik di peta, rute otomatis mengikuti jalan (OpenStreetMap/OSRM), lengkap dengan petunjuk belok berbahasa Indonesia. Ada tombol batal, pulang-pergi, dan kembali ke titik awal.
- **Ikuti rute**: saat merekam muncul banner belokan berikutnya ("Belok kiri ke Jalan Pemuda · dalam 120 m"), sisa jarak, dan peringatan *keluar dari rute*. HP bergetar saat mendekati belokan atau keluar jalur.
- **Riwayat & statistik**: split per km, waktu terbaik (400 m, 1 km, 5 km, 10 km, setengah maraton, maraton; sepeda 5–100 km), PR, grafik 12 minggu, total tahun ini dan sepanjang masa.
- **Akun & teman**: daftar/masuk, cari dan ikuti teman, feed aktivitas, kudos, komentar.
- **Segmen & leaderboard**: buat segmen dari potongan aktivitasmu. Semua aktivitas lama dan baru yang melewatinya otomatis dicocokkan. Leaderboard bisa "Semua" atau "Yang kuikuti", dengan medali PR.

## Struktur

```
jejak/
├── app/      Aplikasi HP (Expo SDK 58 + Expo Router, React Native). Juga jalan di browser.
├── server/   API (Node 24 + Hono + SQLite bawaan Node). Tanpa langkah build.
└── shared/   Kode bersama app & server: hitungan geo (jarak, split, rekor,
              pencocokan segmen, progres di rute) dan tipe data API.
```

## Menjalankan

Butuh Node 24 ke atas. Untuk mencoba di HP, pasang **Expo Go** dari Play Store/App Store.

```bash
npm run setup
```

Terminal 1, server API (port 4000, database di `server/data/jejak.db`):

```bash
npm run server
```

Terminal 2, aplikasi (scan QR dengan Expo Go; HP harus satu WiFi dengan komputer):

```bash
npm run app
```

App otomatis menghubungi server di IP komputer yang menjalankan Expo. Kalau server ada di tempat lain (mis. VPS), isi `app/.env`:

```
EXPO_PUBLIC_API_URL=http://alamat-server:4000
```

Kalau HP tidak bisa terhubung, cek apakah firewall macOS memblokir port 4000. Alamat server yang dipakai app tampil di bawah halaman masuk.

Versi browser (peta Leaflet + OpenStreetMap) bisa dibuka dengan `npm run web`.

### Mode uji (simulasi GPS)

Selama mode pengembangan, layar Rekam punya sakelar **Simulasi GPS**. Posisi bergerak sendiri di sepanjang rute yang dipilih (atau berputar di sekitar posisimu) dengan kecepatan 8×, jadi perekaman, pemandu rute, dan segmen bisa dicoba tanpa keluar rumah.

## Merekam saat layar mati

Expo Go tidak mengizinkan lokasi latar belakang, jadi di Expo Go layar dibuat tetap menyala selama merekam. Untuk merekam dengan layar terkunci, buat *development build* sendiri. Build-nya jalan di cloud EAS (butuh akun Expo gratis), tanpa Xcode atau Android Studio:

```bash
cd app
npx expo install expo-dev-client
npx eas-cli@latest build:configure
npx eas-cli@latest build --profile development --platform android
```

Pasang APK hasilnya di HP, lalu jalankan `npm run app` seperti biasa (setelah `expo-dev-client` terpasang, QR akan membuka build ini, bukan Expo Go). App sudah disiapkan untuk lokasi latar: izin lokasi "Selalu", layanan latar dengan notifikasi "Jejak sedang merekam", dan titik GPS yang terkumpul saat app tertutup ikut dimasukkan ketika app dibuka lagi.

Untuk rilis di Android, peta Google butuh kunci API. Lihat [panduan react-native-maps](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/#deploy-app-with-google-maps).

## Cek kode

```bash
npm run check
```

Perintah ini menjalankan typecheck server, tes server (`node --test`: geo, akun, feed, kudos, rute, segmen, leaderboard), typecheck app, dan ESLint.

## Catatan

- Rute mengikuti jalan memakai server OSRM publik dari FOSSGIS (`routing.openstreetmap.de`, profil jalan kaki dan sepeda). Pakailah sewajarnya. Bila layanan gagal, rute otomatis jadi garis lurus. Server sendiri bisa dipakai lewat variabel `ROUTING_URL`.
- Peta versi web memakai tile `tile.openstreetmap.org`. Untuk pemakaian ramai, ganti ke penyedia tile sendiri.
