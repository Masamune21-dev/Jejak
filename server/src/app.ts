import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import type {
  Activity,
  ActivitySummary,
  ChatMessage,
  ChatSummary,
  FollowItem,
  LikeState,
  Post,
  PostReply,
  TimelineItem,
  ActivityType,
  AuthResult,
  BestEffort,
  Comment,
  KudosState,
  LeaderboardRow,
  PlannedRoute,
  Profile,
  RouteStep,
  RouteSummary,
  Segment,
  SegmentEffort,
  SegmentSummary,
  Stats,
  Totals,
  UserListItem,
  UserSummary,
  WeekTotal,
} from '../../shared/api.ts';
import * as geo from '../../shared/geo.ts';
import type { LatLon, TrackPoint } from '../../shared/geo.ts';
import { hashPassword, hashToken, newToken, verifyPassword } from './auth.ts';
import { tx, type DB } from './db.ts';
import { cleanJpeg, MAX_PHOTO_BYTES, mediaPath, openMedia, readMedia, removeMedia, saveJpeg, verifyMedia, type MediaStore } from './media.ts';
import { planRoute as defaultPlanRoute } from './routing.ts';

type Row = Record<string, any>;
type Env = { Variables: { me: UserSummary } };

const TYPES: ActivityType[] = ['run', 'ride', 'walk'];

/** Jarak yang dicatat sebagai rekor tercepat per jenis aktivitas. */
export const EFFORTS: Record<ActivityType, { name: string; distanceM: number }[]> = {
  run: [
    { name: '400 m', distanceM: 400 },
    { name: '1 km', distanceM: 1000 },
    { name: '5 km', distanceM: 5000 },
    { name: '10 km', distanceM: 10000 },
    { name: 'Setengah maraton', distanceM: 21097.5 },
    { name: 'Maraton', distanceM: 42195 },
  ],
  walk: [
    { name: '1 km', distanceM: 1000 },
    { name: '5 km', distanceM: 5000 },
    { name: '10 km', distanceM: 10000 },
  ],
  ride: [
    { name: '5 km', distanceM: 5000 },
    { name: '10 km', distanceM: 10000 },
    { name: '20 km', distanceM: 20000 },
    { name: '40 km', distanceM: 40000 },
    { name: '100 km', distanceM: 100000 },
  ],
};

/** Segmen lari juga berlaku untuk jalan kaki; sepeda punya segmen sendiri. */
const segmentType = (t: ActivityType): ActivityType => (t === 'ride' ? 'ride' : 'run');
const familyOf = (segType: ActivityType): ActivityType[] => (segType === 'ride' ? ['ride'] : ['run', 'walk']);

const MAX_TRACK_POINTS = 60_000;
const BBOX_MARGIN_DEG = 0.001;
const DAY_MS = 86_400_000;
/** Sesi berakhir bila tidak dipakai selama ini. */
const SESSION_IDLE_MS = 90 * DAY_MS;
/** Track bertanggal sebelum ini (atau lebih dari sehari ke depan) pasti jam HP salah atau data palsu. */
const MIN_TRACK_TIME_MS = Date.UTC(2020, 0, 1);

/**
 * Waktu tercepat yang masih masuk akal untuk jarak tertentu. Lebih cepat dari ini hampir pasti terbawa kendaraan
 * atau dipalsukan, dan akan merusak rekor serta leaderboard segmen. Jalan kaki memakai batas lari.
 */
const SPEED_LIMITS: Record<ActivityType, { distanceM: number; minS: number }[]> = {
  run: [{ distanceM: 1000, minS: 120 }],
  walk: [{ distanceM: 1000, minS: 120 }],
  ride: [
    { distanceM: 1000, minS: 36 },
    { distanceM: 10_000, minS: 600 },
  ],
};
const TYPE_LABEL: Record<ActivityType, string> = { run: 'lari', walk: 'jalan kaki', ride: 'bersepeda' };

function fail(status: ContentfulStatusCode, message: string): never {
  throw new HTTPException(status, { message });
}

// --- Validasi input ---

function str(v: unknown, field: string, min = 1, max = 100): string {
  if (typeof v !== 'string') fail(400, `${field} wajib diisi`);
  const s = v.trim();
  if (s.length < min) fail(400, min > 1 ? `${field} minimal ${min} karakter` : `${field} wajib diisi`);
  if (s.length > max) fail(400, `${field} maksimal ${max} karakter`);
  return s;
}

/** Kata sandi yang paling sering dipakai, jadi paling dulu dicoba penebak (termasuk yang umum di Indonesia). */
const COMMON_PASSWORDS = new Set(
  (
    'password password1 password123 qwerty qwerty123 qwertyuiop abc123 abcdef abcd1234 iloveyou admin admin123 ' +
    'welcome letmein monkey dragon football sunshine princess 1q2w3e 1q2w3e4r zxcvbn asdfgh asdf1234 ' +
    '123123 112233 121212 123321 654321 159753 147258 ' +
    'sayang sayangku cinta cintaku bismillah indonesia rahasia rahasia123 katasandi jakarta merdeka garuda ' +
    'anjing kucing persib persija jejak jejak123 lari123'
  ).split(' '),
);

/** Kata sandi yang mudah ditebak: umum, satu karakter diulang, deret angka, atau berisi username. */
function weakPassword(password: string, username: string): boolean {
  const p = password.toLowerCase();
  return (
    COMMON_PASSWORDS.has(p) ||
    /^(.)\1+$/.test(p) ||
    '01234567890123456789'.includes(p) ||
    '98765432109876543210'.includes(p) ||
    // Username pendek (mis. "ika") bisa muncul tanpa sengaja di kata sandi biasa, jadi tidak dicek.
    (username.length >= 4 && p.includes(username))
  );
}

function actType(v: unknown): ActivityType {
  if (!TYPES.includes(v as ActivityType)) fail(400, 'Jenis aktivitas tidak dikenal');
  return v as ActivityType;
}

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const isLatLon = (p: unknown): p is [number, number, ...unknown[]] =>
  Array.isArray(p) && isNum(p[0]) && isNum(p[1]) && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180;

function latLonList(v: unknown, field: string, min: number, max: number): LatLon[] {
  if (!Array.isArray(v) || v.length < min || v.length > max || !v.every(isLatLon)) {
    fail(400, `${field} harus berisi ${min}–${max} titik koordinat`);
  }
  return v.map((p) => [p[0], p[1]]);
}

function trackOf(v: unknown): TrackPoint[][] {
  if (!Array.isArray(v)) fail(400, 'Track tidak valid');
  let n = 0;
  const parts: TrackPoint[][] = [];
  for (const part of v) {
    if (!Array.isArray(part)) fail(400, 'Track tidak valid');
    const clean: TrackPoint[] = [];
    for (const raw of part) {
      const p = raw as unknown[];
      if (!isLatLon(p) || !isNum(p[2]) || !(p[3] == null || isNum(p[3]))) fail(400, 'Titik track tidak valid');
      const t = p[2] as number;
      if (t < MIN_TRACK_TIME_MS || t > Date.now() + DAY_MS)
        fail(400, 'Tanggal aktivitas tidak masuk akal. Periksa jam dan tanggal di HP.');
      if (clean.length && t < clean[clean.length - 1][2]) fail(400, 'Waktu titik track harus urut');
      clean.push([p[0], p[1], t, (p[3] as number | null | undefined) ?? null]);
    }
    n += clean.length;
    if (clean.length) parts.push(clean);
  }
  if (n < 2) fail(400, 'Aktivitas terlalu pendek untuk disimpan');
  if (n > MAX_TRACK_POINTS) fail(400, 'Track terlalu panjang');
  return parts;
}

const mmss = (s: number) => {
  const t = Math.round(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

/** Tolak track yang kecepatannya mustahil untuk jenis aktivitasnya. */
function checkPlausible(type: ActivityType, track: TrackPoint[][]) {
  const cum = geo.cumulative(track);
  const totalM = cum.dist[cum.dist.length - 1];
  const activeS = cum.time[cum.time.length - 1];
  if (activeS <= 0) fail(400, 'Waktu titik track tidak bertambah');
  const tooFast = (what: string) =>
    fail(400, `Kecepatan tidak masuk akal untuk ${TYPE_LABEL[type]} (${what}). Mungkin rekaman terbawa kendaraan.`);
  for (const { distanceM, minS } of SPEED_LIMITS[type]) {
    const best = geo.bestEffort(cum, distanceM);
    if (best && best.elapsedS < minS) tooFast(`${distanceM / 1000} km dalam ${mmss(best.elapsedS)}`);
  }
  // Aktivitas yang lebih pendek dari jendela terkecil dinilai dari kecepatan rata-ratanya.
  const { distanceM, minS } = SPEED_LIMITS[type][0];
  if (totalM >= 200 && totalM < distanceM && totalM / activeS > distanceM / minS) {
    tooFast(`rata-rata ${Math.round((totalM / activeS) * 3.6)} km/j`);
  }
}

function stepsOf(v: unknown): RouteStep[] {
  if (!Array.isArray(v) || v.length > 1000) fail(400, 'Petunjuk arah tidak valid');
  return v.map((s) => {
    if (!s || !isNum(s.atM) || typeof s.text !== 'string' || !isLatLon(s.at)) fail(400, 'Petunjuk arah tidak valid');
    return { atM: s.atM, text: s.text.slice(0, 120), at: [s.at[0], s.at[1]] };
  });
}

function idParam(c: Context, name = 'id'): number {
  const id = Number(c.req.param(name));
  if (!Number.isInteger(id) || id <= 0) fail(404, 'Tidak ditemukan');
  return id;
}

async function body(c: Context): Promise<Row> {
  try {
    const b = await c.req.json();
    if (b && typeof b === 'object') return b as Row;
  } catch {}
  fail(400, 'Isi permintaan harus JSON');
}

// --- Aplikasi ---

export function createApp(db: DB, opts: { planRoute?: typeof defaultPlanRoute; media?: MediaStore } = {}) {
  const planRoute = opts.planRoute ?? defaultPlanRoute;
  // Tes memakai folder sementara; server sungguhan memberi data/uploads (lihat index.ts).
  const media = opts.media ?? openMedia(mkdtempSync(join(tmpdir(), 'jejak-media-')));
  const photoUrl = (file: string | null | undefined) => (file ? mediaPath(media, file) : null);
  const one = <T = Row>(sql: string, ...p: any[]) => db.prepare(sql).get(...p) as T | undefined;
  const all = <T = Row>(sql: string, ...p: any[]) => db.prepare(sql).all(...p) as T[];
  const run = (sql: string, ...p: any[]) => db.prepare(sql).run(...p);

  const userOf = (r: Row): UserSummary => ({ id: r.u_id, username: r.u_username, name: r.u_name, avatarUrl: photoUrl(r.u_avatar) });

  const ACTIVITY_SELECT = `
    select a.id, a.type, a.title, a.started_at, a.elapsed_s, a.moving_s, a.distance_m, a.elev_gain_m,
           a.preview, a.route_id, a.pr_count,
           u.id as u_id, u.username as u_username, u.name as u_name, u.avatar as u_avatar,
           (select count(*) from kudos k where k.activity_id = a.id) as kudos,
           exists(select 1 from kudos k where k.activity_id = a.id and k.user_id = $me) as has_kudo,
           (select count(*) from comments c where c.activity_id = a.id) as comments
    from activities a join users u on u.id = a.user_id`;

  // Zona privasi: orang lain tidak melihat awal dan akhir jejak (sering rumah). Pemilik selalu melihat jejak penuh.
  const toSummary = (r: Row, me: number): ActivitySummary => ({
    id: r.id,
    user: userOf(r),
    type: r.type,
    title: r.title,
    startedAt: r.started_at,
    elapsedS: r.elapsed_s,
    movingS: r.moving_s,
    distanceM: r.distance_m,
    elevGainM: r.elev_gain_m,
    preview: r.u_id === me ? JSON.parse(r.preview) : geo.hideEnds(JSON.parse(r.preview), geo.privacyZoneM(r.distance_m)),
    kudos: r.kudos,
    hasKudo: !!r.has_kudo,
    comments: r.comments,
    routeId: r.route_id ?? null,
    prCount: r.pr_count,
  });

  const isFollowing = (me: number, other: number) =>
    !!one('select 1 from follows where follower_id = ? and followee_id = ?', me, other);

  const totalsOf = (where: string, ...p: any[]): Totals => {
    const r = one(
      `select count(*) as count, coalesce(sum(distance_m), 0) as d, coalesce(sum(moving_s), 0) as m from activities where ${where}`,
      ...p,
    )!;
    return { count: r.count, distanceM: r.d, movingS: r.m };
  };

  const blockedBy = (blocker: number, blocked: number) =>
    !!one('select 1 from blocks where blocker_id = ? and blocked_id = ?', blocker, blocked);

  function profile(id: number, me: number): Profile {
    const u = one('select id, username, name, created_at, avatar, cover from users where id = ?', id);
    if (!u) fail(404, 'Pengguna tidak ditemukan');
    const following = isFollowing(me, id);
    const mutual = following && isFollowing(id, me);
    const blocked = blockedBy(me, id);
    return {
      id: u.id,
      username: u.username,
      name: u.name,
      avatarUrl: photoUrl(u.avatar),
      coverUrl: photoUrl(u.cover),
      createdAt: u.created_at,
      followers: one('select count(*) as n from follows where followee_id = ?', id)!.n,
      following: one('select count(*) as n from follows where follower_id = ?', id)!.n,
      isFollowing: following,
      isMe: id === me,
      totals: totalsOf('user_id = ?', id),
      isMutual: mutual,
      blocked,
      canMessage: id !== me && mutual && !blocked && !blockedBy(id, me),
    };
  }

  // Peringkat bila waktu `elapsedS` dibandingkan waktu terbaik pengguna lain di segmen.
  const rankOn = (segmentId: number, userId: number, elapsedS: number) =>
    1 +
    one(
      `select count(*) as n from (select user_id, min(elapsed_s) as b from segment_efforts
       where segment_id = ? and user_id != ? group by user_id) where b < ?`,
      segmentId,
      userId,
      elapsedS,
    )!.n;

  function getActivity(id: number, me: number): Activity {
    const r = one(`${ACTIVITY_SELECT} where a.id = $id`, { me, id });
    if (!r) fail(404, 'Aktivitas tidak ditemukan');
    const extra = one('select track, splits, max_speed_mps from activities where id = ?', id)!;
    const full: TrackPoint[][] = JSON.parse(extra.track);
    const { track, dropped } =
      r.u_id === me ? { track: full, dropped: 0 } : geo.hideTrackEnds(full, geo.privacyZoneM(r.distance_m));
    // Indeks effort menunjuk ke track penuh; geser ke track yang terlihat.
    const lastIndex = Math.max(0, track.reduce((n, p) => n + p.length, 0) - 1);
    const visibleIndex = (i: number) => Math.min(Math.max(i - dropped, 0), lastIndex);
    const bestEfforts: BestEffort[] = all(
      'select name, distance_m, elapsed_s, is_pr from best_efforts where activity_id = ? order by distance_m',
      id,
    ).map((b) => ({ name: b.name, distanceM: b.distance_m, elapsedS: b.elapsed_s, isPr: !!b.is_pr }));
    const efforts: SegmentEffort[] = all(
      `select e.id, e.segment_id, s.name, e.elapsed_s, e.distance_m, e.start_index, e.end_index, e.is_pr, e.user_id
       from segment_efforts e join segments s on s.id = e.segment_id
       where e.activity_id = ? order by e.start_index`,
      id,
    ).map((e) => ({
      id: e.id,
      segmentId: e.segment_id,
      segmentName: e.name,
      elapsedS: e.elapsed_s,
      distanceM: e.distance_m,
      startIndex: visibleIndex(e.start_index),
      endIndex: visibleIndex(e.end_index),
      rank: rankOn(e.segment_id, e.user_id, e.elapsed_s),
      isPr: !!e.is_pr,
    }));
    const kudosBy = all(
      `select u.id as u_id, u.username as u_username, u.name as u_name, u.avatar as u_avatar
       from kudos k join users u on u.id = k.user_id where k.activity_id = ? order by k.created_at desc limit 50`,
      id,
    ).map(userOf);
    return {
      ...toSummary(r, me),
      track,
      maxSpeedMps: extra.max_speed_mps,
      splits: JSON.parse(extra.splits),
      bestEfforts,
      efforts,
      kudosBy,
    };
  }

  /** Cocokkan satu aktivitas dengan semua segmen di sekitarnya; kembalikan jumlah PR. */
  function matchActivityToSegments(
    activityId: number,
    userId: number,
    type: ActivityType,
    startedAt: string,
    cum: geo.Cumulative,
  ) {
    const b = geo.bounds(cum.points)!;
    const segs = all(
      `select id, geometry from segments where type = ?
       and max_lat >= ? and min_lat <= ? and max_lon >= ? and min_lon <= ?`,
      segmentType(type),
      b.minLat - BBOX_MARGIN_DEG,
      b.maxLat + BBOX_MARGIN_DEG,
      b.minLon - BBOX_MARGIN_DEG,
      b.maxLon + BBOX_MARGIN_DEG,
    );
    let prs = 0;
    for (const s of segs) {
      const m = geo.matchSegment(JSON.parse(s.geometry), cum);
      if (!m) continue;
      const prev = one('select min(elapsed_s) as b from segment_efforts where segment_id = ? and user_id = ?', s.id, userId)!.b;
      const isPr = prev != null && m.elapsedS < prev;
      if (isPr) prs++;
      run(
        `insert into segment_efforts (segment_id, activity_id, user_id, elapsed_s, distance_m, start_index, end_index, is_pr, started_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        s.id,
        activityId,
        userId,
        m.elapsedS,
        m.distanceM,
        m.startIndex,
        m.endIndex,
        isPr ? 1 : 0,
        startedAt,
      );
    }
    return prs;
  }

  function saveActivity(userId: number, type: ActivityType, title: string, track: TrackPoint[][], routeId: number | null) {
    const s = geo.summarize(track);
    const cum = geo.cumulative(track);
    const b = geo.bounds(cum.points)!;
    const startedAt = new Date(s.startedAt).toISOString();
    return tx(db, () => {
      const id = Number(
        run(
          `insert into activities (user_id, type, title, started_at, elapsed_s, moving_s, distance_m, elev_gain_m, max_speed_mps,
             min_lat, max_lat, min_lon, max_lon, preview, track, splits, route_id)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          userId,
          type,
          title,
          startedAt,
          s.elapsedS,
          s.movingS,
          s.distanceM,
          s.elevGainM,
          s.maxSpeedMps,
          b.minLat,
          b.maxLat,
          b.minLon,
          b.maxLon,
          JSON.stringify(geo.preview(cum.points)),
          JSON.stringify(track),
          JSON.stringify(geo.splits(cum)),
          routeId,
        ).lastInsertRowid,
      );
      let prs = 0;
      for (const e of EFFORTS[type]) {
        const best = geo.bestEffort(cum, e.distanceM);
        if (!best) continue;
        const prev = one(
          'select min(elapsed_s) as b from best_efforts where user_id = ? and type = ? and name = ?',
          userId,
          type,
          e.name,
        )!.b;
        // Rekor pertama kali belum dihitung PR; PR = mengalahkan waktu sebelumnya.
        const isPr = prev != null && best.elapsedS < prev;
        if (isPr) prs++;
        run(
          'insert into best_efforts (activity_id, user_id, type, name, distance_m, elapsed_s, is_pr) values (?, ?, ?, ?, ?, ?, ?)',
          id,
          userId,
          type,
          e.name,
          e.distanceM,
          best.elapsedS,
          isPr ? 1 : 0,
        );
      }
      prs += matchActivityToSegments(id, userId, type, startedAt, cum);
      run('update activities set pr_count = ? where id = ?', prs, id);
      return id;
    });
  }

  const routeSummary = (r: Row): RouteSummary => ({
    id: r.id,
    user: userOf(r),
    name: r.name,
    type: r.type,
    distanceM: r.distance_m,
    preview: JSON.parse(r.preview),
    createdAt: r.created_at,
  });

  const ROUTE_SELECT = `select r.*, u.id as u_id, u.username as u_username, u.name as u_name, u.avatar as u_avatar
    from routes r join users u on u.id = r.user_id`;

  /** Rute rencana hanya untuk pembuatnya (sering dimulai dari rumah). */
  function getRoute(id: number, me: number): PlannedRoute {
    const r = one(`${ROUTE_SELECT} where r.id = ? and r.user_id = ?`, id, me);
    if (!r) fail(404, 'Rute tidak ditemukan');
    return {
      ...routeSummary(r),
      waypoints: JSON.parse(r.waypoints),
      geometry: JSON.parse(r.geometry),
      steps: JSON.parse(r.steps),
    };
  }

  const SEGMENT_SELECT = `select s.*, u.id as u_id, u.username as u_username, u.name as u_name, u.avatar as u_avatar,
      (select count(distinct e.user_id) from segment_efforts e where e.segment_id = s.id) as athletes
    from segments s join users u on u.id = s.user_id`;

  const segmentSummary = (r: Row): SegmentSummary => {
    const geometry: LatLon[] = JSON.parse(r.geometry);
    return {
      id: r.id,
      name: r.name,
      type: r.type,
      distanceM: r.distance_m,
      createdBy: userOf(r),
      preview: JSON.parse(r.preview),
      athletes: r.athletes,
      start: geometry[0],
    };
  };

  function getSegment(id: number, me: number, followingOnly: boolean): Segment {
    const r = one(`${SEGMENT_SELECT} where s.id = ?`, id);
    if (!r) fail(404, 'Segmen tidak ditemukan');
    const filter = followingOnly
      ? 'and (e.user_id = $me or e.user_id in (select followee_id from follows where follower_id = $me))'
      : '';
    // SQLite mengambil activity_id & started_at dari baris dengan min(elapsed_s).
    const board = all(
      `select e.user_id as u_id, u.username as u_username, u.name as u_name, u.avatar as u_avatar,
              min(e.elapsed_s) as elapsed_s, e.activity_id, e.started_at
       from segment_efforts e join users u on u.id = e.user_id
       where e.segment_id = $id ${filter}
       group by e.user_id order by elapsed_s asc limit 100`,
      followingOnly ? { id, me } : { id },
    );
    const leaderboard: LeaderboardRow[] = board.map((b, i) => ({
      rank: i + 1,
      user: userOf(b),
      elapsedS: b.elapsed_s,
      activityId: b.activity_id,
      date: b.started_at,
    }));
    const mine = one(
      `select e.user_id as u_id, u.username as u_username, u.name as u_name, u.avatar as u_avatar,
              min(e.elapsed_s) as elapsed_s, e.activity_id, e.started_at
       from segment_efforts e join users u on u.id = e.user_id
       where e.segment_id = ? and e.user_id = ?`,
      id,
      me,
    );
    const myBest: LeaderboardRow | null =
      mine && mine.elapsed_s != null
        ? {
            rank: rankOn(id, me, mine.elapsed_s),
            user: userOf(mine),
            elapsedS: mine.elapsed_s,
            activityId: mine.activity_id,
            date: mine.started_at,
          }
        : null;
    return { ...segmentSummary(r), geometry: JSON.parse(r.geometry), leaderboard, myBest };
  }

  const app = new Hono<Env>();
  app.use('*', cors());

  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
    console.error(err);
    return c.json({ error: 'Terjadi kesalahan di server' }, 500);
  });

  app.get('/health', (c) => c.json({ ok: true }));

  // --- Akun ---

  const startSession = (user: UserSummary): AuthResult => {
    const token = newToken();
    // Sekalian bersihkan sesi yang sudah kedaluwarsa.
    run('delete from sessions where last_used_at < ?', new Date(Date.now() - SESSION_IDLE_MS).toISOString());
    run('insert into sessions (token_hash, user_id) values (?, ?)', hashToken(token), user.id);
    return { token, user };
  };

  const bearer = (c: Context) => c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');

  app.post('/auth/register', async (c) => {
    const b = await body(c);
    const username = str(b.username, 'Username', 3, 20).toLowerCase();
    if (!/^[a-z0-9_.]+$/.test(username)) fail(400, 'Username hanya boleh huruf, angka, titik, dan garis bawah');
    const name = str(b.name, 'Nama', 1, 50);
    // Kata sandi dipakai apa adanya (tidak di-trim), sama seperti saat masuk.
    const password = typeof b.password === 'string' ? b.password : '';
    if (password.length < 6) fail(400, 'Kata sandi minimal 6 karakter');
    if (password.length > 200) fail(400, 'Kata sandi maksimal 200 karakter');
    if (weakPassword(password, username))
      fail(400, 'Kata sandi terlalu mudah ditebak. Pakai gabungan kata dan angka yang tidak umum.');
    if (one('select 1 from users where username = ?', username)) fail(409, 'Username sudah dipakai');
    const id = Number(
      run('insert into users (username, name, password_hash) values (?, ?, ?)', username, name, hashPassword(password))
        .lastInsertRowid,
    );
    return c.json(startSession({ id, username, name }), 201);
  });

  app.post('/auth/login', async (c) => {
    const b = await body(c);
    const username = str(b.username, 'Username', 1, 50).toLowerCase();
    const password = typeof b.password === 'string' ? b.password : '';
    const u = one('select id, username, name, avatar, password_hash from users where username = ?', username);
    // Akun lama didaftarkan dengan kata sandi yang di-trim, jadi coba juga versi tanpa spasi tepi.
    const ok = u && (verifyPassword(password, u.password_hash) || verifyPassword(password.trim(), u.password_hash));
    if (!u || !ok) fail(401, 'Username atau kata sandi salah');
    return c.json(startSession({ id: u.id, username: u.username, name: u.name, avatarUrl: photoUrl(u.avatar) }));
  });

  // Foto disajikan tanpa header Authorization (tag <img> di web tidak bisa mengirimnya); aksesnya dijaga tanda tangan URL.
  app.get('/media/:name', (c) => {
    const name = c.req.param('name');
    if (!verifyMedia(media, name, c.req.query('exp'), c.req.query('sig'))) fail(403, 'Alamat foto tidak berlaku');
    const data = readMedia(media, name);
    if (!data) fail(404, 'Foto tidak ditemukan');
    return c.body(new Uint8Array(data), 200, {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'private, max-age=604800, immutable',
      'X-Content-Type-Options': 'nosniff',
    });
  });

  app.use('*', async (c, next) => {
    if (c.req.path === '/health' || c.req.path.startsWith('/auth/') || c.req.path.startsWith('/media/') || c.req.method === 'OPTIONS')
      return next();
    const hash = hashToken(bearer(c) ?? '');
    const u = one(
      'select u.id, u.username, u.name, s.last_used_at from sessions s join users u on u.id = s.user_id where s.token_hash = ?',
      hash,
    );
    if (!u) fail(401, 'Sesi berakhir, silakan masuk lagi');
    const idleMs = Date.now() - Date.parse(u.last_used_at);
    if (idleMs > SESSION_IDLE_MS) {
      run('delete from sessions where token_hash = ?', hash);
      fail(401, 'Sesi berakhir, silakan masuk lagi');
    }
    // Cukup dicatat sekali sehari supaya tiap permintaan tidak menulis ke database.
    if (idleMs > DAY_MS) run('update sessions set last_used_at = ? where token_hash = ?', new Date().toISOString(), hash);
    c.set('me', { id: u.id, username: u.username, name: u.name });
    await next();
  });

  app.post('/logout', (c) => {
    run('delete from sessions where token_hash = ?', hashToken(bearer(c)!));
    return c.json({ ok: true });
  });

  // --- Notifikasi push ---

  // Satu token per sesi. Token yang sama dari sesi lain (HP yang sama, akun berganti) dipindah ke sesi ini.
  app.put('/me/device', async (c) => {
    const b = await body(c);
    const token = str(b.token, 'Token', 20, 4096);
    const appVersion = typeof b.appVersion === 'string' ? b.appVersion.trim().slice(0, 20) || null : null;
    const hash = hashToken(bearer(c)!);
    run('delete from push_devices where token = ? or session_hash = ?', token, hash);
    run(
      'insert into push_devices (token, user_id, session_hash, platform, app_version) values (?, ?, ?, ?, ?)',
      token,
      c.var.me.id,
      hash,
      b.platform === 'ios' ? 'ios' : 'android',
      appVersion,
    );
    return c.json({ ok: true });
  });

  app.delete('/me/device', (c) => {
    run('delete from push_devices where session_hash = ?', hashToken(bearer(c)!));
    return c.json({ ok: true });
  });

  // --- Pengguna & teman ---

  app.get('/me', (c) => c.json(profile(c.var.me.id, c.var.me.id)));

  app.get('/users', (c) => {
    const me = c.var.me.id;
    const q = (c.req.query('q') ?? '').trim();
    const like = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    const rows = all(
      `select id, username, name, avatar, exists(select 1 from follows where follower_id = $me and followee_id = users.id) as f
       from users where id != $me and (username like $q escape '\\' or name like $q escape '\\')
       order by username limit 30`,
      { me, q: like },
    );
    return c.json(
      rows.map<UserListItem>((r) => ({ id: r.id, username: r.username, name: r.name, avatarUrl: photoUrl(r.avatar), isFollowing: !!r.f })),
    );
  });

  app.get('/users/:id', (c) => c.json(profile(idParam(c), c.var.me.id)));

  app.post('/users/:id/follow', (c) => {
    const id = idParam(c);
    if (id === c.var.me.id) fail(400, 'Tidak bisa mengikuti diri sendiri');
    if (!one('select 1 from users where id = ?', id)) fail(404, 'Pengguna tidak ditemukan');
    if (blockedBy(id, c.var.me.id) || blockedBy(c.var.me.id, id)) fail(403, 'Tidak bisa mengikuti pengguna ini');
    run('insert or ignore into follows (follower_id, followee_id) values (?, ?)', c.var.me.id, id);
    return c.json(profile(id, c.var.me.id));
  });

  app.delete('/users/:id/follow', (c) => {
    const id = idParam(c);
    run('delete from follows where follower_id = ? and followee_id = ?', c.var.me.id, id);
    return c.json(profile(id, c.var.me.id));
  });

  app.get('/users/:id/activities', (c) => {
    const me = c.var.me.id;
    const rows = all(`${ACTIVITY_SELECT} where a.user_id = $uid and a.started_at < $before order by a.started_at desc limit 20`, {
      me,
      uid: idParam(c),
      before: c.req.query('before') ?? '9999',
    });
    return c.json(rows.map((r) => toSummary(r, me)));
  });

  app.get('/users/:id/stats', (c) => {
    const uid = idParam(c);
    const rawType = c.req.query('type') ?? 'run';
    // type=all menggabungkan semua jenis (untuk ringkasan mingguan di beranda).
    const type = rawType === 'all' ? 'all' : actType(rawType);
    const byType = type === 'all' ? '' : 'and type = ?';
    const typeArg = type === 'all' ? [] : [type];
    // Zona waktu pengguna dalam menit di timur UTC (WIB = 420), dibatasi ke zona yang ada (UTC−12 s.d. UTC+14).
    const tz = Math.min(840, Math.max(-720, Number(c.req.query('tz') ?? 420) || 0));
    const local = (iso: string | number) => new Date(new Date(iso).getTime() + tz * 60_000);
    const weekStart = (d: Date) => {
      const offset = (d.getUTCDay() + 6) % 7;
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - offset)).toISOString().slice(0, 10);
    };
    const now = local(Date.now());
    const weeks: WeekTotal[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 7 * 86_400_000);
      weeks.push({ start: weekStart(d), count: 0, distanceM: 0, movingS: 0 });
    }
    const byWeek = new Map(weeks.map((w) => [w.start, w]));
    const thisYear: Totals = { count: 0, distanceM: 0, movingS: 0 };
    const rows = all(`select started_at, distance_m, moving_s from activities where user_id = ? ${byType}`, uid, ...typeArg);
    for (const r of rows) {
      const d = local(r.started_at);
      const w = byWeek.get(weekStart(d));
      for (const t of [w, d.getUTCFullYear() === now.getUTCFullYear() ? thisYear : undefined]) {
        if (!t) continue;
        t.count++;
        t.distanceM += r.distance_m;
        t.movingS += r.moving_s;
      }
    }
    const records = all(
      `select b.name, b.distance_m, min(b.elapsed_s) as elapsed_s, b.activity_id, a.started_at
       from best_efforts b join activities a on a.id = b.activity_id
       where b.user_id = ? and b.type = ? group by b.name order by b.distance_m`,
      uid,
      type === 'all' ? '' : type,
    ).map((r) => ({
      name: r.name,
      distanceM: r.distance_m,
      elapsedS: r.elapsed_s,
      activityId: r.activity_id,
      date: r.started_at,
    }));
    const l = one(
      `select id, distance_m, started_at from activities where user_id = ? ${byType} order by distance_m desc limit 1`,
      uid,
      ...typeArg,
    );
    const stats: Stats = {
      type,
      weeks,
      thisYear,
      allTime: totalsOf(`user_id = ? ${byType}`, uid, ...typeArg),
      records,
      longest: l ? { distanceM: l.distance_m, activityId: l.id, date: l.started_at } : null,
    };
    return c.json(stats);
  });

  // --- Aktivitas, feed, kudos, komentar ---

  app.get('/feed', (c) => {
    const me = c.var.me.id;
    const rows = all(
      `${ACTIVITY_SELECT}
       where (a.user_id = $me or a.user_id in (select followee_id from follows where follower_id = $me))
         and a.started_at < $before
       order by a.started_at desc limit 20`,
      { me, before: c.req.query('before') ?? '9999' },
    );
    return c.json(rows.map((r) => toSummary(r, me)));
  });

  app.post('/activities', async (c) => {
    const b = await body(c);
    const type = actType(b.type);
    const title = str(b.title, 'Judul', 1, 100);
    const track = trackOf(b.track);
    checkPlausible(type, track);
    let routeId: number | null = null;
    if (b.routeId != null) {
      routeId = Number(b.routeId);
      if (!one('select 1 from routes where id = ? and user_id = ?', routeId, c.var.me.id)) routeId = null;
    }
    const id = saveActivity(c.var.me.id, type, title, track, routeId);
    return c.json(getActivity(id, c.var.me.id), 201);
  });

  app.get('/activities/:id', (c) => c.json(getActivity(idParam(c), c.var.me.id)));

  app.patch('/activities/:id', async (c) => {
    const id = idParam(c);
    const b = await body(c);
    const r = one('select user_id from activities where id = ?', id);
    if (!r) fail(404, 'Aktivitas tidak ditemukan');
    if (r.user_id !== c.var.me.id) fail(403, 'Hanya pemilik yang bisa mengubah');
    run('update activities set title = ? where id = ?', str(b.title, 'Judul', 1, 100), id);
    return c.json(getActivity(id, c.var.me.id));
  });

  app.delete('/activities/:id', (c) => {
    const id = idParam(c);
    const r = one('select user_id from activities where id = ?', id);
    if (!r) fail(404, 'Aktivitas tidak ditemukan');
    if (r.user_id !== c.var.me.id) fail(403, 'Hanya pemilik yang bisa menghapus');
    run('delete from activities where id = ?', id);
    return c.json({ ok: true });
  });

  const kudosState = (id: number, me: number): KudosState => ({
    kudos: one('select count(*) as n from kudos where activity_id = ?', id)!.n,
    hasKudo: !!one('select 1 from kudos where activity_id = ? and user_id = ?', id, me),
  });

  app.post('/activities/:id/kudos', (c) => {
    const id = idParam(c);
    const r = one('select user_id from activities where id = ?', id);
    if (!r) fail(404, 'Aktivitas tidak ditemukan');
    if (r.user_id === c.var.me.id) fail(400, 'Tidak bisa memberi kudos ke aktivitas sendiri');
    run('insert or ignore into kudos (activity_id, user_id) values (?, ?)', id, c.var.me.id);
    return c.json(kudosState(id, c.var.me.id));
  });

  app.delete('/activities/:id/kudos', (c) => {
    const id = idParam(c);
    run('delete from kudos where activity_id = ? and user_id = ?', id, c.var.me.id);
    return c.json(kudosState(id, c.var.me.id));
  });

  const COMMENT_SELECT = `select c.id, c.body, c.created_at, u.id as u_id, u.username as u_username, u.name as u_name, u.avatar as u_avatar
    from comments c join users u on u.id = c.user_id`;
  const toComment = (r: Row): Comment => ({ id: r.id, body: r.body, createdAt: r.created_at, user: userOf(r) });

  app.get('/activities/:id/comments', (c) =>
    c.json(all(`${COMMENT_SELECT} where c.activity_id = ? order by c.created_at`, idParam(c)).map(toComment)),
  );

  app.post('/activities/:id/comments', async (c) => {
    const id = idParam(c);
    if (!one('select 1 from activities where id = ?', id)) fail(404, 'Aktivitas tidak ditemukan');
    const text = str((await body(c)).body, 'Komentar', 1, 500);
    const cid = run('insert into comments (activity_id, user_id, body) values (?, ?, ?)', id, c.var.me.id, text).lastInsertRowid;
    return c.json(toComment(one(`${COMMENT_SELECT} where c.id = ?`, cid)!), 201);
  });

  app.delete('/comments/:id', (c) => {
    const id = idParam(c);
    const r = one(
      'select c.user_id, a.user_id as owner from comments c join activities a on a.id = c.activity_id where c.id = ?',
      id,
    );
    if (!r) fail(404, 'Komentar tidak ditemukan');
    if (r.user_id !== c.var.me.id && r.owner !== c.var.me.id) fail(403, 'Tidak boleh menghapus komentar ini');
    run('delete from comments where id = ?', id);
    return c.json({ ok: true });
  });

  // --- Rute rencana ---

  app.post('/routing', async (c) => {
    const b = await body(c);
    return c.json(await planRoute(actType(b.type), latLonList(b.waypoints, 'Titik rute', 2, 50)));
  });

  app.get('/routes', (c) =>
    c.json(all(`${ROUTE_SELECT} where r.user_id = ? order by r.created_at desc`, c.var.me.id).map(routeSummary)),
  );

  app.post('/routes', async (c) => {
    const b = await body(c);
    const name = str(b.name, 'Nama rute', 1, 80);
    const type = actType(b.type);
    const waypoints = latLonList(b.waypoints, 'Titik rute', 2, 50);
    const geometry = latLonList(b.geometry, 'Garis rute', 2, 20_000);
    const steps = stepsOf(b.steps ?? []);
    const id = run(
      `insert into routes (user_id, name, type, distance_m, waypoints, geometry, steps, preview)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
      c.var.me.id,
      name,
      type,
      geo.pathDistance(geometry),
      JSON.stringify(waypoints),
      JSON.stringify(geometry),
      JSON.stringify(steps),
      JSON.stringify(geo.preview(geometry)),
    ).lastInsertRowid;
    return c.json(getRoute(Number(id), c.var.me.id), 201);
  });

  app.get('/routes/:id', (c) => c.json(getRoute(idParam(c), c.var.me.id)));

  app.delete('/routes/:id', (c) => {
    const id = idParam(c);
    const r = one('select user_id from routes where id = ?', id);
    if (!r) fail(404, 'Rute tidak ditemukan');
    if (r.user_id !== c.var.me.id) fail(403, 'Hanya pembuat yang bisa menghapus');
    run('delete from routes where id = ?', id);
    return c.json({ ok: true });
  });

  // --- Segmen & leaderboard ---

  app.post('/segments', async (c) => {
    const b = await body(c);
    const name = str(b.name, 'Nama segmen', 1, 80);
    const activityId = Number(b.activityId);
    const a = one('select user_id, type, track from activities where id = ?', activityId);
    if (!a) fail(404, 'Aktivitas tidak ditemukan');
    if (a.user_id !== c.var.me.id) fail(403, 'Segmen dibuat dari aktivitas sendiri');
    const cum = geo.cumulative(JSON.parse(a.track));
    const points = cum.points;
    const s = Number(b.startIndex);
    const e = Number(b.endIndex);
    if (!Number.isInteger(s) || !Number.isInteger(e) || s < 0 || e >= points.length || s >= e) {
      fail(400, 'Titik awal/akhir segmen tidak valid');
    }
    const slice = geo.toLatLon(points.slice(s, e + 1));
    // Jarak kumulatif tidak menghitung lompatan posisi selama jeda.
    const distanceM = cum.dist[e] - cum.dist[s];
    if (distanceM < 100) fail(400, 'Segmen minimal 100 m');
    const geometry = geo.simplify(slice, 2);
    const bb = geo.bounds(geometry)!;
    const type = segmentType(a.type);
    const id = tx(db, () => {
      const id = Number(
        run(
          `insert into segments (user_id, name, type, distance_m, geometry, preview, min_lat, max_lat, min_lon, max_lon)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          c.var.me.id,
          name,
          type,
          distanceM,
          JSON.stringify(geometry),
          JSON.stringify(geo.preview(geometry)),
          bb.minLat,
          bb.maxLat,
          bb.minLon,
          bb.maxLon,
        ).lastInsertRowid,
      );
      // Cocokkan semua aktivitas lama, urut waktu supaya status PR sesuai sejarah.
      const fam = familyOf(type);
      const acts = all(
        `select id, user_id, started_at, track from activities
         where type in (${fam.map(() => '?').join(',')})
           and max_lat >= ? and min_lat <= ? and max_lon >= ? and min_lon <= ?
         order by started_at`,
        ...fam,
        bb.minLat - BBOX_MARGIN_DEG,
        bb.maxLat + BBOX_MARGIN_DEG,
        bb.minLon - BBOX_MARGIN_DEG,
        bb.maxLon + BBOX_MARGIN_DEG,
      );
      const bestByUser = new Map<number, number>();
      for (const act of acts) {
        const m = geo.matchSegment(geometry, geo.cumulative(JSON.parse(act.track)));
        if (!m) continue;
        const prev = bestByUser.get(act.user_id);
        const isPr = prev != null && m.elapsedS < prev;
        if (prev == null || m.elapsedS < prev) bestByUser.set(act.user_id, m.elapsedS);
        run(
          `insert into segment_efforts (segment_id, activity_id, user_id, elapsed_s, distance_m, start_index, end_index, is_pr, started_at)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          act.id,
          act.user_id,
          m.elapsedS,
          m.distanceM,
          m.startIndex,
          m.endIndex,
          isPr ? 1 : 0,
          act.started_at,
        );
      }
      return id;
    });
    return c.json(getSegment(id, c.var.me.id, false), 201);
  });

  app.get('/segments', (c) => {
    const near = (c.req.query('near') ?? '').split(',').map(Number);
    const rows = all(SEGMENT_SELECT).map(segmentSummary);
    if (near.length === 2 && near.every(Number.isFinite)) {
      const here: LatLon = [near[0], near[1]];
      const withDist = rows.map((s) => ({ s, d: geo.haversine(here, s.start) }));
      withDist.sort((a, b) => a.d - b.d);
      return c.json(withDist.slice(0, 50).map((x) => x.s));
    }
    rows.sort((a, b) => b.athletes - a.athletes || b.id - a.id);
    return c.json(rows.slice(0, 50));
  });

  app.get('/segments/:id', (c) => c.json(getSegment(idParam(c), c.var.me.id, c.req.query('filter') === 'following')));

  app.delete('/segments/:id', (c) => {
    const id = idParam(c);
    const r = one('select user_id from segments where id = ?', id);
    if (!r) fail(404, 'Segmen tidak ditemukan');
    if (r.user_id !== c.var.me.id) fail(403, 'Hanya pembuat yang bisa menghapus');
    run('delete from segments where id = ?', id);
    return c.json({ ok: true });
  });

  // --- Foto profil & sampul ---

  /** Ambil satu foto JPEG dari isian multipart, sudah dibersihkan dari EXIF (lokasi GPS). */
  const photoFrom = async (v: unknown): Promise<Buffer> => {
    if (!v || typeof v !== 'object' || !('arrayBuffer' in v)) fail(400, 'Foto wajib diunggah');
    const f = v as File;
    if (f.size > MAX_PHOTO_BYTES) fail(413, 'Foto maksimal 2 MB');
    const clean = cleanJpeg(Buffer.from(await f.arrayBuffer()));
    if (!clean) fail(400, 'Foto harus berformat JPEG');
    return clean;
  };

  const formOf = async (c: Context) => {
    try {
      return await c.req.parseBody({ all: true });
    } catch {
      fail(400, 'Isi permintaan harus multipart/form-data');
    }
  };

  for (const kind of ['avatar', 'cover'] as const) {
    app.put(`/me/${kind}`, async (c) => {
      const data = await photoFrom((await formOf(c)).foto);
      const me = c.var.me.id;
      const old = one(`select ${kind} as f from users where id = ?`, me)!.f;
      run(`update users set ${kind} = ? where id = ?`, saveJpeg(media, data), me);
      removeMedia(media, old);
      return c.json(profile(me, me));
    });
    app.delete(`/me/${kind}`, (c) => {
      const me = c.var.me.id;
      removeMedia(media, one(`select ${kind} as f from users where id = ?`, me)!.f);
      run(`update users set ${kind} = null where id = ?`, me);
      return c.json(profile(me, me));
    });
  }

  // --- Daftar pengikut & mengikuti ---

  const followList = (sql: string) => (c: Context<Env>) => {
    const id = idParam(c);
    if (!one('select 1 from users where id = ?', id)) fail(404, 'Pengguna tidak ditemukan');
    const rows = all(sql, { id, me: c.var.me.id, before: c.req.query('before') ?? '9999' });
    return c.json(
      rows.map<FollowItem>((r) => ({
        id: r.id,
        username: r.username,
        name: r.name,
        avatarUrl: photoUrl(r.avatar),
        isFollowing: !!r.f,
        since: r.since,
      })),
    );
  };
  const FOLLOW_COLS = `u.id, u.username, u.name, u.avatar, f.created_at as since,
    exists(select 1 from follows x where x.follower_id = $me and x.followee_id = u.id) as f`;
  app.get(
    '/users/:id/followers',
    followList(`select ${FOLLOW_COLS} from follows f join users u on u.id = f.follower_id
      where f.followee_id = $id and f.created_at < $before order by f.created_at desc limit 30`),
  );
  app.get(
    '/users/:id/following',
    followList(`select ${FOLLOW_COLS} from follows f join users u on u.id = f.followee_id
      where f.follower_id = $id and f.created_at < $before order by f.created_at desc limit 30`),
  );

  // --- Postingan ---

  const POST_SELECT = `
    select p.id, p.body, p.created_at, p.segment_id, p.activity_id, s.name as s_name, a.title as a_title, a.type as a_type,
           u.id as u_id, u.username as u_username, u.name as u_name, u.avatar as u_avatar,
           (select count(*) from post_likes l where l.post_id = p.id) as likes,
           exists(select 1 from post_likes l where l.post_id = p.id and l.user_id = $me) as has_liked,
           (select count(*) from post_replies r where r.post_id = p.id) as replies
    from posts p join users u on u.id = p.user_id
      left join segments s on s.id = p.segment_id
      left join activities a on a.id = p.activity_id`;

  const toPost = (r: Row): Post => ({
    id: r.id,
    user: userOf(r),
    body: r.body,
    photos: all('select file from post_photos where post_id = ? order by position', r.id).map((f) => photoUrl(f.file)!),
    segment: r.segment_id != null && r.s_name != null ? { id: r.segment_id, name: r.s_name } : null,
    activity: r.activity_id != null && r.a_title != null ? { id: r.activity_id, title: r.a_title, type: r.a_type } : null,
    createdAt: r.created_at,
    likes: r.likes,
    hasLiked: !!r.has_liked,
    replies: r.replies,
  });

  const getPost = (id: number, me: number): Post => {
    const r = one(`${POST_SELECT} where p.id = $id`, { id, me });
    if (!r) fail(404, 'Postingan tidak ditemukan');
    return toPost(r);
  };

  app.post('/posts', async (c) => {
    const me = c.var.me.id;
    const form = await formOf(c);
    const text = typeof form.body === 'string' ? form.body.trim() : '';
    if (text.length > 500) fail(400, 'Postingan maksimal 500 karakter');
    const raw = form.foto == null ? [] : Array.isArray(form.foto) ? form.foto : [form.foto];
    if (raw.length > 4) fail(400, 'Maksimal 4 foto');
    if (!text && raw.length === 0) fail(400, 'Tulis sesuatu atau pilih foto');
    const photos = await Promise.all(raw.map(photoFrom));
    let segmentId: number | null = null;
    if (form.segmentId != null && form.segmentId !== '') {
      segmentId = Number(form.segmentId);
      if (!one('select 1 from segments where id = ?', segmentId)) fail(404, 'Segmen tidak ditemukan');
    }
    let activityId: number | null = null;
    if (form.activityId != null && form.activityId !== '') {
      activityId = Number(form.activityId);
      const a = one('select user_id from activities where id = ?', activityId);
      if (!a) fail(404, 'Aktivitas tidak ditemukan');
      if (a.user_id !== me) fail(403, 'Hanya aktivitas sendiri yang bisa ditautkan');
    }
    const id = tx(db, () => {
      const id = Number(
        run('insert into posts (user_id, body, segment_id, activity_id) values (?, ?, ?, ?)', me, text, segmentId, activityId)
          .lastInsertRowid,
      );
      photos.forEach((data, i) => run('insert into post_photos (post_id, position, file) values (?, ?, ?)', id, i, saveJpeg(media, data)));
      return id;
    });
    return c.json(getPost(id, me), 201);
  });

  app.get('/posts/:id', (c) => c.json(getPost(idParam(c), c.var.me.id)));

  app.delete('/posts/:id', (c) => {
    const id = idParam(c);
    const r = one('select user_id from posts where id = ?', id);
    if (!r) fail(404, 'Postingan tidak ditemukan');
    if (r.user_id !== c.var.me.id) fail(403, 'Hanya pemilik yang bisa menghapus');
    const files = all('select file from post_photos where post_id = ?', id);
    run('delete from posts where id = ?', id);
    for (const f of files) removeMedia(media, f.file);
    return c.json({ ok: true });
  });

  const likeState = (id: number, me: number): LikeState => ({
    likes: one('select count(*) as n from post_likes where post_id = ?', id)!.n,
    hasLiked: !!one('select 1 from post_likes where post_id = ? and user_id = ?', id, me),
  });

  app.post('/posts/:id/like', (c) => {
    const id = idParam(c);
    if (!one('select 1 from posts where id = ?', id)) fail(404, 'Postingan tidak ditemukan');
    run('insert or ignore into post_likes (post_id, user_id) values (?, ?)', id, c.var.me.id);
    return c.json(likeState(id, c.var.me.id));
  });

  app.delete('/posts/:id/like', (c) => {
    const id = idParam(c);
    run('delete from post_likes where post_id = ? and user_id = ?', id, c.var.me.id);
    return c.json(likeState(id, c.var.me.id));
  });

  const REPLY_SELECT = `select r.id, r.body, r.created_at, u.id as u_id, u.username as u_username, u.name as u_name, u.avatar as u_avatar
    from post_replies r join users u on u.id = r.user_id`;
  const toReply = (r: Row): PostReply => ({ id: r.id, body: r.body, createdAt: r.created_at, user: userOf(r) });

  app.get('/posts/:id/replies', (c) =>
    c.json(all(`${REPLY_SELECT} where r.post_id = ? order by r.created_at`, idParam(c)).map(toReply)),
  );

  app.post('/posts/:id/replies', async (c) => {
    const id = idParam(c);
    if (!one('select 1 from posts where id = ?', id)) fail(404, 'Postingan tidak ditemukan');
    const text = str((await body(c)).body, 'Balasan', 1, 500);
    const rid = run('insert into post_replies (post_id, user_id, body) values (?, ?, ?)', id, c.var.me.id, text).lastInsertRowid;
    return c.json(toReply(one(`${REPLY_SELECT} where r.id = ?`, rid)!), 201);
  });

  app.delete('/replies/:id', (c) => {
    const id = idParam(c);
    const r = one('select r.user_id, p.user_id as owner from post_replies r join posts p on p.id = r.post_id where r.id = ?', id);
    if (!r) fail(404, 'Balasan tidak ditemukan');
    if (r.user_id !== c.var.me.id && r.owner !== c.var.me.id) fail(403, 'Tidak boleh menghapus balasan ini');
    run('delete from post_replies where id = ?', id);
    return c.json({ ok: true });
  });

  app.post('/posts/:id/report', async (c) => {
    const id = idParam(c);
    if (!one('select 1 from posts where id = ?', id)) fail(404, 'Postingan tidak ditemukan');
    const reason = str((await body(c)).reason, 'Alasan', 1, 300);
    run('insert into reports (reporter_id, post_id, reason) values (?, ?, ?)', c.var.me.id, id, reason);
    return c.json({ ok: true }, 201);
  });

  // Diskusi segmen: semua postingan yang menandai segmen ini, kecuali dari orang yang diblokir.
  app.get('/segments/:id/posts', (c) => {
    const me = c.var.me.id;
    const rows = all(
      `${POST_SELECT} where p.segment_id = $id and p.created_at < $before
         and p.user_id not in (select blocked_id from blocks where blocker_id = $me)
       order by p.created_at desc limit 20`,
      { id: idParam(c), me, before: c.req.query('before') ?? '9999' },
    );
    return c.json(rows.map(toPost));
  });

  // Feed baru: aktivitas + postingan dari diri sendiri dan yang diikuti. /feed lama tetap untuk APK lama.
  app.get('/timeline', (c) => {
    const me = c.var.me.id;
    const params = { me, before: c.req.query('before') ?? '9999' };
    const circle = 'in (select followee_id from follows where follower_id = $me)';
    const acts = all(
      `${ACTIVITY_SELECT} where (a.user_id = $me or a.user_id ${circle}) and a.started_at < $before order by a.started_at desc limit 20`,
      params,
    ).map((r): TimelineItem => ({ kind: 'activity', at: r.started_at, ...toSummary(r, me) }));
    const posts = all(
      `${POST_SELECT} where (p.user_id = $me or p.user_id ${circle}) and p.created_at < $before order by p.created_at desc limit 20`,
      params,
    ).map((r): TimelineItem => ({ kind: 'post', at: r.created_at, ...toPost(r) }));
    return c.json([...acts, ...posts].sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : 0)).slice(0, 20));
  });

  // --- Chat & blokir ---

  const toMessage = (r: Row, me: number): ChatMessage => ({
    id: r.id,
    fromMe: r.from_id === me,
    body: r.body,
    createdAt: r.created_at,
    readAt: r.read_at ?? null,
  });

  const partnerOf = (c: Context<Env>) => {
    const id = idParam(c, 'userId');
    if (id === c.var.me.id) fail(400, 'Tidak bisa mengobrol dengan diri sendiri');
    if (!one('select 1 from users where id = ?', id)) fail(404, 'Pengguna tidak ditemukan');
    return id;
  };

  app.get('/chats', (c) => {
    const me = c.var.me.id;
    const rows = all(
      `select partner, max(id) as last_id, sum(case when to_id = $me and read_at is null then 1 else 0 end) as unread
       from (select id, to_id, read_at, case when from_id = $me then to_id else from_id end as partner
             from messages where from_id = $me or to_id = $me)
       group by partner order by last_id desc limit 50`,
      { me },
    );
    return c.json(
      rows.map<ChatSummary>((r) => {
        const u = one('select id as u_id, username as u_username, name as u_name, avatar as u_avatar from users where id = ?', r.partner)!;
        return { user: userOf(u), last: toMessage(one('select * from messages where id = ?', r.last_id)!, me), unread: r.unread };
      }),
    );
  });

  app.get('/chats/unread', (c) =>
    c.json({ count: one('select count(*) as n from messages where to_id = ? and read_at is null', c.var.me.id)!.n }),
  );

  // ?before=<id> untuk menggulir ke pesan lama; ?after=<id> untuk polling pesan baru.
  app.get('/chats/:userId', (c) => {
    const me = c.var.me.id;
    const other = partnerOf(c);
    const pair = '((from_id = $me and to_id = $other) or (from_id = $other and to_id = $me))';
    const after = Number(c.req.query('after') ?? 0) || 0;
    const before = Number(c.req.query('before') ?? 0) || Number.MAX_SAFE_INTEGER;
    const rows = after
      ? all(`select * from messages where ${pair} and id > $after order by id asc limit 100`, { me, other, after })
      : all(`select * from messages where ${pair} and id < $before order by id desc limit 30`, { me, other, before }).reverse();
    return c.json(rows.map((r) => toMessage(r, me)));
  });

  app.post('/chats/:userId', async (c) => {
    const me = c.var.me.id;
    const other = partnerOf(c);
    const text = str((await body(c)).body, 'Pesan', 1, 1000);
    if (blockedBy(me, other) || blockedBy(other, me)) fail(403, 'Tidak bisa mengirim pesan ke pengguna ini');
    if (!(isFollowing(me, other) && isFollowing(other, me))) fail(403, 'Pesan hanya bisa dikirim ke teman yang saling mengikuti');
    const id = run('insert into messages (from_id, to_id, body) values (?, ?, ?)', me, other, text).lastInsertRowid;
    return c.json(toMessage(one('select * from messages where id = ?', id)!, me), 201);
  });

  app.post('/chats/:userId/read', (c) => {
    const me = c.var.me.id;
    const other = partnerOf(c);
    run('update messages set read_at = ? where from_id = ? and to_id = ? and read_at is null', new Date().toISOString(), other, me);
    return c.json({ ok: true });
  });

  // Hapus pesan sendiri (hilang juga dari layar lawan bicara).
  app.delete('/chats/messages/:id', (c) => {
    const id = idParam(c);
    const r = one('select from_id from messages where id = ?', id);
    if (!r) fail(404, 'Pesan tidak ditemukan');
    if (r.from_id !== c.var.me.id) fail(403, 'Hanya pengirim yang bisa menghapus pesan');
    run('delete from messages where id = ?', id);
    return c.json({ ok: true });
  });

  // Blokir: putus saling mengikuti dan tolak pesan dari kedua arah.
  app.post('/users/:id/block', (c) => {
    const me = c.var.me.id;
    const id = idParam(c);
    if (id === me) fail(400, 'Tidak bisa memblokir diri sendiri');
    if (!one('select 1 from users where id = ?', id)) fail(404, 'Pengguna tidak ditemukan');
    tx(db, () => {
      run('insert or ignore into blocks (blocker_id, blocked_id) values (?, ?)', me, id);
      run('delete from follows where (follower_id = ? and followee_id = ?) or (follower_id = ? and followee_id = ?)', me, id, id, me);
    });
    return c.json(profile(id, me));
  });

  app.delete('/users/:id/block', (c) => {
    const id = idParam(c);
    run('delete from blocks where blocker_id = ? and blocked_id = ?', c.var.me.id, id);
    return c.json(profile(id, c.var.me.id));
  });

  return app;
}
