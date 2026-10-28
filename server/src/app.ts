import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import type {
  Activity,
  ActivitySummary,
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
import { hashPassword, newToken, verifyPassword } from './auth.ts';
import { tx, type DB } from './db.ts';
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

export function createApp(db: DB, opts: { planRoute?: typeof defaultPlanRoute } = {}) {
  const planRoute = opts.planRoute ?? defaultPlanRoute;
  const one = <T = Row>(sql: string, ...p: any[]) => db.prepare(sql).get(...p) as T | undefined;
  const all = <T = Row>(sql: string, ...p: any[]) => db.prepare(sql).all(...p) as T[];
  const run = (sql: string, ...p: any[]) => db.prepare(sql).run(...p);

  const userOf = (r: Row): UserSummary => ({ id: r.u_id, username: r.u_username, name: r.u_name });

  const ACTIVITY_SELECT = `
    select a.id, a.type, a.title, a.started_at, a.elapsed_s, a.moving_s, a.distance_m, a.elev_gain_m,
           a.preview, a.route_id, a.pr_count,
           u.id as u_id, u.username as u_username, u.name as u_name,
           (select count(*) from kudos k where k.activity_id = a.id) as kudos,
           exists(select 1 from kudos k where k.activity_id = a.id and k.user_id = $me) as has_kudo,
           (select count(*) from comments c where c.activity_id = a.id) as comments
    from activities a join users u on u.id = a.user_id`;

  const toSummary = (r: Row): ActivitySummary => ({
    id: r.id,
    user: userOf(r),
    type: r.type,
    title: r.title,
    startedAt: r.started_at,
    elapsedS: r.elapsed_s,
    movingS: r.moving_s,
    distanceM: r.distance_m,
    elevGainM: r.elev_gain_m,
    preview: JSON.parse(r.preview),
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

  function profile(id: number, me: number): Profile {
    const u = one('select id, username, name, created_at from users where id = ?', id);
    if (!u) fail(404, 'Pengguna tidak ditemukan');
    return {
      id: u.id,
      username: u.username,
      name: u.name,
      createdAt: u.created_at,
      followers: one('select count(*) as n from follows where followee_id = ?', id)!.n,
      following: one('select count(*) as n from follows where follower_id = ?', id)!.n,
      isFollowing: isFollowing(me, id),
      isMe: id === me,
      totals: totalsOf('user_id = ?', id),
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
      startIndex: e.start_index,
      endIndex: e.end_index,
      rank: rankOn(e.segment_id, e.user_id, e.elapsed_s),
      isPr: !!e.is_pr,
    }));
    const kudosBy = all(
      `select u.id as u_id, u.username as u_username, u.name as u_name
       from kudos k join users u on u.id = k.user_id where k.activity_id = ? order by k.created_at desc limit 50`,
      id,
    ).map(userOf);
    return {
      ...toSummary(r),
      track: JSON.parse(extra.track),
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

  const ROUTE_SELECT = `select r.*, u.id as u_id, u.username as u_username, u.name as u_name
    from routes r join users u on u.id = r.user_id`;

  function getRoute(id: number): PlannedRoute {
    const r = one(`${ROUTE_SELECT} where r.id = ?`, id);
    if (!r) fail(404, 'Rute tidak ditemukan');
    return {
      ...routeSummary(r),
      waypoints: JSON.parse(r.waypoints),
      geometry: JSON.parse(r.geometry),
      steps: JSON.parse(r.steps),
    };
  }

  const SEGMENT_SELECT = `select s.*, u.id as u_id, u.username as u_username, u.name as u_name,
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
      `select e.user_id as u_id, u.username as u_username, u.name as u_name,
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
      `select e.user_id as u_id, u.username as u_username, u.name as u_name,
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
    run('insert into sessions (token, user_id) values (?, ?)', token, user.id);
    return { token, user };
  };

  app.post('/auth/register', async (c) => {
    const b = await body(c);
    const username = str(b.username, 'Username', 3, 20).toLowerCase();
    if (!/^[a-z0-9_.]+$/.test(username)) fail(400, 'Username hanya boleh huruf, angka, titik, dan garis bawah');
    const name = str(b.name, 'Nama', 1, 50);
    // Kata sandi dipakai apa adanya (tidak di-trim), sama seperti saat masuk.
    const password = typeof b.password === 'string' ? b.password : '';
    if (password.length < 6) fail(400, 'Kata sandi minimal 6 karakter');
    if (password.length > 200) fail(400, 'Kata sandi maksimal 200 karakter');
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
    const u = one('select id, username, name, password_hash from users where username = ?', username);
    // Akun lama didaftarkan dengan kata sandi yang di-trim, jadi coba juga versi tanpa spasi tepi.
    const ok = u && (verifyPassword(password, u.password_hash) || verifyPassword(password.trim(), u.password_hash));
    if (!u || !ok) fail(401, 'Username atau kata sandi salah');
    return c.json(startSession({ id: u.id, username: u.username, name: u.name }));
  });

  app.use('*', async (c, next) => {
    if (c.req.path === '/health' || c.req.path.startsWith('/auth/') || c.req.method === 'OPTIONS') return next();
    const token = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
    const u = token
      ? one('select u.id, u.username, u.name from sessions s join users u on u.id = s.user_id where s.token = ?', token)
      : undefined;
    if (!u) fail(401, 'Sesi berakhir, silakan masuk lagi');
    c.set('me', { id: u.id, username: u.username, name: u.name });
    await next();
  });

  app.post('/logout', (c) => {
    const token = c.req.header('Authorization')!.replace(/^Bearer\s+/i, '');
    run('delete from sessions where token = ?', token);
    return c.json({ ok: true });
  });

  // --- Pengguna & teman ---

  app.get('/me', (c) => c.json(profile(c.var.me.id, c.var.me.id)));

  app.get('/users', (c) => {
    const me = c.var.me.id;
    const q = (c.req.query('q') ?? '').trim();
    const like = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    const rows = all(
      `select id, username, name, exists(select 1 from follows where follower_id = $me and followee_id = users.id) as f
       from users where id != $me and (username like $q escape '\\' or name like $q escape '\\')
       order by username limit 30`,
      { me, q: like },
    );
    return c.json(rows.map<UserListItem>((r) => ({ id: r.id, username: r.username, name: r.name, isFollowing: !!r.f })));
  });

  app.get('/users/:id', (c) => c.json(profile(idParam(c), c.var.me.id)));

  app.post('/users/:id/follow', (c) => {
    const id = idParam(c);
    if (id === c.var.me.id) fail(400, 'Tidak bisa mengikuti diri sendiri');
    if (!one('select 1 from users where id = ?', id)) fail(404, 'Pengguna tidak ditemukan');
    run('insert or ignore into follows (follower_id, followee_id) values (?, ?)', c.var.me.id, id);
    return c.json(profile(id, c.var.me.id));
  });

  app.delete('/users/:id/follow', (c) => {
    const id = idParam(c);
    run('delete from follows where follower_id = ? and followee_id = ?', c.var.me.id, id);
    return c.json(profile(id, c.var.me.id));
  });

  app.get('/users/:id/activities', (c) => {
    const rows = all(`${ACTIVITY_SELECT} where a.user_id = $uid and a.started_at < $before order by a.started_at desc limit 20`, {
      me: c.var.me.id,
      uid: idParam(c),
      before: c.req.query('before') ?? '9999',
    });
    return c.json(rows.map(toSummary));
  });

  app.get('/users/:id/stats', (c) => {
    const uid = idParam(c);
    const rawType = c.req.query('type') ?? 'run';
    // type=all menggabungkan semua jenis (untuk ringkasan mingguan di beranda).
    const type = rawType === 'all' ? 'all' : actType(rawType);
    const byType = type === 'all' ? '' : 'and type = ?';
    const typeArg = type === 'all' ? [] : [type];
    // Zona waktu pengguna dalam menit di timur UTC (WIB = 420).
    const tz = Number(c.req.query('tz') ?? 420) || 0;
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
    const rows = all(
      `${ACTIVITY_SELECT}
       where (a.user_id = $me or a.user_id in (select followee_id from follows where follower_id = $me))
         and a.started_at < $before
       order by a.started_at desc limit 20`,
      { me: c.var.me.id, before: c.req.query('before') ?? '9999' },
    );
    return c.json(rows.map(toSummary));
  });

  app.post('/activities', async (c) => {
    const b = await body(c);
    const type = actType(b.type);
    const title = str(b.title, 'Judul', 1, 100);
    const track = trackOf(b.track);
    let routeId: number | null = null;
    if (b.routeId != null) {
      routeId = Number(b.routeId);
      if (!one('select 1 from routes where id = ?', routeId)) routeId = null;
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

  const COMMENT_SELECT = `select c.id, c.body, c.created_at, u.id as u_id, u.username as u_username, u.name as u_name
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
    return c.json(getRoute(Number(id)), 201);
  });

  app.get('/routes/:id', (c) => c.json(getRoute(idParam(c))));

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

  return app;
}
