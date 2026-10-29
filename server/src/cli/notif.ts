/**
 * Kirim notifikasi push manual. Di produksi dijalankan lewat `deploy/deploy.sh notif` (sebagai user jejak,
 * kunci FCM dibaca dari stdin supaya tetap hanya bisa dibaca root):
 *
 *   node src/cli/notif.ts --judul "…" --isi "…" [--ke username]… [--tautan /segmen/12] [--jenis info|pembaruan]
 *                         [--kecuali-versi 0.3.1] [--uji]
 *
 * --uji hanya menghitung penerima. Database dari DB_PATH, kunci dari FCM_CREDENTIALS (bawaan /etc/jejak/fcm.json;
 * `-` berarti stdin).
 */
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { openDb } from '../db.ts';
import { loadPusher, notify, recipients, type PushMessage } from '../push.ts';

function stop(message: string): never {
  console.error(message);
  process.exit(1);
}

const { values: a } = parseArgs({
  options: {
    judul: { type: 'string' },
    isi: { type: 'string' },
    ke: { type: 'string', multiple: true, default: [] },
    tautan: { type: 'string' },
    jenis: { type: 'string', default: 'info' },
    'kecuali-versi': { type: 'string' },
    uji: { type: 'boolean', default: false },
  },
});

const title = a.judul?.trim() ?? '';
const body = a.isi?.trim() ?? '';
if (!title || !body) stop('--judul dan --isi wajib diisi.');
// Lebih panjang dari ini terpotong di bilah notifikasi HP.
if (title.length > 60) stop(`Judul ${title.length} karakter, maksimal 60.`);
if (body.length > 200) stop(`Isi ${body.length} karakter, maksimal 200.`);
if (a.tautan && !/^(\/[^\s]*|https:\/\/\S+)$/.test(a.tautan)) stop('--tautan harus path app (/segmen/12) atau alamat https://.');
if (a.jenis !== 'info' && a.jenis !== 'pembaruan') stop('--jenis harus info atau pembaruan.');

const msg: PushMessage = {
  title,
  body,
  url: a.tautan,
  channel: a.jenis,
  // Pengumuman pembaruan yang baru menggantikan yang lama di HP.
  tag: a.jenis === 'pembaruan' ? 'pembaruan' : undefined,
};
const opts = { ...msg, to: a.ke, skipVersion: a['kecuali-versi'] };

const db = openDb(process.env.DB_PATH ?? fileURLToPath(new URL('../../data/jejak.db', import.meta.url)));
const who = recipients(db, opts);
for (const u of who.missing) console.log(`  ! ${u}: tidak ada atau belum menyalakan notifikasi`);
console.log(`Penerima: ${who.tokens.length} perangkat, ${who.users} pengguna${opts.to.length ? '' : ' (semua)'}.`);
if (a.uji || who.tokens.length === 0) process.exit(0);

const keyPath = process.env.FCM_CREDENTIALS ?? '/etc/jejak/fcm.json';
const pusher = loadPusher(keyPath) ?? stop(`Kunci FCM belum dipasang di ${keyPath} (lihat docs/deploy.md).`);
const r = await notify(db, pusher, opts);
console.log(`Terkirim ${r.sent}, gagal ${r.failed}, token tidak berlaku dihapus ${r.removed}.`);
if (r.failed > 0) process.exit(2);
