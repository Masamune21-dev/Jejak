// Kontrak data antara app dan server. Hanya tipe, tanpa kode, supaya bisa
// dipakai Metro (app) dan Node (server) tanpa langkah build.

import type { LatLon, TrackPoint } from './geo.ts';

export type { LatLon, TrackPoint };

export type ActivityType = 'run' | 'ride' | 'walk';

export interface UserSummary {
  id: number;
  username: string;
  name: string;
  /** Alamat foto profil relatif terhadap API (bertanda tangan, berlaku 1–2 minggu); null bila belum ada. */
  avatarUrl?: string | null;
}

export interface Totals {
  count: number;
  distanceM: number;
  movingS: number;
}

export interface UserListItem extends UserSummary {
  isFollowing: boolean;
}

/** Baris daftar pengikut / mengikuti; `since` = waktu mulai mengikuti (kursor halaman). */
export interface FollowItem extends UserListItem {
  since: string;
}

export interface KudosState {
  kudos: number;
  hasKudo: boolean;
}

export interface Profile extends UserSummary {
  createdAt: string;
  followers: number;
  following: number;
  isFollowing: boolean;
  isMe: boolean;
  totals: Totals;
  coverUrl: string | null;
  /** Saling mengikuti dengan pengguna yang sedang login. */
  isMutual: boolean;
  /** Pengguna yang sedang login memblokir profil ini. */
  blocked: boolean;
  /** Boleh mengirim pesan: saling mengikuti dan tidak ada blokir dari kedua pihak. */
  canMessage: boolean;
}

export interface AuthResult {
  token: string;
  user: UserSummary;
}

export interface Split {
  /** Nomor km (1, 2, 3 …); km terakhir bisa pendek. */
  index: number;
  distanceM: number;
  elapsedS: number;
}

export interface BestEffort {
  name: string;
  distanceM: number;
  elapsedS: number;
  /** Rekor pribadi baru saat aktivitas ini diunggah. */
  isPr?: boolean;
}

export interface SegmentEffort {
  id: number;
  segmentId: number;
  segmentName: string;
  elapsedS: number;
  distanceM: number;
  startIndex: number;
  endIndex: number;
  /** Peringkat waktu terbaik pengguna ini di leaderboard segmen. */
  rank: number | null;
  isPr: boolean;
}

export interface ActivitySummary {
  id: number;
  user: UserSummary;
  type: ActivityType;
  title: string;
  startedAt: string;
  elapsedS: number;
  movingS: number;
  distanceM: number;
  elevGainM: number;
  preview: LatLon[];
  kudos: number;
  hasKudo: boolean;
  comments: number;
  routeId: number | null;
  prCount: number;
}

export interface Activity extends ActivitySummary {
  track: TrackPoint[][];
  maxSpeedMps: number;
  splits: Split[];
  bestEfforts: BestEffort[];
  efforts: SegmentEffort[];
  kudosBy: UserSummary[];
}

export interface NewActivity {
  type: ActivityType;
  title: string;
  track: TrackPoint[][];
  routeId?: number | null;
}

export interface Comment {
  id: number;
  user: UserSummary;
  body: string;
  createdAt: string;
}

export interface RouteStep {
  /** Jarak dari awal rute sampai titik belok. */
  atM: number;
  text: string;
  at: LatLon;
}

export interface RoutingResult {
  geometry: LatLon[];
  distanceM: number;
  steps: RouteStep[];
  /** false bila layanan routing gagal dan rute dibuat garis lurus. */
  snapped: boolean;
}

export interface RouteSummary {
  id: number;
  user: UserSummary;
  name: string;
  type: ActivityType;
  distanceM: number;
  preview: LatLon[];
  createdAt: string;
}

export interface PlannedRoute extends RouteSummary {
  waypoints: LatLon[];
  geometry: LatLon[];
  steps: RouteStep[];
}

export interface NewRoute {
  name: string;
  type: ActivityType;
  waypoints: LatLon[];
  geometry: LatLon[];
  steps: RouteStep[];
}

export interface LeaderboardRow {
  rank: number;
  user: UserSummary;
  elapsedS: number;
  activityId: number;
  date: string;
}

export interface SegmentSummary {
  id: number;
  name: string;
  type: ActivityType;
  distanceM: number;
  createdBy: UserSummary;
  preview: LatLon[];
  athletes: number;
  start: LatLon;
}

export interface Segment extends SegmentSummary {
  geometry: LatLon[];
  leaderboard: LeaderboardRow[];
  myBest: LeaderboardRow | null;
}

export interface NewSegment {
  activityId: number;
  /** Indeks pada titik track yang sudah diratakan (semua bagian disambung). */
  startIndex: number;
  endIndex: number;
  name: string;
}

export interface WeekTotal extends Totals {
  /** Senin awal minggu, YYYY-MM-DD. */
  start: string;
}

export interface Record {
  name: string;
  distanceM: number;
  elapsedS: number;
  activityId: number;
  date: string;
}

export interface Stats {
  type: ActivityType | 'all';
  weeks: WeekTotal[];
  thisYear: Totals;
  allTime: Totals;
  records: Record[];
  longest: { distanceM: number; activityId: number; date: string } | null;
}

// --- Postingan ---

export interface Post {
  id: number;
  user: UserSummary;
  body: string;
  /** Alamat foto (bertanda tangan), urut sesuai unggahan. */
  photos: string[];
  segment: { id: number; name: string } | null;
  activity: { id: number; title: string; type: ActivityType } | null;
  createdAt: string;
  likes: number;
  hasLiked: boolean;
  replies: number;
}

export interface PostReply {
  id: number;
  user: UserSummary;
  body: string;
  createdAt: string;
}

export interface LikeState {
  likes: number;
  hasLiked: boolean;
}

/** Isi feed Beranda baru: aktivitas dan postingan, urut waktu (terbaru dulu). `at` = kursor halaman. */
export type TimelineItem = ({ kind: 'activity'; at: string } & ActivitySummary) | ({ kind: 'post'; at: string } & Post);

// --- Chat ---

export interface ChatMessage {
  id: number;
  fromMe: boolean;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface ChatSummary {
  user: UserSummary;
  last: ChatMessage;
  unread: number;
}
