# Deploy produksi

Produksi berjalan di satu VPS di belakang Cloudflare: **https://jejak.masamune.my.id** (web) dan **https://jejak.masamune.my.id/api** (API).

## Daftar isi

1. [Tata letak server](#tata-letak-server)
2. [Proses Node (PM2)](#proses-node-pm2)
3. [nginx dan Cloudflare](#nginx-dan-cloudflare)
4. [Alur deploy](#alur-deploy)
5. [Memeriksa hasil deploy](#memeriksa-hasil-deploy)
6. [Melihat log](#melihat-log)
7. [Backup database](#backup-database)
8. [Rollback](#rollback)
9. [Catatan yang diketahui](#catatan-yang-diketahui)

---

## Tata letak server

Host SSH bawaan di `deploy/deploy.sh` adalah `root@103.189.249.115`; bisa diganti lewat variabel `JEJAK_HOST`.

```
/var/www/jejak.masamune.my.id/
├── repo/       Kode yang sedang berjalan: isi folder server/, shared/, deploy/ dari satu
│               commit (hasil `git archive`, bukan klon git) + berkas REVISION berisi hash commit.
│               Server Node berjalan dari repo/server.
├── repo.old/   Versi sebelumnya (dari deploy terakhir), untuk rollback cepat.
├── repo.new/   Hanya ada sementara selama deploy berlangsung (atau tertinggal bila deploy gagal).
├── web/        Hasil `expo export --platform web` (diunggah dengan rsync).
└── data/       Database SQLite: jejak.db, jejak.db-wal, jejak.db-shm.
```

Server **tidak** butuh akses ke GitHub (repo boleh private): kode dikirim dari komputer pengembang lewat SSH. Untuk melihat versi yang sedang jalan: `cat /var/www/jejak.masamune.my.id/repo/REVISION`.

Berkas lain di server yang dipakai:

| Berkas | Isi |
| --- | --- |
| `/etc/nginx/sites-enabled/jejak` | Salinan `deploy/nginx-jejak.conf` (dipasang otomatis saat deploy server). |
| `/etc/ssl/cloudflare/masamune.my.id.pem` / `.key` | Sertifikat origin Cloudflare (wildcard `*.masamune.my.id`). |
| `/etc/ssl/cloudflare/aop-ca.pem` | CA Cloudflare untuk Authenticated Origin Pulls. |
| `/etc/nginx/snippets/cloudflare-real-ip.conf` | Memulihkan IP asli pengunjung dari header Cloudflare. |
| `/root/.nvm` | Node dipasang lewat nvm; `deploy.sh` memuatnya sebelum menjalankan `npm` dan `pm2`. |

Berkas sertifikat dan snippet tidak ada di repo dan tidak diubah oleh skrip deploy.

---

## Proses Node (PM2)

Konfigurasi `deploy/ecosystem.config.cjs`:

| Kunci | Nilai |
| --- | --- |
| `name` | `jejak` |
| `cwd` | `/var/www/jejak.masamune.my.id/repo/server` |
| `script` | `src/index.ts` (dijalankan langsung oleh Node 24, tanpa build) |
| `interpreter` | `node` |
| `env.NODE_ENV` | `production` |
| `env.HOST` | `127.0.0.1` (hanya bisa diakses dari mesin itu, lewat nginx) |
| `env.PORT` | `3014` |
| `env.DB_PATH` | `/var/www/jejak.masamune.my.id/data/jejak.db` |
| `max_memory_restart` | `300M` |

Perintah PM2 yang berguna (di server):

```bash
pm2 status                 # daftar proses
pm2 describe jejak         # detail, termasuk env dan jumlah restart
pm2 reload jejak           # muat ulang tanpa mengubah konfigurasi
pm2 restart jejak
```

---

## nginx dan Cloudflare

`deploy/nginx-jejak.conf` berisi dua blok `server`:

1. **Port 80**: semua dialihkan ke HTTPS (301).
2. **Port 443** (`http2`):
   - TLS dengan **sertifikat origin Cloudflare** (TLS 1.2 dan 1.3).
   - **Authenticated Origin Pulls**: `ssl_client_certificate aop-ca.pem` + `ssl_verify_client on`. nginx hanya menerima koneksi yang membawa sertifikat klien Cloudflare. Fitur Authenticated Origin Pulls harus aktif di Cloudflare untuk domain ini.
   - `include cloudflare-real-ip.conf` supaya `$binary_remote_addr` (untuk batas laju) dan log berisi IP asli, bukan IP Cloudflare.
   - Header keamanan: `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `Content-Security-Policy frame-ancestors 'self' https://masamune.my.id https://*.masamune.my.id`. Dipasang di level `server` dan diulang di `location /_expo/` serta `location /` (lihat [Catatan](#catatan-yang-diketahui)), jadi berlaku untuk API maupun halaman web.
   - `client_max_body_size 20m` (track GPS aktivitas panjang bisa beberapa MB).
   - User agent pemindai (`sqlmap`, `nikto`, `masscan`, `zgrab`, `acunetix`, `nessus`) diputus dengan 444.

Lokasi:

| `location` | Perilaku |
| --- | --- |
| `/api/auth/` | Batas laju zona `jejak_auth`: 10 permintaan/menit per IP, `burst=10 nodelay`, kelebihan → **429**. Diteruskan ke `http://127.0.0.1:3014/auth/`. |
| `/api/` | Diteruskan ke `http://127.0.0.1:3014/` (awalan `/api` dibuang), `proxy_read_timeout 120s`. |
| `/_expo/` | Berkas build web ber-hash: `expires 1y`, `Cache-Control: public, immutable`, 404 bila tidak ada. |
| `/` | Berkas web; bila tidak ada, `$uri.html`, lalu `/index.html` (aplikasi satu halaman). `Cache-Control: no-cache`. |

### Akibat Authenticated Origin Pulls

Permintaan langsung ke IP origin tanpa sertifikat klien Cloudflare ditolak nginx dengan **400** (*No required SSL certificate was sent*), termasuk:

```bash
curl -k --resolve jejak.masamune.my.id:443:103.189.249.115 https://jejak.masamune.my.id/api/health   # → 400
```

Ini normal. **Uji selalu lewat domain:**

```bash
curl -s https://jejak.masamune.my.id/api/health                               # → {"ok":true}
```

Untuk menguji Node tanpa nginx, jalankan dari server itu sendiri:

```bash
curl -s http://127.0.0.1:3014/health
```

---

## Alur deploy

Prasyarat di komputer pengembang:

- akses SSH tanpa kata sandi ke host (kunci SSH);
- perubahan di `server/`, `shared/`, dan `deploy/` sudah di-commit. Yang dipasang adalah **commit `HEAD` lokal** (branch apa pun, tidak perlu di-push), jadi pastikan `HEAD` memang versi yang ingin dipasang (biasanya `main`);
- dependensi app terpasang (untuk build web).

```bash
deploy/deploy.sh          # server + web
deploy/deploy.sh server   # hanya server
deploy/deploy.sh web      # hanya web
```

### Bagian server

1. Tolak bila ada perubahan belum di-commit di `server/`, `shared/`, atau `deploy/` (*Ada perubahan server/shared/deploy yang belum di-commit. Commit dulu.*).
2. Kirim kode: `git archive --format=tar HEAD server shared deploy` dialirkan lewat SSH dan diekstrak ke `repo.new/` (folder lama `repo.new/` dihapus dulu), lalu hash pendek commit ditulis ke `repo.new/REVISION`.
3. Lewat SSH ke host:
   1. muat nvm;
   2. buat `data/` dan `web/` bila belum ada;
   3. di `repo.new/`: `npm ci --omit=dev --prefix server`;
   4. salin config nginx lama ke `/tmp/jejak.nginx.bak`, pasang `repo.new/deploy/nginx-jejak.conf` ke `/etc/nginx/sites-enabled/jejak`, lalu `nginx -t`. **Bila tes gagal, config lama dikembalikan** (atau berkas dihapus bila sebelumnya tidak ada) dan deploy berhenti dengan *config nginx gagal dites, dibatalkan*;
   5. **tukar folder**: hapus `repo.old/`, pindahkan `repo/` menjadi `repo.old/`, lalu `repo.new/` menjadi `repo/`;
   6. `systemctl reload nginx`;
   7. `pm2 startOrReload repo/deploy/ecosystem.config.cjs --update-env` lalu `pm2 save`;
   8. tunggu 1 detik, lalu `curl -fsS http://127.0.0.1:3014/health`. Bila berhasil: *server sehat (\<isi REVISION\>)*, yaitu hash yang dibaca dari server.

Skrip memakai `set -euo pipefail`, jadi langkah yang gagal menghentikan deploy. Karena folder baru baru ditukar setelah `npm ci` dan `nginx -t` berhasil, kegagalan di langkah itu membuat server lama tetap jalan tanpa perubahan. Perubahan manual di `repo/` di server akan hilang pada deploy berikutnya.

### Bagian web

1. Di komputer lokal: hapus `app/dist`, lalu
   `EXPO_PUBLIC_API_URL=https://jejak.masamune.my.id/api npx expo export --platform web --output-dir dist`.
2. `rsync -az --delete app/dist/ <host>:/var/www/jejak.masamune.my.id/web/` (berkas lama yang tidak ada di build baru ikut dihapus).

Penting: web dibangun dari **isi folder kerja lokal**, bukan dari commit. Perubahan di `app/` atau `shared/` yang belum di-commit ikut terpasang; skrip hanya menampilkan *Peringatan: versi web dibangun dari folder kerja, termasuk perubahan app/shared yang belum di-commit.* lalu tetap melanjutkan. Pastikan `git status` bersih sebelum `deploy.sh web`.

Database tidak disentuh oleh deploy. Skema tabel baru dibuat otomatis saat server mulai.

---

## Memeriksa hasil deploy

```bash
curl -s https://jejak.masamune.my.id/api/health     # {"ok":true}
curl -sI https://jejak.masamune.my.id/              # 200
```

Lalu buka https://jejak.masamune.my.id di browser, masuk, dan buka beberapa layar. Karena `index.html` tidak di-cache dan berkas `/_expo/` ber-hash, pengunjung langsung mendapat versi baru setelah memuat ulang.

---

## Melihat log

Di server:

```bash
pm2 logs jejak                     # ikuti log Node (stdout + stderr)
pm2 logs jejak --lines 200         # 200 baris terakhir
tail -f /var/log/nginx/jejak.access.log
tail -f /var/log/nginx/jejak.error.log
```

Yang biasa muncul di log Node:

| Pesan | Arti |
| --- | --- |
| `Server Jejak jalan di http://127.0.0.1:3014` | Proses baru mulai (setelah deploy, restart, atau crash). |
| `[routing] gagal, pakai garis lurus: …` | OSRM gagal/timeout; pengguna mendapat rute garis lurus. |
| Stack trace error | Penyebab respons 500 *Terjadi kesalahan di server*. |

Di log akses nginx, status 429 pada `/api/auth/` menandakan batas laju terpicu, dan 444 menandakan pemindai yang diblokir.

---

## Backup database

Database memakai mode WAL: isi terbaru bisa masih berada di `jejak.db-wal`. **Jangan** menyalin `jejak.db` begitu saja selagi server jalan. Gunakan salah satu cara berikut, keduanya aman selagi server berjalan.

Dengan CLI `sqlite3` (bila terpasang di server):

```bash
mkdir -p /root/backup
sqlite3 /var/www/jejak.masamune.my.id/data/jejak.db ".backup '/root/backup/jejak-$(date +%F).db'"
```

Dengan Node (selalu tersedia karena server memakainya):

```bash
. /root/.nvm/nvm.sh
mkdir -p /root/backup
node -e "new (require('node:sqlite').DatabaseSync)('/var/www/jejak.masamune.my.id/data/jejak.db').exec(\"vacuum into '/root/backup/jejak-$(date +%F).db'\")"
```

`vacuum into` gagal bila berkas tujuan sudah ada, jadi beri nama berbeda tiap kali (misalnya bertanggal).

Saran:

- Jadwalkan harian lewat `cron` dan simpan beberapa salinan terakhir.
- Salin juga ke luar server, misalnya dari komputer lokal: `rsync -az root@103.189.249.115:/root/backup/ ./backup-jejak/`.
- Database berisi akun (hash kata sandi), token sesi, dan jejak GPS pengguna. Simpan backup di tempat yang aman.

Memulihkan backup:

```bash
pm2 stop jejak
cd /var/www/jejak.masamune.my.id/data
mkdir -p rusak && mv jejak.db jejak.db-wal jejak.db-shm rusak/ 2>/dev/null
cp /root/backup/jejak-2026-10-28.db jejak.db
pm2 start jejak
```

---

## Rollback

### Kode server

**Paling cepat: kembali ke versi sebelumnya yang masih ada di server** (`repo.old/`, dari deploy terakhir):

```bash
. /root/.nvm/nvm.sh
cd /var/www/jejak.masamune.my.id
cat repo/REVISION repo.old/REVISION      # pastikan repo.old memang versi yang diinginkan
mv repo repo.bad && mv repo.old repo
pm2 startOrReload repo/deploy/ecosystem.config.cjs --update-env && pm2 save
curl -fsS http://127.0.0.1:3014/health
rm -rf repo.bad                          # setelah yakin tidak dibutuhkan lagi
```

Config nginx tidak ikut kembali dengan cara ini; bila deploy yang bermasalah juga mengubah nginx, pasang lagi `repo/deploy/nginx-jejak.conf` ke `/etc/nginx/sites-enabled/jejak`, `nginx -t`, lalu `systemctl reload nginx`.

**Cara yang disarankan untuk jangka panjang** (riwayat tetap rapi):

```bash
git revert <commit-bermasalah>
deploy/deploy.sh server
```

Karena skrip memasang `HEAD` lokal, bisa juga memasang commit lama secara langsung:

```bash
git checkout <commit-yang-baik>     # HEAD terlepas (detached)
deploy/deploy.sh server
git checkout main
```

### Web

Web dibangun dari folder kerja lokal, jadi cukup bangun dari commit lama:

```bash
git stash            # bila ada perubahan lokal
git checkout <commit-yang-baik>
deploy/deploy.sh web
git checkout main
```

### nginx

Bila `nginx -t` gagal saat deploy, skrip otomatis mengembalikan config sebelumnya. Bila config baru lolos tes tetapi perilakunya salah, perbaiki `deploy/nginx-jejak.conf` (atau revert), commit, lalu `deploy/deploy.sh server`. Salinan config sebelumnya dari deploy terakhir ada di `/tmp/jejak.nginx.bak` di server (selama belum terhapus).

### Database

Rollback kode jarang membutuhkan rollback database, karena skema hanya bertambah (`create table if not exists`). Bila data rusak, pulihkan dari backup seperti di atas; data sejak backup itu akan hilang.

---

## Catatan yang diketahui

- **Header nginx di dalam `location`.** Di nginx, `add_header` di level `server` hanya diwarisi oleh `location` yang tidak punya `add_header` sendiri. Karena itu ketiga header keamanan **diulang** di `location /_expo/` dan `location /` (sejak commit `a273d33`). Bila menambah header baru di level `server`, tambahkan juga ke kedua `location` itu.
- **Yang dipasang adalah `HEAD` lokal.** `deploy.sh server` tidak melihat branch dan tidak melakukan push. Deploy dari branch fitur memasang branch itu ke produksi.
- **Hanya satu versi cadangan.** `repo.old/` ditimpa setiap deploy. Untuk kembali lebih jauh, pasang commit lama dari komputer lokal.
- **Satu proses, satu berkas database.** Tidak ada replikasi; backup adalah satu-satunya perlindungan data.
