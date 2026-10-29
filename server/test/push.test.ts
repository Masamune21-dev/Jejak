import assert from 'node:assert/strict';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';

import type { AuthResult } from '../../shared/api.ts';
import { createApp } from '../src/app.ts';
import { openDb } from '../src/db.ts';
import { createPusher, fcmMessage, notify, recipients, type Pusher, type PushResult } from '../src/push.ts';

function setup() {
  const db = openDb(':memory:');
  const app = createApp(db, { planRoute: async (_t, waypoints) => ({ geometry: waypoints, distanceM: 0, steps: [], snapped: false }) });
  const call = async (method: string, path: string, token?: string, body?: unknown) => {
    const res = await app.request(path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  };
  const register = async (username: string) =>
    (await call('POST', '/auth/register', undefined, { username, name: username, password: 'lari-pagi-77' })).body as unknown as AuthResult;
  // Baris node:sqlite tidak punya prototipe; disalin supaya bisa dibandingkan dengan deepEqual.
  const rows = (sql: string) => db.prepare(sql).all().map((r) => ({ ...r }));
  const devices = () => rows('select token, user_id, app_version from push_devices order by token');
  return { db, call, register, devices, rows };
}

const TOKEN_A = 'fcm-token-a-0123456789';
const TOKEN_B = 'fcm-token-b-0123456789';

test('perangkat push: terikat sesi, pindah akun, hilang saat keluar', async () => {
  const { call, register, devices } = setup();
  const budi = await register('budi');
  const sari = await register('sari');

  assert.equal((await call('PUT', '/me/device', undefined, { token: TOKEN_A })).status, 401);
  assert.equal((await call('PUT', '/me/device', budi.token, { token: 'pendek' })).status, 400);

  assert.equal((await call('PUT', '/me/device', budi.token, { token: TOKEN_A, appVersion: '0.3.0' })).status, 200);
  assert.deepEqual(devices(), [{ token: TOKEN_A, user_id: budi.user.id, app_version: '0.3.0' }]);

  // Token FCM berganti di HP yang sama: baris lama sesi ini diganti, bukan ditambah.
  await call('PUT', '/me/device', budi.token, { token: TOKEN_B, appVersion: '0.3.0' });
  assert.deepEqual(devices().map((d) => d.token), [TOKEN_B]);

  // HP yang sama dipakai masuk akun lain: tokennya pindah, budi tidak lagi menerima di HP itu.
  await call('PUT', '/me/device', sari.token, { token: TOKEN_B });
  assert.deepEqual(devices(), [{ token: TOKEN_B, user_id: sari.user.id, app_version: null }]);

  await call('PUT', '/me/device', budi.token, { token: TOKEN_A });
  assert.equal((await call('DELETE', '/me/device', budi.token)).status, 200);
  assert.deepEqual(devices().map((d) => d.token), [TOKEN_B]);

  // Keluar menghapus sesi, dan perangkatnya ikut terhapus.
  await call('POST', '/logout', sari.token);
  assert.deepEqual(devices(), []);
});

test('notifikasi: penerima, token mati dibuang, dicatat', async () => {
  const { db, call, register, devices, rows } = setup();
  const budi = await register('budi');
  const sari = await register('sari');
  await call('PUT', '/me/device', budi.token, { token: TOKEN_A, appVersion: '0.3.0' });
  await call('PUT', '/me/device', sari.token, { token: TOKEN_B, appVersion: '0.3.1' });

  assert.equal(recipients(db, { to: [] }).tokens.length, 2);
  assert.deepEqual(recipients(db, { to: [], skipVersion: '0.3.1' }).tokens, [TOKEN_A]);
  assert.deepEqual(recipients(db, { to: ['SARI', 'hantu'] }), { tokens: [TOKEN_B], users: 1, missing: ['hantu'] });

  const sent: string[] = [];
  const pusher: Pusher = {
    projectId: 'uji',
    send: async (token): Promise<PushResult> => {
      sent.push(token);
      return token === TOKEN_B ? 'invalid' : 'ok';
    },
  };
  const r = await notify(db, pusher, { title: 'Halo', body: 'Coba', channel: 'info', to: [] });
  assert.deepEqual(sent.sort(), [TOKEN_A, TOKEN_B]);
  assert.deepEqual(r, { devices: 2, users: 2, sent: 1, removed: 1, failed: 0, missing: [] });
  assert.deepEqual(devices().map((d) => d.token), [TOKEN_A]);
  assert.deepEqual(rows('select kind, title, target, sent, failed from announcements'), [
    { kind: 'info', title: 'Halo', target: 'semua', sent: 1, failed: 1 },
  ]);
});

test('FCM: pesan untuk expo-notifications, JWT sah, access token disimpan, token mati dikenali', async () => {
  assert.deepEqual(fcmMessage('t', { title: 'Jejak 0.3.1 tersedia', body: 'Ketuk', url: '/', channel: 'pembaruan', tag: 'pembaruan' }), {
    message: {
      token: 't',
      data: { title: 'Jejak 0.3.1 tersedia', message: 'Ketuk', channelId: 'pembaruan', body: '{"url":"/"}', tag: 'pembaruan' },
      android: { priority: 'HIGH' },
    },
  });

  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const sa = {
    project_id: 'jejak-uji',
    client_email: 'jejak-fcm@jejak-uji.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
  let tokenCalls = 0;
  const sends: { url: string; auth: string; body: any }[] = [];
  const fakeFetch = (async (url: string, init: RequestInit) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      tokenCalls++;
      const jwt = new URLSearchParams(init.body as URLSearchParams).get('assertion')!;
      const [h, p, s] = jwt.split('.');
      assert.ok(createVerify('RSA-SHA256').update(`${h}.${p}`).verify(publicKey, Buffer.from(s, 'base64url')));
      const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
      assert.equal(claims.iss, sa.client_email);
      assert.equal(claims.scope, 'https://www.googleapis.com/auth/firebase.messaging');
      return Response.json({ access_token: `akses-${tokenCalls}`, expires_in: 3600 });
    }
    const body = JSON.parse(init.body as string);
    sends.push({ url, auth: (init.headers as Record<string, string>).Authorization, body });
    if (body.message.token === 'mati') {
      return Response.json(
        { error: { status: 'NOT_FOUND', message: 'Requested entity was not found.', details: [{ errorCode: 'UNREGISTERED' }] } },
        { status: 404 },
      );
    }
    if (body.message.token === 'basi' && tokenCalls === 1) return Response.json({ error: { status: 'UNAUTHENTICATED' } }, { status: 401 });
    if (body.message.token === 'sibuk') return Response.json({ error: { status: 'UNAVAILABLE', message: 'coba lagi' } }, { status: 503 });
    return Response.json({ name: 'projects/jejak-uji/messages/1' });
  }) as typeof fetch;

  const pusher = createPusher(sa, fakeFetch);
  const msg = { title: 'Halo', body: 'Coba', channel: 'info' as const };
  assert.equal(await pusher.send('hidup', msg), 'ok');
  assert.equal(await pusher.send('mati', msg), 'invalid');
  assert.equal(tokenCalls, 1);
  assert.equal(sends[0].url, 'https://fcm.googleapis.com/v1/projects/jejak-uji/messages:send');
  assert.equal(sends[0].auth, 'Bearer akses-1');

  // Access token ditolak: diambil ulang sekali lalu dikirim lagi.
  assert.equal(await pusher.send('basi', msg), 'ok');
  assert.equal(tokenCalls, 2);
  assert.equal(sends.at(-1)!.auth, 'Bearer akses-2');

  const log = console.error;
  console.error = () => {};
  try {
    assert.equal(await pusher.send('sibuk', msg), 'error');
  } finally {
    console.error = log;
  }
});
