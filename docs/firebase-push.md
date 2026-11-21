# Firebase dan notifikasi push

Panduan menyiapkan Firebase Cloud Messaging (FCM) untuk notifikasi Jejak, lalu
menghubungkannya ke fitur chat, postingan, like, komentar, pembaruan APK, dan
pengumuman dari administrator.

## 1. Yang sudah ada di kode

| Bagian | Status |
| --- | --- |
| Token FCM per HP, terikat sesi login | Ada (`push_devices`, `PUT /me/device`) |
| Kanal Android `info` dan `pembaruan` | Ada |
| Kirim pengumuman ke semua pengguna | Ada (`deploy/deploy.sh notif`) |
| Notifikasi APK baru + kartu unduh di app | Ada (`deploy/deploy.sh apk --umumkan`) |
| Ketukan notifikasi membuka layar terkait | Ada (`useNotificationTaps`) |
| Notifikasi chat, postingan teman, like, komentar | Ada di server (0.4.1+) |
| Kanal Android `sosial` dan `aktivitas` | Ada di app (0.4.1+) |
| Pengaturan notifikasi per jenis | Belum; saat ini satu sakelar nyala/mati |

Pengirim memakai **FCM HTTP v1** dengan service account, bukan server key lama.
Kodenya ada di `server/src/push.ts`.

## 2. Pilih proyek Firebase

Ada dua pilihan.

### Opsi A — pakai proyek yang sudah ada (disarankan)

APK Jejak sekarang memakai proyek Firebase **`absensi-f66e1`** dengan aplikasi
Android `id.my.masamune.jejak`. Proyek ini sudah dipakai untuk notifikasi
pembaruan. Kalau tidak ada alasan khusus untuk memisahkan, **pakai proyek ini**:
tidak perlu mengganti `google-services.json` dan tidak ada risiko salah cocok
antara APK dan kunci server.

Lewati ke [bagian 4](#4-aktifkan-cloud-messaging-api).

### Opsi B — buat proyek baru khusus Jejak

Dipakai bila ingin memisahkan kuota, penagihan, atau akses Firebase dari proyek
lain. Ingat: **APK dan kunci server harus dari proyek yang sama**. Setelah
proyek baru dibuat, APK wajib di-build ulang dengan `google-services.json` baru.

## 3. Membuat proyek dan aplikasi Android

1. Buka <https://console.firebase.google.com/> lalu **Add project**.
2. Nama proyek: `Jejak` (ID proyek akan dibuat otomatis, mis. `jejak-1a2b3`).
3. Google Analytics boleh dimatikan; notifikasi tidak memerlukannya.
4. Setelah proyek jadi, klik ikon **Android** untuk menambah aplikasi.
5. Isi:
   - **Android package name**: `id.my.masamune.jejak` (harus sama persis dengan
     `expo.android.package` di `app/app.json`).
   - **App nickname**: `Jejak Android`.
   - **Debug signing certificate SHA-1**: kosongkan. FCM tidak memerlukannya.
6. Klik **Register app**, lalu **Download google-services.json**.

## 4. Aktifkan Cloud Messaging API

1. Firebase Console → ikon roda gigi → **Project settings** → tab **Cloud Messaging**.
2. Pastikan **Firebase Cloud Messaging API (V1)** berstatus *Enabled*.
3. Bila belum, klik menu tiga titik → **Manage API in Google Cloud Console**, lalu
   aktifkan **Firebase Cloud Messaging API**.
4. Abaikan **Cloud Messaging API (Legacy)** dan *Server key*; kode Jejak tidak
   memakainya.

## 5. Pasang `google-services.json` di app

Berkas ini **tidak masuk repo** (sudah ada di `app/.gitignore`).

```bash
# dari folder app/
cp ~/Downloads/google-services.json ./google-services.json
```

Untuk build EAS, unggah sebagai variabel file (sekali; ulangi bila berkasnya
berganti):

```bash
cd app
npx eas-cli@latest env:set \
  --name GOOGLE_SERVICES_JSON \
  --type file \
  --value ./google-services.json \
  --visibility secret \
  --environment preview \
  --environment production
```

`app/app.config.ts` membaca variabel itu saat build. Di komputer sendiri,
`app/google-services.json` dipakai bila variabelnya kosong.

> **Penting:** notifikasi push jarak jauh tidak bisa diuji di Expo Go sejak SDK 53.
> Selalu uji dengan APK `preview`.

## 6. Buat service account untuk server

Server mengirim notifikasi tanpa SDK Google: JWT service account ditandatangani
dengan `node:crypto`, lalu ditukar menjadi access token OAuth.

1. Firebase Console → **Project settings** → tab **Service accounts**.
2. Klik **Generate new private key** → **Generate key**.
3. Simpan berkas JSON itu sebagai `fcm.json` di komputer, **jangan** commit.
4. Pasang di server. API sekarang perlu membaca kunci ini, jadi izinnya
   `640 root:jejak` (bukan hanya root):

```bash
scp fcm.json "$(git config jejak.deployHost):/tmp/fcm.json"
ssh "$(git config jejak.deployHost)" '
  install -d -m 750 -o root -g jejak /etc/jejak
  install -m 640 -o root -g jejak /tmp/fcm.json /etc/jejak/fcm.json
  rm -f /tmp/fcm.json
  systemctl restart jejak
'
```

5. Periksa bahwa API bisa membaca kunci:

```bash
ssh "$(git config jejak.deployHost)" 'journalctl -u jejak -n 30 --no-pager | grep -i push || true'
```

Tidak ada baris `push: nonaktif` berarti kunci terbaca. Bila ada, periksa
kepemilikan/izin berkas dan pastikan service berjalan sebagai user `jejak`.

> Kunci ini memberi akses mengirim notifikasi ke seluruh proyek Firebase. Jangan
> menaruhnya di repo, jangan mengirimnya lewat chat, dan rotasi bila bocor
> (buat kunci baru, pasang, lalu hapus kunci lama di Console).

`FCM_CREDENTIALS` bisa dipakai untuk menunjuk lokasi lain, mis. saat development:

```bash
FCM_CREDENTIALS=./fcm.json npm run dev --prefix server
```

## 7. Daftarkan HP dan uji

1. Pasang APK `preview` terbaru.
2. Masuk, lalu nyalakan notifikasi di kartu Beranda atau
   **Pengaturan → Notifikasi**.
3. Di server, pastikan token masuk:

```bash
ssh "$(git config jejak.deployHost)" \
  "runuser -u jejak -- sqlite3 /var/www/jejak.masamune.my.id/data/jejak.db \
   'select user_id, platform, app_version from push_devices;'"
```

4. Kirim tes ke satu akun (hitung penerima dulu):

```bash
deploy/deploy.sh notif --judul "Tes Jejak" --isi "Notifikasi berfungsi." --ke masamune --uji
deploy/deploy.sh notif --judul "Tes Jejak" --isi "Notifikasi berfungsi." --ke masamune
```

5. Untuk menguji notifikasi sosial, gunakan dua akun yang saling mengikuti:
   kirim chat, beri like, komentar, atau buat postingan dari akun kedua.

## 8. Fitur notifikasi dan sumbernya

Semua notifikasi memakai pesan data + `url`. Ketukan membuka path app
(`/pesan/2`, `/aktivitas/17`, `/postingan/9`) atau alamat `https://` untuk
unduhan APK.

| Fitur | Kapan dikirim | Penerima | Kanal | URL |
| --- | --- | --- | --- | --- |
| Chat | `POST /chats/:userId` | Lawan bicara | `sosial` | `/pesan/<pengirim>` |
| Postingan teman | `POST /posts` dengan visibilitas publik/pengikut | Pengikut penulis | `aktivitas` | `/postingan/<id>` |
| Like aktivitas | `POST /activities/:id/kudos` (like baru) | Pemilik aktivitas | `sosial` | `/aktivitas/<id>` |
| Like postingan | `POST /posts/:id/like` (like baru) | Penulis postingan | `sosial` | `/postingan/<id>` |
| Komentar aktivitas | `POST /activities/:id/comments` | Pemilik aktivitas | `sosial` | `/aktivitas/<id>` |
| Balasan postingan | `POST /posts/:id/replies` | Penulis postingan | `sosial` | `/postingan/<id>` |
| APK baru | `deploy/deploy.sh apk --umumkan` | Semua HP yang belum memakai versi itu | `pembaruan` | `https://jejak.masamune.my.id/unduh/jejak.apk?v=<versi>` |
| Pengumuman admin | `deploy/deploy.sh notif` | Semua, atau `--ke username` | `info` | opsional `--tautan` |

Aturan yang sudah diterapkan:

- Pelaku tidak menerima notifikasi dari aksinya sendiri.
- Pengguna yang memblokir atau diblokir tidak dikirimi notifikasi.
- Notifikasi berulang memakai `tag`, jadi pesan baru dari chat yang sama
  menggantikan notifikasi lama di bilah notifikasi.
- Like ulang tidak mengirim notifikasi baru (`insert or ignore`).
- Postingan pribadi tidak mengirim notifikasi ke siapa pun.

## 9. Notifikasi pembaruan APK

Alurnya sudah ada dan tidak perlu Firebase tambahan:

1. Naikkan `expo.version` di `app/app.json`.
2. Isi `app/CATATAN-RILIS.md` di bawah judul versi baru.
3. Build APK `preview` di EAS.
4. `deploy/deploy.sh apk --umumkan`:
   - mengunduh APK terbaru dari EAS;
   - menulis `versi.json` (versi, build, ukuran, catatan, minimal);
   - mengunggah ke `/unduh/jejak.apk`;
   - mengirim notifikasi ke HP yang belum memakai versi itu.
5. Di app, kartu **Jejak x.y.z tersedia** muncul di Beranda dan tombol **Unduh**
   langsung membuka APK. Notifikasi yang diketuk juga membuka alamat unduhan.

## 10. Pengumuman dari administrator

Saat ini jalur admin adalah CLI di server, bukan layar di app:

```bash
deploy/deploy.sh notif --judul "Judul" --isi "Isi singkat" --tautan /segmen/12
deploy/deploy.sh notif --judul "Judul" --isi "Isi singkat" --ke masamune
deploy/deploy.sh notif --judul "Judul" --isi "Isi singkat" --ya   # tanpa konfirmasi
```

- Tanpa `--ke`, notifikasi dikirim ke **semua** HP yang menyalakan notifikasi.
- `--tautan` harus path app (`/...`) atau alamat `https://`.
- `--uji` hanya menghitung penerima.
- Setiap pengiriman dicatat di tabel `announcements`.

Bila nanti ingin tombol **Kirim pengumuman** di dalam app, tambahkan flag admin
di server (mis. `ADMIN_USERNAMES`, terpisah dari `verified`), endpoint
`POST /admin/notify`, dan layar admin di Pengaturan. Belum dibuat sekarang.

## 11. Batasan yang perlu diketahui

- FCM bersifat *best effort*: HP tanpa internet, mode hemat daya, atau izin
  notifikasi mati tidak akan menerima pesan.
- Belum ada pengaturan per jenis notifikasi. Sakelar di app hanya menyalakan atau
  mematikan semuanya.
- Notifikasi postingan dikirim ke semua pengikut sekaligus. Untuk pengguna
  dengan pengikut sangat banyak, pindahkan pengiriman ke antrean/worker agar
  respons `POST /posts` tetap cepat.
- Notifikasi chat tetap muncul walau percakapan sedang dibuka. Penekanan
  (suppression) saat layar chat aktif bisa ditambahkan nanti.
- Kanal Android dibuat app saat pertama kali notifikasi disiapkan. Setelah APK
  baru terpasang, kanal `sosial` dan `aktivitas` muncul di pengaturan notifikasi
  Android dan bisa dibisukan per kanal oleh pengguna.

## 12. Checklist rilis

- [ ] Proyek Firebase dan aplikasi Android `id.my.masamune.jejak` ada.
- [ ] Cloud Messaging API (V1) aktif.
- [ ] `google-services.json` terpasang di `app/` dan di variabel EAS
      `GOOGLE_SERVICES_JSON` (preview + production).
- [ ] Service account JSON terpasang di `/etc/jejak/fcm.json` dengan izin
      `640 root:jejak`.
- [ ] `systemctl restart jejak` dan log tidak menunjukkan `push: nonaktif`.
- [ ] APK baru (0.4.1+) terpasang; kanal `sosial` dan `aktivitas` muncul.
- [ ] `push_devices` berisi token HP uji.
- [ ] Tes chat, like, komentar, postingan, dan pengumuman berhasil.
- [ ] `deploy/deploy.sh apk --umumkan` mengirim notifikasi pembaruan.