import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { hashToken } from './auth.ts';

const NOW = `(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

/** Sesi menyimpan hash token (bukan token mentah); kedaluwarsa bila lama tidak dipakai (`last_used_at`). */
const sessionsTable = (name: string) => `
create table if not exists ${name} (
  token_hash text primary key,
  user_id integer not null references users(id) on delete cascade,
  created_at text not null default ${NOW},
  last_used_at text not null default ${NOW}
);`;

const SCHEMA = `
create table if not exists users (
  id integer primary key,
  username text not null unique collate nocase,
  name text not null,
  password_hash text not null,
  created_at text not null default ${NOW}
);

${sessionsTable('sessions')}

create table if not exists follows (
  follower_id integer not null references users(id) on delete cascade,
  followee_id integer not null references users(id) on delete cascade,
  created_at text not null default ${NOW},
  primary key (follower_id, followee_id)
);

create table if not exists routes (
  id integer primary key,
  user_id integer not null references users(id) on delete cascade,
  name text not null,
  type text not null,
  distance_m real not null,
  waypoints text not null,
  geometry text not null,
  steps text not null,
  preview text not null,
  created_at text not null default ${NOW}
);

create table if not exists activities (
  id integer primary key,
  user_id integer not null references users(id) on delete cascade,
  type text not null,
  title text not null,
  started_at text not null,
  elapsed_s real not null,
  moving_s real not null,
  distance_m real not null,
  elev_gain_m real not null,
  max_speed_mps real not null,
  min_lat real not null, max_lat real not null,
  min_lon real not null, max_lon real not null,
  preview text not null,
  track text not null,
  splits text not null,
  pr_count integer not null default 0,
  route_id integer references routes(id) on delete set null,
  created_at text not null default ${NOW}
);
create index if not exists activities_user on activities(user_id, started_at desc);

create table if not exists best_efforts (
  activity_id integer not null references activities(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  type text not null,
  name text not null,
  distance_m real not null,
  elapsed_s real not null,
  is_pr integer not null default 0,
  primary key (activity_id, name)
);
create index if not exists best_efforts_user on best_efforts(user_id, type, name, elapsed_s);

create table if not exists kudos (
  activity_id integer not null references activities(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  created_at text not null default ${NOW},
  primary key (activity_id, user_id)
);

create table if not exists comments (
  id integer primary key,
  activity_id integer not null references activities(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  body text not null,
  created_at text not null default ${NOW}
);
create index if not exists comments_activity on comments(activity_id, created_at);

create table if not exists segments (
  id integer primary key,
  user_id integer not null references users(id) on delete cascade,
  name text not null,
  type text not null,
  distance_m real not null,
  geometry text not null,
  preview text not null,
  min_lat real not null, max_lat real not null,
  min_lon real not null, max_lon real not null,
  created_at text not null default ${NOW}
);

create table if not exists segment_efforts (
  id integer primary key,
  segment_id integer not null references segments(id) on delete cascade,
  activity_id integer not null references activities(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  elapsed_s real not null,
  distance_m real not null,
  start_index integer not null,
  end_index integer not null,
  is_pr integer not null default 0,
  started_at text not null,
  unique (segment_id, activity_id)
);
create index if not exists segment_efforts_board on segment_efforts(segment_id, elapsed_s);

create table if not exists posts (
  id integer primary key,
  user_id integer not null references users(id) on delete cascade,
  body text not null,
  segment_id integer references segments(id) on delete set null,
  activity_id integer references activities(id) on delete set null,
  created_at text not null default ${NOW}
);
create index if not exists posts_user on posts(user_id, created_at desc);
create index if not exists posts_segment on posts(segment_id, created_at desc);

create table if not exists post_photos (
  post_id integer not null references posts(id) on delete cascade,
  position integer not null,
  file text not null,
  primary key (post_id, position)
);

create table if not exists post_likes (
  post_id integer not null references posts(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  created_at text not null default ${NOW},
  primary key (post_id, user_id)
);

create table if not exists post_replies (
  id integer primary key,
  post_id integer not null references posts(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  body text not null,
  created_at text not null default ${NOW}
);
create index if not exists post_replies_post on post_replies(post_id, created_at);

create table if not exists reports (
  id integer primary key,
  reporter_id integer not null references users(id) on delete cascade,
  post_id integer not null references posts(id) on delete cascade,
  reason text not null,
  created_at text not null default ${NOW}
);

create table if not exists messages (
  id integer primary key,
  from_id integer not null references users(id) on delete cascade,
  to_id integer not null references users(id) on delete cascade,
  body text not null,
  created_at text not null default ${NOW},
  read_at text
);
create index if not exists messages_pair on messages(from_id, to_id, id);
create index if not exists messages_unread on messages(to_id, read_at);

create table if not exists blocks (
  blocker_id integer not null references users(id) on delete cascade,
  blocked_id integer not null references users(id) on delete cascade,
  created_at text not null default ${NOW},
  primary key (blocker_id, blocked_id)
);

-- Token FCM satu HP per sesi: keluar atau sesi kedaluwarsa ikut menghapusnya.
create table if not exists push_devices (
  token text primary key,
  user_id integer not null references users(id) on delete cascade,
  session_hash text not null unique references sessions(token_hash) on delete cascade,
  platform text not null,
  app_version text,
  created_at text not null default ${NOW},
  last_seen_at text not null default ${NOW}
);
create index if not exists push_devices_user on push_devices(user_id);

-- Catatan setiap notifikasi yang dikirim dari server (deploy/deploy.sh notif).
create table if not exists announcements (
  id integer primary key,
  kind text not null,
  title text not null,
  body text not null,
  url text,
  target text not null,
  sent integer not null default 0,
  failed integer not null default 0,
  created_at text not null default ${NOW}
);
`;

export type DB = DatabaseSync;

export function openDb(path: string): DB {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('pragma journal_mode = wal; pragma foreign_keys = on; pragma busy_timeout = 5000;');
  migrateSessions(db);
  db.exec(SCHEMA);
  migrateUserPhotos(db);
  return db;
}

/** Kolom foto profil dan sampul (nama berkas di data/uploads) ditambahkan ke database lama. */
function migrateUserPhotos(db: DB) {
  const cols = (db.prepare('pragma table_info(users)').all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes('avatar')) db.exec('alter table users add column avatar text');
  if (!cols.includes('cover')) db.exec('alter table users add column cover text');
}

/**
 * Database lama menyimpan token mentah di kolom `sessions.token`. Ganti dengan hash-nya dalam satu transaksi,
 * jadi tidak ada pengguna yang ter-logout; `last_used_at` dihitung mulai saat migrasi.
 */
function migrateSessions(db: DB) {
  const cols = db.prepare('pragma table_info(sessions)').all() as { name: string }[];
  if (!cols.some((c) => c.name === 'token')) return;
  tx(db, () => {
    db.exec(sessionsTable('sessions_new'));
    const insert = db.prepare('insert into sessions_new (token_hash, user_id, created_at) values (?, ?, ?)');
    const old = db.prepare('select token, user_id, created_at from sessions').all() as {
      token: string;
      user_id: number;
      created_at: string;
    }[];
    for (const r of old) insert.run(hashToken(r.token), r.user_id, r.created_at);
    db.exec('drop table sessions; alter table sessions_new rename to sessions;');
  });
}

/** Jalankan `fn` dalam satu transaksi. */
export function tx<T>(db: DB, fn: () => T): T {
  db.exec('begin');
  try {
    const out = fn();
    db.exec('commit');
    return out;
  } catch (e) {
    db.exec('rollback');
    throw e;
  }
}
