# Dokumentasi Jejak

Jejak adalah aplikasi olahraga ala Strava: rekam lari, bersepeda, dan jalan kaki dengan GPS, buat rute sendiri yang mengikuti jalan lalu ikuti saat merekam (petunjuk belok + peringatan keluar rute), lihat feed teman, beri kudos dan komentar, pantau statistik dan rekor pribadi, adu waktu di segmen lewat leaderboard, serta bagikan hasil aktivitas sebagai stiker transparan, gambar, atau berkas GPX. Sejak app 0.2.0 ada juga foto profil dan sampul, daftar pengikut, postingan dengan Diskusi segmen, pesan antarteman, serta tema terang/gelap dengan lima warna aksen.

Versi produksi: **https://jejak.masamune.my.id** (web) dengan API di `https://jejak.masamune.my.id/api`.

## Daftar dokumen

| Dokumen | Isi |
| --- | --- |
| [fitur.md](fitur.md) | Panduan pengguna per layar: daftar/masuk, beranda, rekam, ikuti rute, buat rute, detail aktivitas, bagikan ke foto (stiker dan template), ekspor GPX, segmen, leaderboard dan Diskusi, profil dan foto, pengikut, cari teman, postingan, pesan, pengaturan. |
| [arsitektur.md](arsitektur.md) | Komponen dan aliran data, mesin status perekam, sumber lokasi, pemilihan dan pemuatan peta, pencatat crash, berbagi gambar/berkas, tema, unggah foto dan alamat bertanda tangan, polling chat, alamat API, token login, kunci React Query. |
| [api.md](api.md) | Referensi semua endpoint HTTP: metode, path, body, respons, kode error. Termasuk foto, pengikut, timeline, postingan, chat, dan blokir. |
| [data.md](data.md) | Skema SQLite: tabel, kolom, relasi, indeks, format kolom JSON, berkas foto, migrasi. |
| [algoritma.md](algoritma.md) | Rumus dan ambang: waktu bergerak, tanjakan, kecepatan maksimum, split, waktu terbaik, PR, pencocokan segmen, progres rute, filter GPS, routing OSRM. |
| [pengembangan.md](pengembangan.md) | Setup lokal, variabel lingkungan, menjalankan server/app/web, simulasi GPS, tes, gaya kode, jebakan yang diketahui. |
| [deploy.md](deploy.md) | Server produksi, service systemd (user `jejak`), kunci alamat foto, nginx + Cloudflare, `deploy/deploy.sh`, log, backup database dan folder foto, rollback. |
| [build-apk.md](build-apk.md) | Membuat dan memasang APK/AAB lewat EAS, modul native baru di 0.2.0, ukuran APK (arm64), keystore, peta MapLibre, lokasi latar, izin foto/kamera, log crash dengan adb, menaikkan versi. |
| [troubleshooting.md](troubleshooting.md) | Masalah umum dan cara mengatasinya, termasuk APK yang tertutup sendiri dan gambar yang tidak tersimpan. |
| [desain.md](desain.md) | Riset UI/UX dan sistem desain: kosakata visual dari jalan (aspal, marka, patok, rambu), palet gelap/terang dan lima warna aksen, huruf, stiker dan template bagikan. |
| [ide-fitur.md](ide-fitur.md) | Daftar fitur yang sudah ada dan ide fitur berikutnya, dengan perkiraan usaha dan perlu-tidaknya build baru. |
| [rencana-update.md](rencana-update.md) | Rencana tujuh permintaan pemilik (template bagikan ala Strava, foto profil & sampul, daftar pengikut, postingan, chat, tema terang/gelap & warna, info aplikasi), semuanya sudah dikerjakan di 0.2.0, dengan catatan bagian yang berbeda dari rencana; perubahan data, keamanan, tahapan rilis, keputusan pemilik. |

Dokumentasi di atas ditulis berdasarkan kode pada commit `098e29a` (app 0.2.0). Bila perilaku app atau server berubah, perbarui dokumen yang bersangkutan.

## Gambaran singkat

Repo ini berisi tiga bagian yang saling terkait:

```
jejak/
├── app/      Aplikasi Expo SDK 58 + Expo Router (React Native 0.88, React 19).
│             Jalan di Android, iOS, dan browser (web).
├── server/   API Node 24+ dengan Hono dan SQLite bawaan Node (node:sqlite).
│             TypeScript dijalankan langsung, tanpa langkah build.
├── shared/   Kode bersama app & server: hitungan geo (geo.ts) dan tipe kontrak API (api.ts).
└── deploy/   Skrip deploy, service systemd, dan konfigurasi nginx produksi.
```

Prinsip penting:

- **Hitungan geo hanya ada di satu tempat** (`shared/geo.ts`). Server memakainya untuk ringkasan aktivitas, split, waktu terbaik, dan pencocokan segmen; app memakainya untuk jarak, simulasi GPS, dan pemandu rute. Perubahan di sana langsung berlaku untuk keduanya.
- **Ringkasan aktivitas dihitung server.** App hanya mengirim titik-titik GPS mentah (`track`); jarak, waktu bergerak, tanjakan, split, waktu terbaik, PR, dan waktu segmen semuanya dihitung ulang di server saat aktivitas diunggah.
- **Perekaman tahan app tertutup.** Status perekam disimpan ke penyimpanan lokal secara berkala dan dipulihkan saat app dibuka lagi.

## Diagram arsitektur

```mermaid
flowchart LR
  subgraph HP["HP / browser"]
    UI["Layar Expo Router<br/>(app/src/app)"]
    REC["Perekam<br/>(lib/recorder.ts)"]
    SRC["Sumber lokasi<br/>gps-bg · gps-fg · sim"]
    RQ["React Query<br/>(cache data API)"]
    MAP["Peta (dimuat lazy)<br/>MapLibre · react-native-maps · Leaflet"]
    STORE[("AsyncStorage<br/>SecureStore / localStorage")]
  end

  subgraph SHARED["shared/"]
    GEO["geo.ts<br/>jarak, split, rekor,<br/>segmen, progres rute"]
    TYPES["api.ts<br/>tipe kontrak"]
  end

  subgraph PROD["Server produksi"]
    CF["Cloudflare"]
    NGINX["nginx<br/>/api/ → :3014<br/>/ → web statis"]
    HONO["Node + Hono<br/>(server/src/app.ts)<br/>systemd 'jejak'"]
    DB[("SQLite<br/>jejak.db")]
    UP[("Foto JPEG<br/>data/uploads")]
  end

  OSRM["OSRM FOSSGIS<br/>routing.openstreetmap.de"]
  ESRI["Ubin peta<br/>OpenStreetMap"]

  SRC --> REC --> UI
  REC <--> STORE
  UI --> RQ
  RQ -- "HTTPS + Bearer token" --> CF --> NGINX --> HONO --> DB
  HONO --> UP
  HONO -- "POST /routing" --> OSRM
  MAP --> ESRI
  REC -.-> GEO
  HONO -.-> GEO
  UI -.-> TYPES
  HONO -.-> TYPES
```

Garis putus-putus berarti "memakai kode dari". Saat pengembangan lokal, app bisa langsung memanggil server di komputer sendiri (`http://<ip-komputer>:4000`) tanpa Cloudflare dan nginx. Lihat [pengembangan.md](pengembangan.md).
