import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseFit, parseGpx } from '../src/lib/import-track.ts';

const GPX = `<?xml version="1.0"?>
<gpx version="1.1" creator="uji">
  <trk><name>Lari pagi</name><type>running</type>
    <trkseg>
      <trkpt lat="-7.8100" lon="110.9200"><ele>12.4</ele><time>2026-11-01T00:00:00Z</time></trkpt>
      <trkpt lat="-7.8101" lon="110.9201"><ele>12.6</ele><time>2026-11-01T00:00:01Z</time></trkpt>
      <trkpt lat="-7.8102" lon="110.9202"><ele>12.8</ele><time>2026-11-01T00:00:02Z</time></trkpt>
    </trkseg>
    <trkseg>
      <trkpt lat="-7.8103" lon="110.9203"><time>2026-11-01T00:10:00Z</time></trkpt>
      <trkpt lat="-7.8104" lon="110.9204"><time>2026-11-01T00:10:01Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>`;

test('impor GPX: nama, jenis, dua bagian, dan ketinggian', () => {
  const r = parseGpx(GPX);
  assert.equal(r.name, 'Lari pagi');
  assert.equal(r.type, 'run');
  assert.equal(r.track.length, 2);
  assert.equal(r.track[0].length, 3);
  assert.equal(r.track[1].length, 2);
  assert.ok(Math.abs(r.track[0][0][3]! - 12.4) < 0.01);
  assert.equal(r.track[0][0][2], Date.parse('2026-11-01T00:00:00Z'));
});

test('impor GPX: berkas tanpa waktu ditolak', () => {
  assert.throws(() => parseGpx('<gpx><trkpt lat="1" lon="2"/></gpx>'), /tidak berisi titik GPS/);
});

/** Berkas FIT minimal: satu definisi pesan record + beberapa data. */
function fitFile(points: { t: number; lat: number; lon: number }[]): Uint8Array {
  const SEMI = 180 / 2 ** 31;
  const def = [0x40, 0x00, 0x00, 20, 0x00, 3, 253, 4, 0x86, 0, 4, 0x85, 1, 4, 0x85];
  const data: number[] = [...def];
  for (const p of points) {
    const rec = new DataView(new ArrayBuffer(12));
    rec.setUint32(0, p.t, true);
    rec.setInt32(4, Math.round(p.lat / SEMI), true);
    rec.setInt32(8, Math.round(p.lon / SEMI), true);
    data.push(0x00, ...new Uint8Array(rec.buffer));
  }
  const header = new Uint8Array(12);
  header[0] = 12;
  header[1] = 0x10;
  new DataView(header.buffer).setUint32(4, data.length, true);
  header.set([0x2e, 0x46, 0x49, 0x54], 8); // ".FIT"
  return new Uint8Array([...header, ...data]);
}

test('impor FIT: membaca pesan record menjadi titik GPS', () => {
  const base = Math.floor(Date.UTC(2026, 10, 1) / 1000) - 631_065_600;
  const r = parseFit(
    fitFile([
      { t: base, lat: -7.81, lon: 110.92 },
      { t: base + 1, lat: -7.8101, lon: 110.9201 },
      { t: base + 2, lat: -7.8102, lon: 110.9202 },
    ]),
  );
  assert.equal(r.track.length, 1);
  assert.equal(r.track[0].length, 3);
  assert.ok(Math.abs(r.track[0][0][0] - -7.81) < 1e-5);
  assert.ok(Math.abs(r.track[0][0][1] - 110.92) < 1e-5);
  assert.equal(r.track[0][0][2], Date.UTC(2026, 10, 1));
});

test('impor FIT: berkas bukan FIT ditolak', () => {
  assert.throws(() => parseFit(new Uint8Array(20)), /bukan file FIT/);
});
