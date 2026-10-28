// Kontrak data antara app dan server. Hanya tipe, tanpa kode, supaya bisa
// dipakai Metro (app) dan Node (server) tanpa langkah build.

import type { LatLon, TrackPoint } from './geo.ts';

export type { LatLon, TrackPoint };

export type ActivityType = 'run' | 'ride' | 'walk';

export interface UserSummary {
  id: number;
  username: string;
  name: string;
}

export interface Totals {
  count: number;
  distanceM: number;
  movingS: number;
}

export interface UserListItem extends UserSummary {
  isFollowing: boolean;
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
