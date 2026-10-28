import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as geo from '../../shared/geo.ts';
import { east, HOME, north, walkPath } from './helpers.ts';

const near = (actual: number, expected: number, tol: number) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${actual} tidak dekat ${expected} (±${tol})`);

test('haversine satu derajat bujur di khatulistiwa', () => {
  near(geo.haversine([0, 0], [0, 1]), 111_195, 5);
});

test('ringkasan: jarak, waktu bergerak, jeda tidak dihitung', () => {
  const a = walkPath([HOME, north(HOME, 1000)], 3);
  const lastT = a[a.length - 1][2];
  // Jeda 10 menit, lalu lanjut 1 km lagi ke timur.
  const b = walkPath([north(HOME, 1000), east(north(HOME, 1000), 1000)], 3, lastT + 600_000);
  const s = geo.summarize([a, b]);
  near(s.distanceM, 2000, 3);
  near(s.movingS, 667, 3);
  near(s.elapsedS, 667 + 600, 3);
  near(s.maxSpeedMps, 3, 0.1);
  const splits = geo.splits(geo.cumulative([a, b]));
  assert.equal(splits.length, 2);
  near(splits[0].elapsedS, 333, 2);
  near(splits[1].elapsedS, 333, 2);
});

test('rekor 1 km tercepat ada di tengah aktivitas', () => {
  const p1 = north(HOME, 1000);
  const p2 = north(p1, 1000);
  const p3 = north(p2, 1000);
  const track = [
    [
      ...walkPath([HOME, p1], 2),
      ...walkPath([p1, p2], 4, Date.UTC(2026, 9, 20, 23) + 500_000).slice(1),
      ...walkPath([p2, p3], 2, Date.UTC(2026, 9, 20, 23) + 750_000).slice(1),
    ],
  ];
  const best = geo.bestEffort(geo.cumulative(track), 1000)!;
  near(best.elapsedS, 250, 2);
  assert.equal(geo.bestEffort(geo.cumulative(track), 5000), null);
});

test('ketinggian naik dihitung, derau kecil diabaikan', () => {
  const pts = walkPath([HOME, north(HOME, 500)], 3, undefined, 1, null);
  pts.forEach((p, i) => (p[3] = 100 + i * 0.2 + (i % 2 ? 1 : -1)));
  const s = geo.summarize([pts]);
  near(s.elevGainM, 0.2 * (pts.length - 1), 6);
});

test('segmen cocok bila dilewati searah, tidak bila berlawanan atau melenceng', () => {
  const a = HOME;
  const b = north(a, 800);
  const c = east(b, 600);
  const d = north(c, 500);
  const segment = [north(a, 300), b, east(b, 400)];
  const forward = geo.cumulative([walkPath([a, b, c, d], 3)]);
  const m = geo.matchSegment(segment, forward)!;
  assert.ok(m, 'harus cocok');
  near(m.elapsedS, 900 / 3, 4);
  near(m.distanceM, 900, 5);

  const backward = geo.cumulative([walkPath([d, c, b, a], 3)]);
  assert.equal(geo.matchSegment(segment, backward), null);

  // Jalur paralel 120 m di sebelah timur.
  const parallel = geo.cumulative([walkPath([east(a, 120), east(b, 120), c], 3)]);
  assert.equal(geo.matchSegment(segment, parallel), null);
});

test('segmen dilewati dua kali: ambil yang tercepat', () => {
  const a = HOME;
  const b = north(a, 600);
  const segment = [north(a, 100), north(a, 500)];
  const lap1 = walkPath([a, b], 2);
  const back = walkPath([b, east(b, 200), east(a, 200), a], 4, lap1[lap1.length - 1][2]).slice(1);
  const lap2 = walkPath([a, b], 4, back[back.length - 1][2]).slice(1);
  const m = geo.matchSegment(segment, geo.cumulative([[...lap1, ...back, ...lap2]]))!;
  near(m.elapsedS, 100, 3);
});

test('progres di rute dan jarak melenceng', () => {
  const route = [HOME, north(HOME, 1000), east(north(HOME, 1000), 1000)];
  const cum = geo.cumulativeDistance(route);
  const onRoute = geo.progressOnRoute(route, cum, north(HOME, 400));
  near(onRoute.alongM, 400, 2);
  near(onRoute.offM, 0, 1);
  const off = geo.progressOnRoute(
    route,
    cum,
    east(north(HOME, 1000), 300).map((v, i) => (i === 0 ? v - 80 / 111_195 : v)) as geo.LatLon,
    onRoute.alongM,
  );
  near(off.alongM, 1300, 3);
  near(off.offM, 80, 2);
});

test('rute putaran: awal tidak terbaca sebagai akhir, progres maju terus', () => {
  const b = north(HOME, 500);
  const c = east(b, 500);
  const d = east(HOME, 500);
  const loop = [HOME, b, c, d, HOME];
  const cum = geo.cumulativeDistance(loop);
  const start = geo.progressOnRoute(loop, cum, north(HOME, 5), 0);
  near(start.alongM, 5, 2);
  let last = 0;
  for (const p of walkPath(loop, 3).filter((_, i) => i % 10 === 0)) {
    const r = geo.progressOnRoute(loop, cum, p, last);
    assert.ok(r.alongM >= last - 1, `mundur dari ${last} ke ${r.alongM}`);
    last = r.alongM;
  }
  near(last, 2000, 35);
  assert.ok(start.alongM < 10);
});

test('jalan buntu pergi-pulang: arah pulang tidak terbaca sebagai arah pergi', () => {
  const tip = north(HOME, 600);
  const route = [HOME, tip, HOME, east(HOME, 400)];
  const cum = geo.cumulativeDistance(route);
  let last = 0;
  for (const p of walkPath(route, 3)) {
    const r = geo.progressOnRoute(route, cum, p, last);
    assert.ok(r.alongM >= last - 2, `mundur dari ${Math.round(last)} ke ${Math.round(r.alongM)}`);
    last = r.alongM;
  }
  near(last, 1600, 5);
});

test('preview membatasi jumlah titik', () => {
  const pts = walkPath([HOME, north(HOME, 3000), east(north(HOME, 3000), 3000)], 3);
  const p = geo.preview(pts, 50);
  assert.ok(p.length <= 50 && p.length >= 3);
});

test('zona privasi: 300 m, paling banyak seperempat panjang', () => {
  assert.equal(geo.privacyZoneM(5000), 300);
  assert.equal(geo.privacyZoneM(800), 200);
  assert.equal(geo.privacyZoneM(0), 0);
});

test('zona privasi: ujung garis jarang diinterpolasi tepat di batas', () => {
  const line = [HOME, north(HOME, 1000)];
  const out = geo.hideEnds(line, 300);
  assert.equal(out.length, 2);
  near(geo.haversine(HOME, out[0]), 300, 0.5);
  near(geo.haversine(HOME, out[1]), 700, 0.5);
  assert.deepEqual(geo.hideEnds(line, 600), []);
  assert.deepEqual(geo.hideEnds(line, 0), line);
});

test('zona privasi: track dipotong per bagian, batas jeda tetap', () => {
  const a = walkPath([HOME, north(HOME, 600)], 3);
  const b = walkPath([north(HOME, 600), east(north(HOME, 600), 600)], 3, a[a.length - 1][2] + 60_000);
  const { track, dropped } = geo.hideTrackEnds([a, b], 300);
  assert.equal(track.length, 2);
  assert.ok(dropped > 0);
  assert.ok(geo.haversine(HOME, track[0][0]) >= 300);
  assert.ok(geo.haversine(b[b.length - 1], track[1][track[1].length - 1]) >= 299);
  // Titik pertama yang terlihat adalah titik ke-`dropped` dari track penuh.
  assert.deepEqual(track[0][0], a[dropped]);
});
