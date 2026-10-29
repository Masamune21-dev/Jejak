# Catatan rilis

Dibaca `deploy/deploy.sh apk`: butir di bawah judul versi tampil di kartu pembaruan app (paling banyak empat) dan
butir pertama menjadi isi notifikasi pembaruan (`deploy.sh apk --umumkan`). Tulis dari sudut pandang pengguna,
satu perubahan per butir, sebelum menjalankan `deploy.sh apk`.

Baris `Versi minimal: x.y.z` (opsional, di luar bagian versi) memaksa app yang lebih lama memperbarui diri. Isi
hanya bila server berubah sehingga versi lama tidak bisa dipakai lagi.

## 0.3.1

- Ganti nama tampilan dan kata sandi di Pengaturan → Akun
- Tombol mata untuk melihat kata sandi saat masuk dan daftar

## 0.3.0

- Notifikasi info dan kabar versi baru, bisa dimatikan di Pengaturan
- Kartu di Beranda saat ada versi baru Jejak, langsung bisa diunduh
- Ekspor rute ke berkas GPX untuk diikuti di jam GPS (Garmin, COROS, dan lainnya)
- Keyboard tidak lagi menutupi kolom komentar, nama rute, dan pesan
- Kontak pembuat dan tombol Kirim masukan di Tentang aplikasi

## 0.2.2

- Ganti foto profil dan sampul dari aplikasi sudah bisa lagi
- Gambar dari layar Bagikan tersimpan tajam, 1080 piksel
