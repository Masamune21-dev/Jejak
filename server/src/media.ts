// Foto unggahan (avatar, sampul, postingan): disimpan sebagai berkas JPEG bernama acak di data/uploads,
// disajikan lewat API dengan URL bertanda tangan (HMAC) supaya hanya pengguna yang login yang mendapat alamatnya.
// Folder data/ tertutup untuk nginx dan hanya boleh ditulis service jejak (lihat deploy/jejak.service).

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Batas satu foto setelah dikompres di HP (avatar ±60 KB, sampul ±300 KB). */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const WEEK_S = 7 * 86_400;
const NAME = /^[a-f0-9]{32}\.jpg$/;

export interface MediaStore {
  dir: string;
  key: Buffer;
}

/** Siapkan folder unggahan dan kunci tanda tangan (dari MEDIA_SECRET, atau dibuat sekali lalu disimpan di folder itu). */
export function openMedia(dir: string, secret = process.env.MEDIA_SECRET): MediaStore {
  mkdirSync(dir, { recursive: true });
  if (secret) return { dir, key: Buffer.from(secret) };
  const file = join(dir, '.kunci-media');
  if (!existsSync(file)) writeFileSync(file, randomBytes(32), { mode: 0o600 });
  return { dir, key: readFileSync(file) };
}

/**
 * JPEG tanpa segmen APP1 (EXIF/XMP) dan APP13 (IPTC): di sanalah kamera menyimpan lokasi GPS foto.
 * Mengembalikan null bila berkas bukan JPEG yang utuh.
 */
export function cleanJpeg(buf: Buffer): Buffer | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  const keep: Buffer[] = [buf.subarray(0, 2)];
  let i = 2;
  while (i + 1 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    if (marker === 0xff) {
      i++; // byte pengisi
      continue;
    }
    // SOS: sisanya data gambar sampai akhir berkas. EOI: berkas selesai.
    if (marker === 0xda || marker === 0xd9) {
      keep.push(buf.subarray(i));
      return Buffer.concat(keep);
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      keep.push(buf.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (i + 4 > buf.length) return null;
    const len = buf.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buf.length) return null;
    if (marker !== 0xe1 && marker !== 0xed) keep.push(buf.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  return null;
}

/** Simpan JPEG (sudah dibersihkan) dengan nama acak; kembalikan nama berkasnya. */
export function saveJpeg(m: MediaStore, data: Buffer): string {
  const name = `${randomBytes(16).toString('hex')}.jpg`;
  writeFileSync(join(m.dir, name), data);
  return name;
}

export function removeMedia(m: MediaStore, name: string | null | undefined) {
  if (!name || !NAME.test(name)) return;
  try {
    unlinkSync(join(m.dir, name));
  } catch {}
}

export function readMedia(m: MediaStore, name: string): Buffer | null {
  if (!NAME.test(name)) return null;
  try {
    return readFileSync(join(m.dir, name));
  } catch {
    return null;
  }
}

const sign = (m: MediaStore, name: string, exp: number) => createHmac('sha256', m.key).update(`${name}.${exp}`).digest('base64url');

/**
 * Alamat foto relatif terhadap API, berlaku 1–2 minggu. `exp` dibulatkan ke pergantian minggu,
 * jadi alamatnya tetap sama selama seminggu dan cache gambar di HP tetap terpakai.
 */
export function mediaPath(m: MediaStore, name: string, now = Date.now()): string {
  const exp = (Math.floor(now / 1000 / WEEK_S) + 2) * WEEK_S;
  return `/media/${name}?exp=${exp}&sig=${sign(m, name, exp)}`;
}

export function verifyMedia(m: MediaStore, name: string, exp: string | undefined, sig: string | undefined, now = Date.now()) {
  if (!NAME.test(name) || !exp || !/^\d{1,12}$/.test(exp) || !sig) return false;
  if (Number(exp) * 1000 < now) return false;
  const want = Buffer.from(sign(m, name, Number(exp)));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}
