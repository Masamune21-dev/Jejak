# Troubleshooting

Masalah yang mungkin muncul, penyebabnya menurut kode, dan cara mengatasinya.

## Daftar isi

1. [APK dan pemasangan](#apk-dan-pemasangan)
2. [Koneksi dan login](#koneksi-dan-login)
3. [GPS dan perekaman](#gps-dan-perekaman)
4. [Peta](#peta)
5. [Rute](#rute)
6. [Bagikan dan ekspor](#bagikan-dan-ekspor)
7. [Segmen, rekor, dan statistik](#segmen-rekor-dan-statistik)
8. [Pengembangan](#pengembangan)
9. [Deploy dan server produksi](#deploy-dan-server-produksi)

---

## APK dan pemasangan

### APK langsung tertutup saat dibuka

APK yang dibangun sebelum commit `edea652` tertutup sendiri saat dibuka. Penyebabnya WorkManager (dibawa react-native-maps) yang rusak oleh R8; rinciannya ada di [build-apk.md](build-apk.md#bila-apk-tertutup-sendiri-crash). Langkah:

1. **Pasang APK terbaru** (dibangun dari kode sejak `edea652`). Build ini juga memuat peta hanya saat dibutuhkan dan menampilkan laporan untuk error JavaScript:
   - error saat menampilkan layar: layar **Ada yang gagal di layar ini** dengan tombol **Coba lagi**, app tidak tertutup;
   - error fatal lainnya: app tertutup, tetapi saat dibuka lagi muncul layar **Jejak sempat berhenti** berisi pesan dan stack.

   Foto layar laporan itu dan kirim ke pengembang.
2. **Bila APK baru tetap tertutup tanpa laporan** saat dibuka lagi, crash-nya berasal dari kode native (modul native, MapLibre, atau memori), yang tidak bisa dicatat dari JavaScript. Ambil log dengan adb:
   1. aktifkan **Opsi pengembang** (ketuk **Nomor build** 7 kali di Tentang ponsel) dan **Debugging USB**;
   2. sambungkan kabel, terima dialog di HP, cek dengan `adb devices`;
   3. jalankan `adb logcat -b crash -c`, buka Jejak sampai tertutup, lalu `adb logcat -b crash -d > jejak-crash.txt`;
   4. cari `FATAL EXCEPTION` dan baris *Caused by* di berkas itu.

   Langkah lengkapnya ada di [build-apk.md](build-apk.md#mengambil-log-crash-native-dengan-adb).

### APK tidak bisa dipasang

- **"Aplikasi tidak terinstal" karena konflik / tanda tangan berbeda**: APK lama ditandatangani keystore lain. Copot versi lama dulu (sesi login dan rekaman yang belum tersimpan di HP ikut hilang).
- **HP 32-bit atau emulator x86**: APK hanya berisi library `arm64-v8a`. Cek dengan `adb shell getprop ro.product.cpu.abilist`; lewat adb, kesalahannya muncul sebagai `INSTALL_FAILED_NO_MATCHING_ABIS`. Lihat [build-apk.md](build-apk.md#ukuran-apk-hanya-arm64-v8a).
- **Diblokir pemasangan dari sumber tidak dikenal**: izinkan *Instal aplikasi tidak dikenal* untuk browser atau aplikasi Files yang membuka APK.

---

## Koneksi dan login

### "Tidak bisa terhubung ke server (…). Pastikan server jalan dan HP satu WiFi dengan komputer."

Muncul bila `fetch` gagal total atau melewati batas waktu (20 detik; unggah aktivitas 60 detik). Alamat di dalam kurung adalah alamat yang sedang dipakai app; alamat yang sama juga tertulis di bawah layar masuk (**Server: …**).

| Alamat yang tertulis | Periksa |
| --- | --- |
| `jejak.masamune.my.id/api` | Koneksi internet HP. Buka `https://jejak.masamune.my.id/api/health` di browser HP; harus `{"ok":true}`. |
| `192.168.x.x:4000` (mode `lan`) | `npm run server` sedang jalan; HP dan komputer di WiFi yang sama; firewall komputer mengizinkan port 4000; server tidak dijalankan dengan `HOST=127.0.0.1`. Coba buka `http://192.168.x.x:4000/health` dari browser HP. |
| `localhost:4000` | Di HP, `localhost` adalah HP itu sendiri. Terjadi bila `EXPO_PUBLIC_API_URL` kosong/`lan` tetapi app tidak dijalankan dari Metro (misalnya APK yang dibangun dengan `lan`). Pakai alamat lengkap. |
| Bukan yang diharapkan | Setelah mengubah `app/.env` atau `app/.env.local`, hentikan Metro dan jalankan lagi (`npx expo start -c` bila perlu). Nilai `EXPO_PUBLIC_*` ditanam saat bundling. |

Jaringan seluler yang lambat juga bisa membuat unggah aktivitas panjang melewati 60 detik. Rekaman tidak hilang; coba **Simpan aktivitas** lagi saat sinyal lebih baik.

### Tiba-tiba kembali ke layar masuk / "Sesi berakhir, silakan masuk lagi"

Server membalas 401 karena token tidak dikenal, lalu app otomatis mengeluarkan pengguna. Penyebab umum:

- berpindah server (produksi ↔ lokal): token dari satu database tidak berlaku di database lain;
- database server lokal dihapus atau diganti;
- sesi sudah dihapus lewat **Keluar** di perangkat yang sama.

Masuk lagi. Di server lokal, daftar akun baru bila akunnya belum ada.

### "Permintaan gagal (429)" saat masuk atau daftar

Batas laju nginx di produksi: 10 permintaan per menit per IP untuk `/api/auth/` (dengan cadangan 10). Tunggu sekitar satu menit. Pengguna di balik satu IP bersama (misalnya WiFi kantor) berbagi batas yang sama.

### "Username atau kata sandi salah" padahal yakin benar

- Username tidak peka huruf besar/kecil, tetapi kata sandi peka.
- Spasi di awal/akhir kata sandi ikut dihitung. Bila saat daftar papan ketik menambahkan spasi otomatis di akhir, kata sandinya memang mengandung spasi itu; coba masuk dengan spasi yang sama. (Akun yang didaftarkan sebelum commit `a273d33` disimpan tanpa spasi tepi; untuk akun itu, kata sandi dengan atau tanpa spasi tepi sama-sama diterima.)

### "Permintaan gagal (413)"

Badan permintaan lebih dari 20 MB (batas nginx). Bisa terjadi hanya untuk aktivitas yang sangat panjang; server sendiri menolak di atas 60.000 titik dengan *Track terlalu panjang*.

---

## GPS dan perekaman

### Tidak merekam saat layar mati (Expo Go)

Normal. Expo Go tidak mendukung lokasi latar, jadi perekam memakai mode *GPS aktif. Biarkan layar menyala* dan menjaga layar tetap hidup. Jangan kunci layar selama merekam di Expo Go, atau pakai APK (lihat [build-apk.md](build-apk.md)).

### Di APK tetap tertulis "Biarkan layar menyala"

Izin lokasi latar belum diberikan. App hanya menanyakannya **sekali**. Buka Pengaturan HP → Aplikasi → Jejak → Izin → Lokasi → **Izinkan sepanjang waktu**. Setelah itu mulai rekaman baru; sumber lokasi dipilih saat rekaman dimulai (atau saat **Lanjutkan** di layar simpan), bukan saat Jeda/Lanjut biasa.

Bila izin sudah benar tetapi rekaman tetap berhenti saat layar mati, matikan optimasi baterai untuk Jejak dan pastikan notifikasi Jejak tidak diblokir.

### "Izin lokasi ditolak. Aktifkan lokasi untuk Jejak di pengaturan HP."

Izin lokasi biasa ditolak. Berikan dari Pengaturan HP, lalu tekan Mulai lagi. Di web, izinkan lokasi di pengaturan situs browser (dan buka lewat `https://` atau `localhost`).

### Stopwatch jalan tetapi jarak tidak bertambah

Perekam menolak titik bila:

- akurasi lebih buruk dari **35 m** (lihat angka ±m di pil atas; titik kuning berarti di atas 20 m);
- bergeser kurang dari **3 m** dari titik sebelumnya;
- kecepatannya lebih dari **45 m/s** (lompatan GPS).

Di dalam gedung atau di antara bangunan tinggi, akurasi sering di atas 35 m. Keluar ke tempat terbuka dan tunggu akurasi membaik. Pada simulasi GPS, jarak berhenti bertambah saat simulasi sampai di ujung jalur.

### Pace di layar rekam berbeda dengan di detail aktivitas

Bukan bug. Layar rekam menghitung pace dari **waktu aktif** (semua waktu di luar jeda, termasuk berdiri diam). Detail aktivitas dan feed memakai **waktu bergerak** (hanya interval dengan kecepatan di atas 0,5 m/s) yang dihitung server. Lihat [algoritma.md](algoritma.md#waktu-bergerak).

### Rekaman muncul "Dijeda" setelah app dibuka lagi

Normal. Bila app tertutup atau dimatikan sistem saat merekam, rekaman dipulihkan dalam keadaan dijeda. Tekan **Lanjut** untuk meneruskan atau tekan-tahan **Tahan untuk selesai** untuk menyimpan.

### Tombol "Tahan untuk selesai" tidak bereaksi, muncul "Tekan lebih lama"

Disengaja, supaya rekaman tidak tertutup karena tersentuh. Ketukan biasa hanya memunculkan *Tekan lebih lama* selama 2,5 detik. Tekan dan tahan tombol sekitar 0,6 detik. Di APK dengan lokasi latar, titik selama app tertutup ikut masuk; di Expo Go tidak.

### "Aktivitas terlalu pendek untuk disimpan"

Track hanya berisi kurang dari 2 titik yang lolos filter (misalnya langsung Selesai setelah Mulai, atau akurasi GPS terus di atas 35 m). Tekan **Lanjutkan** dan rekam lebih lama, atau **Buang**.

### Gagal menyimpan aktivitas

Pesan error ditampilkan di layar simpan dan rekaman **tidak** dihapus. Perbaiki penyebabnya (biasanya koneksi) lalu tekan **Simpan aktivitas** lagi.

### Tidak ada getaran saat belokan atau keluar rute

- Getaran hanya terjadi saat status **merekam** (bukan saat dijeda) dan hanya di HP (tidak di web).
- Getar belokan muncul sekali per belokan saat jaraknya kurang dari 30 m. Rute garis lurus tidak punya belokan.
- Getar keluar rute hanya saat **mulai** keluar (lebih dari 40 m dari garis), tidak berulang selama tetap di luar.
- Periksa mode senyap/getar HP.

### Peringatan "Keluar dari rute" terus muncul

Peringatan muncul bila posisi lebih dari **40 m** dari garis rute. Penyebab umum: akurasi GPS buruk, rute dibuat sebagai garis lurus (memotong blok bangunan sehingga jalan sebenarnya jauh dari garis), atau memang mengambil jalan lain. Buat ulang rute dengan **Ikuti jalan** aktif.

---

## Peta

### Peta kosong / abu-abu tanpa jalan

- **Semua versi** memakai ubin dari `tile.openstreetmap.org` (OpenStreetMap), kecuali Expo Go Android (Google Maps) dan iOS (Apple Maps). Pastikan HP punya internet dan domain itu tidak diblokir jaringan.
- **APK Android** memakai MapLibre. Peta kosong di APK biasanya berarti ubin OpenStreetMap tidak termuat (internet), bukan masalah kunci API. Pengecualian: bila modul MapLibre gagal dimuat, app jatuh ke react-native-maps tanpa kunci Google, sehingga peta kosong tetapi app tetap jalan. Di log (`adb logcat`) muncul `[peta] MapLibre gagal dimuat, pakai react-native-maps`.
- APK yang dibangun sebelum peralihan ke MapLibre (commit `c8907a4`) memakai react-native-maps dan butuh kunci Google Maps; tanpa kunci, petanya kosong. Bangun ulang APK dari kode terbaru.
- Ubin OpenStreetMap sampai zoom 19. Server ubin OSM menolak pemakaian berlebihan; bila suatu saat ubin diganti gambar "blocked", pindahkan alamat di `app/src/lib/tiles.ts` ke penyedia ubin lain.

### Cuplikan peta di kartu kosong

Cuplikan (`StaticMap`) hanya menggambar bila ada minimal 2 titik dan lebar kartu sudah diketahui. Aktivitas/segmen yang sangat pendek bisa tampil sebagai kotak abu-abu polos.

### Peta di web tertutup panel atau ukurannya salah

Peta Leaflet menyesuaikan ukuran lewat `ResizeObserver`. Muat ulang halaman bila terjadi setelah mengubah ukuran jendela secara ekstrem.

---

## Rute

### Rute jadi garis lurus (putus-putus)

Petunjuk di atas peta bertuliskan *Layanan rute tidak tersedia, pakai garis lurus*. Penyebab:

1. Sakelar **Ikuti jalan (OpenStreetMap)** mati.
2. Server gagal menghubungi OSRM FOSSGIS (`routing.openstreetmap.de`): tidak ada internet di server, layanan sedang sibuk/turun, atau lebih dari **10 detik**. Log server berisi `[routing] gagal, pakai garis lurus: …`.
3. OSRM tidak menemukan jalan (misalnya titik di tengah laut atau area tanpa jalan di OpenStreetMap).
4. Permintaan `/routing` dari app ke server gagal (app lalu memakai garis lurus sendiri).

Coba geser titik ke jalan yang jelas, tunggu sebentar, atau matikan-nyalakan sakelar. Bila sering gagal, pertimbangkan server OSRM sendiri lewat `ROUTING_URL`.

### Tidak bisa menambah titik lagi

Batas 50 titik per rute. **Pergi-pulang** dan **Ke awal** juga dipotong di 50 titik, sehingga untuk rute dengan banyak titik, jalur pulang bisa terpotong. Kurangi jumlah titik (rute tetap mengikuti jalan di antara titik).

### Tombol "Simpan rute" tidak aktif

Butuh minimal 2 titik, perhitungan rute sudah selesai (bukan *Menghitung rute…*), dan nama rute terisi.

### Tombol "Ikuti rute ini" tidak aktif

Masih ada rekaman yang belum disimpan atau dibuang (tab Rekam berlabel **Merekam**). Selesaikan dulu, lalu pasang rute.

---

## Bagikan dan ekspor

### Gambar tidak tersimpan ke galeri

Pesan *Izin galeri ditolak. Aktifkan izin foto untuk Jejak di pengaturan HP.* berarti izin foto ditolak. App memintanya saat **Simpan ke galeri** ditekan; setelah ditolak, sistem bisa tidak bertanya lagi.

- **Android**: Setelan → Aplikasi → Jejak → Izin → **Foto dan video** (atau **Penyimpanan** di Android lama) → Izinkan.
- **iOS**: Pengaturan → Jejak → **Foto** → pilih *Tambah Foto Saja* atau *Akses Penuh*.

Lalu tekan **Simpan ke galeri** lagi. Bila pesan tidak muncul tetapi gambar tidak terlihat, buka album terbaru/semua foto di galeri; gambar tersimpan sebagai PNG 1080 px.

Sebagai alternatif, tekan **Bagikan** lalu pilih aplikasi galeri atau penyimpanan dari lembar berbagi. Di versi web, tombolnya **Unduh gambar** dan berkas masuk ke folder unduhan browser.

### "Izin kamera ditolak. Aktifkan kamera untuk Jejak di pengaturan HP."

Izinkan kamera untuk Jejak di pengaturan HP (Android: Setelan → Aplikasi → Jejak → Izin → Kamera), atau pakai **Pilih foto** dari galeri. Tombol **Kamera** memang tidak ada di versi web.

### "Berbagi tidak tersedia di perangkat ini"

Lembar berbagi sistem tidak tersedia. Pakai **Simpan ke galeri**. Di web, bila browser tidak mendukung berbagi berkas, **Bagikan** otomatis mengunduh `jejak.png`.

### Tombol Bagikan / Ekspor GPX tidak ada

Kedua tombol hanya muncul di detail aktivitas **milikmu sendiri**.

### Berkas GPX tidak bisa diimpor

Berkas berformat GPX 1.1 standar dengan waktu di setiap titik. Pastikan berkas yang diunggah adalah `.gpx` hasil ekspor yang utuh (bukan pratinjau teks dari aplikasi chat). Aktivitas dengan beberapa jeda menghasilkan beberapa `<trkseg>` dalam satu `<trk>`; bila layanan tujuan bermasalah dengan itu, cobalah aktivitas tanpa jeda untuk memastikan penyebabnya.

---

## Segmen, rekor, dan statistik

### Aktivitas tidak tercatat di segmen

Aktivitas dianggap melewati segmen hanya bila:

- jenisnya cocok: segmen lari menerima lari dan jalan kaki, segmen sepeda hanya sepeda;
- lewat dalam **35 m** dari titik S lalu dalam 35 m dari titik F, **searah** (S ke F);
- melewati semua titik kontrol di sepanjang segmen dalam jarak **40 m**;
- jarak tempuhnya antara 80% − 30 m dan 130% + 60 m dari panjang segmen.

GPS yang meleset jauh, jalan paralel, memotong jalan, atau arah berlawanan membuat aktivitas tidak cocok. Detail di [algoritma.md](algoritma.md#pencocokan-segmen).

### "Segmen minimal 100 m" / "Titik awal/akhir segmen tidak valid"

Panjang potongan kurang dari 100 m, atau titik awal tidak sebelum titik akhir. Geser S/F dengan tombol ±5/±20 titik.

### Aktivitas pertama tidak dapat PR

Disengaja. PR berarti mengalahkan waktu terbaik sebelumnya; rekor pertama belum mengalahkan apa pun. Lari dan jalan kaki punya rekor terpisah.

### PR lama masih tampil setelah aktivitas dihapus

Status PR dicatat saat aktivitas diunggah dan tidak dihitung ulang setelah aktivitas lain dihapus.

### Rekor tidak tampil di Beranda

Kartu Beranda memakai statistik `type=all`, yang memang tidak berisi rekor. Rekor ada di tab Profil per jenis aktivitas.

### Minggu atau tahun di statistik terasa bergeser

Statistik dihitung dengan zona waktu HP (`tz`). Minggu dimulai Senin. Bila jam/zona waktu HP salah, pengelompokan minggu ikut salah.

---

## Pengembangan

### Perubahan kode tidak terbaca Metro

- Pastikan Expo **tidak** dijalankan dengan `CI=1` (`echo $CI`). Mode itu mematikan pemantauan berkas.
- Perubahan di `shared/` hanya terbaca bila `app/metro.config.js` masih menambahkan `../shared` ke `watchFolders`.
- Bersihkan cache: `npx expo start -c`.

### Perubahan di `shared/` tidak terasa di server

`npm run server` tidak memantau berkas. Restart server, atau pakai `npm run dev --prefix server`.

### Typecheck server gagal dengan error sintaks yang aneh

Server berjalan dengan *type stripping* Node dan `erasableSyntaxOnly`. `enum`, `namespace`, dan parameter properties tidak boleh dipakai di `server/` maupun `shared/`. Import lokal harus memakai ekstensi `.ts` dan import tipe harus `import type`.

### Sakelar Simulasi GPS tidak ada

Hanya ada saat `__DEV__` (dijalankan dari Metro). APK hasil EAS adalah build rilis.

---

## Deploy dan server produksi

### `curl` ke IP server membalas 400

Normal. nginx memakai Authenticated Origin Pulls Cloudflare dan menolak koneksi tanpa sertifikat klien Cloudflare. Uji lewat domain: `curl https://jejak.masamune.my.id/api/health`. Untuk menguji Node langsung, jalankan `curl http://127.0.0.1:3014/health` dari server itu sendiri.

### `deploy.sh` berhenti dengan "Ada perubahan server/shared/deploy yang belum di-commit"

Commit perubahan di folder itu dulu. Skrip mengirim isi commit `HEAD` (lewat `git archive`), bukan folder kerja, jadi perubahan yang belum di-commit tidak akan ikut terpasang; skrip menolak supaya tidak ada yang terlewat. Push ke GitHub tidak diperlukan.

### `deploy.sh` berhenti dengan "config nginx gagal dites, dibatalkan"

`nginx -t` gagal untuk `deploy/nginx-jejak.conf` yang baru. Config lama sudah dikembalikan otomatis dan folder kode belum ditukar, jadi situs tetap jalan dengan versi lama. Perbaiki config, commit, lalu deploy lagi. Untuk melihat pesan lengkap: `nginx -t` di server.

### Health check gagal setelah deploy

Skrip deploy menampilkan 30 baris terakhir log; lebih lengkap: `journalctl -u jejak -n 100 --no-pager`. Penyebab umum: error sintaks/import di kode server, versi Node di nvm bukan 24+, atau database tidak bisa dibuka (folder `data/` atau berkas di dalamnya bukan milik user `jejak`, misalnya setelah menyalin backup sebagai root; perbaiki dengan `chown -R jejak:jejak /var/www/jejak.masamune.my.id/data`). Sandbox service juga menolak tulisan di luar folder `data/` (*read-only file system*). Pada titik ini folder kode sudah ditukar; untuk kembali cepat ke versi sebelumnya, pakai `repo.old/` (lihat [deploy.md](deploy.md#rollback)).

### Perubahan sudah di-deploy tetapi tidak terpasang

- Server memasang commit `HEAD` lokal saat skrip dijalankan. Cek versi yang terpasang dengan `cat /var/www/jejak.masamune.my.id/repo/REVISION` dan bandingkan dengan `git rev-parse --short HEAD`.
- Web dibangun dari folder kerja lokal; pastikan kamu menjalankan `deploy.sh web` dari kode yang benar.
- Muat ulang browser. `index.html` tidak di-cache, tetapi tab yang sudah terbuka masih memakai bundel lama sampai dimuat ulang.

### Respons 502 atau 504 dari `/api/`

Proses Node mati atau tidak menjawab. Periksa `systemctl status jejak` dan `journalctl -u jejak -n 100`. systemd menjalankan ulang proses yang berhenti (setelah 2 detik), termasuk bila memakai lebih dari 300 MB memori (`MemoryMax`).
