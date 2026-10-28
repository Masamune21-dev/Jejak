import type { LatLon } from '@shared/geo';

export interface RoutePath {
  /** Atribut `d` untuk <Path> SVG. */
  d: string;
  start: [number, number];
  end: [number, number];
}

/**
 * Proyeksikan garis rute (Web Mercator) ke dalam kotak w×h, dipusatkan dan
 * proporsional, untuk digambar di atas foto atau template.
 */
export function routePath(points: LatLon[], w: number, h: number, pad = 0): RoutePath | null {
  if (points.length < 2 || w <= 0 || h <= 0) return null;
  const proj = points.map(([lat, lon]) => {
    const sin = Math.sin((lat * Math.PI) / 180);
    return [lon / 360, -Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)] as const;
  });
  const xs = proj.map((p) => p[0]);
  const ys = proj.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX || 1e-9;
  const spanY = Math.max(...ys) - minY || 1e-9;
  const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);
  const ox = (w - spanX * scale) / 2;
  const oy = (h - spanY * scale) / 2;
  const pts = proj.map(([x, y]) => [ox + (x - minX) * scale, oy + (y - minY) * scale] as [number, number]);
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return { d, start: pts[0], end: pts[pts.length - 1] };
}
