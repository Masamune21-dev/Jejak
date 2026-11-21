// Impor jejak dari berkas GPX atau FIT jam GPS. Hasilnya track siap dikirim ke
// POST /activities; app tidak menghitung ulang jarak atau kecepatan dari jam.

import type { ActivityType, TrackPoint } from '@shared/api';

export interface ImportedTrack {
  track: TrackPoint[][];
  name: string | null;
  type: ActivityType | null;
}

/** Jeda lebih dari 2 menit dianggap berhenti: bagian baru supaya tidak masuk waktu bergerak. */
const SPLIT_GAP_MS = 120_000;

function cleanText(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function typeOf(s: string | null): ActivityType | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (/run|jog|trail|lari/.test(v)) return 'run';
  if (/bike|cycl|ride|gowes|sepeda/.test(v)) return 'ride';
  if (/walk|hike|jalan/.test(v)) return 'walk';
  return null;
}

/** Tambah titik ke bagian terakhir; buat bagian baru bila ada jeda panjang. */
function pushPoint(parts: TrackPoint[][], point: TrackPoint) {
  if (parts.length === 0) {
    parts.push([point]);
    return;
  }
  const last = parts[parts.length - 1];
  const prev = last[last.length - 1];
  if (prev && point[2] - prev[2] > SPLIT_GAP_MS) {
    parts.push([point]);
    return;
  }
  // Waktu harus naik di dalam satu bagian.
  if (prev && point[2] <= prev[2]) return;
  last.push(point);
}

export function parseGpx(text: string): ImportedTrack {
  const name = cleanText(/<trk>[\s\S]*?<name>([\s\S]*?)<\/name>/i.exec(text)?.[1] ?? '');
  const type = typeOf(/<trk>[\s\S]*?<type>([\s\S]*?)<\/type>/i.exec(text)?.[1] ?? null);
  const segs = [...text.matchAll(/<trkseg\b[^>]*>([\s\S]*?)<\/trkseg>/gi)].map((m) => m[1]);
  const bodies = segs.length > 0 ? segs : [text];
  const parts: TrackPoint[][] = [];
  for (const body of bodies) {
    const part: TrackPoint[] = [];
    for (const m of body.matchAll(/<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/gi)) {
      const attrs = m[1];
      const lat = Number(/lat\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]);
      const lon = Number(/lon\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
      const iso = /<time>([\s\S]*?)<\/time>/i.exec(m[2])?.[1];
      const t = iso ? Date.parse(cleanText(iso)) : NaN;
      if (!Number.isFinite(t)) continue;
      const ele = /<ele>([\s\S]*?)<\/ele>/i.exec(m[2])?.[1];
      const alt = ele == null ? null : Number(cleanText(ele));
      const point: TrackPoint = [lat, lon, t, Number.isFinite(alt) ? Math.round((alt as number) * 10) / 10 : null];
      const tail = part[part.length - 1];
      if (tail && t <= tail[2]) continue;
      part.push(point);
    }
    if (part.length > 0) parts.push(part);
  }
  // Gabungkan bagian yang berdekatan dan pecah lagi bila ada jeda panjang.
  const merged: TrackPoint[][] = [];
  for (const part of parts) for (const point of part) pushPoint(merged, point);
  if (merged.reduce((n, p) => n + p.length, 0) < 2) throw new Error('File GPX tidak berisi titik GPS yang lengkap (butuh waktu dan koordinat).');
  return { track: merged, name: name || null, type };
}

// --- FIT ---

/** Detik dari 1970 ke epoch FIT (31 Desember 1989 00:00 UTC). */
const FIT_EPOCH_S = 631_065_600;
/** Semicircle FIT: 2^31 = 180 derajat. */
const SEMI = 180 / 2 ** 31;

const BASE_SIZE: Record<number, number> = {
  0x00: 1, // enum
  0x01: 1, // sint8
  0x02: 1, // uint8
  0x83: 2, // sint16
  0x84: 2, // uint16
  0x85: 4, // sint32
  0x86: 4, // uint32
  0x07: 1, // string (variabel; ukuran ada di definisi)
  0x88: 4, // float32
  0x89: 8, // float64
  0x0a: 1, // uint8z
  0x8b: 2, // uint16z
  0x8c: 4, // uint32z
  0x0d: 1, // byte
  0x8e: 8, // sint64
  0x8f: 8, // uint64
  0x90: 8, // uint64z
};

interface FitField {
  num: number;
  size: number;
  type: number;
}

interface FitDef {
  little: boolean;
  global: number;
  fields: FitField[];
}

function fitNumber(view: DataView, offset: number, type: number, size: number, little: boolean): number | null {
  const base = BASE_SIZE[type];
  if (base == null) return null;
  switch (type) {
    case 0x01:
      return view.getInt8(offset);
    case 0x83:
      return view.getInt16(offset, little);
    case 0x85:
      return view.getInt32(offset, little);
    case 0x8e:
      return Number(view.getBigInt64(offset, little));
    case 0x88:
      return view.getFloat32(offset, little);
    case 0x89:
      return view.getFloat64(offset, little);
    case 0x8f:
    case 0x90:
      return Number(view.getBigUint64(offset, little));
    default: {
      if (size >= 4) return view.getUint32(offset, little);
      if (size === 2) return view.getUint16(offset, little);
      return view.getUint8(offset);
    }
  }
}

export function parseFit(bytes: Uint8Array): ImportedTrack {
  if (bytes.length < 14) throw new Error('File FIT terlalu pendek.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (String.fromCharCode(...bytes.subarray(8, 12)) !== '.FIT') throw new Error('Berkas ini bukan file FIT.');
  const headerSize = bytes[0];
  const dataSize = view.getUint32(4, true);
  const end = Math.min(bytes.length, headerSize + dataSize);
  let pos = headerSize;
  const defs = new Map<number, FitDef>();
  const parts: TrackPoint[][] = [];
  let lastTs = 0;
  let lastPointT: number | null = null;

  const add = (latRaw: number, lonRaw: number, ts: number, altRaw: number | null) => {
    const lat = latRaw * SEMI;
    const lon = lonRaw * SEMI;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const t = (ts + FIT_EPOCH_S) * 1000;
    if (lastPointT != null && t <= lastPointT) return;
    lastPointT = t;
    const alt = altRaw == null ? null : Math.round((altRaw / 5 - 500) * 10) / 10;
    pushPoint(parts, [lat, lon, t, alt]);
  };

  while (pos < end) {
    const header = bytes[pos++];
    // Header waktu terkompresi: timestamp tidak ada di data, dihitung dari 5 bit.
    if (header & 0x80) {
      const local = (header >> 5) & 0x03;
      const offset = header & 0x1f;
      const def = defs.get(local);
      if (!def) throw new Error('File FIT rusak: definisi pesan tidak ditemukan.');
      lastTs = (lastTs & ~0x1f) + offset + (offset < (lastTs & 0x1f) ? 32 : 0);
      let lat: number | null = null;
      let lon: number | null = null;
      let alt: number | null = null;
      for (const f of def.fields) {
        if (f.num === 253) {
          pos += f.size;
          continue;
        }
        const value = fitNumber(view, pos, f.type, f.size, def.little);
        pos += f.size;
        if (value == null) continue;
        if (f.num === 0) lat = value;
        if (f.num === 1) lon = value;
        if (f.num === 2 || f.num === 78) alt = value;
      }
      if (def.global === 20 && lat != null && lon != null) add(lat, lon, lastTs, alt);
      continue;
    }

    const local = header & 0x0f;
    const isDef = (header & 0x40) !== 0;
    const hasDev = (header & 0x20) !== 0;
    if (isDef) {
      pos += 1; // reserved
      const arch = bytes[pos++];
      const little = arch === 0;
      const global = view.getUint16(pos, little);
      pos += 2;
      const count = bytes[pos++];
      const fields: FitField[] = [];
      for (let i = 0; i < count; i++) {
        fields.push({ num: bytes[pos], size: bytes[pos + 1], type: bytes[pos + 2] });
        pos += 3;
      }
      if (hasDev) {
        const devCount = bytes[pos++];
        pos += devCount * 3;
      }
      defs.set(local, { little, global, fields });
      continue;
    }

    const def = defs.get(local);
    if (!def) throw new Error('File FIT rusak: data muncul sebelum definisinya.');
    let lat: number | null = null;
    let lon: number | null = null;
    let alt: number | null = null;
    let ts: number | null = null;
    for (const f of def.fields) {
      const value = fitNumber(view, pos, f.type, f.size, def.little);
      pos += f.size;
      if (value == null) continue;
      if (f.num === 253) ts = value;
      else if (f.num === 0) lat = value;
      else if (f.num === 1) lon = value;
      else if (f.num === 2 || f.num === 78) alt = value;
    }
    if (ts != null) lastTs = ts;
    if (def.global === 20 && lat != null && lon != null && ts != null) add(lat, lon, ts, alt);
  }

  if (parts.reduce((n, p) => n + p.length, 0) < 2) throw new Error('File FIT tidak berisi titik GPS yang lengkap.');
  return { track: parts, name: null, type: null };
}