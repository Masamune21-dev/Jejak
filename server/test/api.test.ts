import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';

import type { Activity, ActivitySummary, AuthResult, PlannedRoute, Profile, Segment, Stats } from '../../shared/api.ts';
import { haversine, type LatLon, type TrackPoint } from '../../shared/geo.ts';
import { createApp } from '../src/app.ts';
import { hashToken } from '../src/auth.ts';
import { openDb } from '../src/db.ts';
import { east, HOME, north, walkPath } from './helpers.ts';

function setup(db = openDb(':memory:')) {
  const app = createApp(db, {
    planRoute: async (_type, waypoints) => ({ geometry: waypoints, distanceM: 0, steps: [], snapped: false }),
  });
  const call = async <T>(method: string, path: string, token?: string, body?: unknown) => {
    const res = await app.request(path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json()) as T & { error?: string } };
  };
  const register = async (username: string) =>
    (
      await call<AuthResult>('POST', '/auth/register', undefined, {
        username,
        name: username.toUpperCase(),
        password: 'rahasia1',
      })
    ).body;
  return { call, register, db };
}

test('akun: ganti nama dan kata sandi, sesi lain dikeluarkan', async () => {
  const { call, register } = setup();
  const ika = await register('ika');
  const hp2 = (await call<AuthResult>('POST', '/auth/login', undefined, { username: 'ika', password: 'rahasia1' })).body;

  assert.equal((await call('PATCH', '/me', ika.token, { name: '  ' })).status, 400);
  const renamed = await call<Profile>('PATCH', '/me', ika.token, { name: '  Ika Lari ' });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.name, 'Ika Lari');
  assert.equal(renamed.body.username, 'ika');

  const change = (currentPassword: string, newPassword: string) =>
    call('PUT', '/me/password', ika.token, { currentPassword, newPassword });
  // Salah kata sandi lama: 400 (bukan 401, yang membuat app mengeluarkan pengguna).
  const wrong = await change('salah', 'lari-sore-88');
  assert.deepEqual([wrong.status, wrong.body.error], [400, 'Kata sandi sekarang salah']);
  assert.equal((await change('rahasia1', '12345')).status, 400);
  assert.equal((await change('rahasia1', 'password123')).status, 400);
  assert.equal((await change('rahasia1', 'rahasia1')).status, 400);
  assert.equal((await change('rahasia1', 'lari-sore-88')).status, 200);

  // Sesi yang mengganti tetap masuk; sesi lain keluar; kata sandi lama tidak berlaku lagi.
  assert.equal((await call('GET', '/me', ika.token)).status, 200);
  assert.equal((await call('GET', '/me', hp2.token)).status, 401);
  assert.equal((await call('POST', '/auth/login', undefined, { username: 'ika', password: 'rahasia1' })).status, 401);
  assert.equal((await call('POST', '/auth/login', undefined, { username: 'ika', password: 'lari-sore-88' })).status, 200);
});

const A = HOME;
const B = north(A, 1200);
const C = east(B, 800);

test('akun: daftar, masuk, salah sandi, tanpa token', async () => {
  const { call, register } = setup();
  const ika = await register('ika');
  assert.ok(ika.token);
  assert.equal(
    (await call('POST', '/auth/register', undefined, { username: 'IKA', name: 'x', password: 'rahasia1' })).status,
    409,
  );
  assert.equal((await call('POST', '/auth/login', undefined, { username: 'ika', password: 'salah' })).status, 401);
  const ok = await call<AuthResult>('POST', '/auth/login', undefined, { username: 'Ika', password: 'rahasia1' });
  assert.equal(ok.status, 200);
  assert.equal((await call('GET', '/feed')).status, 401);
  // Kata sandi dengan spasi di tepi dipakai apa adanya saat daftar maupun masuk.
  await call('POST', '/auth/register', undefined, { username: 'spasi', name: 'Spasi', password: ' rahasia1 ' });
  assert.equal((await call('POST', '/auth/login', undefined, { username: 'spasi', password: ' rahasia1 ' })).status, 200);
  assert.equal(
    (await call('POST', '/auth/register', undefined, { username: 'pendek', name: 'P', password: '12345' })).status,
    400,
  );
  const me = await call<Profile>('GET', '/me', ok.body.token);
  assert.equal(me.body.username, 'ika');
});

test('aktivitas, feed teman, kudos, komentar, statistik', async () => {
  const { call, register } = setup();
  const dicky = await register('dicky');
  const fajar = await register('fajar');

  const created = await call<Activity>('POST', '/activities', dicky.token, {
    type: 'run',
    title: 'Lari pagi',
    track: [walkPath([A, B, C], 3)],
  });
  assert.equal(created.status, 201, created.body.error);
  assert.ok(Math.abs(created.body.distanceM - 2000) < 5);
  assert.equal(created.body.splits.length, 2);
  assert.deepEqual(
    created.body.bestEfforts.map((b) => b.name),
    ['400 m', '1 km'],
  );

  // Fajar belum mengikuti Dicky: feed kosong.
  assert.equal((await call<ActivitySummary[]>('GET', '/feed', fajar.token)).body.length, 0);
  await call('POST', `/users/${dicky.user.id}/follow`, fajar.token);
  const feed = (await call<ActivitySummary[]>('GET', '/feed', fajar.token)).body;
  assert.equal(feed.length, 1);
  assert.equal(feed[0].user.username, 'dicky');

  assert.equal((await call('POST', `/activities/${created.body.id}/kudos`, dicky.token)).status, 400);
  const k = await call<{ kudos: number; hasKudo: boolean }>('POST', `/activities/${created.body.id}/kudos`, fajar.token);
  assert.deepEqual(k.body, { kudos: 1, hasKudo: true });
  await call('POST', `/activities/${created.body.id}/comments`, fajar.token, { body: 'Mantap!' });
  const detail = (await call<Activity>('GET', `/activities/${created.body.id}`, dicky.token)).body;
  assert.equal(detail.kudos, 1);
  assert.equal(detail.comments, 1);
  assert.equal(detail.kudosBy[0].username, 'fajar');

  // Aktivitas kedua lebih cepat: rekor 1 km jadi PR.
  const faster = await call<Activity>('POST', '/activities', dicky.token, {
    type: 'run',
    title: 'Lari sore',
    track: [walkPath([A, B, C], 4, Date.UTC(2026, 9, 21, 10))],
  });
  assert.ok(faster.body.bestEfforts.find((b) => b.name === '1 km')?.isPr);
  assert.ok(faster.body.prCount >= 1);

  const stats = (await call<Stats>('GET', `/users/${dicky.user.id}/stats?type=run&tz=420`, fajar.token)).body;
  assert.equal(stats.allTime.count, 2);
  assert.equal(stats.records.find((r) => r.name === '1 km')?.activityId, faster.body.id);
  assert.equal(stats.longest?.distanceM !== undefined, true);

  await call('POST', '/activities', dicky.token, {
    type: 'ride',
    title: 'Gowes',
    track: [walkPath([A, B], 7, Date.UTC(2026, 9, 21, 12))],
  });
  const all = (await call<Stats>('GET', `/users/${dicky.user.id}/stats?type=all&tz=420`, dicky.token)).body;
  assert.equal(all.allTime.count, 3);
  assert.equal(all.records.length, 0);

  const profile = (await call<Profile>('GET', `/users/${dicky.user.id}`, fajar.token)).body;
  assert.equal(profile.followers, 1);
  assert.equal(profile.isFollowing, true);
});

test('rute: rencana, simpan, lihat, hapus', async () => {
  const { call, register } = setup();
  const u = await register('masamune');
  const plan = await call<{ geometry: unknown[] }>('POST', '/routing', u.token, { type: 'run', waypoints: [A, B, C] });
  assert.equal(plan.body.geometry.length, 3);
  const saved = await call<PlannedRoute>('POST', '/routes', u.token, {
    name: 'Keliling alun-alun',
    type: 'run',
    waypoints: [A, B, C],
    geometry: [A, B, C],
    steps: [{ atM: 1200, text: 'Belok kanan', at: B }],
  });
  assert.equal(saved.status, 201, saved.body.error);
  assert.ok(Math.abs(saved.body.distanceM - 2000) < 5);
  assert.equal((await call<PlannedRoute[]>('GET', '/routes', u.token)).body.length, 1);
  assert.equal((await call('DELETE', `/routes/${saved.body.id}`, u.token)).status, 200);
});

test('segmen: dibuat dari aktivitas, aktivitas lama ikut dicocokkan, leaderboard urut', async () => {
  const { call, register } = setup();
  const dicky = await register('dicky');
  const fajar = await register('fajar');
  const slow = await call<Activity>('POST', '/activities', dicky.token, {
    type: 'run',
    title: 'a',
    track: [walkPath([A, B, C], 2.5)],
  });
  const fast = await call<Activity>('POST', '/activities', fajar.token, {
    type: 'run',
    title: 'b',
    track: [walkPath([A, B, C], 4, Date.UTC(2026, 9, 22, 6))],
  });
  // Bersepeda tidak ikut segmen lari.
  await call('POST', '/activities', fajar.token, {
    type: 'ride',
    title: 'c',
    track: [walkPath([A, B, C], 8, Date.UTC(2026, 9, 23, 6))],
  });

  const n = slow.body.track[0].length;
  const seg = await call<Segment>('POST', '/segments', dicky.token, {
    activityId: slow.body.id,
    startIndex: Math.floor(n * 0.2),
    endIndex: Math.floor(n * 0.8),
    name: 'Tanjakan tugu',
  });
  assert.equal(seg.status, 201, seg.body.error);
  assert.equal(seg.body.leaderboard.length, 2);
  assert.equal(seg.body.leaderboard[0].user.username, 'fajar');
  assert.equal(seg.body.myBest?.rank, 2);

  // Aktivitas baru yang melewati segmen langsung punya effort.
  const again = await call<Activity>('POST', '/activities', dicky.token, {
    type: 'run',
    title: 'ngebut',
    track: [walkPath([A, B, C], 5, Date.UTC(2026, 9, 24, 6))],
  });
  assert.equal(again.body.efforts.length, 1);
  assert.equal(again.body.efforts[0].rank, 1);
  assert.equal(again.body.efforts[0].isPr, true);

  const board = (await call<Segment>('GET', `/segments/${seg.body.id}`, fajar.token)).body;
  assert.equal(board.leaderboard[0].user.username, 'dicky');
  const followingOnly = (await call<Segment>('GET', `/segments/${seg.body.id}?filter=following`, fajar.token)).body;
  assert.deepEqual(
    followingOnly.leaderboard.map((r) => r.user.username),
    ['fajar'],
  );
  const near = (await call<{ id: number }[]>('GET', `/segments?near=${A[0]},${A[1]}`, fajar.token)).body;
  assert.equal(near[0].id, seg.body.id);
  assert.equal(fast.status, 201);
});

test('validasi: track pendek dan segmen terlalu pendek ditolak', async () => {
  const { call, register } = setup();
  const u = await register('ika');
  const bad = await call('POST', '/activities', u.token, { type: 'run', title: 'x', track: [[[A[0], A[1], 0, null]]] });
  assert.equal(bad.status, 400);
  const act = await call<Activity>('POST', '/activities', u.token, {
    type: 'walk',
    title: 'jalan',
    track: [walkPath([A, B], 1.4)],
  });
  const seg = await call('POST', '/segments', u.token, { activityId: act.body.id, startIndex: 0, endIndex: 10, name: 'pendek' });
  assert.equal(seg.status, 400);
});

test('privasi: orang lain tidak melihat 300 m awal & akhir jejak, pemilik melihat penuh', async () => {
  const { call, register } = setup();
  const dicky = await register('dicky');
  const fajar = await register('fajar');
  const own = await call<Activity>('POST', '/activities', dicky.token, {
    type: 'run',
    title: 'Dari rumah',
    track: [walkPath([A, B, C], 3)],
  });
  assert.equal(own.status, 201, own.body.error);
  const full = own.body.track.flat();
  assert.deepEqual(full[0].slice(0, 2), A);

  const seen = (await call<Activity>('GET', `/activities/${own.body.id}`, fajar.token)).body;
  const visible = seen.track.flat();
  const farFromEnds = (p: LatLon | TrackPoint) => haversine(p, A) >= 299 && haversine(p, C) >= 299;
  assert.ok(visible.length > 0 && visible.length < full.length);
  assert.ok(visible.every(farFromEnds));
  assert.equal(seen.distanceM, own.body.distanceM);

  await call('POST', `/users/${dicky.user.id}/follow`, fajar.token);
  const [card] = (await call<ActivitySummary[]>('GET', '/feed', fajar.token)).body;
  assert.ok(card.preview.length >= 2 && card.preview.every(farFromEnds));
  const mine = (await call<ActivitySummary[]>('GET', '/feed', dicky.token)).body[0];
  assert.deepEqual(mine.preview[0], A);

  // Indeks effort di jejak yang terpotong menunjuk ke titik yang sama dengan jejak penuh.
  const n = full.length;
  await call('POST', '/segments', dicky.token, {
    activityId: own.body.id,
    startIndex: Math.floor(n * 0.3),
    endIndex: Math.floor(n * 0.6),
    name: 'Tengah',
  });
  const ownEffort = (await call<Activity>('GET', `/activities/${own.body.id}`, dicky.token)).body.efforts[0];
  const seenEffort = (await call<Activity>('GET', `/activities/${own.body.id}`, fajar.token)).body.efforts[0];
  assert.deepEqual(visible[seenEffort.startIndex], full[ownEffort.startIndex]);
  assert.deepEqual(visible[seenEffort.endIndex], full[ownEffort.endIndex]);

  // Rute rencana hanya untuk pembuatnya.
  const route = await call<PlannedRoute>('POST', '/routes', dicky.token, {
    name: 'Rumah',
    type: 'run',
    waypoints: [A, B],
    geometry: [A, B],
  });
  assert.equal((await call('GET', `/routes/${route.body.id}`, dicky.token)).status, 200);
  assert.equal((await call('GET', `/routes/${route.body.id}`, fajar.token)).status, 404);
  const linked = await call<Activity>('POST', '/activities', fajar.token, {
    type: 'run',
    title: 'Pakai rute orang',
    track: [walkPath([A, B], 3, Date.UTC(2026, 9, 22, 6))],
    routeId: route.body.id,
  });
  assert.equal(linked.body.routeId, null);
});

test('sesi: token disimpan sebagai hash, kedaluwarsa setelah 90 hari tidak dipakai', async () => {
  const { call, register, db } = setup();
  const ika = await register('ika');
  const rows = db.prepare('select token_hash, last_used_at from sessions').all() as {
    token_hash: string;
    last_used_at: string;
  }[];
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].token_hash, ika.token);
  assert.equal(rows[0].token_hash, hashToken(ika.token));

  const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
  db.prepare('update sessions set last_used_at = ?').run(daysAgo(2));
  assert.equal((await call('GET', '/me', ika.token)).status, 200);
  const touched = db.prepare('select last_used_at from sessions').get() as { last_used_at: string };
  assert.ok(Date.now() - Date.parse(touched.last_used_at) < 60_000);

  db.prepare('update sessions set last_used_at = ?').run(daysAgo(91));
  assert.equal((await call('GET', '/me', ika.token)).status, 401);
  assert.equal((db.prepare('select count(*) as n from sessions').get() as { n: number }).n, 0);

  const again = (await call<AuthResult>('POST', '/auth/login', undefined, { username: 'ika', password: 'rahasia1' })).body;
  await call('POST', '/logout', again.token);
  assert.equal((await call('GET', '/me', again.token)).status, 401);
});

test('migrasi: database lama dengan token mentah tetap bisa dipakai', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'jejak-'));
  try {
    const path = join(dir, 'lama.db');
    const old = new DatabaseSync(path);
    old.exec(`
      create table users (id integer primary key, username text not null unique collate nocase, name text not null,
        password_hash text not null, created_at text not null default 'x');
      create table sessions (token text primary key, user_id integer not null references users(id) on delete cascade,
        created_at text not null default 'x');
      insert into users (id, username, name, password_hash) values (1, 'lama', 'Lama', 'scrypt$00$00');
      insert into sessions (token, user_id) values ('token-lama', 1);
    `);
    old.close();

    const { call, db } = setup(openDb(path));
    const me = await call<Profile>('GET', '/me', 'token-lama');
    assert.equal(me.status, 200);
    assert.equal(me.body.username, 'lama');
    const cols = (db.prepare('pragma table_info(sessions)').all() as { name: string }[]).map((c) => c.name);
    assert.deepEqual(cols, ['token_hash', 'user_id', 'created_at', 'last_used_at']);
    assert.equal(
      (db.prepare('select token_hash from sessions').get() as { token_hash: string }).token_hash,
      hashToken('token-lama'),
    );
    db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validasi: kecepatan dan tanggal mustahil ditolak', async () => {
  const { call, register } = setup();
  const u = await register('ika');
  const post = (type: string, track: TrackPoint[]) =>
    call<Activity>('POST', '/activities', u.token, { type, title: 'x', track: [track] });

  const car = await post('run', walkPath([A, north(A, 10_000)], 160));
  assert.equal(car.status, 400);
  assert.match(car.body.error ?? '', /Kecepatan tidak masuk akal untuk lari \(1 km dalam 0:06\)/);
  assert.equal((await post('ride', walkPath([A, B], 30))).status, 400);
  // Lebih pendek dari 1 km: dinilai dari rata-ratanya.
  const short = await post('walk', walkPath([A, north(A, 500)], 20));
  assert.equal(short.status, 400);
  assert.match(short.body.error ?? '', /rata-rata 72 km\/j/);
  assert.equal((await post('run', walkPath([A, B], 3, Date.now() + 2 * 86_400_000))).status, 400);
  assert.equal((await post('run', walkPath([A, B], 3, Date.UTC(2019, 0, 1)))).status, 400);
  assert.equal(
    (
      await post('run', [
        [A[0], A[1], Date.UTC(2026, 9, 1), null],
        [B[0], B[1], Date.UTC(2026, 9, 1), null],
      ])
    ).status,
    400,
  );

  // Cepat tapi masih manusiawi: diterima.
  assert.equal((await post('run', walkPath([A, B], 6))).status, 201);
  assert.equal((await post('ride', walkPath([A, B, C], 15, Date.UTC(2026, 9, 21, 6)))).status, 201);
});

test('validasi: kata sandi mudah ditebak ditolak saat daftar, tz ekstrem tidak membuat error', async () => {
  const { call, register } = setup();
  const daftar = (username: string, password: string) =>
    call('POST', '/auth/register', undefined, { username, name: 'X', password });
  for (const [u, pw] of [
    ['satu', '123456'],
    ['dua', 'Password'],
    ['tiga', 'aaaaaaa'],
    ['empat', '987654'],
    ['dicky_lari', 'dicky_lari99'],
    ['budi', 'budi1990'],
  ]) {
    const r = await daftar(u, pw);
    assert.equal(r.status, 400, `${u}/${pw}`);
    assert.match(r.body.error ?? '', /terlalu mudah ditebak/);
  }
  // Username pendek yang kebetulan muncul di kata sandi biasa tetap boleh.
  assert.equal((await daftar('ika', 'fisika123')).status, 201);

  const u = await register('waktu');
  for (const tz of ['1e20', '-99999', 'abc']) {
    assert.equal((await call('GET', `/users/${u.user.id}/stats?tz=${tz}`, u.token)).status, 200, tz);
  }
});
