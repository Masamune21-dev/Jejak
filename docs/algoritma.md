# Algoritma dan ambang

Semua angka di dokumen ini diambil dari kode. Sebagian besar ada di `shared/geo.ts` (dipakai app dan server), sisanya di `app/src/lib/recorder.ts`, `server/src/app.ts`, dan `server/src/routing.ts`.

## Daftar isi

1. [Ringkasan ambang](#ringkasan-ambang)
2. [Jarak dan proyeksi](#jarak-dan-proyeksi)
3. [Filter titik GPS di perekam](#filter-titik-gps-di-perekam)
4. [Kumulatif dan bagian (jeda)](#kumulatif-dan-bagian-jeda)
5. [Ringkasan aktivitas](#ringkasan-aktivitas)
6. [Split per km](#split-per-km)
7. [Waktu terbaik](#waktu-terbaik)
8. [Rekor pribadi (PR)](#rekor-pribadi-pr)
9. [Pencocokan segmen](#pencocokan-segmen)
10. [Progres di rute](#progres-di-rute)
11. [Routing OSRM dan garis lurus](#routing-osrm-dan-garis-lurus)
12. [Penyederhanaan garis dan cuplikan](#penyederhanaan-garis-dan-cuplikan)
13. [Statistik mingguan](#statistik-mingguan)
14. [Format angka di app](#format-angka-di-app)

---

## Ringkasan ambang

| Nilai | Angka | Tempat |
| --- | --- | --- |
| Jari-jari bumi | 6.371.008,8 m | `geo.ts` `EARTH_R` |
| Batas "bergerak" | > 0,5 m/s | `geo.ts` `MOVING_MPS` |
| Histeresis tanjakan | 4 m | `geo.ts` `ELEV_HYSTERESIS_M` |
| Penghalusan ketinggian | rata-rata ±2 titik | `geo.ts` `smoothAltitude` |
| Jendela kecepatan maks | ≥ 5 detik | `geo.ts` `MAX_SPEED_WINDOW_S` |
| Split terakhir dibuang bila | < 50 m | `geo.ts` `splits` |
| Radius awal/akhir segmen | 35 m | `geo.ts` `SEG_ENDPOINT_RADIUS_M` |
| Radius titik kontrol segmen | 40 m | `geo.ts` `SEG_CHECKPOINT_RADIUS_M` |
| Jumlah titik kontrol | panjang/100 m, dibatasi 3–30 | `geo.ts` `matchSegment` |
| Toleransi jarak segmen | 0,8 × L − 30 m sampai 1,3 × L + 60 m | `geo.ts` `matchSegment` |
| Panjang minimal segmen | 100 m | `app.ts` `POST /segments` |
| Toleransi penyederhanaan segmen | 2 m | `app.ts` `POST /segments` |
| Margin kotak batas segmen (server) | 0,001° | `app.ts` `BBOX_MARGIN_DEG` |
| Akurasi GPS maksimal | 35 m | `recorder.ts` `MAX_ACCURACY_M` |
| Jarak minimal antar titik | 3 m | `recorder.ts` `MIN_STEP_M` |
| Kecepatan mustahil | > 45 m/s (162 km/j) | `recorder.ts` `MAX_SPEED_MPS` |
| Keluar rute | > 40 m dari garis | `recorder.ts` `OFF_ROUTE_M` |
| Getar belokan | < 30 m sebelum belokan | `recorder.ts` `computeGuide` |
| Simpan rekaman lokal | tiap ≥ 10 detik | `recorder.ts` `SAVE_EVERY_MS` |
| Titik maksimal per aktivitas | 60.000 | `app.ts` `MAX_TRACK_POINTS` |
| Batas waktu OSRM | 10 detik | `routing.ts` |
| Titik cuplikan | maksimal 80 | `geo.ts` `preview` |

---

## Jarak dan proyeksi

**Haversine** (`haversine`): jarak lingkaran besar antara dua titik dengan jari-jari bumi rata-rata R = 6.371.008,8 m.

```
s = sin²(Δφ/2) + cos φ1 · cos φ2 · sin²(Δλ/2)
d = 2R · asin(min(1, √s))
```

**Proyeksi lokal** (`project`, dipakai `distanceToSegment`): titik diubah ke koordinat datar dalam meter relatif terhadap sebuah titik asal:

```
x = Δλ · R · cos(φ_asal)
y = Δφ · R
```

Cukup akurat untuk jarak beberapa kilometer, dan jauh lebih murah daripada geometri bola.

**Jarak titik ke ruas** (`distanceToSegment(p, a, b)`): proyeksikan `b` dan `p` relatif ke `a`, hitung posisi relatif `t = clamp((p·b)/|b|², 0, 1)`, lalu jarak dari `p` ke titik `a + t·b`. Mengembalikan jarak dan `t`.

---

## Filter titik GPS di perekam

`addFixes()` di `app/src/lib/recorder.ts` memproses setiap pembacaan `Fix` dari sumber lokasi:

1. `here` dan `accuracy` **selalu** diperbarui (untuk titik biru di peta dan angka ±m), walau titiknya nanti ditolak.
2. Bila status bukan `recording`, berhenti di sini.
3. **Akurasi**: bila `acc` diketahui dan lebih dari **35 m**, titik ditolak. Akurasi `null` diterima.
4. Bila sudah ada titik sebelumnya **di bagian yang sama**, hitung `d` (haversine) dan `dt` (detik). Titik ditolak bila:
   - `dt ≤ 0` (waktu tidak maju);
   - `d < 3 m` (getaran GPS saat diam);
   - `d / dt > 45 m/s` (lompatan posisi mustahil).
5. Titik diterima: `distanceM += d`, lalu `[lat, lon, t, ketinggian dibulatkan 0,1 m]` ditambahkan ke bagian aktif.

Titik pertama setiap bagian hanya melewati cek akurasi. Perbandingan selalu dengan titik **terakhir yang diterima**, jadi satu lonjakan tidak merusak titik-titik sesudahnya.

Karena jarak di app dijumlah dengan rumus yang sama dari titik yang sama, jarak di layar rekam sama dengan jarak yang dihitung server.

Akibat ambang 3 m: saat berdiri diam, praktis tidak ada titik baru. Interval panjang tanpa titik ini nantinya tidak dihitung sebagai waktu bergerak (lihat di bawah).

---

## Kumulatif dan bagian (jeda)

Track terdiri dari bagian-bagian; setiap **Lanjut** setelah jeda memulai bagian baru. `cumulative(track)` meratakan semua titik dan membuat dua deret:

- `dist[i]`: jarak kumulatif. Di dalam bagian bertambah haversine antar titik; **di batas bagian tidak bertambah**, jadi perpindahan selama jeda tidak dihitung.
- `time[i]`: waktu aktif kumulatif (detik). Di dalam bagian bertambah `max(0, Δt)`; **di batas bagian tidak bertambah**, jadi durasi jeda tidak dihitung.

Split, waktu terbaik, dan waktu segmen semuanya memakai deret ini. Akibatnya, sebuah waktu terbaik atau waktu segmen boleh melintasi jeda, dan durasi jedanya tidak ikut dihitung.

---

## Ringkasan aktivitas

`summarize(track)` dijalankan server saat aktivitas disimpan. Bagian kosong diabaikan.

### Jarak

Jumlah haversine antar titik berurutan **di dalam setiap bagian**.

### Waktu total (`elapsedS`)

`(waktu titik terakhir − waktu titik pertama) / 1000`, minimal 0. **Termasuk** jeda. `startedAt` = waktu titik pertama.

### Waktu bergerak

Untuk setiap pasangan titik berurutan di dalam satu bagian dengan `dt > 0`: bila kecepatan `d / dt > 0,5 m/s`, `dt` ditambahkan ke `movingS`. Interval lebih lambat dari itu (berhenti di lampu merah, berdiri diam) tidak dihitung. Pace dan kecepatan rata-rata di feed dan detail aktivitas memakai waktu ini.

### Tanjakan (`elevGainM`)

Ketinggian GPS sangat berisik, jadi dihitung dua tahap per bagian:

1. **Penghalusan**: setiap titik yang punya ketinggian diganti rata-rata ketinggian titik-titik di jendela ±2 titik (maksimal 5 titik) di bagian yang sama. Ketinggian `null` dilewati, dan titik `null` tetap `null`.
2. **Histeresis 4 m**: simpan ketinggian acuan `ref` (mula-mula ketinggian halus pertama).
   - Bila `alt − ref ≥ 4`: tanjakan bertambah `alt − ref`, lalu `ref = alt`.
   - Bila `ref − alt ≥ 4`: `ref = alt` (turunan tidak dihitung, hanya menurunkan acuan).
   - Selain itu, `ref` tidak berubah.

Dengan begitu naik-turun kecil di bawah 4 m tidak menumpuk menjadi tanjakan palsu. `ref` dimulai ulang di setiap bagian.

### Kecepatan maksimum (`maxSpeedMps`)

Kecepatan sesaat GPS mudah melonjak, jadi dipakai jendela waktu. Untuk setiap titik `i`, cari titik awal `w` **terakhir** yang masih berjarak waktu ≥ 5 detik sebelum `i` (jendela terpendek yang masih ≥ 5 detik). Kecepatan jendela = panjang lintasan `w..i` dibagi durasinya. `maxSpeedMps` = kecepatan jendela tertinggi di semua bagian. Bila tidak ada jendela ≥ 5 detik, nilainya 0.

---

## Split per km

`splits(c, every = 1000)`:

1. Untuk k = 1, 2, …, selama `(k − 1) × 1000 < total jarak`:
   - target = `min(k × 1000, total)`;
   - waktu aktif saat jarak kumulatif mencapai target dicari dengan **interpolasi linear** di antara dua titik yang mengapitnya;
   - `distanceM = target − (k − 1) × 1000`, `elapsedS = waktu(target) − waktu(target sebelumnya)`.
2. Split terakhir yang **kurang dari 50 m** dibuang (kecuali bila itu split pertama), karena sisa sependek itu hanya mengacaukan pace.

Split memakai waktu aktif (jeda tidak dihitung, berdiri diam di dalam bagian tetap dihitung).

Di layar detail, panjang batang tiap split = `waktu-per-meter split tercepat ÷ waktu-per-meter split ini × 100%` (dibatasi 12–100%), dengan pembanding split tercepat dari **semua** split. Penanda merah "km tercepat" hanya dipilih dari split ≥ 900 m.

---

## Waktu terbaik

`bestEffort(c, D)`: waktu tercepat untuk menempuh jarak `D` di mana saja dalam aktivitas.

1. Bila total jarak < D, hasilnya `null` (jarak itu tidak dicatat).
2. Untuk setiap titik akhir `j` dengan `dist[j] ≥ D`, titik mulai berada di jarak `s = dist[j] − D`. Penunjuk `i` (yang hanya bergerak maju) dicari supaya `dist[i] ≤ s < dist[i+1]`, lalu waktu mulai diinterpolasi linear di antara `i` dan `i+1`.
3. `elapsed = time[j] − waktu mulai`. Ambil yang terkecil (dan > 0).

Ujung akhir selalu tepat di sebuah titik GPS, ujung awal diinterpolasi, sehingga jaraknya tepat `D`. Kompleksitasnya O(n) berkat dua penunjuk.

Jarak yang dicatat (`EFFORTS` di `app.ts`):

| Jenis | Jarak |
| --- | --- |
| `run` | 400 m, 1 km, 5 km, 10 km, Setengah maraton (21.097,5 m), Maraton (42.195 m) |
| `walk` | 1 km, 5 km, 10 km |
| `ride` | 5 km, 10 km, 20 km, 40 km, 100 km |

---

## Rekor pribadi (PR)

Dihitung sekali saat aktivitas disimpan, di dalam transaksi yang sama.

**Waktu terbaik**: untuk setiap jarak standar yang tercapai, ambil `prev = min(elapsed_s)` milik pengguna itu di tabel `best_efforts` dengan **jenis dan nama yang sama** (sebelum baris baru dimasukkan).

```
isPr = prev ada  DAN  waktu baru < prev
```

Rekor pertama kali **bukan** PR, karena belum ada yang dikalahkan. Lari dan jalan kaki punya rekor terpisah.

**Segmen**: sama, dengan `prev = min(elapsed_s)` pengguna itu di segmen tersebut.

`activities.pr_count` = jumlah PR waktu terbaik + jumlah PR segmen. Status PR tidak dihitung ulang bila aktivitas lain dihapus kemudian.

Saat **segmen baru dibuat**, aktivitas lama dicocokkan urut `started_at`, dan PR dihitung berdasarkan urutan itu (per pengguna, effort yang mengalahkan waktu terbaik sebelumnya dalam sejarah). PR segmen hasil pencocokan ulang ini tidak menambah `pr_count` aktivitas lama.

---

## Pencocokan segmen

`matchSegment(segment, c)` mencari **lintasan tercepat** dalam aktivitas yang melewati segmen dari awal (S) ke akhir (F), searah, melalui semua titik kontrol.

### Langkah

1. **Saringan cepat**: bila kotak batas segmen dan kotak batas track tidak bersinggungan (dengan margin 35 m), langsung tidak cocok. Server sudah menyaring lebih dulu dengan kueri kotak batas ± 0,001° (sekitar 110 m).
2. **Titik kontrol**: panjang segmen `L`, jumlah titik kontrol `n = clamp(round(L / 100), 3, 30)`. Titik kontrol ke-k berada di jarak `L × k / (n + 1)` sepanjang segmen (k = 1..n), jadi tersebar merata di bagian dalam segmen, tidak di ujungnya.
3. **Kandidat titik awal**: telusuri track; setiap rombongan titik berurutan yang berada dalam **35 m** dari S menyumbang satu kandidat, yaitu titiknya yang paling dekat ke S. Jadi segmen yang dilewati dua kali menghasilkan dua kandidat.
4. Untuk setiap kandidat `i0`:
   - batas pencarian: `maxDist = dist[i0] + 1,5 × L + 200 m`;
   - untuk setiap titik kontrol **berurutan**, maju di track sampai ada ruas track (`P[j]`–`P[j+1]`) yang berjarak ≤ **40 m** dari titik kontrol. Bila melewati `maxDist` atau track habis, kandidat gagal;
   - setelah titik kontrol terakhir, cari rombongan titik pertama yang berada dalam **35 m** dari F (masih dalam `maxDist`), ambil titiknya yang paling dekat ke F;
   - **cek jarak**: jarak track antara awal dan akhir harus di antara `0,8 × L − 30 m` dan `1,3 × L + 60 m`;
   - waktu = `time[akhir] − time[awal]` (waktu aktif) dan harus > 0.
5. Dari semua kandidat yang lolos, ambil waktu **tercepat**.

Hasilnya `{ startIndex, endIndex, elapsedS, distanceM }` dengan indeks pada track yang diratakan.

### Akibat yang perlu diketahui

- **Arah penting**: melewati segmen dari F ke S tidak cocok, karena titik kontrol harus dilalui berurutan.
- **Jalur paralel** yang lebih dari ~40 m dari segmen tidak cocok, walau awal dan akhirnya dekat.
- Memotong jalan pintas yang membuat jarak tempuh kurang dari 80% (dikurangi 30 m), atau memutar terlalu jauh (lebih dari 130% + 60 m), tidak cocok.
- Satu aktivitas paling banyak satu waktu per segmen (yang tercepat).

### Jenis segmen

`segmentType(type)`: aktivitas `ride` → segmen `ride`; aktivitas `run` dan `walk` → segmen `run`. Saat mencocokkan:

| Segmen | Dicocokkan dengan aktivitas |
| --- | --- |
| `run` | `run` dan `walk` |
| `ride` | `ride` |

Jadi pejalan kaki dan pelari berbagi leaderboard di segmen lari, sedangkan sepeda punya segmen sendiri.

### Membuat segmen

`POST /segments` mengambil titik track (diratakan) dari `startIndex` sampai `endIndex`, menghitung panjangnya (harus ≥ 100 m), menyederhanakan garisnya dengan Douglas-Peucker toleransi **2 m**, menyimpan kotak batasnya, lalu menjalankan `matchSegment` terhadap semua aktivitas sejenis yang kotak batasnya bersinggungan.

---

## Progres di rute

`progressOnRoute(route, cum, pos, prevAlongM)` memproyeksikan posisi ke garis rute dan mengembalikan `{ index, alongM, offM }`:

- `alongM`: jarak sepanjang rute ke titik proyeksi;
- `offM`: jarak posisi ke garis rute.

Masalah yang diselesaikan: pada rute putaran (awal = akhir) atau jalan buntu yang dilewati pergi-pulang, satu posisi bisa dekat ke dua bagian rute sekaligus. Supaya progres tidak meloncat, setiap kandidat diberi **biaya** relatif terhadap progres sebelumnya:

```
cost(along) = along − prev            bila along ≥ prev   (maju)
            = (prev − along) × 5      bila along < prev   (mundur, dihukum 5×)
```

Pencarian per ruas rute: ruas yang lebih dekat **lebih dari 10 m** selalu menang; bila selisih jaraknya **dalam 10 m**, yang biayanya lebih kecil menang.

Urutan pencarian:

1. **Lokal**: hanya ruas di rentang `prev − 20 m` sampai `prev + 300 m` sepanjang rute. Bila hasilnya berjarak ≤ 50 m dari garis, pakai.
2. **Global**: semua ruas. Pakai hasil global bila lebih dekat dari hasil lokal.

Perekam menyimpan `alongM` terakhir sebagai `prev` untuk pembacaan berikutnya, dan mereset ke 0 saat rute diganti atau rekaman dimulai.

Pemandu di app (lihat [arsitektur.md](arsitektur.md#pemandu-rute)):

| Hasil | Rumus |
| --- | --- |
| Sisa | `total − alongM` |
| Petunjuk berikutnya | langkah pertama dengan `atM > alongM − 5` |
| Jarak ke belokan | `max(0, atM − alongM)` |
| Keluar rute | `offM > 40` |
| Getar belokan | sekali per langkah saat jarak < 30 m |
| Getar keluar rute | saat berubah dari di rute menjadi keluar rute |

---

## Routing OSRM dan garis lurus

`planRoute(type, waypoints)` di `server/src/routing.ts`.

### Permintaan

```
GET {ROUTING_URL}/{profil}/route/v1/driving/{lon,lat;lon,lat;…}?overview=full&geometries=geojson&steps=true
```

| Item | Nilai |
| --- | --- |
| `ROUTING_URL` | Variabel lingkungan, bawaan `https://routing.openstreetmap.de` (OSRM publik FOSSGIS). |
| Profil | `run`, `walk` → `routed-foot`; `ride` → `routed-bike`. |
| Koordinat | `bujur,lintang` dengan 6 desimal, dipisah `;`. |
| User-Agent | `Jejak/0.1 (aplikasi olahraga pribadi)` |
| Batas waktu | 10 detik (`AbortSignal.timeout`). |

Layanan FOSSGIS gratis untuk pemakaian wajar. Untuk lalu lintas besar, pasang server OSRM sendiri dan isi `ROUTING_URL` (struktur path harus sama: `/{profil}/route/v1/driving/...`).

### Mengolah respons

1. `routes[0].geometry.coordinates` (GeoJSON `[bujur, lintang]`) dibalik menjadi `LatLon[]`.
2. Semua `steps` dari semua `legs` digabung. Setiap langkah diubah menjadi kalimat dengan `stepText()`:

| Jenis manuver OSRM | Teks |
| --- | --- |
| `depart` | (tidak diumumkan) |
| `arrive` | `Sampai di tujuan`, hanya untuk langkah paling akhir (kedatangan di waypoint tengah tidak diumumkan) |
| `roundabout`, `rotary` | `Di bundaran ambil keluar ke-N ke <jalan>` bila ada nomor keluar, selain itu `Masuk bundaran ke <jalan>` |
| `new name`, `continue` | Tidak diumumkan bila tanpa arah atau lurus; selain itu seperti belokan |
| `notification` | (tidak diumumkan) |
| lainnya (`turn`, `fork`, `end of road`, …) | kata kerja dari arah + ` ke <jalan>` |

Kata kerja dari `modifier`:

| `modifier` | Teks |
| --- | --- |
| `left` / `right` | Belok kiri / Belok kanan |
| `slight left` / `slight right` | Agak ke kiri / Agak ke kanan |
| `sharp left` / `sharp right` | Belok tajam ke kiri / Belok tajam ke kanan |
| `straight` | Lurus terus |
| `uturn` | Putar balik |
| lainnya atau tidak ada | Lanjut |

Bagian ` ke <jalan>` hanya ditambahkan bila OSRM memberi nama jalan.

3. **Posisi belokan** (`atM`): lokasi manuver dicocokkan ke titik geometri terdekat (jarak Manhattan dalam derajat), dengan pencarian yang hanya **maju** dari belokan sebelumnya. Dengan begitu, rute yang melewati titik yang sama dua kali tetap menghasilkan urutan belokan yang benar. `atM` = jarak kumulatif pada titik geometri itu.

### Fallback garis lurus

Bila terjadi error apa pun (jaringan, batas waktu, HTTP bukan 2xx, `code` bukan `Ok`, atau tidak ada rute), server mencatat `[routing] gagal, pakai garis lurus: <pesan>` lalu mengembalikan:

```ts
{ geometry: waypoints /* apa adanya */, distanceM: pathDistance(waypoints), steps: [], snapped: false }
```

App juga jatuh ke garis lurus bila permintaan `/routing` ke server gagal. Garis lurus digambar putus-putus dan tidak punya petunjuk belok.

---

## Penyederhanaan garis dan cuplikan

**Douglas-Peucker** (`simplify(pts, tol)`): ujung-ujung selalu disimpan; untuk setiap rentang, titik dengan jarak terjauh ke garis ujung-ke-ujung disimpan bila jaraknya lebih dari `tol` meter, lalu rentang dibelah dua. Diimplementasikan dengan tumpukan (tanpa rekursi).

**Cuplikan** (`preview(pts, maxPoints = 80)`): mulai dengan toleransi 3 m, gandakan terus (6, 12, 24, … m) sampai hasilnya ≤ 80 titik atau toleransi melewati 5 km. Koordinat dibulatkan 6 desimal. Dipakai untuk kolom `preview` aktivitas, rute, dan segmen.

---

## Statistik mingguan

`GET /users/:id/stats` (lihat [api.md](api.md#statistik)):

- Waktu lokal = waktu UTC + `tz` menit.
- Awal minggu = **Senin** pada tanggal lokal (`(hari + 6) mod 7` hari sebelumnya).
- `weeks`: 12 minggu, dari 11 minggu lalu sampai minggu berjalan. Aktivitas masuk minggu sesuai `started_at` lokalnya; aktivitas lebih lama dari 12 minggu hanya masuk total.
- `thisYear`: aktivitas dengan tahun lokal sama dengan tahun lokal sekarang.
- `records`: `min(elapsed_s)` per nama jarak di `best_efforts` untuk jenis itu.

---

## Format angka di app

`app/src/lib/format.ts`:

| Fungsi | Hasil |
| --- | --- |
| Jarak | `< 1000 m` → `"850 m"`, selain itu km 2 desimal dengan koma (`"5,02 km"`). |
| Durasi | `25:09` atau `1:05:09`. |
| Durasi singkat | `25m` atau `1j 5m`. |
| Pace | detik per km sebagai `5:12 /km`; `–` bila jarak < 10 m, waktu ≤ 0, atau pace lebih lambat dari 60 menit/km. |
| Kecepatan | `m/s × 3,6` dengan 1 desimal, `"24,3 km/j"`. |
| Pace atau kecepatan | Sepeda memakai kecepatan, lari dan jalan memakai pace. |
| Perkiraan waktu rute | jarak ÷ kecepatan rata-rata: lari 2,8 m/s, sepeda 5,5 m/s, jalan 1,3 m/s. |
| Judul bawaan | `<Jenis> <pagi\|siang\|sore\|malam>` dari jam titik pertama: < 11, < 15, < 18, selebihnya malam. |
| Waktu relatif | `Hari ini pukul 06.12`, `Kemarin pukul 16.40`, `N hari lalu` (2–6 hari), selebihnya tanggal (`12 Okt 2026`). |
| Kalimat meta | Jenis + waktu relatif berhuruf kecil di awal: `Lari, hari ini pukul 06.12`. Dipakai di feed dan detail aktivitas. |
