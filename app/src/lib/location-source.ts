import type { LocationObject } from 'expo-location';

/** Satu pembacaan posisi. */
export interface Fix {
  lat: number;
  lon: number;
  /** Waktu epoch ms */
  t: number;
  alt: number | null;
  /** Akurasi horizontal (m) */
  acc: number | null;
}

export type SourceKind = 'gps-bg' | 'gps-fg' | 'sim';

/** Penyedia posisi untuk perekam: GPS asli atau simulasi. */
export interface LocationSource {
  kind: SourceKind;
  start(onFix: (fixes: Fix[]) => void): Promise<void>;
  stop(): Promise<void>;
  /** Jam yang dipakai stopwatch; simulasi punya jamnya sendiri. */
  now(): number;
}

export function toFix(loc: LocationObject): Fix {
  return {
    lat: loc.coords.latitude,
    lon: loc.coords.longitude,
    t: loc.timestamp,
    alt: loc.coords.altitude ?? null,
    acc: loc.coords.accuracy ?? null,
  };
}
