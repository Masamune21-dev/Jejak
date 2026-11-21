# Apa yang dibenci pengguna Strava, dan apa artinya untuk Jejak

## Sampel

| Ukuran | Hasil |
| --- | --- |
| Ulasan terkumpul | 1.200 |
| Setelah 23 duplikat dibuang | **1.177 unik** |
| Sumber | App Store US (500), GB (250), Indonesia (450) |
| Rentang | 16 Maret 2017 – 19 November 2026 |
| Rating 1–3 bintang | 672 |
| Rating 1–2 bintang | 556 |
| Semua berlabel bintang | 1.177 |

Sumbernya feed RSS resmi Apple, bukan scraping. Apple tidak memberi tautan
permanen per ulasan, jadi setiap tautan di bawah menuju halaman ulasan
aplikasi di toko yang sama. Satu ulasan bisa cocok dengan beberapa tema, jadi
angka tema **tumpang tindih** dan bukan jumlah keluhan unik.

## 1. Yang mereka benci

Angka = jumlah ulasan **1–3 bintang** yang menyebut tema itu.

| Tema | Ulasan | Bukti | Arti untuk Jejak |
| --- | ---: | --- | --- |
| Harga langganan dan paywall | 169 | *"more and more features (many of which are very basic) have been creeping behind the paywall, and it's now reaching a point where the free version is almost unusable."* — GB, 1★, 2025-12-19 | Jejak gratis. Jangan pernah mengunci fitur inti. |
| Crash dan bug | 89 | *"So many bugs."* — US, 1★ | Keandalan adalah fitur utama. |
| Sinkron dan unggah gagal | 77 | *"Runs get duplicated in Strava and they all have different times."* — US, 2★, 2026-09-18 | Antrean unggah otomatis + kunci idempoten. |
| Jam GPS dan perangkat | 75 | *"pas di sync ke strava malah berkurang 200 m"* — ID, 2★, 2025-08-19 | Impor GPX/FIT apa adanya, jangan hitung ulang. |
| GPS dan jarak melenceng | 74 | *"jarak sepeda saya menyelesaikan 25.77km. Sedangkan yang terekam hanya 17.7km."* — ID, 2★, 2019-09-30 | Haluskan GPS, tampilkan akurasi, tolak lompatan mustahil. |
| Layanan pelanggan | 59 | *"They use an AI named "Miles" to reply to emails. As it's now been 12 days since I first reached out, I'm assuming I will never hear from an actual person."* — US, 1★, 2026-08-11 | Dukungan manusia, bukan bot AI. |
| Peta dan navigasi | 58 | *"when that information gets synced with Strava there can be missing maps on long runs."* — US, 2★, 2026-09-18 | Peta harus tetap ada walau unggahan gagal. |
| Akun, login, dan hapus data | 48 | *"You cannot delete your account in the app; it forces you to their website."* — US, 1★, 2026-08-01 | Hapus akun dan ekspor data dari dalam app. |
| Tampilan susah dipakai | 35 | *"The AI workout summaries add clutter to the interface without adding useful insight."* — GB, 3★, 2026-01-12 | Jangan tambah AI atau kartu yang tidak diminta. |
| Teman, klub, dan tantangan | 35 | *"challenges are for paid members only, what a shame!"* — US, 1★, 2026-11-11 | Klub dan tantangan gratis bisa jadi pembeda. |
| Notifikasi | 33 | *"This year I never received a notification that my 2025 report was available"* — GB, 5★, 2026-02-28 | Push untuk kudos, komentar, dan rekor. |
| Iklan dan feed penuh | 29 | *"I just wanted an app to log workouts without all the noise."* — GB, 1★, 2026-10-02 | Feed kronologis, tanpa iklan, tanpa rekomendasi. |
| Data hilang | 26 | *"my garmin and Strava have matched data wise, but now Strava is auto pausing my runs which I do not want"* — US, 3★, 2026-10-28 | Jangan ubah data pengguna diam-diam. |
| Aplikasi lambat | 26 | *"every time I wanted to give kudos it would freeze and crash."* — US, 1★, 2026-07-21 | Jaga app tetap ringan. |
| Privasi dan keamanan | 12 | *"I thought i had 'hidden' myself from other subscribers but was then followed by some random. When i checked, all my routes... were visible to all!"* — GB, 1★, 2026-05-18 | Visibilitas per aktivitas, bukan hanya zona privasi. |
| Segmen dan leaderboard | 11 | *"Do I need to buy a desktop computer to create a new segment now?"* — US, 1★, 2026-10-04 | Jejak sudah bisa bikin segmen dari HP. Tonjolkan. |
| Baterai boros | 1 | *"battery"* — hanya satu ulasan | Sampel terlalu tipis. Jangan dijadikan prioritas. |

### Pola yang tidak masuk tema

Beberapa keluhan muncul berulang di daftar "baca manual":

- **Musik mati atau mengecil saat mulai lari.** *"The app will randomly decide to turn my music very low, and later blast my ears with their pace split timing update."* — GB, 1★. Strava punya masalah *audio ducking*. Kalau Jejak menambah panduan suara, harus bisa mengecilkan musik sebentar lalu mengembalikannya, bukan mematikannya.
- **Update paksa di HP lama.** *"And now it won't work on my iPhone X, why is this necessary? We can't all afford to keep buying new phones!"* — GB, 1★. Jejak berupa APK dan bisa jalan di perangkat lama; ini keunggulan yang bisa dikomunikasikan.
- **Data jam dihitung ulang.** *"Instead of taking the data from Garmin, which is main source of distance... Strava is taking the map route of our run... giving significant mistakes in distance."* — US, 1★, 2026-11-11.
- **Jenis aktivitas berubah saat disimpan.** *"ketika disave malah jadi bersepeda padahal saya lari"* — ID, 2★, 2025-10-09.

## 2. Yang mereka minta

| Permintaan | Bukti | Peluang untuk Jejak |
| --- | --- | --- |
| Mulai dengan hitung mundur | *"just wish they can add a feature to delay start time for run to allow people to put way their phones"* — US, 4★ | Hitung mundur 3–10 detik sebelum merekam. Kecil. |
| Kontrol format bagikan | *"At least please make it possible in setting to save photo in original ratio and without PR."* — ID, 1★, 2025-03-24 | Jejak sudah punya 4:5 dan 9:16; tambah pilihan menyembunyikan angka tertentu. |
| Sembunyikan elevasi di stiker | *"berikan opsi untuk menyembunyikan elevation gain saat di story... soalnya saya tidak mendaki kok ada elevation gain nya"* — ID, 2★, 2025-04-30 | Toggle angka di stiker. Kecil. |
| Mode malam yang benar-benar gelap | *"the night mode display is not completely black... the font/text sometimes cannot be read."* — ID, 3★, 2026-07-02 | Cek kontras token tema terang/gelap. |
| Impor data lama dari jam | *"people online say that if you connect garmin it will import your last year of data. It didn't"* — US, 1★, 2026-07-31 | Impor GPX/FIT, lalu impor massal. |
| Versi tablet | *"there is not a better iPad version of the app to review data and maps"* — GB, 3★ | Versi web Jejak sudah jalan; tata letak tablet bisa menyusul. |
| Matikan fitur yang tidak diminta | *"Please add a toggle to remove this from my feed."* — US, 3★ | Jangan tambah fitur yang tidak bisa dimatikan. |

## 3. Yang belum terselesaikan

Ini bukan daftar fitur, tapi janji yang bisa dipakai untuk membedakan Jejak:

1. **Gratis tanpa paywall dan tanpa iklan.** Bukan sekadar harga, tapi janji bahwa
   segmen, leaderboard, riwayat, dan PR tidak akan pernah dikunci.
2. **Data milik pengguna.** Ekspor semua aktivitas, hapus akun dari dalam app,
   dan tidak memakai data latihan untuk AI.
3. **Jalan di HP lama dan sinyal jelek.** APK ringan, rekaman lokal, unggah
   otomatis saat sinyal kembali.
4. **Dukungan manusia.** Tanpa bot AI yang mengulang jawaban.
5. **Mobile-first.** Bikin segmen, rute, dan aktivitas dari HP, bukan dari desktop.
6. **Privasi sejak awal.** Zona privasi, visibilitas per aktivitas, dan peta
   yang bisa disembunyikan.
7. **Konteks lokal.** Bahasa Indonesia, jalan lokal, OpenStreetMap, dan istilah
   yang dipakai pelari di sini.

## 4. Rencana perbaikan

Diurutkan dari bukti terkuat dikali biaya termurah.

| # | Perbaikan | Bukti | Usaha | Di mana | Kenapa sekarang |
| --- | --- | --- | --- | --- | --- |
| 1 | Antrean unggah otomatis + kunci idempoten anti-duplikat | 77 sinkron/unggah, 26 data hilang | M | `app/lib/recorder.ts`, server | Keluhan keandalan nomor dua setelah harga. Jejak sudah menyimpan lokal saat gagal; tinggal unggah sendiri. |
| 2 | Visibilitas per aktivitas + sembunyikan peta | 12 privasi, 48 akun | M | server + `app/src/app/pengaturan` | Melengkapi zona privasi yang sudah ada. Strava justru dikeluhkan karena profil "hidden" tapi rute tetap terlihat. |
| 3 | Hapus akun dan ekspor semua data dari dalam app | 48 akun/login | S–M | server + Pengaturan | Strava disebut memakai *dark pattern*. Ini murah dan langsung membangun kepercayaan. |
| 4 | Impor GPX/FIT | 75 perangkat, 74 GPS | M | `app/lib/gpx.ts`, server | Melayani pengguna Garmin/COROS/Huawei tanpa perlu bikin app jam. Data jam dipakai apa adanya, tidak dihitung ulang. |
| 5 | Notifikasi push kudos, komentar, pengikut, dan rekor | 33 notifikasi | M | `server/src/push.ts` + app | Retensi. Sekarang push hanya untuk pengumuman dan pembaruan. |
| 6 | Panduan suara yang tidak mematikan musik | Keluhan audio berulang | S–M | `app/lib/recorder.ts` | Pembeda yang jelas: suara split dan belokan, musik dikecilkan sebentar lalu kembali. |
| 7 | Filter feed + toggle angka di stiker | 29 iklan/feed, permintaan bagikan | S | Beranda, `ShareStickers.tsx` | Kemenangan cepat. Pengguna ingin feed bersih dan kontrol atas apa yang dibagikan. |
| 8 | Klub dan tantangan bulanan gratis | 35 teman/klub/tantangan | L | server + app | Strava mengunci tantangan di balik langganan. Ini peluang komunitas terbesar. |

Yang **tidak** perlu ditiru: ringkasan AI, feed algoritmik, iklan, bot dukungan,
update paksa, dan menghitung ulang data dari jam.

## 5. Sudut positioning

**Pilihan A (disarankan).**
> Untuk pelari dan pesepeda Indonesia yang muak dengan aplikasi olahraga yang
> makin mahal: **Jejak gratis, tanpa iklan, tanpa paywall, dan semua data
> latihanmu tetap milikmu.**

Bukti: 169 dari 672 ulasan 1–3 bintang menyebut langganan/paywall; 29 menyebut
iklan/feed; 450 ulasan berasal dari toko Indonesia.

**Pilihan B.**
> Untuk pengguna jam GPS yang datanya sering dirusak aplikasi: **Jejak menerima
> GPX/FIT apa adanya, tanpa menghitung ulang jarakmu.**

Bukti: 75 ulasan perangkat dan 74 ulasan GPS/jarak; kutipan Garmin yang
jaraknya dihitung ulang dan jam yang kehilangan 200 m saat sinkron.

**Pilihan C.**
> Untuk yang peduli privasi: **zona privasi, visibilitas per aktivitas, dan
> hapus akun dari dalam aplikasi.**

Bukti: 12 ulasan privasi dan 48 ulasan akun; kutipan profil "hidden" yang
rutinya tetap terlihat, dan proses hapus akun yang berbelit.

Rekomendasi: **A sebagai janji utama, B dan C sebagai bukti pendukung.** A
paling kuat karena sudah cocok dengan model Jejak sekarang (gratis, tanpa
iklan, donasi) dan langsung menjawab keluhan nomor satu.

## 6. Batas penelitian ini

- Sampel hanya App Store (US, GB, ID). Google Play, Reddit, dan forum lokal
  belum masuk. Tambahkan sebelum mengambil keputusan besar.
- Tautan menuju halaman ulasan aplikasi, bukan ulasan individual, karena feed
  Apple tidak menyediakan tautan permanen.
- Hitungan tema tumpang tindih dan memakai pencocokan kata kunci. Sudah
  dibatasi ke ulasan 1–3 bintang, tapi tetap bisa salah tangkap.
- Kutipan diambil apa adanya dari ulasan, termasuk salah tulis dan emoji.
- Ini riset produk, bukan nasihat hukum.

## 7. Langkah berikutnya

1. Pilih 1–2 perbaikan dari tabel di atas, mulai dari #1 dan #3.
2. Masukkan ke `replica/features.csv` sebagai baris baru dengan `original=no`
   (fitur yang Strava tidak punya atau tidak jalankan dengan baik).
3. Perbarui `docs/ide-fitur.md` dengan bukti dan kutipan dari dokumen ini.
4. Jalankan ulang riset tiap kuartal, dan tambahkan Google Play + Reddit.
