# Rencana 0.3.0: notifikasi push, info pembaruan, dan kontak

Rencana untuk empat permintaan pemilik (29 Oktober 2026):

1. notifikasi push lewat FCM;
2. mengirim notifikasi manual dari server;
3. info pembaruan aplikasi;
4. info kontak di Tentang aplikasi.

Status: **dikerjakan untuk app 0.3.0, belum dirilis**. Pemilik memilih semua usulan di [Pertanyaan untuk pemilik](#pertanyaan-untuk-pemilik); kontaknya email info@masamune.my.id dan GitHub Masamune21-dev. Yang berbeda dari rencana ditandai **Hasil**. Perilaku yang berlaku: [fitur.md](fitur.md#notifikasi-dan-pembaruan), [api.md](api.md#notifikasi-push), [deploy.md](deploy.md#notifikasi-push). Dua keputusan lama berubah: "tidak pakai notifikasi push" dan "pembuat tanpa kontak" (lihat [Keputusan pemilik 0.2.0](rencana-update.md#keputusan-pemilik)). Skala usaha sama dengan [ide-fitur.md](ide-fitur.md): **kecil** (beberapa jam), **sedang** (1–3 hari), **besar** (lebih dari seminggu).

## Daftar isi

1. [Ringkasan](#ringkasan)
2. [Notifikasi push FCM](#1-notifikasi-push-fcm)
3. [Kirim notifikasi manual dari server](#2-kirim-notifikasi-manual-dari-server)
4. [Info pembaruan aplikasi](#3-info-pembaruan-aplikasi)
5. [Kontak di Tentang aplikasi](#4-kontak-di-tentang-aplikasi)
6. [Perubahan data dan API](#perubahan-data-dan-api)
7. [Keamanan dan privasi](#keamanan-dan-privasi)
8. [Langkah pemilik sebelum dikerjakan](#langkah-pemilik-sebelum-dikerjakan)
9. [Tahapan rilis](#tahapan-rilis)
10. [Pertanyaan untuk pemilik](#pertanyaan-untuk-pemilik)

---

## Ringkasan

| # | Fitur | Usaha | Butuh APK baru | Butuh dari pemilik |
| --- | --- | --- | --- | --- |
| 1 | Notifikasi push FCM (fondasi) | sedang | ya (`expo-notifications`, `google-services.json`) | proyek Firebase, `google-services.json`, kunci service account |
| 2 | Kirim notifikasi manual dari server | kecil | tidak (memakai #1) | — |
| 3 | Info pembaruan aplikasi | kecil–sedang | ya (ikut APK #1) | catatan rilis tiap versi |
| 4 | Kontak di Tentang aplikasi | kecil | tidak (hanya JavaScript) | alamat kontak |

Keempatnya dirilis bersama sebagai **0.3.0** karena #1 butuh APK baru. Total sekitar 2–3 hari kerja.

Pengguna 0.2.x belum punya notifikasi maupun kartu pembaruan, jadi 0.3.0 masih harus dibagikan manual (WhatsApp, landing page). Mulai versi sesudahnya, pembaruan diumumkan dari dalam app.

---

## 1. Notifikasi push FCM

### Jalur pengiriman

| | FCM langsung (disarankan) | Expo Push Service |
| --- | --- | --- |
| Token di app | `getDevicePushTokenAsync()` (token FCM asli) | `getExpoPushTokenAsync()` |
| Server | Menandatangani JWT service account dengan `node:crypto`, menukarnya jadi access token Google, lalu mengirim per token ke `fcm.googleapis.com/v1/projects/<id>/messages:send` | POST ke `exp.host`, 100 token per permintaan, tanpa OAuth |
| Kunci rahasia | Berkas service account di server | Berkas service account diunggah ke EAS |
| Pihak ketiga | Google saja | Expo + Google |
| iOS nanti | Butuh APNs terpisah | Sudah tercakup |

Disarankan **FCM langsung**: sesuai permintaan, app hanya Android, dan server tidak butuh paket npm baru. Kedua jalur sama-sama butuh proyek Firebase dan `google-services.json`.

### Yang dilihat pengguna

- **Kartu di Beranda:** setelah masuk, Beranda menampilkan kartu **Aktifkan notifikasi** ("info dan pembaruan Jejak") dengan tombol **Aktifkan** dan **Nanti**. Izin Android 13+ baru diminta setelah tombol ditekan, bukan saat app pertama dibuka.
- **Pengaturan → Notifikasi** (bagian baru): sakelar nyala/mati. Bila izin sistem ditolak, muncul tombol **Buka pengaturan HP**.
- **Tampilan notifikasi:** ikon jejak putih dengan warna marka kuning. Mengetuknya membuka layar yang dituju, misalnya halaman unduh APK atau sebuah segmen.
- **Web:** tidak ada push; bagian Notifikasi disembunyikan.

### App

- **Paket:** `npx expo install expo-notifications`.
- **`app.json`:**
  - plugin `expo-notifications` dengan `icon` (PNG 96×96 putih transparan, dibuat dari `android-icon-monochrome.png`), `color: "#FFC629"`, dan `defaultChannel: "info"`;
  - `android.googleServicesFile: "./google-services.json"`. Berkas ini berisi pengenal publik dan boleh masuk repo.
- **`lib/push.ts`:**
  - Membuat kanal `info` (Info dan pengumuman) dan `pembaruan` (Pembaruan aplikasi) **sebelum** meminta token; Android tidak menampilkan dialog izin sebelum ada kanal.
  - Meminta izin, mengambil `getDevicePushTokenAsync()`, lalu mengirimnya ke `PUT /me/device`.
  - `addPushTokenListener` mengirim ulang token bila FCM menggantinya.
  - Dilewati di web dan di Expo Go, karena push jarak jauh tidak didukung Expo Go sejak SDK 53.
- **Ketukan:** `useLastNotificationResponse()` di `_layout.tsx` membaca `data.url`. Path app (`/segmen/12`) dibuka dengan `router.push`; alamat `https://` dengan `Linking.openURL`.
- **App sedang terbuka:** notifikasi tetap tampil sebagai banner (`setNotificationHandler`).
- **Keluar:** tidak perlu langkah tambahan; perangkat ikut terhapus di server bersama sesinya (lihat [data](#perubahan-data-dan-api)).

### Server

- **Tabel `push_devices`:** satu baris per HP, terikat ke sesi. Keluar atau sesi kedaluwarsa otomatis menghapus perangkat, jadi HP yang sudah keluar tidak lagi menerima notifikasi akun itu.
- **Endpoint:**
  - `PUT /me/device` `{ token, appVersion }` menyimpan atau memperbarui perangkat untuk sesi ini. Token yang sama dari akun lain dipindahkan.
  - `DELETE /me/device` mematikan notifikasi.
- **`server/src/push.ts`:**
  - Membaca berkas service account, membuat JWT RS256 dengan `node:crypto`, dan menukarnya di `oauth2.googleapis.com/token` (scope `https://www.googleapis.com/auth/firebase.messaging`).
  - Access token disimpan sekitar 55 menit.
  - Mengirim dengan beberapa permintaan sekaligus (bukan ratusan paralel). Token yang dibalas `UNREGISTERED` atau `NOT_FOUND` dihapus.
- **Isi pesan:** format yang dibaca `expo-notifications` (`title`, `message`, `channelId`, dan `body` berisi JSON dengan `url`), prioritas tinggi Android. Dokumentasi Expo belum tegas soal pesan *data-only* dibanding blok `notification`, jadi format pastinya diuji di HP pada langkah pertama implementasi.
- **Kunci service account:** rahasia dan tidak masuk repo. Pemilik menaruhnya di server sebagai `/etc/jejak/fcm.json` (milik root, mode 600). Service membacanya lewat `LoadCredential=fcm.json:/etc/jejak/fcm.json` di drop-in systemd, dari `$CREDENTIALS_DIRECTORY/fcm.json`. Tanpa kunci, server tetap jalan; push mati dengan pesan di log.

**Hasil:** service API tidak memakai kunci sama sekali (di 0.3.0 hanya CLI yang mengirim), jadi `LoadCredential` tidak dipasang. `/etc/jejak/fcm.json` tetap milik root (600); `deploy.sh notif` mengirim isinya lewat stdin ke CLI yang berjalan sebagai user `jejak`. Kuncinya milik service account khusus `jejak-fcm` dengan peran *Firebase Cloud Messaging API Admin* saja, bukan `firebase-adminsdk` (yang punya akses admin ke Firebase GeoAttend). Perintah dari komputer pemilik juga berganti nama: `deploy.sh notif` memanggil CLI `server/src/cli/notif.ts`.

### Uji

Pakai APK `preview` (bukan Expo Go):

- kirim ke akun sendiri saat app tertutup, di latar, dan terbuka;
- ketukan membuka layar yang benar;
- izin ditolak, lalu diizinkan dari Pengaturan;
- keluar lalu kirim lagi: notifikasi tidak boleh sampai;
- copot app: token terhapus di server pada kiriman berikutnya;
- HP Xiaomi/HyperOS: notifikasi tetap masuk setelah app ditutup dari daftar aplikasi terbaru. Bila tidak, catat langkah Autostart dan penghemat baterai di [troubleshooting.md](troubleshooting.md).

---

## 2. Kirim notifikasi manual dari server

### Cara pakai

Dari komputer pemilik:

```bash
./deploy/deploy.sh notif --judul "CFD libur" --isi "Minggu ini CFD Alun-alun Pati ditiadakan."
```

| Opsi | Arti |
| --- | --- |
| `--judul`, `--isi` | Wajib. Judul paling banyak 60 karakter, isi 200, supaya tidak terpotong di HP. |
| `--ke <username>` | Hanya pengguna ini; boleh diulang. Tanpa opsi ini: semua perangkat yang menyalakan notifikasi. |
| `--tautan <path atau URL>` | Layar yang dibuka saat notifikasi diketuk, misalnya `/segmen/12`. |
| `--uji` | Hanya menghitung penerima, tidak mengirim. |

- `deploy.sh notif` menjalankan `server/src/cli/notif.ts` di server lewat ssh sebagai user `jejak`, dengan database dan kunci yang sama dengan service.
- Sebelum mengirim ke semua pengguna, CLI menampilkan jumlah perangkat dan meminta konfirmasi `y`.
- Hasilnya: jumlah terkirim, gagal, dan token yang dihapus. Setiap kiriman dicatat di tabel `announcements`.

### Kenapa lewat CLI, bukan halaman admin

Halaman admin di web menambah pintu masuk yang harus diamankan: peran admin, perlindungan dari salah klik, dan risiko akun admin dibobol. Lewat CLI, hanya yang punya akses ssh yang bisa mengirim. Halaman admin bisa menyusul bila nanti dibutuhkan.

### Opsional

Daftar **Info** di app, berisi riwayat pengumuman dari tabel `announcements`, supaya pengguna web dan yang mematikan notifikasi tetap bisa membacanya. Lihat [pertanyaan 3](#pertanyaan-untuk-pemilik).

---

## 3. Info pembaruan aplikasi

### Sumber

`/unduh/versi.json`, yang sudah ditulis `deploy.sh apk`, ditambah dua kolom:

- `catatan`: daftar singkat perubahan, diambil dari bagian versi itu di berkas baru `app/CATATAN-RILIS.md`.
- `minimal` (opsional): versi terendah yang masih didukung. Hanya diisi bila API berubah dan versi lama tidak bisa dipakai lagi.

### Yang dilihat pengguna (APK saja)

- **Pemeriksaan:** saat app dibuka atau kembali ke depan (paling sering sekali per 6 jam), app membaca `versi.json` dan membandingkannya dengan `expo.version`. Nomor build tidak dipakai karena profil `preview` selalu build 1.
- **Kartu di Beranda:** bila ada versi lebih baru, muncul kartu **Jejak 0.3.1 tersedia** berisi catatan rilis, dengan dua tombol:
  - **Unduh** membuka `https://jejak.masamune.my.id/unduh/jejak.apk?v=0.3.1` di browser;
  - **Nanti** menyembunyikan kartu untuk versi itu.
- **Pengaturan → Tentang aplikasi:** baris Versi menampilkan "Terbaru" atau "0.3.1 tersedia" dengan tombol Unduh.
- **Di bawah `minimal`:** layar penuh yang tidak bisa dilewati, hanya berisi tombol Unduh.
- **Pengumuman push:** `./deploy/deploy.sh apk --umumkan` memasang APK lalu mengirim notifikasi kanal `pembaruan` ke semua perangkat ("Jejak 0.3.1 tersedia"; diketuk membuka unduhan). Tanpa `--umumkan` tidak ada push, cocok untuk perbaikan kecil.

### Cache APK

Tautan unduh memakai `?v=<versi>`, supaya Cloudflare (cache 4 jam untuk `jejak.apk`) tidak memberi APK lama tepat setelah rilis. Landing page memakai tautan yang sama.

### Uji

- Fungsi pembanding versi diuji unit (`0.10.0` lebih baru dari `0.9.1`).
- Kartu, Nanti, dan layar wajib perbarui diuji dengan `versi.json` palsu dari server lokal saat pengembangan, bukan dengan mengubah berkas di produksi.

---

## 4. Kontak di Tentang aplikasi

### Yang dilihat pengguna

Di Pengaturan → Tentang aplikasi, di bawah baris Pembuat:

- baris kontak yang bisa diketuk, misalnya **Email** (`mailto:`), **WhatsApp** (`https://wa.me/62…`), dan **Instagram**;
- tombol **Kirim masukan**, yang membuka email atau WhatsApp dengan teks awal berisi versi app dan model HP, supaya laporan bug langsung lengkap.

Kontak yang sama bisa juga dipasang di footer landing page (opsional).

### Penyimpanan

Kontak ditulis di satu berkas, `app/src/lib/contact.ts`. Mengubahnya cukup lewat deploy web dan APK berikutnya. Mengambil kontak dari server supaya bisa diubah tanpa APK tidak sebanding dengan usahanya, karena kontak jarang berubah.

---

## Perubahan data dan API

| Tabel | Kolom | Untuk |
| --- | --- | --- |
| `push_devices` | `token` (kunci utama), `user_id`, `session_hash` → `sessions(token_hash) on delete cascade`, `platform`, `app_version`, `created_at`, `last_seen_at` | #1 |
| `announcements` | `id`, `kind` (`info` atau `pembaruan`), `title`, `body`, `url`, `target` (`semua` atau daftar username), `sent`, `failed`, `created_at` | #2, #3 |

Tabel baru dibuat dengan `create table if not exists`; database lama tetap terbaca.

| Metode | Path | Isi |
| --- | --- | --- |
| `PUT` | `/me/device` | `{ token, appVersion }` → `{ ok: true }` |
| `DELETE` | `/me/device` | Mematikan notifikasi untuk sesi ini |
| `GET` | `/announcements` | Hanya bila daftar Info dibuat ([pertanyaan 3](#pertanyaan-untuk-pemilik)) |

| Paket baru | Untuk | Ada di Expo Go |
| --- | --- | --- |
| `expo-notifications` | Izin, kanal, token FCM, ketukan notifikasi | Push jarak jauh tidak; perlu APK |

Server tidak butuh paket baru (`node:crypto` dan `fetch` bawaan Node).

---

## Keamanan dan privasi

- **Token push adalah data pribadi:** terikat ke sesi, hilang saat keluar atau sesi kedaluwarsa, dan tidak pernah dikirim ke pengguna lain.
- **Layar kunci:** isi notifikasi terbaca tanpa membuka HP, jadi pengumuman tidak boleh memuat data pribadi seperti lokasi atau isi pesan.
- **Kunci service account:** hanya di server, sebagai credential systemd. Tidak di repo, tidak di APK, tidak di EAS.
- **Pengiriman:** hanya lewat ssh. Tidak ada endpoint publik untuk mengirim notifikasi.
- **Firebase:** hanya Cloud Messaging yang dipakai. Analytics dan Crashlytics tidak dipasang.
- **Catatan privasi di Tentang aplikasi** ditambah: "Token notifikasi disimpan di server Jejak dan dikirim lewat Firebase Cloud Messaging (Google)."

---

## Langkah pemilik sebelum dikerjakan

**Hasil:** langkah 1–3 sudah dikerjakan pemilik pada 29 Oktober 2026, memakai proyek Firebase yang sudah ada, `absensi-f66e1` (bersama aplikasi GeoAttend), dan service account baru `jejak-fcm`.

Langkah ini memakai akun Google pemilik, jadi tidak bisa dikerjakan Claude:

1. Buat proyek di [Firebase Console](https://console.firebase.google.com/).
2. Tambahkan aplikasi Android dengan nama paket `id.my.masamune.jejak`. Unduh `google-services.json` dan taruh di folder `app/`.
3. Buka Project settings → Service accounts → **Generate new private key**. Simpan berkas JSON itu; jangan kirim lewat chat dan jangan masukkan ke repo. Saat deploy, pemilik menyalinnya ke server sebagai `/etc/jejak/fcm.json`. Perintah lengkapnya ditulis di [deploy.md](deploy.md) saat implementasi.
4. Jawab [pertanyaan di bawah](#pertanyaan-untuk-pemilik).

---

## Tahapan rilis

| Langkah | Isi |
| --- | --- |
| 1 | **Server:** tabel baru, `/me/device`, `push.ts`, CLI `notif`. Deploy server (APK lama tidak terpengaruh), lalu pasang kunci FCM. |
| 2 | **App:** `expo-notifications`, izin, kanal, token, ketukan, kartu pembaruan, kontak. Build APK `preview` dan uji di HP pemilik. |
| 3 | **Uji kirim** ke akun sendiri (`--ke masamune`), lalu deploy web dan APK 0.3.0, dan bagikan manual untuk terakhir kalinya. |
| 4 | **Rilis berikutnya** diumumkan lewat `deploy.sh apk --umumkan`. |

Tahap sesudah 0.3.0: notifikasi otomatis untuk pesan chat baru, pengikut baru, kudos, balasan postingan, dan rekor segmen yang dikalahkan, masing-masing dengan sakelar sendiri di Pengaturan. Semuanya memakai fondasi #1.

---

## Pertanyaan untuk pemilik

| # | Pertanyaan | Usulan |
| --- | --- | --- |
| 1 | Jalur kirim: FCM langsung atau Expo Push Service? | FCM langsung |
| 2 | Kontak apa yang ditampilkan (email, WhatsApp, Instagram, lainnya), dan apa alamatnya? | Dijawab: email info@masamune.my.id dan GitHub github.com/Masamune21-dev. **Kirim masukan** lewat email. |
| 3 | Perlu daftar **Info** (riwayat pengumuman) di app? | Belum perlu di 0.3.0 |
| 4 | Perlu batas versi minimal (wajib perbarui)? | Ya, tapi hanya diisi bila API berubah |
| 5 | Notifikasi otomatis (chat, pengikut, kudos) ikut 0.3.0 atau tahap berikutnya? | Tahap berikutnya |
| 6 | Push pembaruan setiap `deploy.sh apk`, atau hanya dengan `--umumkan`? | Hanya dengan `--umumkan` |
