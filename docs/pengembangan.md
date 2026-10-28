# Panduan pengembangan

## Daftar isi

1. [Prasyarat](#prasyarat)
2. [Setup pertama](#setup-pertama)
3. [Variabel lingkungan](#variabel-lingkungan)
4. [Menjalankan server](#menjalankan-server)
5. [Menjalankan app di HP](#menjalankan-app-di-hp)
6. [Menjalankan versi web](#menjalankan-versi-web)
7. [Mode simulasi GPS](#mode-simulasi-gps)
8. [Tes dan pemeriksaan kode](#tes-dan-pemeriksaan-kode)
9. [Gaya kode](#gaya-kode)
10. [Jebakan yang diketahui](#jebakan-yang-diketahui)

---

## Prasyarat

- **Node 24 atau lebih baru.** Server menjalankan TypeScript langsung lewat *type stripping* bawaan Node (tanpa `tsc`, tanpa `ts-node`) dan memakai `node:sqlite`. `server/package.json` menetapkan `"engines": { "node": ">=24" }`.
- npm (ikut Node).
- Untuk mencoba di HP: **Expo Go** dari Play Store / App Store (versi yang mendukung Expo SDK 58), dan HP satu jaringan WiFi dengan komputer bila memakai server lokal.
- Tidak perlu Android Studio atau Xcode; build APK dilakukan di cloud EAS (lihat [build-apk.md](build-apk.md)).

---

## Setup pertama

Dari akar repo:

```bash
npm run setup      # npm install di server/ dan app/
```

Skrip di `package.json` akar:

| Skrip | Perintah sebenarnya | Fungsi |
| --- | --- | --- |
| `npm run setup` | `npm install --prefix server && npm install --prefix app` | Pasang dependensi. |
| `npm run server` | `npm start --prefix server` → `node src/index.ts` | Jalankan API (port 4000). |
| `npm run app` | `npm start --prefix app` → `expo start` | Jalankan Metro + QR untuk Expo Go. |
| `npm run web` | `npm run web --prefix app` → `expo start --web` | Versi browser. |
| `npm test` | `npm test --prefix server` → `node --test test/*.test.ts` | Tes server. |
| `npm run check` | typecheck server + tes server + typecheck app + ESLint app | Pemeriksaan lengkap sebelum commit. |

`shared/` tidak punya dependensi dan tidak perlu dipasang.

---

## Variabel lingkungan

### App

| Variabel | Bawaan | Fungsi |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | `https://jejak.masamune.my.id/api` (dari `app/.env`) | Alamat API. Nilai khusus `lan` berarti "server di komputer yang menjalankan Expo, port 4000". |

Berkas:

- `app/.env`: ikut git, berisi server produksi. Jangan diubah untuk keperluan lokal.
- `app/.env.local`: buat sendiri bila ingin server lokal. Diabaikan git (`.env*.local`) dan menimpa nilai di `.env`.

```bash
echo "EXPO_PUBLIC_API_URL=lan" > app/.env.local
```

Cara app menerjemahkan nilai ini dijelaskan di [arsitektur.md](arsitektur.md#alamat-server-api). Nilai `EXPO_PUBLIC_*` ditanam ke bundel saat bundling: setelah mengubahnya, hentikan Metro lalu jalankan lagi (bila perlu dengan `npx expo start -c` untuk membersihkan cache).

### Server

| Variabel | Bawaan | Fungsi |
| --- | --- | --- |
| `PORT` | `4000` | Port HTTP. Produksi: `3014`. |
| `HOST` | `0.0.0.0` | Alamat yang didengar. `0.0.0.0` supaya HP di WiFi bisa masuk; produksi memakai `127.0.0.1` (di belakang nginx). |
| `DB_PATH` | `server/data/jejak.db` | Berkas SQLite. Folder dibuat otomatis. |
| `ROUTING_URL` | `https://routing.openstreetmap.de` | Server OSRM untuk rute mengikuti jalan. |

`NODE_ENV=production` dipasang PM2 di produksi tetapi tidak dibaca oleh kode.

Contoh:

```bash
PORT=4100 DB_PATH=/tmp/jejak-coba.db npm run server
```

---

## Menjalankan server

```bash
npm run server
```

Keluaran:

```
Server Jejak jalan di http://localhost:4000
  dari HP di WiFi yang sama: http://192.168.1.23:4000
  database: /…/jejak/server/data/jejak.db
```

Baris "dari HP di WiFi yang sama" hanya muncul bila `HOST` = `0.0.0.0`. Cek cepat:

```bash
curl http://localhost:4000/health          # {"ok":true}
```

Untuk mode pantau (server restart otomatis saat berkas berubah):

```bash
npm run dev --prefix server                # node --watch src/index.ts
```

`npm run server` **tidak** memantau perubahan; setelah mengubah `server/` atau `shared/`, restart manual.

Server lokal memakai database kosong sendiri. Akun produksi tidak ada di sana, jadi daftar akun baru untuk mencoba.

---

## Menjalankan app di HP

1. Jalankan Metro:

   ```bash
   npm run app
   ```

2. Scan QR dengan Expo Go (Android) atau kamera (iOS).
3. Secara bawaan app memakai **server produksi**. Untuk server lokal, buat `app/.env.local` berisi `EXPO_PUBLIC_API_URL=lan`, jalankan `npm run server` di terminal lain, lalu jalankan ulang Metro. HP harus satu WiFi dengan komputer.
4. Pastikan alamatnya benar lewat tulisan **Server: …** di bawah layar masuk.

Yang berbeda di Expo Go dibanding APK:

| Hal | Expo Go | APK (build EAS) |
| --- | --- | --- |
| Lokasi saat layar mati | Tidak bisa; perekam memakai `gps-fg` dan menjaga layar tetap menyala. | Bisa, bila izin "sepanjang waktu" diberikan (`gps-bg`). |
| Peta Android | react-native-maps (Google Maps milik Expo Go). | MapLibre + ubin Esri. |
| Sakelar Simulasi GPS | Ada (mode dev). | Tidak ada (build rilis). |
| Error JavaScript | Layar merah / LogBox pengembangan (error saat render juga ditangkap `ErrorBoundary`). | Layar laporan error Jejak (lihat [build-apk.md](build-apk.md#bila-apk-tertutup-sendiri-crash)). |

---

## Menjalankan versi web

```bash
npm run web
```

Expo membuka browser (Metro di port 8081). Di web:

- peta memakai Leaflet (`components/Map.web.tsx`);
- token disimpan di `localStorage`;
- lokasi memakai geolocation browser (biasanya hanya di `https://` atau `localhost`), tanpa lokasi latar;
- dialog konfirmasi memakai `window.confirm`, getaran tidak ada.

Dengan `EXPO_PUBLIC_API_URL=lan`, versi web memanggil `http://localhost:4000`. Server mengizinkan CORS dari mana saja, jadi web lokal juga bisa memakai API produksi.

Membuat berkas statis seperti di produksi (tanpa mengunggah):

```bash
cd app
EXPO_PUBLIC_API_URL=https://jejak.masamune.my.id/api npx expo export --platform web --output-dir dist
```

`app.json` memakai `web.output: "single"` (satu `index.html`, routing di sisi klien), dan rute di-*split* per layar (`asyncRoutes.web`).

---

## Mode simulasi GPS

Untuk mencoba perekaman, pemandu rute, dan segmen tanpa keluar rumah. Hanya tersedia saat `__DEV__` (Expo Go / Metro), di layar **Rekam** sebelum mulai: sakelar **Simulasi GPS (mode uji)**.

Cara kerja (`app/src/lib/sim.ts`):

| Hal | Nilai |
| --- | --- |
| Jalur | Garis rute yang dipilih; tanpa rute: persegi sisi 500 m dari posisimu (atau Alun-alun Wonogiri), diputari 3 kali (±6 km). |
| Kecepatan dasar | Lari 3,2 m/s, sepeda 7 m/s, jalan 1,4 m/s (`SIM_SPEED` di `rekam.tsx`). |
| Variasi | Tiap langkah dikali acak 0,85–1,15. |
| Jam | Jam simulasi sendiri; satu "detik" simulasi tiap 125 ms nyata (8× lebih cepat). Stopwatch memakai jam ini. |
| Getar posisi | ±0,00001° (sekitar ±1 m) per sumbu. |
| Ketinggian | `110 + 12 × sin(jarak / 350)` m, supaya tanjakan terisi. |
| Akurasi | Selalu 5 m. |

Di ujung jalur posisi berhenti; karena titik yang bergeser kurang dari 3 m ditolak, track tidak bertambah lagi. Tekan **Jeda** lalu tekan-tahan **Tahan untuk selesai**.

Tips: buat rute dulu, pilih rute itu di layar Rekam, lalu aktifkan simulasi. Kamu bisa melihat rambu belokan, getar (di HP), dan sisa jarak. Untuk mencoba segmen, rekam dua kali di jalur yang sama, buat segmen dari salah satunya, lalu lihat leaderboard.

Catatan: setelah selesai lalu **Lanjutkan** di layar simpan, simulasi dibuat ulang dari awal jalur dengan jam yang dimulai dari waktu nyata. Untuk uji yang rapi, pakai Jeda/Lanjut, bukan Selesai/Lanjutkan.

---

## Tes dan pemeriksaan kode

```bash
npm test           # tes server saja
npm run check      # typecheck server, tes, typecheck app, ESLint app
```

Tes ada di `server/test/` dan memakai `node:test` + `node:assert/strict`:

| Berkas | Isi |
| --- | --- |
| `geo.test.ts` | Haversine, ringkasan (jarak, waktu bergerak, jeda), split, waktu terbaik, tanjakan, pencocokan segmen (searah/berlawanan/paralel/dua kali lewat), progres rute (putaran, pergi-pulang), batas titik cuplikan. |
| `api.test.ts` | Akun (daftar, masuk, salah sandi, tanpa token), aktivitas + feed + kudos + komentar + statistik, rute, segmen + leaderboard + filter, validasi. |
| `helpers.ts` | `walkPath()` membuat track sintetis berkecepatan tetap; `north()`/`east()` menggeser titik dalam meter; `HOME` = Alun-alun Wonogiri. |

Tes API memakai database `:memory:` dan `planRoute` tiruan, jadi tidak ada panggilan jaringan ke OSRM.

Menulis tes baru:

```ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as geo from '../../shared/geo.ts';
import { HOME, north, walkPath } from './helpers.ts';

test('1 km tercepat dengan 4 m/s = 250 detik', () => {
  const c = geo.cumulative([walkPath([HOME, north(HOME, 1200)], 4)]);
  assert.ok(Math.abs(geo.bestEffort(c, 1000)!.elapsedS - 250) < 2);
});
```

---

## Gaya kode

**Prettier** (`.prettierrc.json` di akar):

```json
{ "singleQuote": true, "printWidth": 130, "bracketSameLine": true }
```

Prettier tidak dipasang sebagai dependensi; pakai ekstensi editor atau `npx prettier --write <berkas>`.

**TypeScript**: mode `strict` di app dan server.

- Server (`server/tsconfig.json`): `erasableSyntaxOnly` dan `verbatimModuleSyntax`. Karena Node hanya membuang tipe, **jangan** pakai sintaks yang menghasilkan kode (`enum`, `namespace`, parameter properties di constructor). Import tipe wajib `import type`. Import lokal memakai ekstensi `.ts` (`'./db.ts'`, `'../../shared/geo.ts'`).
- App: alias `@/*` → `app/src/*`, `@shared/*` → `shared/*`. Typed routes dan React Compiler aktif (`app.json` → `experiments`).

**ESLint**: `eslint-config-expo` (flat config), dijalankan pada `app/src`.

**Kebiasaan proyek**:

- Teks UI, pesan error API, dan komentar kode dalam bahasa Indonesia.
- Layar di `app/src/app/`, komponen di `app/src/components/`, logika non-UI di `app/src/lib/`.
- Hitungan geo yang dibutuhkan app **dan** server ditaruh di `shared/geo.ts`, bukan diduplikasi.
- Tipe data API ditambahkan di `shared/api.ts` supaya app dan server memakai kontrak yang sama.
- Pasang paket app dengan `npx expo install <paket>` (bukan `npm install`) supaya versinya cocok dengan SDK 58 (lihat `app/AGENTS.md`).

---

## Jebakan yang diketahui

**Jangan jalankan Expo dengan `CI=1`.** Mode CI mematikan pemantauan berkas Metro, sehingga perubahan kode tidak terbaca dan app tidak memuat ulang. Bila Metro tampak "tidak melihat" perubahan, cek variabel ini (`echo $CI`) dan jalankan ulang tanpa `CI`.

**`shared/` berada di luar folder `app/`.** Metro hanya memantau folder proyek, jadi `app/metro.config.js` menambahkan `../shared` ke `watchFolders`. Jangan hapus baris itu; tanpa itu import `@shared/...` gagal atau perubahannya tidak terbaca.

**Perubahan di `shared/` dipakai app dan server sekaligus.**

- Ubah `geo.ts` → ringkasan aktivitas, split, rekor, dan pencocokan segmen di server ikut berubah, juga simulasi dan pemandu rute di app. Aktivitas lama **tidak** dihitung ulang otomatis.
- Ubah `api.ts` → periksa kedua sisi dengan `npm run check`.
- `geo.ts` harus tetap **tanpa import** dan tanpa API khusus Node atau React Native. `api.ts` hanya boleh `import type` dengan ekstensi `.ts`.
- Restart server setelah mengubah `shared/` (kecuali memakai `npm run dev --prefix server`).

**Urutan import paling atas di `_layout.tsx` penting.** `import '@/lib/crash'` harus tetap pertama (supaya error fatal sedini mungkin tercatat), lalu `import '@/lib/location-task'` (karena `TaskManager.defineTask` wajib dipanggil di level modul sebelum tugas latar dipanggil sistem). Jangan pindahkan keduanya ke bawah import lain.

**Layar error merah hanya ada saat pengembangan.** Di APK, error JavaScript tampil sebagai layar laporan (*Ada yang gagal di layar ini* atau *Jejak sempat berhenti*), dan crash native tidak meninggalkan laporan sama sekali. Lihat [build-apk.md](build-apk.md#bila-apk-tertutup-sendiri-crash).

**Token produksi tidak berlaku di server lokal** (dan sebaliknya), karena databasenya berbeda. Saat berpindah server, app menerima 401 lalu otomatis keluar; masuk lagi atau daftar akun di server itu.

**Perubahan `app.json` (plugin, izin, ikon) tidak terasa di Expo Go.** Hal native seperti izin lokasi latar dan MapLibre hanya berlaku di build EAS.

**Tidak ada migrasi database.** `create table if not exists` tidak menambah kolom pada tabel yang sudah ada. Lihat [data.md](data.md#perubahan-skema).

**Server lokal terbuka di jaringan.** Dengan `HOST=0.0.0.0` siapa pun di WiFi yang sama bisa mengakses port 4000. Pakai `HOST=127.0.0.1` bila tidak butuh akses dari HP.
