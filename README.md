# Jejak

Aplikasi olahraga ala Strava: rekam lari, sepeda, dan jalan kaki dengan GPS, buat rute sendiri di peta lalu ikuti saat merekam, dan adu waktu di segmen bersama teman.

Dokumentasi lengkap ada di [docs/](docs/README.md): fitur per layar, arsitektur, API, data, algoritma, pengembangan, deploy, build APK, desain, dan ide fitur.

## Fitur

- **Rekam aktivitas**: lari, bersepeda, jalan kaki. Ada stopwatch, jarak, pace/kecepatan, jeda/lanjut, dan rekaman yang tetap aman walau app tertutup.
- **Buat rute sendiri**: ketuk titik-titik di peta, rute otomatis mengikuti jalan (OpenStreetMap/OSRM), lengkap dengan petunjuk belok berbahasa Indonesia. Ada tombol batal, pulang-pergi, dan kembali ke titik awal.
- **Ikuti rute**: saat merekam muncul banner belokan berikutnya ("Belok kiri ke Jalan Pemuda · dalam 120 m"), sisa jarak, dan peringatan *keluar dari rute*. HP bergetar saat mendekati belokan atau keluar jalur.
- **Riwayat & statistik**: split per km, waktu terbaik (400 m, 1 km, 5 km, 10 km, setengah maraton, maraton; sepeda 5–100 km), PR, grafik 12 minggu, total tahun ini dan sepanjang masa.
- **Akun & teman**: daftar/masuk, cari dan ikuti teman, feed aktivitas, kudos, komentar.
- **Bagikan ke foto & ekspor GPX**: tempel hasil aktivitas di fotomu dengan 4 template (Nomor dada, Rute, Patok KM, Rambu) untuk postingan atau story, atau ekspor GPX ke aplikasi lain.
- **Segmen & leaderboard**: buat segmen dari potongan aktivitasmu. Semua aktivitas lama dan baru yang melewatinya otomatis dicocokkan. Leaderboard bisa "Semua" atau "Yang kuikuti", dengan medali PR.

## Struktur

```
jejak/
├── app/      Aplikasi HP (Expo SDK 58 + Expo Router, React Native). Juga jalan di browser.
├── server/   API (Node 24 + Hono + SQLite bawaan Node). Tanpa langkah build.
└── shared/   Kode bersama app & server: hitungan geo (jarak, split, rekor,
              pencocokan segmen, progres di rute) dan tipe data API.
```

Versi produksi: **https://jejak.masamune.my.id** (web) dengan API di `https://jejak.masamune.my.id/api`.

## Menjalankan untuk pengembangan

Butuh Node 24 ke atas. Untuk mencoba di HP, pasang **Expo Go** dari Play Store/App Store.

```bash
npm run setup
```

Aplikasi (scan QR dengan Expo Go). Secara bawaan app memakai server produksi (`app/.env`):

```bash
npm run app
```

Untuk memakai server di komputer sendiri, buat `app/.env.local` berisi `EXPO_PUBLIC_API_URL=lan`, lalu jalankan server di terminal lain (port 4000, database di `server/data/jejak.db`; HP harus satu WiFi):

```bash
npm run server
```

Jangan jalankan Expo dengan `CI=1`, karena mode itu mematikan pemantauan file sehingga perubahan kode tidak terbaca. Versi browser bisa dibuka dengan `npm run web`.

### Mode uji (simulasi GPS)

Selama mode pengembangan, layar Rekam punya sakelar **Simulasi GPS**. Posisi bergerak sendiri di sepanjang rute yang dipilih (atau berputar di sekitar posisimu) dengan kecepatan 8×, jadi perekaman, pemandu rute, dan segmen bisa dicoba tanpa keluar rumah.

## Build APK (Android)

APK dibuat di cloud EAS dengan akun Expo, tanpa Android Studio. APK mandiri bisa merekam saat layar mati (lokasi latar) dan memakai server produksi. Peta di APK Android memakai **MapLibre** dengan ubin OpenStreetMap: gratis, tanpa kunci Google dan tanpa akun penagihan. Di Expo Go peta tetap memakai react-native-maps, karena Expo Go tidak membawa MapLibre.

Jalankan di folder `app` (login sekali saja):

```bash
cd app
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile preview
```

Saat pertama kali, pilih *Generate a new Android Keystore*. Setelah selesai, EAS memberi tautan/QR untuk mengunduh APK ke HP. Profil `production` membuat AAB untuk Google Play (`--profile production`).

## Deploy server & web

Server produksi ada di `103.189.249.115` (service systemd `jejak` dengan user non-root `jejak`, port 3014, nginx + sertifikat Cloudflare, data di `/var/www/jejak.masamune.my.id/data`). Setelah commit:

```bash
deploy/deploy.sh
```

Skrip ini mengirim commit `HEAD` ke server lewat SSH (`git archive`), menjalankan `npm ci`, memasang config nginx dan service systemd, lalu menjalankan ulang API; setelah itu membangun versi web dan mengunggahnya. Detailnya di [docs/deploy.md](docs/deploy.md). Pakai `deploy/deploy.sh server` atau `deploy/deploy.sh web` untuk salah satunya saja.

## Cek kode

```bash
npm run check
```

Perintah ini menjalankan typecheck server, tes server (`node --test`: geo, akun, feed, kudos, rute, segmen, leaderboard), typecheck app, dan ESLint.

## Catatan

- Rute mengikuti jalan memakai server OSRM publik dari FOSSGIS (`routing.openstreetmap.de`, profil jalan kaki dan sepeda). Pakailah sewajarnya. Bila layanan gagal, rute otomatis jadi garis lurus. Server sendiri bisa dipakai lewat variabel `ROUTING_URL`.
- Semua peta memakai ubin OpenStreetMap yang digelapkan agar cocok dengan tema (tanpa kunci API, wajib atribusi). Peta di APK Android memakai MapLibre dengan ubin yang sama; di iOS dan Expo Go memakai react-native-maps (Apple Maps / Google Maps).
