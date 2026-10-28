// Hitungan geografis yang dipakai bersama oleh app dan server:
// jarak, ringkasan aktivitas, split per km, rekor, segmen, dan progres rute.
// File ini sengaja tanpa import supaya bisa langsung dipakai Metro dan Node.

export type LatLon = [number, number];
/** [lintang, bujur, waktu epoch ms, ketinggian meter | null] */
export type TrackPoint = [number, number, number, number | null];
type Pt = LatLon | TrackPoint;

const EARTH_R = 6371008.8;
const RAD = Math.PI / 180;

export function haversine(a: Pt, b: Pt): number {
  const dLat = (b[0] - a[0]) * RAD;
  const dLon = (b[1] - a[1]) * RAD;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function pathDistance(pts: readonly Pt[]): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i]);
  return d;
}

/** Jarak kumulatif tiap titik sepanjang garis. */
export function cumulativeDistance(pts: readonly Pt[]): number[] {
  const out = new Array<number>(pts.length);
  let d = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) d += haversine(pts[i - 1], pts[i]);
    out[i] = d;
  }
  return out;
}

export function flatten(track: readonly TrackPoint[][]): TrackPoint[] {
  return track.flat();
}

export function toLatLon(pts: readonly Pt[]): LatLon[] {
  return pts.map((p) => [p[0], p[1]]);
}

export interface Cumulative {
  points: TrackPoint[];
  /** Jarak kumulatif (m). Perpindahan antar bagian (saat jeda) tidak dihitung. */
  dist: number[];
  /** Waktu aktif kumulatif (detik). Waktu jeda tidak dihitung. */
  time: number[];
}

export function cumulative(track: readonly TrackPoint[][]): Cumulative {
  const points: TrackPoint[] = [];
  const dist: number[] = [];
  const time: number[] = [];
  let d = 0;
  let t = 0;
  for (const part of track) {
    for (let i = 0; i < part.length; i++) {
      if (i > 0) {
        d += haversine(part[i - 1], part[i]);
        t += Math.max(0, part[i][2] - part[i - 1][2]) / 1000;
      }
      points.push(part[i]);
      dist.push(d);
      time.push(t);
    }
  }
  return { points, dist, time };
}

export interface TrackSummary {
  startedAt: number;
  distanceM: number;
  /** Dari titik pertama sampai terakhir, termasuk jeda. */
  elapsedS: number;
  /** Hanya saat benar-benar bergerak (kecepatan > 0,5 m/s, di luar jeda). */
  movingS: number;
  elevGainM: number;
  maxSpeedMps: number;
}

const MOVING_MPS = 0.5;
const ELEV_HYSTERESIS_M = 4;
const MAX_SPEED_WINDOW_S = 5;

export function summarize(track: readonly TrackPoint[][]): TrackSummary {
  const parts = track.filter((p) => p.length > 0);
  if (parts.length === 0) {
    return { startedAt: 0, distanceM: 0, elapsedS: 0, movingS: 0, elevGainM: 0, maxSpeedMps: 0 };
  }
  const first = parts[0][0];
  const lastPart = parts[parts.length - 1];
  const last = lastPart[lastPart.length - 1];
  let distanceM = 0;
  let movingS = 0;
  let maxSpeedMps = 0;
  let elevGainM = 0;
  for (const part of parts) {
    let ref: number | null = null;
    const alts = smoothAltitude(part);
    let w = 0;
    for (let i = 0; i < part.length; i++) {
      const alt = alts[i];
      if (alt != null) {
        // Naik/turun baru diakui setelah melewati ambang, supaya derau GPS tidak menumpuk.
        if (ref == null) ref = alt;
        else if (alt - ref >= ELEV_HYSTERESIS_M) {
          elevGainM += alt - ref;
          ref = alt;
        } else if (ref - alt >= ELEV_HYSTERESIS_M) ref = alt;
      }
      if (i === 0) continue;
      const d = haversine(part[i - 1], part[i]);
      const dt = (part[i][2] - part[i - 1][2]) / 1000;
      distanceM += d;
      if (dt > 0 && d / dt > MOVING_MPS) movingS += dt;
      // Kecepatan maksimum dari jendela ≥5 detik agar lonjakan GPS tidak terbaca.
      while (w < i && (part[i][2] - part[w + 1][2]) / 1000 >= MAX_SPEED_WINDOW_S) w++;
      const span = (part[i][2] - part[w][2]) / 1000;
      if (span >= MAX_SPEED_WINDOW_S) {
        const v = pathDistance(part.slice(w, i + 1)) / span;
        if (v > maxSpeedMps) maxSpeedMps = v;
      }
    }
  }
  return {
    startedAt: first[2],
    distanceM,
    elapsedS: Math.max(0, (last[2] - first[2]) / 1000),
    movingS,
    elevGainM,
    maxSpeedMps,
  };
}

/** Rata-rata bergerak ±2 titik untuk ketinggian GPS (null tetap null). */
function smoothAltitude(part: readonly TrackPoint[]): (number | null)[] {
  return part.map((p, i) => {
    if (p[3] == null) return null;
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, i - 2); k <= Math.min(part.length - 1, i + 2); k++) {
      const a = part[k][3];
      if (a != null) {
        sum += a;
        n++;
      }
    }
    return sum / n;
  });
}

/** Waktu aktif saat jarak kumulatif mencapai `d` (interpolasi linear). */
function timeAtDistance(c: Cumulative, d: number, from = 0): { time: number; index: number } {
  const { dist, time } = c;
  let i = from;
  while (i < dist.length - 1 && dist[i + 1] < d) i++;
  if (i >= dist.length - 1) return { time: time[dist.length - 1], index: dist.length - 1 };
  const span = dist[i + 1] - dist[i];
  const f = span > 0 ? (d - dist[i]) / span : 0;
  return { time: time[i] + f * (time[i + 1] - time[i]), index: i };
}

export function splits(c: Cumulative, every = 1000): { index: number; distanceM: number; elapsedS: number }[] {
  const total = c.dist[c.dist.length - 1] ?? 0;
  const out: { index: number; distanceM: number; elapsedS: number }[] = [];
  let prevT = 0;
  let from = 0;
  for (let k = 1; (k - 1) * every < total; k++) {
    const target = Math.min(k * every, total);
    const at = timeAtDistance(c, target, from);
    from = at.index;
    const distanceM = target - (k - 1) * every;
    // Sisa km terakhir yang sangat pendek hanya mengacaukan pace.
    if (distanceM < 50 && k > 1) break;
    out.push({ index: k, distanceM, elapsedS: at.time - prevT });
    prevT = at.time;
  }
  return out;
}

/** Waktu tercepat untuk menempuh `distanceM` di mana saja dalam aktivitas. */
export function bestEffort(c: Cumulative, distanceM: number): { elapsedS: number; startIndex: number; endIndex: number } | null {
  const { dist, time } = c;
  const n = dist.length;
  if (n < 2 || dist[n - 1] < distanceM) return null;
  let best: { elapsedS: number; startIndex: number; endIndex: number } | null = null;
  let i = 0;
  for (let j = 1; j < n; j++) {
    const s = dist[j] - distanceM;
    if (s < 0) continue;
    while (i < j - 1 && dist[i + 1] <= s) i++;
    const span = dist[i + 1] - dist[i];
    const f = span > 0 ? (s - dist[i]) / span : 0;
    const startT = time[i] + f * (time[i + 1] - time[i]);
    const elapsedS = time[j] - startT;
    if (elapsedS > 0 && (!best || elapsedS < best.elapsedS)) best = { elapsedS, startIndex: i, endIndex: j };
  }
  return best;
}

// --- Proyeksi lokal (cukup akurat untuk jarak beberapa kilometer) ---

function project(origin: Pt, p: Pt): [number, number] {
  const x = (p[1] - origin[1]) * RAD * EARTH_R * Math.cos(origin[0] * RAD);
  const y = (p[0] - origin[0]) * RAD * EARTH_R;
  return [x, y];
}

/** Jarak titik `p` ke ruas a–b, plus posisi relatif t (0..1) di ruas itu. */
export function distanceToSegment(p: Pt, a: Pt, b: Pt): { dist: number; t: number } {
  const [bx, by] = project(a, b);
  const [px, py] = project(a, p);
  const len2 = bx * bx + by * by;
  const t = len2 > 0 ? Math.max(0, Math.min(1, (px * bx + py * by) / len2)) : 0;
  const dx = px - t * bx;
  const dy = py - t * by;
  return { dist: Math.sqrt(dx * dx + dy * dy), t };
}

/** Douglas-Peucker: buang titik yang menyimpang kurang dari `toleranceM`. */
export function simplify<T extends Pt>(pts: readonly T[], toleranceM: number): T[] {
  if (pts.length <= 2) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = -1;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const { dist } = distanceToSegment(pts[i], pts[s], pts[e]);
      if (dist > maxD) {
        maxD = dist;
        idx = i;
      }
    }
    if (idx > 0 && maxD > toleranceM) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Versi ringkas garis untuk thumbnail: maksimal `maxPoints` titik. */
export function preview(pts: readonly Pt[], maxPoints = 80): LatLon[] {
  const ll = toLatLon(pts);
  let tol = 3;
  let out = simplify(ll, tol);
  while (out.length > maxPoints && tol < 5000) {
    tol *= 2;
    out = simplify(ll, tol);
  }
  return out.map(([a, b]) => [round6(a), round6(b)]);
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export interface Bounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export function bounds(pts: readonly Pt[]): Bounds | null {
  if (pts.length === 0) return null;
  const b = { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity };
  for (const p of pts) {
    if (p[0] < b.minLat) b.minLat = p[0];
    if (p[0] > b.maxLat) b.maxLat = p[0];
    if (p[1] < b.minLon) b.minLon = p[1];
    if (p[1] > b.maxLon) b.maxLon = p[1];
  }
  return b;
}

export function boundsOverlap(a: Bounds, b: Bounds, marginM = 0): boolean {
  const mLat = marginM / 111_320;
  const mLon = marginM / (111_320 * Math.max(0.1, Math.cos(((a.minLat + a.maxLat) / 2) * RAD)));
  return a.minLat - mLat <= b.maxLat && a.maxLat + mLat >= b.minLat && a.minLon - mLon <= b.maxLon && a.maxLon + mLon >= b.minLon;
}

/** Titik di garis `pts` pada jarak `d` dari awal. */
export function pointAtDistance(pts: readonly Pt[], cum: readonly number[], d: number): LatLon {
  if (d <= 0) return [pts[0][0], pts[0][1]];
  for (let i = 1; i < pts.length; i++) {
    if (cum[i] >= d) {
      const span = cum[i] - cum[i - 1];
      const f = span > 0 ? (d - cum[i - 1]) / span : 0;
      return [pts[i - 1][0] + f * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + f * (pts[i][1] - pts[i - 1][1])];
    }
  }
  const last = pts[pts.length - 1];
  return [last[0], last[1]];
}

// --- Segmen ---

const SEG_ENDPOINT_RADIUS_M = 35;
const SEG_CHECKPOINT_RADIUS_M = 40;

export interface SegmentMatch {
  startIndex: number;
  endIndex: number;
  elapsedS: number;
  distanceM: number;
}

/**
 * Cari lintasan tercepat dalam aktivitas yang melewati segmen dari awal sampai
 * akhir, berurutan, lewat semua titik kontrol di sepanjang segmen.
 */
export function matchSegment(segment: readonly LatLon[], c: Cumulative): SegmentMatch | null {
  const P = c.points;
  if (segment.length < 2 || P.length < 2) return null;
  const segB = bounds(segment)!;
  const trackB = bounds(P)!;
  if (!boundsOverlap(segB, trackB, SEG_ENDPOINT_RADIUS_M)) return null;

  const segCum = cumulativeDistance(segment);
  const segLen = segCum[segCum.length - 1];
  const nCheck = Math.max(3, Math.min(30, Math.round(segLen / 100)));
  const checkpoints: LatLon[] = [];
  for (let k = 1; k <= nCheck; k++) checkpoints.push(pointAtDistance(segment, segCum, (segLen * k) / (nCheck + 1)));
  const S0 = segment[0];
  const S1 = segment[segment.length - 1];

  // Kandidat titik awal: titik terdekat dari tiap rombongan titik yang lewat di dekat awal segmen.
  const starts: number[] = [];
  let runBest = -1;
  let runBestD = Infinity;
  for (let i = 0; i <= P.length; i++) {
    const d = i < P.length ? haversine(P[i], S0) : Infinity;
    if (d <= SEG_ENDPOINT_RADIUS_M) {
      if (d < runBestD) {
        runBestD = d;
        runBest = i;
      }
    } else if (runBest >= 0) {
      starts.push(runBest);
      runBest = -1;
      runBestD = Infinity;
    }
  }

  const nearSegment = (j: number, q: LatLon) =>
    j + 1 < P.length ? distanceToSegment(q, P[j], P[j + 1]).dist : haversine(P[j], q);

  let best: SegmentMatch | null = null;
  for (const i0 of starts) {
    const maxDist = c.dist[i0] + segLen * 1.5 + 200;
    let j = i0;
    let ok = true;
    for (const cp of checkpoints) {
      while (j < P.length && nearSegment(j, cp) > SEG_CHECKPOINT_RADIUS_M) {
        if (c.dist[j] > maxDist) break;
        j++;
      }
      if (j >= P.length || c.dist[j] > maxDist) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    let end = -1;
    let endD = Infinity;
    for (; j < P.length && c.dist[j] <= maxDist; j++) {
      const d = haversine(P[j], S1);
      if (d <= SEG_ENDPOINT_RADIUS_M) {
        if (d < endD) {
          endD = d;
          end = j;
        }
      } else if (end >= 0) break;
    }
    if (end < 0) continue;
    const distanceM = c.dist[end] - c.dist[i0];
    if (distanceM < segLen * 0.8 - 30 || distanceM > segLen * 1.3 + 60) continue;
    const elapsedS = c.time[end] - c.time[i0];
    if (elapsedS <= 0) continue;
    if (!best || elapsedS < best.elapsedS) best = { startIndex: i0, endIndex: end, elapsedS, distanceM };
  }
  return best;
}

// --- Mengikuti rute ---

export interface RouteProgress {
  /** Indeks ruas rute tempat posisi diproyeksikan. */
  index: number;
  /** Jarak yang sudah ditempuh di sepanjang rute. */
  alongM: number;
  /** Jarak posisi sekarang ke garis rute. */
  offM: number;
}

/**
 * Proyeksikan posisi ke rute. `prevAlongM` adalah progres sebelumnya, supaya rute
 * putaran dan jalan yang dilewati pergi-pulang tidak meloncat ke arah sebaliknya.
 */
export function progressOnRoute(route: readonly LatLon[], cum: readonly number[], pos: Pt, prevAlongM = 0): RouteProgress {
  if (route.length < 2) return { index: 0, alongM: 0, offM: route.length ? haversine(pos, route[0]) : Infinity };
  // Di antara hasil yang jaraknya hampir sama (selisih ≤10 m), pilih yang paling dekat
  // dengan progres sebelumnya; mundur dihukum lebih berat karena pelari bergerak maju.
  const cost = (alongM: number) => (alongM >= prevAlongM ? alongM - prevAlongM : (prevAlongM - alongM) * 5);
  const search = (fromM: number, toM: number) => {
    let best: RouteProgress = { index: 0, alongM: 0, offM: Infinity };
    for (let i = 0; i < route.length - 1; i++) {
      if (cum[i + 1] < fromM || cum[i] > toM) continue;
      const { dist, t } = distanceToSegment(pos, route[i], route[i + 1]);
      const alongM = cum[i] + t * (cum[i + 1] - cum[i]);
      const better = dist < best.offM - 10 || (dist <= best.offM + 10 && cost(alongM) < cost(best.alongM));
      if (better) best = { index: i, alongM, offM: dist };
    }
    return best;
  };
  const prevAlong = prevAlongM;
  const local = search(prevAlong - 20, prevAlong + 300);
  if (local.offM <= 50) return local;
  const global = search(-Infinity, Infinity);
  return global.offM < local.offM ? global : local;
}

// --- Zona privasi ---

/** Panjang yang disembunyikan di awal dan di akhir garis: `maxM`, tetapi paling banyak seperempat panjangnya. */
export function privacyZoneM(totalM: number, maxM = 300): number {
  return Math.max(0, Math.min(maxM, totalM / 4));
}

/**
 * Indeks titik pertama dan terakhir yang masih terlihat bila `zoneM` pertama dan terakhir (menurut jarak
 * kumulatif `dist`) disembunyikan. `from > to` berarti tidak ada titik yang tersisa.
 */
export function visibleRange(dist: readonly number[], zoneM: number): { from: number; to: number } {
  const total = dist[dist.length - 1] ?? 0;
  let from = 0;
  while (from < dist.length && dist[from] < zoneM) from++;
  let to = dist.length - 1;
  while (to >= 0 && dist[to] > total - zoneM) to--;
  return { from, to };
}

/** Garis tanpa `zoneM` pertama dan terakhir. Ujung barunya diinterpolasi tepat di batas zona (penting untuk garis jarang). */
export function hideEnds(pts: readonly Pt[], zoneM: number): LatLon[] {
  if (pts.length < 2 || zoneM <= 0) return toLatLon(pts);
  const cum = cumulativeDistance(pts);
  const total = cum[cum.length - 1];
  if (total <= zoneM * 2) return [];
  const { from, to } = visibleRange(cum, zoneM);
  const edge = (d: number): LatLon => pointAtDistance(pts, cum, d).map(round6) as LatLon;
  return [edge(zoneM), ...toLatLon(pts.slice(from, to + 1)), edge(total - zoneM)];
}

/**
 * Track tanpa `zoneM` pertama dan terakhir (diukur seperti `cumulative`, tanpa perpindahan saat jeda).
 * Batas bagian tetap; `dropped` = jumlah titik yang dibuang di depan, untuk menggeser indeks pada track.
 */
export function hideTrackEnds(track: readonly TrackPoint[][], zoneM: number): { track: TrackPoint[][]; dropped: number } {
  const { from, to } = visibleRange(cumulative(track).dist, zoneM);
  const out: TrackPoint[][] = [];
  let i = 0;
  for (const part of track) {
    const kept: TrackPoint[] = [];
    for (const p of part) {
      if (i >= from && i <= to) kept.push(p);
      i++;
    }
    if (kept.length) out.push(kept);
  }
  return { track: out, dropped: from };
}
