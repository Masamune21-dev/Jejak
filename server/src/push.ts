import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

import type { DB } from './db.ts';

/**
 * Pengirim notifikasi push lewat FCM HTTP v1, tanpa SDK Google: JWT service account ditandatangani dengan
 * node:crypto lalu ditukar jadi access token OAuth.
 */

export interface PushMessage {
  title: string;
  body: string;
  /** Path app (`/segmen/12`) atau alamat https yang dibuka saat notifikasi diketuk. */
  url?: string;
  /** Kanal Android yang dibuat app (app/src/lib/push.ts). */
  channel: 'info' | 'pembaruan';
  /** Notifikasi dengan tag sama menggantikan yang lama di HP. */
  tag?: string;
}

/** `invalid`: token sudah tidak berlaku (app dicopot, data dihapus) dan sebaiknya dibuang dari database. */
export type PushResult = 'ok' | 'invalid' | 'error';

export interface Pusher {
  projectId: string;
  send(token: string, msg: PushMessage): Promise<PushResult>;
}

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URI = 'https://oauth2.googleapis.com/token';
/** Kode FCM yang berarti token itu sendiri yang salah, bukan pesannya atau servernya. */
const DEAD_TOKEN = new Set(['UNREGISTERED', 'SENDER_ID_MISMATCH']);

const b64url = (s: string | Buffer) => Buffer.from(s).toString('base64url');

/** Isi `data` dalam format yang dibaca expo-notifications di Android (judul, teks, kanal, dan `body` JSON). */
export function fcmMessage(token: string, msg: PushMessage) {
  const data: Record<string, string> = {
    title: msg.title,
    message: msg.body,
    channelId: msg.channel,
    body: JSON.stringify(msg.url ? { url: msg.url } : {}),
  };
  if (msg.tag) data.tag = msg.tag;
  // Pesan data saja dengan prioritas tinggi: expo-notifications yang menampilkannya, juga saat app tertutup.
  return { message: { token, data, android: { priority: 'HIGH' } } };
}

/** Pengirim dari berkas kunci service account, atau null bila berkasnya belum dipasang. */
export function loadPusher(path: string, fetchFn: typeof fetch = fetch): Pusher | null {
  let sa: ServiceAccount;
  try {
    sa = JSON.parse(readFileSync(path, 'utf8')) as ServiceAccount;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error(`Kunci FCM di ${path} tidak terbaca: ${(e as Error).message}`);
  }
  if (!sa.project_id || !sa.client_email || !sa.private_key) throw new Error(`Kunci FCM di ${path} bukan kunci service account`);
  return createPusher(sa, fetchFn);
}

export function createPusher(sa: ServiceAccount, fetchFn: typeof fetch = fetch): Pusher {
  const tokenUri = sa.token_uri ?? TOKEN_URI;
  let cached: { token: string; until: number } | null = null;

  const accessToken = async (): Promise<string> => {
    if (cached && Date.now() < cached.until) return cached.token;
    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(
      JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600 }),
    )}`;
    const signature = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key);
    const res = await fetchFn(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${b64url(signature)}` }),
    });
    const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
    if (!res.ok || !data.access_token) throw new Error(`Google menolak kunci FCM: ${data.error_description ?? res.status}`);
    // Diperbarui semenit sebelum kedaluwarsa.
    cached = { token: data.access_token, until: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000 };
    return cached.token;
  };

  const send = async (token: string, msg: PushMessage, retried = false): Promise<PushResult> => {
    const res = await fetchFn(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(fcmMessage(token, msg)),
    });
    if (res.ok) return 'ok';
    if (res.status === 401 && !retried) {
      cached = null;
      return send(token, msg, true);
    }
    const err = ((await res.json().catch(() => ({}))) as { error?: { status?: string; message?: string; details?: { errorCode?: string }[] } })
      .error;
    const code = err?.details?.find((d) => d.errorCode)?.errorCode;
    if ((code && DEAD_TOKEN.has(code)) || err?.status === 'NOT_FOUND') return 'invalid';
    if (err?.status === 'INVALID_ARGUMENT' && /registration token/i.test(err.message ?? '')) return 'invalid';
    console.error(`FCM ${res.status} ${code ?? err?.status ?? ''}: ${err?.message ?? ''}`);
    return 'error';
  };

  return {
    projectId: sa.project_id,
    send: async (token, msg) => {
      try {
        return await send(token, msg);
      } catch (e) {
        console.error(`FCM gagal: ${(e as Error).message}`);
        return 'error';
      }
    },
  };
}

export interface NotifyOptions extends PushMessage {
  /** Username penerima; kosong berarti semua perangkat yang menyalakan notifikasi. */
  to: string[];
  /** Lewati perangkat yang sudah memakai versi app ini (pengumuman pembaruan). */
  skipVersion?: string;
}

export interface Recipients {
  tokens: string[];
  users: number;
  /** Username di `to` yang tidak dikenal atau belum menyalakan notifikasi. */
  missing: string[];
}

export function recipients(db: DB, opts: Pick<NotifyOptions, 'to' | 'skipVersion'>): Recipients {
  const to = opts.to.map((u) => u.toLowerCase());
  const rows = db
    .prepare(
      `select d.token, u.username, d.app_version from push_devices d join users u on u.id = d.user_id
       ${to.length ? `where u.username in (${to.map(() => '?').join(', ')})` : ''}`,
    )
    .all(...to) as { token: string; username: string; app_version: string | null }[];
  const picked = rows.filter((r) => !opts.skipVersion || r.app_version !== opts.skipVersion);
  const found = new Set(rows.map((r) => r.username.toLowerCase()));
  return {
    tokens: picked.map((r) => r.token),
    users: new Set(picked.map((r) => r.username)).size,
    missing: to.filter((u) => !found.has(u)),
  };
}

/** Kirim ke semua penerima (beberapa sekaligus), buang token mati, dan catat di `announcements`. */
export async function notify(db: DB, pusher: Pusher, opts: NotifyOptions, concurrency = 8) {
  const { tokens, users, missing } = recipients(db, opts);
  const results: PushResult[] = [];
  for (let i = 0; i < tokens.length; i += concurrency) {
    results.push(...(await Promise.all(tokens.slice(i, i + concurrency).map((t) => pusher.send(t, opts)))));
  }
  const dead = tokens.filter((_, i) => results[i] === 'invalid');
  const del = db.prepare('delete from push_devices where token = ?');
  for (const t of dead) del.run(t);
  const sent = results.filter((r) => r === 'ok').length;
  db.prepare('insert into announcements (kind, title, body, url, target, sent, failed) values (?, ?, ?, ?, ?, ?, ?)').run(
    opts.channel,
    opts.title,
    opts.body,
    opts.url ?? null,
    opts.to.length ? opts.to.join(',') : 'semua',
    sent,
    tokens.length - sent,
  );
  return { devices: tokens.length, users, sent, removed: dead.length, failed: tokens.length - sent - dead.length, missing };
}
