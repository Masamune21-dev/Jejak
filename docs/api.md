# Referensi API

Semua endpoint ada di `server/src/app.ts`. Tipe respons merujuk ke `shared/api.ts`.

## Daftar isi

1. [Dasar](#dasar)
2. [Ringkasan endpoint](#ringkasan-endpoint)
3. [Autentikasi](#autentikasi)
4. [Pengguna dan teman](#pengguna-dan-teman)
5. [Foto profil dan sampul](#foto-profil-dan-sampul)
6. [Notifikasi push](#notifikasi-push)
7. [Statistik](#statistik)
8. [Feed dan aktivitas](#feed-dan-aktivitas)
9. [Kudos dan komentar](#kudos-dan-komentar)
10. [Routing dan rute](#routing-dan-rute)
11. [Segmen dan leaderboard](#segmen-dan-leaderboard)
12. [Postingan](#postingan)
13. [Chat dan blokir](#chat-dan-blokir)
14. [Error umum](#error-umum)

---

## Dasar

| | Lokal | Produksi |
| --- | --- | --- |
| Alamat dasar | `http://localhost:4000` | `https://jejak.masamune.my.id/api` |
| Contoh | `http://localhost:4000/health` | `https://jejak.masamune.my.id/api/health` |

**Di produksi semua path diawali `/api`.** nginx membuang awalan itu sebelum meneruskan ke Node (`/api/feed` → `/feed`). Path di dokumen ini ditulis tanpa awalan.

- Badan permintaan dan respons berupa JSON. Kirim `Content-Type: application/json`. Pengecualian: unggah foto (`PUT /me/avatar`, `PUT /me/cover`, `POST /posts`) memakai `multipart/form-data`, dan `GET /media/:name` membalas gambar JPEG.
- Endpoint yang butuh login memakai header `Authorization: Bearer <token>`. Yang tidak butuh login hanya `/health`, `/auth/register`, `/auth/login`, dan `/media/:name`.
- Error selalu berbentuk `{ "error": "<pesan dalam bahasa Indonesia>" }` dengan kode HTTP yang sesuai, kecuali error dari nginx (lihat [Error umum](#error-umum)).
- Waktu (`startedAt`, `createdAt`, `date`) berupa string ISO 8601 UTC, misalnya `2026-10-28T06:12:03.000Z`.
- Jarak dalam meter (`…M`), durasi dalam detik (`…S`), kecepatan dalam m/s (`…Mps`).
- Koordinat `LatLon` = `[lintang, bujur]`. Titik track `TrackPoint` = `[lintang, bujur, waktu epoch ms, ketinggian meter | null]`.
- CORS dibuka untuk semua origin.

Contoh pemanggilan (ganti `TOKEN` dengan token dari login):

```bash
API=https://jejak.masamune.my.id/api
curl -s "$API/feed" -H "Authorization: Bearer TOKEN"
```

---

## Ringkasan endpoint

| Metode | Path | Login | Respons |
| --- | --- | --- | --- |
| GET | `/health` | tidak | `{ ok: true }` |
| POST | `/auth/register` | tidak | `AuthResult` (201) |
| POST | `/auth/login` | tidak | `AuthResult` |
| GET | `/media/:name?exp=&sig=` | tidak | gambar JPEG |
| POST | `/logout` | ya | `{ ok: true }` |
| GET | `/me` | ya | `Profile` |
| PUT | `/me/device` | ya | `{ ok: true }` |
| DELETE | `/me/device` | ya | `{ ok: true }` |
| PUT | `/me/avatar` | ya | `Profile` |
| DELETE | `/me/avatar` | ya | `Profile` |
| PUT | `/me/cover` | ya | `Profile` |
| DELETE | `/me/cover` | ya | `Profile` |
| GET | `/users?q=` | ya | `UserListItem[]` |
| GET | `/users/:id` | ya | `Profile` |
| POST | `/users/:id/follow` | ya | `Profile` |
| DELETE | `/users/:id/follow` | ya | `Profile` |
| GET | `/users/:id/followers?before=` | ya | `FollowItem[]` |
| GET | `/users/:id/following?before=` | ya | `FollowItem[]` |
| POST | `/users/:id/block` | ya | `Profile` |
| DELETE | `/users/:id/block` | ya | `Profile` |
| GET | `/users/:id/activities?before=` | ya | `ActivitySummary[]` |
| GET | `/users/:id/stats?type=&tz=` | ya | `Stats` |
| GET | `/timeline?before=` | ya | `TimelineItem[]` |
| GET | `/feed?before=` | ya | `ActivitySummary[]` |
| POST | `/activities` | ya | `Activity` (201) |
| GET | `/activities/:id` | ya | `Activity` |
| PATCH | `/activities/:id` | ya | `Activity` |
| DELETE | `/activities/:id` | ya | `{ ok: true }` |
| POST | `/activities/:id/kudos` | ya | `KudosState` |
| DELETE | `/activities/:id/kudos` | ya | `KudosState` |
| GET | `/activities/:id/comments` | ya | `Comment[]` |
| POST | `/activities/:id/comments` | ya | `Comment` (201) |
| DELETE | `/comments/:id` | ya | `{ ok: true }` |
| POST | `/routing` | ya | `RoutingResult` |
| GET | `/routes` | ya | `RouteSummary[]` |
| POST | `/routes` | ya | `PlannedRoute` (201) |
| GET | `/routes/:id` | ya | `PlannedRoute` |
| DELETE | `/routes/:id` | ya | `{ ok: true }` |
| POST | `/segments` | ya | `Segment` (201) |
| GET | `/segments?near=` | ya | `SegmentSummary[]` |
| GET | `/segments/:id?filter=` | ya | `Segment` |
| DELETE | `/segments/:id` | ya | `{ ok: true }` |
| GET | `/segments/:id/posts?before=` | ya | `Post[]` |
| POST | `/posts` | ya | `Post` (201) |
| GET | `/posts/:id` | ya | `Post` |
| DELETE | `/posts/:id` | ya | `{ ok: true }` |
| POST | `/posts/:id/like` | ya | `LikeState` |
| DELETE | `/posts/:id/like` | ya | `LikeState` |
| GET | `/posts/:id/replies` | ya | `PostReply[]` |
| POST | `/posts/:id/replies` | ya | `PostReply` (201) |
| DELETE | `/replies/:id` | ya | `{ ok: true }` |
| POST | `/posts/:id/report` | ya | `{ ok: true }` (201) |
| GET | `/chats` | ya | `ChatSummary[]` |
| GET | `/chats/unread` | ya | `{ count }` |
| GET | `/chats/:userId?before=&after=` | ya | `ChatMessage[]` |
| POST | `/chats/:userId` | ya | `ChatMessage` (201) |
| POST | `/chats/:userId/read` | ya | `{ ok: true }` |

Untuk semua path dengan `:id` atau `:userId`: bila nilainya bukan bilangan bulat positif, respons **404** *Tidak ditemukan*.

---

## Autentikasi

### `GET /health`

Tanpa login. Respons `{ "ok": true }`. Dipakai `deploy.sh` untuk cek kesehatan setelah deploy.

### `POST /auth/register`

Tanpa login. Membuat akun dan langsung membuat sesi.

Body:

```json
{ "username": "dicky_lari", "name": "Dicky", "password": "minimal6" }
```

| Field | Aturan |
| --- | --- |
| `username` | String, 3–20 karakter setelah di-trim, diubah ke huruf kecil, hanya `a-z 0-9 _ .` |
| `name` | String, 1–50 karakter setelah di-trim. |
| `password` | String, 6–200 karakter, dipakai **apa adanya** (spasi di awal/akhir tidak dibuang). Bukan string = dianggap kosong. Ditolak bila mudah ditebak (tanpa membedakan huruf besar/kecil): ada di daftar kata sandi umum (mis. `password`, `qwerty`, `sayang`, `bismillah`), satu karakter diulang (`aaaaaa`), deret angka naik/turun (`123456`, `987654`), atau memuat username yang panjangnya 4 karakter atau lebih. Aturan ini hanya untuk daftar; akun lama tetap bisa masuk. |

Respons **201** `AuthResult`:

```json
{ "token": "<token>", "user": { "id": 1, "username": "dicky_lari", "name": "Dicky" } }
```

| Kode | Pesan |
| --- | --- |
| 400 | `Isi permintaan harus JSON` |
| 400 | `Username wajib diisi`, `Username minimal 3 karakter`, `Username maksimal 20 karakter` |
| 400 | `Username hanya boleh huruf, angka, titik, dan garis bawah` |
| 400 | `Nama wajib diisi`, `Nama maksimal 50 karakter` |
| 400 | `Kata sandi minimal 6 karakter` (termasuk bila kosong/tidak ada), `Kata sandi maksimal 200 karakter` |
| 400 | `Kata sandi terlalu mudah ditebak. Pakai gabungan kata dan angka yang tidak umum.` |
| 409 | `Username sudah dipakai` |

### `POST /auth/login`

Tanpa login.

Body: `{ "username": "...", "password": "..." }`. Username di-trim dan diubah ke huruf kecil (maksimal 50 karakter). Kata sandi dicocokkan apa adanya; bila tidak cocok, server mencoba sekali lagi dengan versi tanpa spasi di awal/akhir. Ini untuk akun yang didaftarkan sebelum commit `a273d33`, saat kata sandi masih di-trim waktu daftar.

Respons **200** `AuthResult`. Berbeda dengan daftar, `user` di sini juga memuat `avatarUrl` (alamat foto profil bertanda tangan, atau `null`; lihat [Foto profil dan sampul](#foto-profil-dan-sampul)). Alamat ini kedaluwarsa dalam 1–2 minggu, jadi app mengambil foto profil terbaru dari `GET /users/:id`, bukan dari data login yang tersimpan.

| Kode | Pesan |
| --- | --- |
| 400 | `Isi permintaan harus JSON` |
| 400 | `Username wajib diisi`, `Username maksimal 50 karakter` |
| 401 | `Username atau kata sandi salah` |

Setiap login membuat token baru; token lama tetap berlaku.

### `POST /logout`

Login. Menghapus sesi milik token yang dipakai. Respons `{ "ok": true }`.

Catatan: path-nya `/logout`, bukan `/auth/logout`, sehingga tidak terkena batas laju nginx untuk `/api/auth/`.

### Token dan sesi

- Token: 32 byte acak, base64url. Tabel `sessions` hanya menyimpan **hash SHA-256**-nya (`token_hash`), jadi database atau backup yang bocor tidak bisa dipakai untuk masuk sebagai siapa pun.
- **Kedaluwarsa bila 90 hari tidak dipakai.** Setiap permintaan yang berhasil memperpanjang sesi (`last_used_at` dicatat paling sering sekali sehari). Sesi yang sudah lewat dihapus saat dipakai lagi dan saat ada yang masuk/daftar. Sesi juga hilang lewat `POST /logout` atau bila penggunanya dihapus.
- Token kosong, salah, sudah dihapus, atau kedaluwarsa → **401** `Sesi berakhir, silakan masuk lagi`. App menanggapi 401 dengan mengeluarkan pengguna.
- Database lama yang masih menyimpan token mentah (kolom `sessions.token`) dimigrasi otomatis saat server mulai: token di-hash dalam satu transaksi, jadi tidak ada yang ter-logout, dan masa 90 hari dihitung sejak migrasi.

### Batas laju (produksi)

nginx membatasi per IP asli (IP dari Cloudflare dipulihkan lebih dulu):

| Zona | Berlaku untuk | Batas |
| --- | --- | --- |
| `jejak_auth` | `/api/auth/` (daftar dan masuk) | 10 permintaan per menit, `burst=10`, `nodelay` |
| `jejak_api` | Semua `/api/` lainnya, termasuk `/api/media/` (foto) | 10 permintaan per detik, `burst=100`, `nodelay` |
| `jejak_write` | `POST`, `PUT`, `PATCH`, `DELETE` di `/api/` (simpan aktivitas, segmen, rute, kudos, komentar, follow, unggah foto profil/sampul, postingan, suka, balasan, pesan chat, blokir, minta rute ke OSRM) | 30 permintaan per menit, `burst=30`, `nodelay` |

Kelebihannya dibalas **429** oleh nginx dengan badan JSON `{ "error": "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi." }`, jadi app menampilkan pesan itu. Karena dihitung per IP, pengguna di balik IP operator seluler yang sama berbagi batas. Batasnya dibuat longgar untuk itu. Tidak ada batas laju di server lokal. Unggah foto profil/sampul (`PUT`) ikut dihitung `jejak_write`.

Polling chat memakai `GET` (tiap 3 detik di layar percakapan, tiap 15 detik di daftar pesan, tiap 30 detik untuk angka belum dibaca), jadi hanya dihitung `jejak_api`.

---

## Pengguna dan teman

Setiap `UserSummary` (`user` di aktivitas, komentar, rute, segmen, leaderboard, postingan, balasan, chat, serta baris `UserListItem`/`FollowItem`) berisi `id`, `username`, `name`, dan `avatarUrl`: alamat foto profil bertanda tangan, atau `null` bila belum ada foto. Satu-satunya yang tanpa `avatarUrl` adalah `user` di respons `POST /auth/register`.

### `GET /me`

Respons `Profile` milik pengguna yang login. Belum dipakai app (app memakai `GET /users/:id` dengan id sendiri).

### `GET /users?q=<teks>`

Mencari pengguna lain berdasarkan potongan `username` atau `name` (`LIKE %q%`, karakter `%`, `_`, `\` di-escape). Tanpa `q` atau `q` kosong menampilkan pengguna lain tanpa filter. Dirimu sendiri tidak ikut. Urut `username`, maksimal 30.

Respons `UserListItem[]`:

```json
[{ "id": 2, "username": "fajar", "name": "Fajar", "avatarUrl": null, "isFollowing": false }]
```

### `GET /users/:id`

Respons `Profile`:

| Field | Arti |
| --- | --- |
| `id`, `username`, `name` | Data pengguna. |
| `avatarUrl`, `coverUrl` | Alamat foto profil dan foto sampul (bertanda tangan), atau `null`. |
| `createdAt` | Waktu daftar. |
| `followers`, `following` | Jumlah pengikut dan yang diikuti. |
| `isFollowing` | Apakah kamu mengikuti dia. |
| `isMutual` | Kalian saling mengikuti. |
| `blocked` | Kamu memblokir dia. Tidak memberi tahu apakah dia memblokirmu. |
| `canMessage` | Kamu boleh mengirim pesan kepadanya: bukan dirimu, saling mengikuti, dan tidak ada blokir dari kedua pihak. |
| `isMe` | Apakah ini dirimu. |
| `totals` | `{ count, distanceM, movingS }` semua jenis aktivitas. |

Error: **404** `Pengguna tidak ditemukan`.

### `POST /users/:id/follow` dan `DELETE /users/:id/follow`

Mengikuti / berhenti mengikuti. Keduanya idempoten. Respons `Profile` pengguna target (sudah memuat `isFollowing` dan `followers` terbaru).

| Kode | Pesan |
| --- | --- |
| 400 | `Tidak bisa mengikuti diri sendiri` (hanya POST) |
| 403 | `Tidak bisa mengikuti pengguna ini` (hanya POST): salah satu dari kalian memblokir yang lain. |
| 404 | `Pengguna tidak ditemukan` |

### `GET /users/:id/followers?before=<ISO>` dan `GET /users/:id/following?before=<ISO>`

Daftar pengikut `:id` (`followers`) dan orang yang diikuti `:id` (`following`). Bisa dibuka semua pengguna yang login, untuk profil siapa pun. Urut dari yang paling baru mulai mengikuti, **30 per halaman**.

Respons `FollowItem[]` = `UserListItem` ditambah `since`:

```json
[{ "id": 3, "username": "cici", "name": "Cici", "avatarUrl": null, "isFollowing": false, "since": "2026-10-28T06:12:03.512Z" }]
```

| Field | Arti |
| --- | --- |
| `isFollowing` | Apakah **kamu** (yang login) mengikuti orang di baris itu. |
| `since` | Waktu mulai mengikuti (`follows.created_at`). |

Paginasi: kirim `before` = `since` baris terakhir halaman sebelumnya. Tanpa `before` dipakai `'9999'`. Halaman berisi kurang dari 30 berarti sudah habis.

Error: **404** `Pengguna tidak ditemukan`.

### `GET /users/:id/activities?before=<ISO>`

Aktivitas milik pengguna `:id`, terbaru dulu, **20 per halaman**. Respons `ActivitySummary[]`. Bila pengguna tidak ada, hasilnya array kosong.

Paginasi: kirim `before` = `startedAt` aktivitas terakhir di halaman sebelumnya. Server mengambil `started_at < before` (perbandingan string ISO). Tanpa `before` dipakai nilai `'9999'` (artinya semua). Halaman berisi kurang dari 20 berarti sudah habis.

---

## Foto profil dan sampul

Foto (profil, sampul, dan foto postingan) disimpan sebagai berkas JPEG di folder unggahan server (`data/uploads/`, lihat [deploy.md](deploy.md#tata-letak-server)), dengan nama acak 32 karakter heksadesimal (`<16 byte acak>.jpg`). Kodenya ada di `server/src/media.ts`.

### `PUT /me/avatar` dan `PUT /me/cover`

Mengganti foto profil (`avatar`) atau foto sampul (`cover`) milikmu. Badan `multipart/form-data` dengan satu berkas di isian **`foto`**:

```bash
curl -s -X PUT "$API/me/avatar" -H "Authorization: Bearer TOKEN" -F "foto=@avatar.jpg;type=image/jpeg"
```

- Hanya **JPEG**, dicek dari isinya (diawali `FF D8` dan strukturnya utuh), bukan dari nama berkas atau `Content-Type`.
- Maksimal **2 MB** (`MAX_PHOTO_BYTES`). App sudah memperkecil foto sebelum unggah (avatar 512 px, sampul 1600 px, JPEG kualitas 0,8), jadi biasanya jauh di bawah batas.
- Sebelum disimpan, server membuang segmen **APP1** (EXIF dan XMP) dan **APP13** (IPTC) dari JPEG. Di sanalah kamera menyimpan lokasi GPS foto. Data gambarnya tidak diubah.
- Berkas lama dihapus setelah yang baru tersimpan.

Respons `Profile` milikmu dengan `avatarUrl`/`coverUrl` baru.

| Kode | Pesan |
| --- | --- |
| 400 | `Foto wajib diunggah` (tidak ada berkas di isian `foto`, termasuk bila badan bukan multipart) |
| 400 | `Foto harus berformat JPEG` (bukan JPEG atau berkas terpotong) |
| 400 | `Isi permintaan harus multipart/form-data` (badan multipart rusak) |
| 413 | `Foto maksimal 2 MB` |

### `DELETE /me/avatar` dan `DELETE /me/cover`

Menghapus foto profil atau sampul (berkas di server ikut dihapus) sehingga app kembali menampilkan inisial atau gradasi bawaan. Idempoten. Respons `Profile` milikmu.

### `GET /media/:name?exp=<detik>&sig=<tanda tangan>`

**Tanpa login.** Tag `<img>` di versi web tidak bisa mengirim header `Authorization`, jadi akses foto dijaga dengan **alamat bertanda tangan**. Semua `avatarUrl`, `coverUrl`, dan `photos` di respons API berbentuk path relatif terhadap alamat API:

```
/media/3f9c0a…e1.jpg?exp=1793836800&sig=Jb2k…
```

App menempelkan alamat API di depannya (`mediaUri()` di `app/src/lib/api.ts`).

| Bagian | Isi |
| --- | --- |
| `name` | Nama berkas: 32 karakter `a-f0-9` + `.jpg`. Nama lain langsung ditolak, jadi path seperti `../jejak.db` tidak bisa dipakai. |
| `exp` | Waktu kedaluwarsa (epoch, **detik**) = awal minggu berjalan + 14 hari. Minggu dihitung dalam kelipatan 7 hari sejak epoch Unix, jadi berganti setiap Kamis 00.00 UTC (07.00 WIB). Contoh: alamat yang dibuat 28 Oktober 2026 berlaku sampai 5 November 2026 00.00 UTC. Akibatnya alamat **berlaku 1–2 minggu** dan **sama persis selama satu minggu**, sehingga cache gambar di HP tetap terpakai. |
| `sig` | HMAC-SHA256 dari `"<name>.<exp>"` dengan kunci server, base64url. |

Kunci HMAC diambil dari variabel `MEDIA_SECRET` bila diisi. Bila tidak, server membuat 32 byte acak sekali dan menyimpannya di berkas `.kunci-media` (izin 600) di dalam folder unggahan. Mengganti kunci membuat semua alamat lama tidak berlaku; app mendapat alamat baru saat memuat ulang data.

Alamat foto hanya muncul di respons endpoint yang butuh login. Siapa pun yang memegang alamatnya tetap bisa membuka foto itu sampai kedaluwarsa.

Respons **200** dengan badan JPEG dan header:

| Header | Nilai |
| --- | --- |
| `Content-Type` | `image/jpeg` |
| `Cache-Control` | `private, max-age=604800, immutable` |
| `X-Content-Type-Options` | `nosniff` |

| Kode | Pesan |
| --- | --- |
| 403 | `Alamat foto tidak berlaku` (nama tidak sah, `exp`/`sig` tidak ada, tanda tangan salah, atau sudah kedaluwarsa) |
| 404 | `Foto tidak ditemukan` (tanda tangan benar tetapi berkasnya sudah dihapus) |

---

## Notifikasi push

Token FCM HP didaftarkan per **sesi**: satu baris `push_devices` untuk setiap sesi yang menyalakan notifikasi. Keluar (`POST /logout`) atau sesi kedaluwarsa menghapus barisnya juga, jadi HP yang sudah keluar tidak menerima notifikasi akun itu. Notifikasi sendiri dikirim dari server lewat CLI, bukan lewat API (lihat [deploy.md](deploy.md#notifikasi-push)).

### `PUT /me/device`

Login. Badan: `{ "token": "<token FCM>", "platform": "android", "appVersion": "0.3.0" }`.

- `token` wajib, 20–4096 karakter (setelah di-trim); `platform` selain `ios` dianggap `android`; `appVersion` opsional, dipotong 20 karakter.
- Baris lama milik sesi ini dan baris lain dengan token yang sama (HP yang sama, akun berganti) dihapus dulu, lalu baris baru dibuat untuk sesi ini.
- App memanggilnya setiap app dibuka dan setiap token diganti FCM, selama notifikasi dinyalakan.

Respons `{ "ok": true }`. Token di luar batas panjang: **400** *Token wajib diisi* / *Token minimal 20 karakter* / *Token maksimal 4096 karakter*.

### `DELETE /me/device`

Login. Menghapus token sesi ini (sakelar notifikasi dimatikan). Respons `{ "ok": true }`, juga bila tidak ada yang terdaftar.

---

## Statistik

### `GET /users/:id/stats?type=<jenis>&tz=<menit>`

| Parameter | Nilai | Bawaan |
| --- | --- | --- |
| `type` | `run`, `ride`, `walk`, atau `all` | `run` |
| `tz` | Selisih zona waktu pengguna dalam menit **di timur UTC** (WIB = `420`, WITA = `480`, WIT = `540`). App mengirim `-new Date().getTimezoneOffset()`. Dibatasi ke `-720`…`840` (UTC−12 s.d. UTC+14); bukan angka dianggap `0`. | `420` |

Respons `Stats`:

| Field | Arti |
| --- | --- |
| `type` | Jenis yang diminta. |
| `weeks` | 12 elemen `WeekTotal` dari terlama ke minggu ini. `start` = tanggal Senin awal minggu (`YYYY-MM-DD`, zona `tz`). Tiap elemen berisi `count`, `distanceM`, `movingS`. |
| `thisYear` | Total tahun kalender berjalan (zona `tz`). |
| `allTime` | Total sepanjang masa. |
| `records` | Waktu terbaik sepanjang masa per jarak standar (`name`, `distanceM`, `elapsedS`, `activityId`, `date`), urut jarak. **Selalu kosong untuk `type=all`**, karena rekor hanya bermakna per jenis. |
| `longest` | Aktivitas terjauh `{ distanceM, activityId, date }` atau `null`. |

Error: **400** `Jenis aktivitas tidak dikenal` bila `type` tidak valid. Pengguna yang tidak ada menghasilkan statistik nol, bukan 404.

```bash
curl -s "$API/users/1/stats?type=run&tz=420" -H "Authorization: Bearer TOKEN"
```

---

## Feed dan aktivitas

### `GET /timeline?before=<ISO>`

Feed Beranda sejak app 0.2.0: **aktivitas dan postingan** milikmu dan milik orang yang kamu ikuti, digabung urut waktu (terbaru dulu), 20 per halaman. Respons `TimelineItem[]`; setiap item punya dua field tambahan:

| Field | Arti |
| --- | --- |
| `kind` | `activity` (sisanya berisi field `ActivitySummary`, lihat `GET /feed`) atau `post` (sisanya berisi field `Post`, lihat [Postingan](#postingan)). |
| `at` | Waktu urutan dan kursor halaman: `startedAt` untuk aktivitas, `createdAt` untuk postingan. |

Contoh satu item postingan:

```json
{
  "kind": "post",
  "at": "2026-10-28T07:01:10.120Z",
  "id": 4,
  "user": { "id": 2, "username": "budi", "name": "Budi", "avatarUrl": null },
  "body": "Jalannya licin habis hujan.",
  "photos": [],
  "segment": { "id": 7, "name": "Tanjakan" },
  "activity": null,
  "createdAt": "2026-10-28T07:01:10.120Z",
  "likes": 0,
  "hasLiked": false,
  "replies": 0
}
```

`id` aktivitas dan `id` postingan berasal dari tabel berbeda dan bisa sama; bedakan dengan `kind` (app memakai kunci `kind-id`, misalnya `post-4`).

Paginasi: kirim `before` = `at` item terakhir di halaman sebelumnya. Server mengambil paling banyak 20 aktivitas (`started_at < before`) dan 20 postingan (`created_at < before`), menggabungkan, mengurutkan, lalu mengembalikan 20 teratas. Halaman berisi kurang dari 20 berarti sudah habis.

Pengguna yang kamu blokir atau yang memblokirmu tidak muncul, karena blokir memutus follow kedua arah.

### `GET /feed?before=<ISO>`

Hanya aktivitas (tanpa postingan). Dipertahankan untuk APK lama (0.1.x); app 0.2.0 memakai `GET /timeline`.

Aktivitas milikmu dan milik orang yang kamu ikuti, terbaru dulu, 20 per halaman. Paginasi `before` sama dengan [aktivitas pengguna](#get-usersidactivitiesbeforeiso). Respons `ActivitySummary[]`:

| Field | Arti |
| --- | --- |
| `id`, `user`, `type`, `title`, `startedAt` | Identitas aktivitas. `user` = `UserSummary`. |
| `elapsedS` | Dari titik pertama sampai terakhir, termasuk jeda. |
| `movingS` | Waktu bergerak. |
| `distanceM`, `elevGainM` | Jarak dan total tanjakan. |
| `preview` | Garis ringkas maksimal 80 titik `LatLon`. Untuk aktivitas orang lain, ujungnya dipotong [zona privasi](#zona-privasi). |
| `kudos`, `hasKudo`, `comments` | Jumlah kudos, apakah kamu sudah memberi, jumlah komentar. |
| `routeId` | Rute yang diikuti atau `null`. |
| `prCount` | Jumlah PR (waktu terbaik + segmen) saat diunggah. |

### `POST /activities`

Menyimpan aktivitas. Server menghitung semua ringkasan dari `track` (lihat [algoritma.md](algoritma.md)).

Body `NewActivity`:

```json
{
  "type": "run",
  "title": "Lari pagi",
  "track": [
    [[-7.8139, 110.9258, 1761630723000, 112.3], [-7.81385, 110.92581, 1761630724000, 112.4]],
    [[-7.8120, 110.9260, 1761631000000, null]]
  ],
  "routeId": 3
}
```

| Field | Aturan |
| --- | --- |
| `type` | `run`, `ride`, atau `walk`. |
| `title` | 1–100 karakter setelah di-trim. |
| `track` | Array bagian; tiap bagian array `TrackPoint`. Bagian baru dimulai setiap kali rekaman dilanjutkan setelah jeda. Bagian kosong dibuang. Waktu di dalam satu bagian tidak boleh mundur. Total titik 2–60.000. |
| `routeId` | Opsional. Bila rute tidak ditemukan atau bukan milikmu, diam-diam disimpan sebagai `null`. |

Respons **201** `Activity` (lihat `GET /activities/:id`).

| Kode | Pesan |
| --- | --- |
| 400 | `Isi permintaan harus JSON` |
| 400 | `Jenis aktivitas tidak dikenal` |
| 400 | `Judul wajib diisi`, `Judul maksimal 100 karakter` |
| 400 | `Track tidak valid` (bukan array / bagian bukan array) |
| 400 | `Titik track tidak valid` (lat/lon di luar rentang, waktu bukan angka, ketinggian bukan angka/null) |
| 400 | `Tanggal aktivitas tidak masuk akal. Periksa jam dan tanggal di HP.` (ada titik sebelum 1 Januari 2020 atau lebih dari sehari ke depan; aktivitas bertanggal masa depan akan menempel di atas feed semua orang) |
| 400 | `Waktu titik track harus urut` |
| 400 | `Waktu titik track tidak bertambah` (semua titik berwaktu sama) |
| 400 | `Kecepatan tidak masuk akal untuk lari (1 km dalam 1:05). Mungkin rekaman terbawa kendaraan.` Lihat batasnya di bawah. |
| 400 | `Aktivitas terlalu pendek untuk disimpan` (kurang dari 2 titik) |
| 400 | `Track terlalu panjang` (lebih dari 60.000 titik) |
| 413 | Dari nginx bila badan lebih dari 20 MB (produksi). |

Batas kecepatan, dihitung dari waktu tercepat di mana saja dalam aktivitas (seperti waktu terbaik, tanpa jeda). Lebih cepat dari ini hampir pasti terbawa kendaraan atau dipalsukan, dan akan merusak rekor serta leaderboard segmen:

| Jenis | Ditolak bila |
| --- | --- |
| `run`, `walk` | 1 km kurang dari 2:00. Aktivitas 200 m–1 km: rata-rata lebih dari 30 km/j. |
| `ride` | 1 km kurang dari 0:36 (100 km/j) atau 10 km kurang dari 10:00 (60 km/j). Aktivitas 200 m–1 km: rata-rata lebih dari 100 km/j. |

Bila ditolak, rekaman di HP tidak hilang (statusnya tetap *selesai*), jadi pengguna bisa membuangnya.

### `GET /activities/:id`

Semua pengguna yang login bisa membaca aktivitas siapa pun, tetapi jejak orang lain dipotong [zona privasi](#zona-privasi). Respons `Activity` = `ActivitySummary` ditambah:

| Field | Arti |
| --- | --- |
| `track` | `TrackPoint[][]`. Lengkap untuk pemilik; untuk orang lain tanpa zona privasi di awal dan akhir (batas bagian tetap). |
| `maxSpeedMps` | Kecepatan maksimum (jendela ≥5 detik). |
| `splits` | `Split[]`: `{ index, distanceM, elapsedS }` per km. |
| `bestEfforts` | `BestEffort[]`: `{ name, distanceM, elapsedS, isPr }`, urut jarak. |
| `efforts` | `SegmentEffort[]`: `{ id, segmentId, segmentName, elapsedS, distanceM, startIndex, endIndex, rank, isPr }`, urut posisi di track. `startIndex`/`endIndex` adalah indeks pada track yang sudah diratakan (untuk orang lain: track yang sudah dipotong, di-clamp ke titik yang terlihat). `rank` = 1 + jumlah atlet lain yang waktu terbaiknya lebih cepat dari waktu **effort ini**. |
| `kudosBy` | Hingga 50 pemberi kudos terbaru. |

Error: **404** `Aktivitas tidak ditemukan`.

### Zona privasi

Awal dan akhir aktivitas sering berada di rumah. Karena itu, untuk aktivitas **orang lain**, server menyembunyikan bagian awal dan akhir jejak sepanjang **300 m**, tetapi paling banyak **seperempat jarak aktivitas** (aktivitas 800 m dipotong 200 m di tiap ujung). Panjangnya diukur di sepanjang jejak.

- Berlaku untuk `track` di `GET /activities/:id` dan `preview` di feed serta daftar aktivitas pengguna. Ujung `preview` yang baru diinterpolasi tepat di batas zona.
- Mengikuti seseorang tidak membuka zona ini, karena follow tidak butuh persetujuan.
- Pemilik selalu menerima jejak penuh, termasuk dari `POST`/`PATCH /activities`. Layar buat segmen memakai indeks track penuh.
- Angka ringkasan (jarak, waktu, split, waktu terbaik), pencocokan segmen, dan leaderboard tetap dihitung dari jejak penuh.

### `PATCH /activities/:id`

Mengubah judul. Body `{ "title": "..." }` (1–100 karakter). Respons `Activity`. Belum dipakai app.

| Kode | Pesan |
| --- | --- |
| 400 | `Judul wajib diisi`, `Judul maksimal 100 karakter`, `Isi permintaan harus JSON` |
| 403 | `Hanya pemilik yang bisa mengubah` |
| 404 | `Aktivitas tidak ditemukan` |

### `DELETE /activities/:id`

Menghapus aktivitas beserta kudos, komentar, waktu terbaik, dan waktu segmennya (cascade). Status PR di aktivitas lain **tidak** dihitung ulang. Respons `{ "ok": true }`.

| Kode | Pesan |
| --- | --- |
| 403 | `Hanya pemilik yang bisa menghapus` |
| 404 | `Aktivitas tidak ditemukan` |

---

## Kudos dan komentar

### `POST /activities/:id/kudos` dan `DELETE /activities/:id/kudos`

Memberi / mencabut kudos. Idempoten. Respons `KudosState`:

```json
{ "kudos": 3, "hasKudo": true }
```

| Kode | Pesan |
| --- | --- |
| 400 | `Tidak bisa memberi kudos ke aktivitas sendiri` (POST) |
| 404 | `Aktivitas tidak ditemukan` (POST) |

`DELETE` tidak memeriksa keberadaan aktivitas; untuk id yang tidak ada hasilnya `{ "kudos": 0, "hasKudo": false }`.

### `GET /activities/:id/comments`

Respons `Comment[]` urut dari yang terlama: `{ id, user, body, createdAt }`. Untuk aktivitas yang tidak ada hasilnya array kosong.

### `POST /activities/:id/comments`

Body `{ "body": "Mantap!" }` (1–500 karakter setelah di-trim). Respons **201** `Comment`.

| Kode | Pesan |
| --- | --- |
| 400 | `Komentar wajib diisi`, `Komentar maksimal 500 karakter`, `Isi permintaan harus JSON` |
| 404 | `Aktivitas tidak ditemukan` |

### `DELETE /comments/:id`

Boleh dilakukan penulis komentar atau pemilik aktivitas. Respons `{ "ok": true }`.

| Kode | Pesan |
| --- | --- |
| 403 | `Tidak boleh menghapus komentar ini` |
| 404 | `Komentar tidak ditemukan` |

---

## Routing dan rute

### `POST /routing`

Merencanakan rute yang mengikuti jalan lewat OSRM (lihat [algoritma.md](algoritma.md#routing-osrm-dan-garis-lurus)). Tidak menyimpan apa pun.

Body:

```json
{ "type": "run", "waypoints": [[-7.8139, 110.9258], [-7.8031, 110.9258], [-7.8031, 110.9330]] }
```

`waypoints`: 2–50 titik `LatLon`. `type` menentukan profil: `run`/`walk` → pejalan kaki, `ride` → sepeda.

Respons `RoutingResult`:

| Field | Arti |
| --- | --- |
| `geometry` | Garis rute `LatLon[]`. |
| `distanceM` | Panjang garis. |
| `steps` | `RouteStep[]`: `{ atM, text, at }`, `atM` = jarak dari awal rute ke titik belok. |
| `snapped` | `true` bila mengikuti jalan; `false` bila layanan routing gagal dan rute dibuat garis lurus (`steps` kosong). |

Endpoint ini tidak pernah gagal karena OSRM; kegagalan routing selalu jatuh ke garis lurus. Bisa memakan waktu hingga sekitar 10 detik (batas waktu ke OSRM).

| Kode | Pesan |
| --- | --- |
| 400 | `Jenis aktivitas tidak dikenal` |
| 400 | `Titik rute harus berisi 2–50 titik koordinat` |

```bash
curl -s -X POST "$API/routing" -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"run","waypoints":[[-7.8139,110.9258],[-7.8031,110.9258]]}'
```

### `GET /routes`

Rute buatanmu sendiri, terbaru dulu. Respons `RouteSummary[]`: `{ id, user, name, type, distanceM, preview, createdAt }`.

### `POST /routes`

Body `NewRoute`:

| Field | Aturan |
| --- | --- |
| `name` | 1–80 karakter. |
| `type` | `run`, `ride`, `walk`. |
| `waypoints` | 2–50 titik. |
| `geometry` | 2–20.000 titik. Jarak rute dihitung server dari garis ini. |
| `steps` | Opsional (bawaan `[]`). Maksimal 1.000 langkah; tiap langkah wajib punya `atM` (angka), `text` (string, dipotong ke 120 karakter), `at` (`LatLon`). |

Respons **201** `PlannedRoute` = `RouteSummary` + `waypoints`, `geometry`, `steps`.

| Kode | Pesan |
| --- | --- |
| 400 | `Nama rute wajib diisi`, `Nama rute maksimal 80 karakter` |
| 400 | `Jenis aktivitas tidak dikenal` |
| 400 | `Titik rute harus berisi 2–50 titik koordinat` |
| 400 | `Garis rute harus berisi 2–20000 titik koordinat` |
| 400 | `Petunjuk arah tidak valid` |

### `GET /routes/:id`

Respons `PlannedRoute`. Hanya pembuat rute yang bisa membacanya, karena rute rencana sering dimulai dari rumah. Rute orang lain dibalas sama seperti rute yang tidak ada: **404** `Rute tidak ditemukan`.

### `DELETE /routes/:id`

Respons `{ "ok": true }`. Aktivitas yang merujuk rute ini tetap ada; `routeId`-nya menjadi `null`.

| Kode | Pesan |
| --- | --- |
| 403 | `Hanya pembuat yang bisa menghapus` |
| 404 | `Rute tidak ditemukan` |

---

## Segmen dan leaderboard

### `POST /segments`

Membuat segmen dari potongan aktivitas milik sendiri, lalu mencocokkan semua aktivitas lama yang relevan (dalam satu transaksi).

Body `NewSegment`:

```json
{ "activityId": 12, "startIndex": 140, "endIndex": 420, "name": "Tanjakan Gunung Gandul" }
```

`startIndex` dan `endIndex` adalah indeks pada **track yang sudah diratakan** (semua bagian disambung). Syarat: bilangan bulat, `0 ≤ startIndex < endIndex < jumlah titik`.

Jenis segmen: aktivitas `ride` → segmen `ride`; aktivitas `run` atau `walk` → segmen `run`.

Respons **201** `Segment` (leaderboard filter *Semua*).

| Kode | Pesan |
| --- | --- |
| 400 | `Nama segmen wajib diisi`, `Nama segmen maksimal 80 karakter`, `Isi permintaan harus JSON` |
| 400 | `Titik awal/akhir segmen tidak valid` |
| 400 | `Segmen minimal 100 m` |
| 403 | `Segmen dibuat dari aktivitas sendiri` |
| 404 | `Aktivitas tidak ditemukan` |

### `GET /segments?near=<lat>,<lon>`

- Dengan `near` yang valid: 50 segmen dengan titik awal terdekat dari posisi itu, terdekat dulu.
- Tanpa `near`: 50 segmen dengan atlet terbanyak, lalu id terbesar (terbaru).

Semua jenis segmen ikut. Respons `SegmentSummary[]`: `{ id, name, type, distanceM, createdBy, preview, athletes, start }`. `athletes` = jumlah pengguna berbeda yang punya waktu di segmen itu, `start` = titik awal segmen.

```bash
curl -s "$API/segments?near=-7.8139,110.9258" -H "Authorization: Bearer TOKEN"
```

### `GET /segments/:id?filter=following`

Respons `Segment` = `SegmentSummary` ditambah:

| Field | Arti |
| --- | --- |
| `geometry` | Garis segmen. |
| `leaderboard` | `LeaderboardRow[]`: waktu terbaik **per atlet**, tercepat dulu, maksimal 100. `rank` = urutan baris (1, 2, 3, …). `activityId` dan `date` diambil dari effort tercepat atlet itu. |
| `myBest` | Waktu terbaikmu sebagai `LeaderboardRow`, atau `null`. `rank` di sini = 1 + jumlah atlet lain yang lebih cepat (atlet dengan waktu sama mendapat peringkat sama), selalu dibanding **semua** atlet walau memakai filter. |

`filter=following` membatasi `leaderboard` ke dirimu dan orang yang kamu ikuti. Nilai lain atau tanpa parameter berarti semua.

Error: **404** `Segmen tidak ditemukan`.

### `DELETE /segments/:id`

Menghapus segmen beserta semua waktunya. Status PR segmen yang sudah tercatat di `prCount` aktivitas tidak dihitung ulang. Postingan yang menandai segmen ini tetap ada, tetapi `segment`-nya menjadi `null`. Respons `{ "ok": true }`.

| Kode | Pesan |
| --- | --- |
| 403 | `Hanya pembuat yang bisa menghapus` |
| 404 | `Segmen tidak ditemukan` |

### `GET /segments/:id/posts?before=<ISO>`

**Diskusi segmen**: semua postingan yang menandai segmen ini, dari siapa pun (tidak hanya yang kamu ikuti), terbaru dulu, **20 per halaman**. Postingan dari orang yang **kamu** blokir tidak ikut. Respons `Post[]`.

Paginasi: `before` = `createdAt` postingan terakhir di halaman sebelumnya; tanpa `before` dipakai `'9999'`. Segmen yang tidak ada menghasilkan array kosong, bukan 404.

---

## Postingan

Postingan pendek ala X: teks, sampai 4 foto, dan bisa menandai satu segmen atau satu aktivitas sendiri. Postingan muncul di [`GET /timeline`](#get-timelinebeforeiso) penulisnya dan para pengikutnya, dan, bila menandai segmen, di [Diskusi segmen](#get-segmentsidpostsbeforeiso). Tidak ada lini masa umum berisi postingan semua orang.

Bentuk `Post`:

| Field | Arti |
| --- | --- |
| `id`, `user`, `createdAt` | Identitas postingan. `user` = `UserSummary` penulis. |
| `body` | Teks (boleh kosong bila ada foto). Ditampilkan app sebagai teks biasa. |
| `photos` | Alamat foto bertanda tangan (lihat [`GET /media/:name`](#get-medianameexpdetiksigtanda-tangan)), urut sesuai unggahan. |
| `segment` | `{ id, name }` segmen yang ditandai, atau `null` (juga bila segmennya sudah dihapus). |
| `activity` | `{ id, title, type }` aktivitas yang ditautkan, atau `null` (juga bila aktivitasnya sudah dihapus). |
| `likes`, `hasLiked` | Jumlah suka dan apakah kamu sudah menyukai. |
| `replies` | Jumlah balasan. |

### `POST /posts`

Badan `multipart/form-data`:

| Isian | Aturan |
| --- | --- |
| `body` | Teks, di-trim, maksimal 500 karakter. Boleh kosong bila ada foto. |
| `foto` | Opsional, 0–4 berkas (isian `foto` diulang). Aturan tiap berkas sama dengan [`PUT /me/avatar`](#put-meavatar-dan-put-mecover): JPEG, maksimal 2 MB, EXIF/XMP/IPTC dibuang. |
| `segmentId` | Opsional. Segmen siapa pun. |
| `activityId` | Opsional. Hanya aktivitas milikmu sendiri. App 0.2.0 belum memakainya. |

```bash
curl -s -X POST "$API/posts" -H "Authorization: Bearer TOKEN" \
  -F "body=Jalannya licin habis hujan, hati-hati di tikungan." -F "segmentId=7" -F "foto=@jalan.jpg;type=image/jpeg"
```

Respons **201** `Post`.

| Kode | Pesan |
| --- | --- |
| 400 | `Tulis sesuatu atau pilih foto` (teks kosong dan tanpa foto, termasuk bila badan bukan multipart) |
| 400 | `Postingan maksimal 500 karakter` |
| 400 | `Maksimal 4 foto` |
| 400 | `Foto wajib diunggah` (isian `foto` berisi teks, bukan berkas), `Foto harus berformat JPEG` |
| 400 | `Isi permintaan harus multipart/form-data` (badan multipart rusak) |
| 403 | `Hanya aktivitas sendiri yang bisa ditautkan` |
| 404 | `Segmen tidak ditemukan`, `Aktivitas tidak ditemukan` |
| 413 | `Foto maksimal 2 MB` (per foto) |

Postingan dan fotonya disimpan dalam satu transaksi.

### `GET /posts/:id`

Respons `Post`. Semua pengguna yang login bisa membaca postingan siapa pun lewat id-nya. Error: **404** `Postingan tidak ditemukan`.

### `DELETE /posts/:id`

Hanya penulisnya. Suka, balasan, dan laporan postingan ikut terhapus (cascade), berkas fotonya dihapus dari folder unggahan. Respons `{ "ok": true }`.

| Kode | Pesan |
| --- | --- |
| 403 | `Hanya pemilik yang bisa menghapus` |
| 404 | `Postingan tidak ditemukan` |

### `POST /posts/:id/like` dan `DELETE /posts/:id/like`

Menyukai / batal menyukai, idempoten. Berbeda dengan kudos, postingan sendiri boleh disukai. Respons `LikeState`:

```json
{ "likes": 1, "hasLiked": true }
```

Error: **404** `Postingan tidak ditemukan` (hanya POST). `DELETE` tidak memeriksa keberadaan postingan; untuk id yang tidak ada hasilnya `{ "likes": 0, "hasLiked": false }`.

### `GET /posts/:id/replies`

Respons `PostReply[]` urut dari yang terlama: `{ id, user, body, createdAt }`. Untuk postingan yang tidak ada hasilnya array kosong.

### `POST /posts/:id/replies`

Body JSON `{ "body": "Siap, makasih infonya" }` (1–500 karakter setelah di-trim). Respons **201** `PostReply`.

| Kode | Pesan |
| --- | --- |
| 400 | `Balasan wajib diisi`, `Balasan maksimal 500 karakter`, `Isi permintaan harus JSON` |
| 404 | `Postingan tidak ditemukan` |

### `DELETE /replies/:id`

Boleh dilakukan penulis balasan atau penulis postingan. Respons `{ "ok": true }`.

| Kode | Pesan |
| --- | --- |
| 403 | `Tidak boleh menghapus balasan ini` |
| 404 | `Balasan tidak ditemukan` |

### `POST /posts/:id/report`

Melaporkan postingan. Body JSON `{ "reason": "spam" }` (1–300 karakter). Laporan masuk ke tabel `reports` untuk ditinjau pemilik app langsung di database; belum ada endpoint untuk membacanya. Laporan berulang dari orang yang sama tetap dicatat. App mengirim alasan tetap *Dilaporkan dari aplikasi*. Respons **201** `{ "ok": true }`.

| Kode | Pesan |
| --- | --- |
| 400 | `Alasan wajib diisi`, `Alasan maksimal 300 karakter`, `Isi permintaan harus JSON` |
| 404 | `Postingan tidak ditemukan` |

---

## Chat dan blokir

Percakapan 1-lawan-1. Pesan tersimpan di database server sebagai teks biasa, **tidak terenkripsi ujung-ke-ujung**, dan ikut backup. Pesan baru tidak dikirim sebagai notifikasi push (notifikasi 0.3.0 hanya untuk info dan pembaruan); app mengambil pesan baru dengan polling (lihat [arsitektur.md](arsitektur.md#polling-chat)).

**Siapa boleh mengirim:** hanya sesama yang **saling mengikuti**, dan tidak ada blokir dari kedua pihak (`Profile.canMessage`). Riwayat percakapan tetap bisa dibaca kedua peserta walau syarat itu tidak lagi terpenuhi (berhenti mengikuti atau diblokir). Hanya dua peserta yang bisa membaca percakapan mereka. Pengirim bisa menghapus pesannya sendiri lewat `DELETE /chats/messages/:id`.

Bentuk `ChatMessage`:

| Field | Arti |
| --- | --- |
| `id` | Naik terus; dipakai sebagai kursor `before`/`after`. |
| `fromMe` | `true` bila kamu pengirimnya. |
| `body` | Isi pesan. |
| `createdAt` | Waktu kirim. |
| `readAt` | Waktu dibaca penerima, atau `null`. App menampilkannya sebagai *terkirim* / *dibaca* di pesanmu sendiri. |

### `GET /chats`

Daftar percakapan, yang pesan terakhirnya paling baru di atas, maksimal 50. Respons `ChatSummary[]`:

| Field | Arti |
| --- | --- |
| `user` | `UserSummary` lawan bicara. |
| `last` | `ChatMessage` terakhir di percakapan itu. |
| `unread` | Jumlah pesan dari dia yang belum kamu baca. |

### `GET /chats/unread`

Jumlah semua pesan masuk yang belum dibaca, dari siapa pun: `{ "count": 2 }`. Dipakai untuk angka di ikon pesan Beranda.

### `GET /chats/:userId?before=<id>` dan `?after=<id>`

Pesan antara kamu dan `:userId`, selalu urut dari yang terlama ke yang terbaru.

| Parameter | Hasil |
| --- | --- |
| tanpa parameter | 30 pesan terakhir. |
| `before=<id>` | 30 pesan sebelum pesan `id` (untuk menggulir ke pesan lama). Halaman berisi kurang dari 30 berarti sudah habis. |
| `after=<id>` | Sampai 100 pesan setelah pesan `id` (untuk polling pesan baru). Bila keduanya dikirim, `after` yang dipakai. |

| Kode | Pesan |
| --- | --- |
| 400 | `Tidak bisa mengobrol dengan diri sendiri` |
| 404 | `Pengguna tidak ditemukan` |

Membaca percakapan tidak menandainya sudah dibaca; app memanggil `POST /chats/:userId/read` terpisah.

### `POST /chats/:userId`

Body JSON `{ "body": "Besok lari pagi?" }` (1–1000 karakter setelah di-trim). Respons **201** `ChatMessage`.

| Kode | Pesan |
| --- | --- |
| 400 | `Tidak bisa mengobrol dengan diri sendiri` |
| 400 | `Pesan wajib diisi`, `Pesan maksimal 1000 karakter`, `Isi permintaan harus JSON` |
| 403 | `Tidak bisa mengirim pesan ke pengguna ini` (salah satu memblokir yang lain) |
| 403 | `Pesan hanya bisa dikirim ke teman yang saling mengikuti` |
| 404 | `Pengguna tidak ditemukan` |

### `POST /chats/:userId/read`

Menandai semua pesan dari `:userId` kepadamu yang belum dibaca sebagai sudah dibaca (`read_at` = sekarang). Respons `{ "ok": true }`. Error sama dengan `GET /chats/:userId`.

### `DELETE /chats/messages/:id`

Menghapus pesan **milik sendiri**; pesan hilang juga dari percakapan lawan bicara. Respons `{ "ok": true }`.

| Kode | Pesan |
| --- | --- |
| 403 | `Hanya pengirim yang bisa menghapus pesan` |
| 404 | `Pesan tidak ditemukan` |

### `POST /users/:id/block` dan `DELETE /users/:id/block`

Memblokir / membuka blokir. Keduanya idempoten. Respons `Profile` pengguna target (`blocked` dan `canMessage` terbaru).

Akibat blokir (dari kedua arah, kecuali disebut lain):

- follow kedua arah langsung dihapus, dan `POST /users/:id/follow` ditolak 403 selama blokir masih ada;
- pesan baru ditolak 403; riwayat percakapan tetap bisa dibaca;
- aktivitas dan postingan masing-masing hilang dari `GET /timeline` yang lain (karena follow terputus);
- postingan dari orang yang kamu blokir tidak tampil di Diskusi segmen milikmu (hanya satu arah).

Profil, aktivitas, dan postingan tetap bisa dibuka lewat id-nya. Orang yang diblokir tidak diberi tahu. Membuka blokir tidak mengembalikan follow yang sudah terhapus.

| Kode | Pesan |
| --- | --- |
| 400 | `Tidak bisa memblokir diri sendiri` (hanya POST) |
| 404 | `Pengguna tidak ditemukan` |

---

## Error umum

| Kode | Pesan | Penyebab |
| --- | --- | --- |
| 400 | `Isi permintaan harus JSON` | Badan bukan JSON valid atau bukan objek, pada endpoint yang membaca badan JSON. |
| 400 | `Isi permintaan harus multipart/form-data` | Badan multipart rusak pada endpoint unggah foto. |
| 403 | `Alamat foto tidak berlaku` | Alamat `/media/…` tanpa tanda tangan, salah, atau kedaluwarsa. |
| 413 | `Foto maksimal 2 MB` | Satu foto lebih dari 2 MB (dari server, JSON). |
| 401 | `Sesi berakhir, silakan masuk lagi` | Token tidak ada, salah, atau sudah logout. Juga untuk path yang tidak dikenal bila tanpa token. |
| 404 | `Tidak ditemukan` | `:id` bukan bilangan bulat positif. |
| 404 | `404 Not Found` (teks biasa, bukan JSON) | Path tidak dikenal dengan token valid (bawaan Hono). |
| 429 | (HTML dari nginx) | Batas laju `/api/auth/` di produksi. |
| 413 | (HTML dari nginx) | Badan lebih dari 20 MB di produksi. |
| 500 | `Terjadi kesalahan di server` | Error tak terduga; detailnya ada di log server (`journalctl -u jejak`). |
| 502/504 | (HTML dari nginx) | Proses Node mati atau tidak menjawab dalam 120 detik. |
