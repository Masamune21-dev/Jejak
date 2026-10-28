import type { StyleProp, ViewStyle } from 'react-native';

import { bounds, haversine, type LatLon } from '@shared/geo';

export interface MapLine {
  id: string;
  coords: LatLon[];
  color: string;
  width?: number;
  dashed?: boolean;
}

export interface MapPin {
  id: string;
  at: LatLon;
  color: string;
  label?: string;
}

export interface MapProps {
  style?: StyleProp<ViewStyle>;
  lines?: MapLine[];
  pins?: MapPin[];
  /** Titik posisi pengguna. */
  me?: LatLon | null;
  /** Saat nilai ini berganti, peta menyesuaikan agar semua titik terlihat. */
  fit?: LatLon[] | null;
  /** Peta mengikuti posisi `me` (mode rekam). */
  followMe?: boolean;
  initialCenter?: LatLon;
  onPress?: (at: LatLon) => void;
  /** false = peta diam (untuk thumbnail). */
  interactive?: boolean;
  /** Tinggi panel yang menutupi bagian bawah peta, supaya fit tidak tertutup. */
  bottomInset?: number;
}

/** Alun-alun Pati, dipakai bila posisi belum diketahui. */
export const DEFAULT_CENTER: LatLon = [-6.7535, 111.04];

/** Lebar/tinggi minimum kotak fit (m), kira-kira zoom 16–17 di HP: jejak pendek tidak diperbesar sampai galat GPS beberapa meter tampak keluar jalan. */
const MIN_FIT_SPAN_M = 200;

/** Kotak [barat daya, timur laut] untuk menyesuaikan peta ke garis, minimal MIN_FIT_SPAN_M ke kedua arah. */
export function fitBox(points: LatLon[]): [LatLon, LatLon] {
  const b = bounds(points)!;
  const lat = (b.minLat + b.maxLat) / 2;
  const lon = (b.minLon + b.maxLon) / 2;
  const halfLat = Math.max((b.maxLat - b.minLat) / 2, MIN_FIT_SPAN_M / 2 / 111_320);
  const halfLon = Math.max((b.maxLon - b.minLon) / 2, MIN_FIT_SPAN_M / 2 / (111_320 * Math.cos((lat * Math.PI) / 180)));
  return [
    [lat - halfLat, lon - halfLon],
    [lat + halfLat, lon + halfLon],
  ];
}

/** Pin awal & akhir; bila rute berupa putaran (ujungnya berdekatan) cukup satu pin. */
export function endPins(line: LatLon[], labels: [string, string] = ['A', 'B']): MapPin[] {
  if (line.length === 0) return [];
  const start = line[0];
  const end = line[line.length - 1];
  if (haversine(start, end) < 30) return [{ id: 'start', at: start, color: '#0B7A55', label: `${labels[0]}/${labels[1]}` }];
  return [
    { id: 'start', at: start, color: '#0B7A55', label: labels[0] },
    { id: 'end', at: end, color: '#D7332A', label: labels[1] },
  ];
}
