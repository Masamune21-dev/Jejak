import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import type { Activity, AuthResult, ChatMessage, ChatSummary, FollowItem, LikeState, Post, Profile, Segment, TimelineItem } from '../../shared/api.ts';
import { createApp } from '../src/app.ts';
import { openDb } from '../src/db.ts';
import { cleanJpeg, mediaPath, openMedia, verifyMedia } from '../src/media.ts';
import { HOME, north, walkPath } from './helpers.ts';

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'jejak-uji-'));
  const media = openMedia(dir, 'kunci-uji');
  const app = createApp(openDb(':memory:'), {
    planRoute: async (_type, waypoints) => ({ geometry: waypoints, distanceM: 0, steps: [], snapped: false }),
    media,
  });
  const call = async <T>(method: string, path: string, token?: string, body?: unknown) => {
    const form = body instanceof FormData;
    const res = await app.request(path, {
      method,
      headers: { ...(form ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
    });
    const type = res.headers.get('content-type') ?? '';
    return {
      status: res.status,
      type,
      body: (type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer())) as T & { error?: string },
    };
  };
  const register = async (username: string) =>
    (await call<AuthResult>('POST', '/auth/register', undefined, { username, name: username.toUpperCase(), password: 'lari-pagi-77' }))
      .body;
  return { app, call, register, dir, media };
}

const seg = (marker: number, payload: Buffer) => {
  const head = Buffer.from([0xff, marker, 0, 0]);
  head.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([head, payload]);
};

/** JPEG tiruan yang utuh secara struktur, dengan blok EXIF berisi "GPS". */
const jpegWithExif = () =>
  Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1')),
    seg(0xe1, Buffer.from('Exif\0\0GPSLatitude -6.7601 GPSLongitude 111.0322', 'latin1')),
    seg(0xdb, Buffer.alloc(65, 1)),
    seg(0xda, Buffer.from([1, 1, 0, 0, 0x3f, 0])),
    Buffer.from([0x12, 0x34, 0x56, 0xff, 0xd9]),
  ]);

const photoForm = (data: Buffer, field = 'foto') => {
  const f = new FormData();
  f.append(field, new Blob([new Uint8Array(data)], { type: 'image/jpeg' }), 'foto.jpg');
  return f;
};

test('foto: EXIF (lokasi GPS) dibuang, bukan JPEG ditolak', () => {
  const clean = cleanJpeg(jpegWithExif())!;
  assert.ok(clean);
  assert.equal(clean[0], 0xff);
  assert.equal(clean[1], 0xd8);
  assert.ok(!clean.includes(Buffer.from('GPSLatitude')));
  assert.ok(clean.includes(Buffer.from('JFIF')));
  assert.equal(cleanJpeg(Buffer.from('\x89PNG\r\n\x1a\n', 'latin1')), null);
  assert.equal(cleanJpeg(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00])), null);
});

test('foto: alamat bertanda tangan, berlaku 1–2 minggu, tidak bisa dipalsukan', () => {
  const m = openMedia(mkdtempSync(join(tmpdir(), 'jejak-uji-')), 'kunci');
  const name = 'a'.repeat(32) + '.jpg';
  const now = Date.UTC(2026, 9, 28);
  const url = new URL(mediaPath(m, name, now), 'http://x');
  const exp = url.searchParams.get('exp')!;
  const sig = url.searchParams.get('sig')!;
  assert.ok(verifyMedia(m, name, exp, sig, now));
  assert.ok(Number(exp) * 1000 - now > 6 * 86_400_000);
  assert.equal(mediaPath(m, name, now), mediaPath(m, name, now + 3_600_000), 'alamat tetap selama seminggu (cache)');
  assert.ok(!verifyMedia(m, name, exp, sig.slice(1) + 'A', now));
  assert.ok(!verifyMedia(m, 'b'.repeat(32) + '.jpg', exp, sig, now));
  assert.ok(!verifyMedia(m, name, exp, sig, Number(exp) * 1000 + 1));
  assert.ok(!verifyMedia(m, '../jejak.db', exp, sig, now));
});

test('foto profil & sampul: unggah, tampil di feed, hanya lewat alamat bertanda tangan, hapus', async () => {
  const { call, register, dir } = setup();
  const ika = await register('ika');
  const up = await call<Profile>('PUT', '/me/avatar', ika.token, photoForm(jpegWithExif()));
  assert.equal(up.status, 200);
  assert.ok(up.body.avatarUrl?.startsWith('/media/'));
  const cover = await call<Profile>('PUT', '/me/cover', ika.token, photoForm(jpegWithExif()));
  assert.ok(cover.body.coverUrl);

  const img = await call<Buffer>('GET', up.body.avatarUrl!);
  assert.equal(img.status, 200);
  assert.equal(img.type, 'image/jpeg');
  assert.ok(!img.body.includes(Buffer.from('GPSLatitude')), 'lokasi GPS tidak tersimpan');
  assert.equal((await call('GET', up.body.avatarUrl!.split('?')[0])).status, 403);

  // Avatar ikut di data pengguna lain (feed).
  await call('POST', '/activities', ika.token, { type: 'run', title: 'Pagi', track: [walkPath([HOME, north(HOME, 800)], 3)] });
  const feed = await call<TimelineItem[]>('GET', '/timeline', ika.token);
  assert.ok(feed.body[0].user.avatarUrl);

  assert.equal((await call('PUT', '/me/avatar', ika.token, photoForm(Buffer.from('bukan foto')))).status, 400);
  assert.equal((await call('PUT', '/me/avatar', ika.token, new FormData())).status, 400);

  const files = () => readdirSync(dir).filter((f) => f.endsWith('.jpg'));
  assert.equal(files().length, 2);
  const del = await call<Profile>('DELETE', '/me/avatar', ika.token);
  assert.equal(del.body.avatarUrl, null);
  assert.equal(files().length, 1, 'berkas lama dihapus');
  assert.ok(!existsSync(join(dir, up.body.avatarUrl!.split('/')[2].split('?')[0])));
});

test('daftar pengikut dan mengikuti', async () => {
  const { call, register } = setup();
  const [a, b, cc] = [await register('ani'), await register('budi'), await register('cici')];
  await call('POST', `/users/${b.user.id}/follow`, a.token);
  await call('POST', `/users/${b.user.id}/follow`, cc.token);
  await call('POST', `/users/${cc.user.id}/follow`, b.token);
  const followers = await call<FollowItem[]>('GET', `/users/${b.user.id}/followers`, a.token);
  assert.deepEqual(new Set(followers.body.map((u) => u.username)), new Set(['ani', 'cici']));
  assert.ok(followers.body.every((u) => u.since));
  // Dilihat oleh ani: ani belum mengikuti cici.
  assert.equal(followers.body.find((u) => u.username === 'cici')!.isFollowing, false);
  const following = await call<FollowItem[]>('GET', `/users/${b.user.id}/following`, a.token);
  assert.deepEqual(following.body.map((u) => u.username), ['cici']);
  assert.equal((await call('GET', '/users/999/followers', a.token)).status, 404);
});

test('postingan: feed teman, diskusi segmen, suka, balasan, hapus, laporan', async () => {
  const { call, register } = setup();
  const [ani, budi, cici] = [await register('ani'), await register('budi'), await register('cici')];
  await call('POST', `/users/${budi.user.id}/follow`, ani.token);

  // Segmen milik budi untuk ditandai.
  const act = (await call<Activity>('POST', '/activities', budi.token, {
    type: 'run',
    title: 'Lari',
    track: [walkPath([HOME, north(HOME, 1000)], 3)],
  })).body;
  const segment = (await call<Segment>('POST', '/segments', budi.token, { activityId: act.id, startIndex: 10, endIndex: 200, name: 'Tanjakan' }))
    .body;

  const form = new FormData();
  form.append('body', 'Jalannya licin habis hujan, hati-hati di tikungan.');
  form.append('segmentId', String(segment.id));
  form.append('foto', new Blob([new Uint8Array(jpegWithExif())], { type: 'image/jpeg' }), 'a.jpg');
  const post = await call<Post>('POST', '/posts', budi.token, form);
  assert.equal(post.status, 201);
  assert.equal(post.body.segment?.name, 'Tanjakan');
  assert.equal(post.body.photos.length, 1);

  // Ani mengikuti budi: postingan muncul di timeline bersama aktivitas. Cici tidak.
  const tl = await call<TimelineItem[]>('GET', '/timeline', ani.token);
  assert.deepEqual(tl.body.map((x) => x.kind).sort(), ['activity', 'post']);
  assert.ok(tl.body[0].at >= tl.body[1].at, 'urut terbaru dulu');
  assert.equal((await call<TimelineItem[]>('GET', '/timeline', cici.token)).body.length, 0);
  // Tapi semua bisa membaca diskusi segmen.
  assert.equal((await call<Post[]>('GET', `/segments/${segment.id}/posts`, cici.token)).body.length, 1);

  const like = await call<LikeState>('POST', `/posts/${post.body.id}/like`, cici.token);
  assert.deepEqual(like.body, { likes: 1, hasLiked: true });
  await call('POST', `/posts/${post.body.id}/replies`, cici.token, { body: 'Siap, makasih infonya' });
  const again = await call<Post>('GET', `/posts/${post.body.id}`, ani.token);
  assert.equal(again.body.replies, 1);
  assert.equal(again.body.hasLiked, false);

  assert.equal((await call('POST', `/posts/${post.body.id}/report`, cici.token, { reason: 'spam' })).status, 201);
  assert.equal((await call('POST', '/posts', ani.token, new FormData())).status, 400);
  assert.equal((await call('DELETE', `/posts/${post.body.id}`, cici.token)).status, 403);
  assert.equal((await call('DELETE', `/posts/${post.body.id}`, budi.token)).status, 200);
  assert.equal((await call('GET', `/posts/${post.body.id}`, ani.token)).status, 404);
});

test('chat: hanya saling mengikuti, belum dibaca, polling, blokir', async () => {
  const { call, register } = setup();
  const [ani, budi] = [await register('ani'), await register('budi')];
  const send = (from: AuthResult, to: AuthResult, text: string) => call<ChatMessage>('POST', `/chats/${to.user.id}`, from.token, { body: text });

  assert.equal((await send(ani, budi, 'halo')).status, 403, 'belum saling mengikuti');
  await call('POST', `/users/${budi.user.id}/follow`, ani.token);
  assert.equal((await send(ani, budi, 'halo')).status, 403, 'baru satu arah');
  await call('POST', `/users/${ani.user.id}/follow`, budi.token);
  assert.equal((await call<Profile>('GET', `/users/${budi.user.id}`, ani.token)).body.canMessage, true);

  const m1 = await send(ani, budi, 'Besok lari pagi?');
  assert.equal(m1.status, 201);
  assert.equal(m1.body.fromMe, true);
  await send(ani, budi, 'Jam 5 di alun-alun');

  const list = await call<ChatSummary[]>('GET', '/chats', budi.token);
  assert.equal(list.body[0].user.username, 'ani');
  assert.equal(list.body[0].unread, 2);
  assert.equal((await call<{ count: number }>('GET', '/chats/unread', budi.token)).body.count, 2);

  const thread = await call<ChatMessage[]>('GET', `/chats/${ani.user.id}`, budi.token);
  assert.deepEqual(thread.body.map((m) => m.body), ['Besok lari pagi?', 'Jam 5 di alun-alun']);
  assert.equal(thread.body[0].fromMe, false);
  await call('POST', `/chats/${ani.user.id}/read`, budi.token);
  assert.equal((await call<{ count: number }>('GET', '/chats/unread', budi.token)).body.count, 0);

  const reply = await send(budi, ani, 'Gas!');
  assert.equal((await call('DELETE', `/chats/messages/${reply.body.id}`, ani.token)).status, 403, 'pesan orang lain');
  const oops = await send(ani, budi, 'salah ketik');
  assert.equal((await call('DELETE', `/chats/messages/${oops.body.id}`, ani.token)).status, 200);
  assert.ok(!(await call<ChatMessage[]>('GET', `/chats/${ani.user.id}`, budi.token)).body.some((m) => m.id === oops.body.id));
  const fresh = await call<ChatMessage[]>('GET', `/chats/${budi.user.id}?after=${m1.body.id + 1}`, ani.token);
  assert.deepEqual(fresh.body.map((m) => m.id), [reply.body.id]);

  // Blokir: pesan ditolak dua arah, saling mengikuti putus, tidak bisa mengikuti lagi.
  const blocked = await call<Profile>('POST', `/users/${ani.user.id}/block`, budi.token);
  assert.equal(blocked.body.blocked, true);
  assert.equal(blocked.body.canMessage, false);
  assert.equal((await send(ani, budi, 'halo?')).status, 403);
  assert.equal((await send(budi, ani, 'halo?')).status, 403);
  assert.equal((await call('POST', `/users/${budi.user.id}/follow`, ani.token)).status, 403);
  // Riwayat tetap bisa dibaca.
  assert.equal((await call<ChatMessage[]>('GET', `/chats/${budi.user.id}`, ani.token)).body.length, 3);
  await call('DELETE', `/users/${ani.user.id}/block`, budi.token);
  assert.equal((await call('POST', `/users/${budi.user.id}/follow`, ani.token)).status, 200);
});
