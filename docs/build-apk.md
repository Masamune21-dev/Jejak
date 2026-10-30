# Build APK / AAB (EAS)

APK Android dibangun di cloud **EAS Build** memakai akun Expo, tanpa Android Studio. APK mandiri bisa merekam saat layar mati (lokasi latar) dan memakai peta MapLibre yang gratis tanpa kunci Google.

## Daftar isi

1. [Konfigurasi yang sudah ada](#konfigurasi-yang-sudah-ada)
2. [Modul native baru di 0.2.0](#modul-native-baru-di-020)
3. [Notifikasi push di 0.3.0](#notifikasi-push-di-030)
4. [Membuat APK](#membuat-apk)
5. [Memasang APK di HP](#memasang-apk-di-hp)
6. [Ukuran APK: hanya arm64-v8a](#ukuran-apk-hanya-arm64-v8a)
7. [Profil build](#profil-build)
8. [Server yang dipakai APK](#server-yang-dipakai-apk)
9. [Keystore (kunci tanda tangan)](#keystore-kunci-tanda-tangan)
10. [Peta di APK Android: MapLibre](#peta-di-apk-android-maplibre)
11. [Lokasi latar](#lokasi-latar)
12. [Izin foto dan kamera](#izin-foto-dan-kamera)
13. [Bila APK tertutup sendiri (crash)](#bila-apk-tertutup-sendiri-crash)
14. [Menaikkan versi](#menaikkan-versi)
15. [Uji cepat setelah memasang APK](#uji-cepat-setelah-memasang-apk)

---

## Konfigurasi yang sudah ada

Proyek sudah ditautkan ke EAS sebagai **@masamune21/jejak** (hasil `eas init`). Di `app/app.json`:

| Kunci | Nilai |
| --- | --- |
| `expo.owner` | `masamune21` |
| `expo.slug` | `jejak` |
| `expo.extra.eas.projectId` | ID proyek EAS (jangan diubah) |
| `expo.android.package` | `id.my.masamune.jejak` |
| `expo.ios.bundleIdentifier` | `id.my.masamune.jejak` |
| `expo.version` | `0.2.0` |
| `expo.scheme` | `jejak` |

Jadi `eas init` **tidak perlu** dijalankan lagi.

Plugin di `expo.plugins` yang memengaruhi build native:

| Plugin | Gunanya |
| --- | --- |
| `expo-router` | Navigasi berbasis berkas. |
| `expo-splash-screen` | Layar pembuka berlatar `#0E1114`. |
| `expo-location` | Izin lokasi dan lokasi latar (lihat [Lokasi latar](#lokasi-latar)). |
| `@maplibre/maplibre-react-native` | Kode native MapLibre untuk peta Android. |
| `expo-secure-store` | Penyimpanan token di Keystore/Keychain. |
| `expo-sharing` | Lembar berbagi sistem (Bagikan, Ekspor GPX). |
| `expo-image-picker` | Memilih foto dan memotret untuk Bagikan, foto profil, foto sampul, dan postingan (lihat [Izin foto dan kamera](#izin-foto-dan-kamera)). |
| `expo-media-library` | Menyimpan gambar ke galeri. |
| `expo-build-properties` | Hanya ABI `arm64-v8a` dan `useLegacyPackaging` (lihat [Ukuran APK](#ukuran-apk-hanya-arm64-v8a)). |

---

## Modul native baru di 0.2.0

App 0.2.0 menambah empat modul yang membawa kode native. Modul ini tidak butuh plugin di `app.json`, tetapi kodenya baru ada di APK setelah **build ulang lewat EAS**:

| Paket | Untuk | Dipakai di |
| --- | --- | --- |
| `expo-clipboard` | Menyalin stiker PNG ke papan klip (**Salin** di layar Bagikan) | `aktivitas/[id]/bagikan.tsx` |
| `expo-image-manipulator` | Memperkecil foto dan menyimpannya ulang sebagai JPEG, sekaligus membuang EXIF (lokasi GPS) | `lib/photo.ts` |
| `expo-blur` | Blur di belakang baris angka hero profil saat ada foto sampul (`dimezisBlurViewSdk31Plus`: aktif di Android 12 ke atas) | `components/ProfileView.tsx` |
| `expo-application` | Versi dan nomor build di Pengaturan → Tentang aplikasi | `pengaturan.tsx` |

Keempatnya ada di Expo Go, jadi pengembangan tetap bisa lewat Expo Go. Dipasang dengan `npx expo install <paket>` supaya versinya cocok dengan SDK 58.

Akibatnya **APK 0.1.x harus diganti APK 0.2.0**. App tidak memakai pembaruan OTA (`expo-updates` tidak terpasang), jadi APK lama tetap menjalankan JavaScript lamanya: tidak ada tema, foto, postingan, maupun chat, tetapi tetap bisa dipakai karena server masih melayani endpoint lama (`/feed`). Versi web langsung mendapat semua fitur setelah `deploy/deploy.sh web`.

Urutan rilis 0.2.0: deploy server dulu (`deploy/deploy.sh server`), lalu build APK `preview`, uji, lalu bagikan.

---

## Notifikasi push di 0.3.0

- **Modul:** `expo-notifications` (~58.1), dengan plugin di `app.json`: ikon notifikasi `assets/images/notification-icon.png` (96×96, putih transparan, dipotong dari `android-icon-monochrome.png`), warna `#FFC629`, kanal bawaan `info`.
- **Firebase:** `android.googleServicesFile: "./google-services.json"`. Berkas ini dari proyek Firebase `absensi-f66e1` (aplikasi Android `id.my.masamune.jejak`). Tanpa berkas ini token FCM tidak bisa diambil. Berkas ini **tidak masuk repo** (ada di `app/.gitignore`): `app.config.ts` memakai variabel file EAS `GOOGLE_SERVICES_JSON` saat build, dan `app/google-services.json` di komputer sendiri bila variabel itu kosong. Unggah sekali dari folder `app/`, dan ulangi dengan `--force` bila berkasnya diganti:

  ```bash
  npx eas-cli@latest env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret --environment preview --environment production
  ```
- **Expo Go:** push jarak jauh tidak didukung sejak SDK 53, jadi bagian notifikasi disembunyikan di Expo Go dan web. Uji notifikasi selalu dengan APK `preview`.
- **Kanal:** `info` (*Info dan pengumuman*, penting) dan `pembaruan` (*Pembaruan aplikasi*, biasa), dibuat app sebelum meminta izin. Setelah dibuat, Android hanya mengizinkan mengganti nama dan deskripsi kanal.
- **APK 0.2.x** tidak punya notifikasi maupun kartu pembaruan, jadi 0.3.0 harus dibagikan manual sekali lagi. Pembaruan sesudahnya diumumkan lewat `deploy/deploy.sh apk --umumkan` dan kartu di Beranda.

---

## Membuat APK

Semua perintah dijalankan di folder `app/`:

```bash
cd app
npx eas-cli@latest login                                        # sekali saja per komputer
npx eas-cli@latest build --platform android --profile preview   # APK
```

Build berjalan di server Expo. Setelah selesai, EAS memberi tautan dan kode QR untuk mengunduh APK (lihat [Memasang APK di HP](#memasang-apk-di-hp)).

Untuk Google Play:

```bash
npx eas-cli@latest build --platform android --profile production   # AAB
```

`eas.json` mensyaratkan EAS CLI versi 16.0.0 atau lebih baru (`cli.version`); `npx eas-cli@latest` selalu memakai versi terbaru.

---

## Memasang APK di HP

**Lewat tautan EAS (paling mudah):**

1. Scan QR dari hasil build atau buka tautannya di browser HP (halaman build juga ada di expo.dev, proyek @masamune21/jejak, menu Builds).
2. Unduh berkas `.apk`.
3. Buka berkas itu dari notifikasi unduhan atau aplikasi Files. Android meminta izin **Instal aplikasi tidak dikenal** untuk browser/Files tersebut; izinkan, lalu kembali dan tekan **Instal**.
4. Bila Play Protect memperingatkan aplikasi tidak dikenal, pilih untuk tetap memasang.

**Lewat kabel (adb):**

```bash
adb install -r jejak.apk        # -r = timpa versi lama, data app dipertahankan
```

Catatan pemasangan:

- APK baru bisa menimpa versi lama hanya bila ditandatangani keystore yang sama (lihat [Keystore](#keystore-kunci-tanda-tangan)). Bila muncul *Aplikasi tidak terinstal* karena konflik, copot dulu versi lama (rekaman yang belum tersimpan dan sesi login di HP ikut hilang).
- APK hanya untuk HP **64-bit ARM** (lihat bagian berikut). Di HP 32-bit, pemasangan gagal.

---

**Lewat situs Jejak:** setelah build `preview` selesai, jalankan `deploy/deploy.sh apk` (lihat [deploy.md](deploy.md#bagian-apk-deploysh-apk)). APK terbaru tersedia di https://jejak.masamune.my.id/unduh/jejak.apk dan tombol **Unduh** di halaman depan versi web, dengan versi dan ukurannya. Alamat ini tetap sama untuk setiap versi, berbeda dengan tautan EAS yang berganti di setiap build.

## Ukuran APK: hanya arm64-v8a

Plugin `expo-build-properties` di `app.json`:

```json
["expo-build-properties", { "android": { "buildArchs": ["arm64-v8a"], "useLegacyPackaging": true } }]
```

| Pengaturan | Akibat |
| --- | --- |
| `buildArchs: ["arm64-v8a"]` | Library native (React Native, Hermes, MapLibre, dll.) hanya dibangun untuk ARM 64-bit, bukan juga untuk `armeabi-v7a`, `x86`, dan `x86_64`. APK jauh lebih kecil. Hampir semua HP Android beberapa tahun terakhir memakai arm64. |
| `useLegacyPackaging: true` | Library native disimpan **terkompres** di dalam APK, sehingga berkas yang diunduh lebih kecil. Saat dipasang, Android mengekstraknya, jadi ukuran setelah terpasang sedikit lebih besar daripada tanpa kompresi. |

Akibatnya APK **tidak bisa dipasang** di:

- HP Android lama yang hanya 32-bit (`armeabi-v7a`);
- emulator Android x86/x86_64 di komputer Intel/AMD (emulator arm64 di Mac Apple Silicon tetap bisa).

Cara mengecek ABI HP lewat adb: `adb shell getprop ro.product.cpu.abilist`; harus ada `arm64-v8a`. Lewat adb, ABI yang tidak cocok muncul sebagai `INSTALL_FAILED_NO_MATCHING_ABIS`.

Bila perlu mendukung HP 32-bit, tambahkan `"armeabi-v7a"` ke `buildArchs` lalu build ulang (APK jadi lebih besar). Profil `production` (AAB) tidak terlalu terpengaruh ukuran, karena Google Play hanya mengirim bagian yang cocok dengan HP pengguna, tetapi pengaturan ABI yang sama tetap berlaku.

---

## Profil build

Dari `app/eas.json`:

| Profil | Hasil | Distribusi | Lain-lain |
| --- | --- | --- | --- |
| `preview` | **APK** (`android.buildType: "apk"`) | `internal`: dibagikan lewat tautan, tidak lewat toko | `environment: "preview"` |
| `production` | **AAB** (bawaan EAS untuk Android bila `buildType` tidak diisi) | Toko (Google Play) | `autoIncrement: true`, `environment: "production"` |

Ada juga `submit.production` kosong untuk `eas submit`; pengiriman ke Google Play membutuhkan akun Play Console dan belum disiapkan.

Belum ada profil `development` (development build). Kedua profil di atas adalah build rilis, sehingga sakelar **Simulasi GPS** (hanya `__DEV__`) tidak muncul di APK.

Build iOS (`--platform ios`) membutuhkan akun Apple Developer dan belum disiapkan.

---

## Server yang dipakai APK

APK memakai `EXPO_PUBLIC_API_URL` yang terbaca saat bundling di EAS, yaitu dari `app/.env`:

```
EXPO_PUBLIC_API_URL=https://jejak.masamune.my.id/api
```

`app/.env.local` (misalnya berisi `lan`) **tidak** ikut, karena diabaikan git. Ini memang yang diinginkan: nilai `lan` tidak bisa bekerja di APK, sebab APK tidak terhubung ke Metro sehingga app akan mencoba `http://localhost:4000` di HP itu sendiri.

Bila perlu APK untuk server lain, nilai `EXPO_PUBLIC_API_URL` harus diganti khusus untuk build itu (misalnya lewat variabel lingkungan EAS di environment `preview`). Periksa hasilnya lewat tulisan **Server: …** di layar masuk APK.

---

## Keystore (kunci tanda tangan)

Saat build Android pertama, EAS bertanya soal keystore. Pilih **Generate a new Android Keystore**. EAS menyimpannya di server Expo dan memakainya otomatis di build berikutnya.

Penting:

- Semua APK/AAB berikutnya harus ditandatangani dengan keystore yang **sama**. Android hanya mau memperbarui app yang sudah terpasang bila tanda tangannya sama; bila berbeda, app lama harus dicopot dulu (data lokal di HP ikut hilang).
- Untuk melihat, mengunduh (backup), atau mengganti kredensial:

  ```bash
  npx eas-cli@latest credentials --platform android
  ```

- Simpan salinan keystore di tempat aman. Berkas `*.jks`, `*.key`, `*.p12`, dan sejenisnya sudah diabaikan git (`app/.gitignore`); jangan di-commit.

---

## Peta di APK Android: MapLibre

`components/Map.tsx` memakai MapLibre di Android **kecuali** di Expo Go:

```ts
const LIBRE = Platform.OS === 'android' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
```

Alasannya:

- **react-native-maps di Android memakai Google Maps SDK**, yang di APK sendiri wajib punya kunci API Google Maps dan akun penagihan Google Cloud. Tanpa kunci, peta tampil kosong.
- **MapLibre** adalah mesin peta sumber terbuka. Dengan ubin raster **OpenStreetMap** yang digelapkan (sama dengan versi web dan cuplikan peta), tidak perlu kunci API atau akun penagihan.
- Expo Go tidak membawa kode native MapLibre, jadi di Expo Go Android tetap memakai react-native-maps (Google Maps dengan kunci milik Expo Go). Modul yang tidak terpilih tidak dimuat sama sekali.
- iOS selalu memakai react-native-maps (Apple Maps, tanpa kunci).

MapLibre dipasang lewat plugin `@maplibre/maplibre-react-native` di `app.json`, sehingga baru aktif setelah build EAS. Atribusi *© OpenStreetMap* wajib tetap tampil.

Sejak commit `b668024`, modul peta baru dimuat saat peta pertama kali tampil (bukan saat app dibuka). Bila modul JavaScript MapLibre gagal dimuat, app mencatat `[peta] MapLibre gagal dimuat, pakai react-native-maps` dan memakai react-native-maps: petanya mungkin kosong (tanpa kunci Google), tetapi app tidak tertutup. Detail di [arsitektur.md](arsitektur.md#pemilihan-implementasi-peta).

---

## Lokasi latar

Agar bisa merekam saat layar mati, `app.json` mengatur plugin `expo-location`:

| Opsi | Nilai |
| --- | --- |
| `isAndroidBackgroundLocationEnabled` | `true` |
| `isAndroidForegroundServiceEnabled` | `true` |
| `isIosBackgroundLocationEnabled` | `true` |
| `locationWhenInUsePermission` | *Jejak memakai lokasi untuk merekam rute lari dan bersepeda.* |
| `locationAlwaysAndWhenInUsePermission` | *Jejak memakai lokasi untuk merekam rute lari dan bersepeda, juga saat layar terkunci.* |

Izin Android (`android.permissions`): `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `RECEIVE_BOOT_COMPLETED`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`.

Perilaku di APK:

1. Saat pertama mulai merekam, app meminta izin lokasi biasa, lalu **sekali saja** meminta izin lokasi latar. Di Android 11 ke atas, permintaan ini membuka halaman Pengaturan; pilih **Izinkan sepanjang waktu**.
2. Bila diizinkan, perekam memakai layanan latar depan dengan notifikasi **Jejak sedang merekam** (*Rute kamu tetap tercatat walau layar mati.*). Pil di layar Rekam bertuliskan *GPS aktif, tetap merekam saat layar mati*.
3. Bila tidak diizinkan, perekam memakai GPS biasa dan menjaga layar tetap menyala (*GPS aktif. Biarkan layar menyala*). App tidak akan bertanya lagi; ubah izinnya manual di Pengaturan HP → Aplikasi → Jejak → Izin → Lokasi.

**Lokasi latar tidak tersedia di Expo Go**, berapa pun izinnya. Di Expo Go perekam selalu memakai mode layar menyala.

Beberapa merek HP mematikan layanan latar secara agresif untuk menghemat baterai. Bila rekaman berhenti saat layar mati, matikan optimasi baterai untuk Jejak.

---

## Izin foto dan kamera

Fitur **Bagikan ke foto**, ganti **foto profil/sampul**, dan **Tulis postingan** memakai dua plugin dengan teks izin berikut (`app.json`). Teksnya masih hanya menyebut Bagikan, walau izin yang sama juga dipakai untuk foto profil dan postingan:

| Plugin | Izin | Teks yang tampil |
| --- | --- | --- |
| `expo-image-picker` | Galeri (`photosPermission`) | *Jejak membuka galeri supaya kamu bisa menempelkan hasil aktivitas di fotomu.* |
| `expo-image-picker` | Kamera (`cameraPermission`) | *Jejak memakai kamera supaya kamu bisa memotret lalu menempelkan hasil aktivitas.* |
| `expo-image-picker` | Mikrofon | Dimatikan (`microphonePermission: false`). |
| `expo-media-library` | Galeri (`photosPermission`) | *Jejak membuka galeri untuk menyimpan gambar hasil aktivitas.* |
| `expo-media-library` | Simpan foto (`savePhotosPermission`) | *Jejak menyimpan gambar hasil aktivitas ke galerimu.* |

`expo-media-library` diatur dengan `granularPermissions: ["photo"]` (hanya foto, tanpa video/audio) dan `isAccessMediaLocationEnabled: false` (tidak membaca lokasi di dalam foto). Saat menyimpan, app meminta izin **hanya menulis** untuk foto.

Izin kamera diminta saat menekan **Kamera** atau **Ambil foto**, izin menyimpan ke galeri saat menekan **Simpan** di layar Bagikan. Bila ditolak, app menampilkan pesan dan izinnya harus diubah manual di Pengaturan HP.

Foto yang diunggah (profil, sampul, postingan) disimpan ulang oleh `expo-image-manipulator` sebelum dikirim, jadi lokasi GPS di EXIF tidak ikut terunggah. `expo-clipboard` tidak butuh izin untuk menyalin.

---

## Bila APK tertutup sendiri (crash)

APK yang dibangun sebelum commit `edea652` langsung tertutup (force close) saat dibuka. Log `adb logcat -b crash` dari HP (Xiaomi, Android 16) menunjukkan penyebabnya:

```
java.lang.RuntimeException: Unable to get provider androidx.startup.InitializationProvider
Caused by: java.lang.RuntimeException: Failed to create an instance of class androidx.work.impl.WorkDatabase…
  at androidx.work.WorkManagerInitializer.create
```

WorkManager menyala otomatis saat app dibuka dan membuat database Room lewat refleksi. Expo SDK 58 menyalakan R8 (minify) secara bawaan di build rilis (`android.enableMinifyInReleaseBuilds=true`), dan R8 merusak pencarian kelas itu, jadi app mati sebelum JavaScript sempat jalan. WorkManager dibawa oleh **react-native-maps**, padahal APK Android memakai MapLibre.

Perbaikannya (`edea652`):

- `app/react-native.config.js` mengecualikan react-native-maps dari autolinking Android. Di Expo Go dan iOS react-native-maps tetap dipakai. APK juga jadi lebih kecil karena Google Maps SDK dan WorkManager ikut hilang.
- `extraProguardRules` di plugin `expo-build-properties` menjaga kelas `androidx.work.**` dan `androidx.room.**` dari R8, sebagai pengaman bila pustaka lain membawa WorkManager.

Selain itu, build sejak `b668024` membedakan jenis crash:

| Jenis | Yang terjadi di build baru |
| --- | --- |
| **Error JavaScript** saat menampilkan layar | Layar **Ada yang gagal di layar ini** berisi pesan error dan stack, dengan tombol **Coba lagi**. App tidak tertutup. |
| **Error JavaScript fatal** di luar render | Laporan disimpan sebelum app tertutup. Saat app dibuka lagi, tampil layar **Jejak sempat berhenti** berisi pesan, stack, dan waktu, dengan tombol **Tutup**. |
| **Crash native** (Java/Kotlin/C++: modul native, MapLibre, memori) | App tetap tertutup tanpa laporan. Penyebabnya hanya terlihat lewat `adb logcat`. |

Untuk dua jenis pertama: foto layar laporannya dan kirim ke pengembang. Cara kerjanya dijelaskan di [arsitektur.md](arsitektur.md#pencatat-crash-dan-errorboundary).

### Mengambil log crash native dengan adb

1. **Aktifkan Opsi pengembang** di HP: Setelan → Tentang ponsel → ketuk **Nomor build** 7 kali (letaknya sedikit berbeda per merek).
2. **Aktifkan Debugging USB**: Setelan → Sistem → Opsi pengembang → **Debugging USB**.
3. **Pasang adb** di komputer: macOS `brew install android-platform-tools`; Windows/Linux unduh *SDK Platform-Tools* dari situs Android Developers.
4. Sambungkan HP dengan kabel USB, terima dialog *Izinkan debugging USB?* di HP, lalu pastikan HP terlihat:

   ```bash
   adb devices
   ```

5. Kosongkan log crash lama, buka Jejak sampai tertutup, lalu ambil log crash:

   ```bash
   adb logcat -b crash -c                  # kosongkan buffer crash
   # buka Jejak di HP sampai tertutup
   adb logcat -b crash -d > jejak-crash.txt
   ```

6. Cari baris `FATAL EXCEPTION` atau `id.my.masamune.jejak` di `jejak-crash.txt`. Baris *Caused by* di bawahnya biasanya menunjukkan penyebabnya.

Tanpa `-d`, `adb logcat -b crash` terus menampilkan crash baru secara langsung sampai dihentikan dengan Ctrl+C. Bila buffer crash kosong, log umum yang lebih panjang bisa diambil dengan `adb logcat -d > jejak-log.txt`.

---

## Menaikkan versi

| Nomor | Sumber | Cara menaikkan |
| --- | --- | --- |
| Versi tampilan (`versionName`, sekarang `0.2.0`) | `expo.version` di `app/app.json` | Ubah manual, commit. Tampil di Pengaturan → Tentang aplikasi → **Versi**. |
| Kode versi Android (`versionCode`) | Disimpan di server EAS (`cli.appVersionSource: "remote"` di `eas.json`), bukan di `app.json` | Profil `production` menaikkannya otomatis setiap build (`autoIncrement: true`). Profil `preview` tidak. Tampil sebagai *(build N)* di samping versi di Pengaturan. |

Perintah untuk melihat dan mengatur kode versi di EAS:

```bash
npx eas-cli@latest build:version:get --platform android
npx eas-cli@latest build:version:set --platform android
```

Untuk rilis baru: naikkan `expo.version`, commit, lalu build `production` (kode versi naik sendiri). Google Play menolak AAB dengan kode versi yang sudah pernah diunggah.

---

## Uji cepat setelah memasang APK

1. Layar masuk menampilkan **Server: jejak.masamune.my.id/api**.
2. Masuk atau daftar.
3. Peta di tab Rekam tampil (abu-abu bersih dengan nama jalan).
4. Mulai rekam, izinkan lokasi **sepanjang waktu**; pil menunjukkan *GPS aktif, tetap merekam saat layar mati* dan notifikasi *Jejak sedang merekam* muncul.
5. Kunci layar, berjalan beberapa menit, buka lagi: jarak bertambah.
6. Jeda → tekan-tahan **Tahan untuk selesai** → Simpan; detail aktivitas terbuka dengan split dan peta.
7. Di detail: **Bagikan** → geser ke beberapa stiker → **Simpan** (izinkan foto) lalu buka di galeri: bagian luar stiker harus transparan, bukan hitam/putih. Coba **Salin** lalu tempel di Story Instagram. Lalu **Ekspor GPX** membuka lembar berbagi.
8. Profil → roda gigi → **Pengaturan**: versi tampil *0.2.0 (build N)*; ganti tema ke **Terang** dan warna aksen, semua layar dan peta ikut berganti tanpa membuka ulang app.
9. Profil → ketuk avatar → **Ambil foto**: foto profil tampil; ganti juga foto sampul dan pastikan baris Aktivitas / Jarak / Waktu terbaca (blur di Android 12 ke atas).
10. Dengan dua akun yang saling mengikuti: **Kirim pesan** dari profil, balas dari akun lain; pesan muncul dalam beberapa detik dan angka belum dibaca di Beranda bertambah.
