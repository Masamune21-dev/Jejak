import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Activity, ActivitySummary, AuthResult, PlannedRoute, Profile, Segment, Stats } from '../../shared/api.ts';
import { createApp } from '../src/app.ts';
import { openDb } from '../src/db.ts';
import { east, HOME, north, walkPath } from './helpers.ts';

function setup() {
  const app = createApp(openDb(':memory:'), {
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
  return { call, register };
}

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
