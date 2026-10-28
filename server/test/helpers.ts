import { haversine, type LatLon, type TrackPoint } from '../../shared/geo.ts';

/** Track sintetis dari titik ke titik dengan kecepatan tetap, satu titik per `stepS` detik. */
export function walkPath(
  path: LatLon[],
  speedMps: number,
  t0 = Date.UTC(2026, 9, 20, 23),
  stepS = 1,
  alt: number | null = 100,
): TrackPoint[] {
  const out: TrackPoint[] = [[path[0][0], path[0][1], t0, alt]];
  let t = t0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const d = haversine(a, b);
    const n = Math.max(1, Math.round(d / (speedMps * stepS)));
    for (let k = 1; k <= n; k++) {
      const f = k / n;
      t += (d / n / speedMps) * 1000;
      out.push([a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]), Math.round(t), alt]);
    }
  }
  return out;
}

/** Titik sejauh `meters` ke utara (+) dari `p`. */
export const north = (p: LatLon, meters: number): LatLon => [p[0] + meters / 111_195, p[1]];
/** Titik sejauh `meters` ke timur (+) dari `p`. */
export const east = (p: LatLon, meters: number): LatLon => [p[0], p[1] + meters / (111_195 * Math.cos((p[0] * Math.PI) / 180))];

export const HOME: LatLon = [-7.8139, 110.9258];
