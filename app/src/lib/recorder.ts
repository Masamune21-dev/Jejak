// Perekam aktivitas: menyimpan titik GPS, jarak, stopwatch, dan panduan rute.
// State hidup di luar React supaya tetap jalan saat layar berpindah, dan
// disimpan ke AsyncStorage supaya rekaman tidak hilang bila app ditutup.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { Activity, ActivityType, PlannedRoute } from '@shared/api';
import { cumulativeDistance, haversine, progressOnRoute, type LatLon, type TrackPoint } from '@shared/geo';

import type { Fix, LocationSource, SourceKind } from './location-source';
import { drainBackgroundBuffer, stopBackgroundUpdates } from './location-task';
import { newClientId, uploadDraft } from './upload-queue';

export type RecStatus = 'idle' | 'recording' | 'paused' | 'finished';

export interface RouteGuide {
  alongM: number;
  remainingM: number;
  /** Jarak posisi sekarang ke garis rute. */
  offM: number;
  offRoute: boolean;
  next: { text: string; inM: number } | null;
}

export interface RecState {
  status: RecStatus;
  type: ActivityType;
  /** Kunci idempoten rekaman ini; tetap sama saat unggahan diulang. */
  clientId: string;
  route: PlannedRoute | null;
  /** Bagian-bagian track; jeda memulai bagian baru. */
  parts: TrackPoint[][];
  distanceM: number;
  /** Waktu aktif yang sudah terkumpul sebelum bagian yang sedang berjalan. */
  activeMs: number;
  /** Jam sumber lokasi saat bagian sekarang dimulai; null bila sedang jeda. */
  runningSince: number | null;
  here: LatLon | null;
  accuracy: number | null;
  sourceKind: SourceKind | null;
  guide: RouteGuide | null;
  /** Preferensi jeda otomatis; disimpan di HP dan berlaku untuk rekaman berikutnya. */
  autoPause: boolean;
  /** Sedang dijeda otomatis: stopwatch beku, GPS tetap berjalan untuk mendeteksi gerakan. */
  autoPaused: boolean;
}

const STORAGE_KEY = 'jejak.rekaman';
const AUTO_PAUSE_KEY = 'jejak.jeda-otomatis';
const OFF_ROUTE_M = 40;
const MIN_STEP_M = 3;
const MAX_ACCURACY_M = 25;
/**
 * GPS yang baru menyala sering meleset puluhan meter. Titik pertama rekaman menunggu akurasi ini,
 * paling lama WARMUP_MS; sesudah itu batas biasa (MAX_ACCURACY_M) yang berlaku.
 */
export const FIRST_FIX_ACCURACY_M = 20;
const WARMUP_MS = 20_000;
const MAX_SPEED_MPS = 45;
const SAVE_EVERY_MS = 10_000;
/** Diam dianggap berhenti setelah 10 detik tanpa bergerak lebih dari 3 m. */
const STILL_AFTER_MS = 10_000;
const STILL_RADIUS_M = 3;
/** Setelah jeda otomatis, hitungan lanjut lagi saat bergerak minimal 8 m dari titik berhenti. */
const MOVE_AFTER_M = 8;

const initial = (): RecState => ({
  status: 'idle',
  type: 'run',
  clientId: newClientId(),
  route: null,
  parts: [],
  distanceM: 0,
  activeMs: 0,
  runningSince: null,
  here: null,
  accuracy: null,
  sourceKind: null,
  guide: null,
  autoPause: true,
  autoPaused: false,
});

let state: RecState = initial();
let source: LocationSource | null = null;
let routeCum: number[] = [];
/** Progres terakhir di rute (m), supaya pencocokan tidak meloncat mundur. */
let routeAlong = 0;
let announcedStep = -1;
let lastSave = 0;
/** Saat Mulai ditekan; titik pertama ditunggu sampai GPS akurat (lihat FIRST_FIX_ACCURACY_M). */
let warmupFrom = 0;
/** Sejak kapan posisi tidak bergerak (ms sumber); null bila sedang bergerak. */
let stillSince: number | null = null;
/** Titik saat jeda otomatis dimulai; dipakai untuk mendeteksi mulai bergerak lagi. */
let pauseAnchor: LatLon | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<RecState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
  if (state.status === 'recording' && Date.now() - lastSave > SAVE_EVERY_MS) void save();
}

function clock(): number {
  return source?.now() ?? Date.now();
}

async function save() {
  lastSave = Date.now();
  if (state.status === 'idle') {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  const { status, type, clientId, route, parts, distanceM } = state;
  const activeMs = elapsedMs(state, clock());
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ status, type, clientId, route, parts, distanceM, activeMs }));
}

function haptic(kind: 'warn' | 'turn') {
  if (Platform.OS === 'web') return;
  const p =
    kind === 'warn'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  p.catch(() => {});
}

function loadRoute(route: PlannedRoute | null) {
  routeCum = route ? cumulativeDistance(route.geometry) : [];
  routeAlong = 0;
  announcedStep = -1;
}

function computeGuide(here: LatLon): RouteGuide | null {
  const route = state.route;
  if (!route || route.geometry.length < 2) return null;
  const p = progressOnRoute(route.geometry, routeCum, here, routeAlong);
  routeAlong = p.alongM;
  const total = routeCum[routeCum.length - 1];
  const idx = route.steps.findIndex((s) => s.atM > p.alongM - 5);
  const next = idx >= 0 ? { text: route.steps[idx].text, inM: Math.max(0, route.steps[idx].atM - p.alongM) } : null;
  const offRoute = p.offM > OFF_ROUTE_M;
  if (state.status === 'recording') {
    if (offRoute && !state.guide?.offRoute) haptic('warn');
    if (next && idx !== announcedStep && next.inM < 30) {
      announcedStep = idx;
      haptic('turn');
    }
  }
  return { alongM: p.alongM, remainingM: Math.max(0, total - p.alongM), offM: p.offM, offRoute, next };
}

function addFixes(fixes: Fix[]) {
  if (fixes.length === 0) return;
  let parts = state.parts;
  let distanceM = state.distanceM;
  let here = state.here;
  let accuracy = state.accuracy;
  let autoPaused = state.autoPaused;
  let activeMs = state.activeMs;
  let runningSince = state.runningSince;
  for (const f of fixes) {
    here = [f.lat, f.lon];
    accuracy = f.acc;
    if (state.status !== 'recording') continue;
    if (f.acc != null && f.acc > MAX_ACCURACY_M) continue;

    if (autoPaused) {
      // GPS tetap masuk saat jeda otomatis; hitungan lanjut setelah bergerak cukup jauh.
      if (pauseAnchor && haversine(pauseAnchor, here) >= MOVE_AFTER_M) {
        autoPaused = false;
        runningSince = f.t;
        parts = [...parts, []];
        stillSince = null;
        pauseAnchor = null;
      } else {
        continue;
      }
    }

    const warmingUp = f.t - warmupFrom < WARMUP_MS && parts.every((p) => p.length === 0);
    if (warmingUp && f.acc != null && f.acc > FIRST_FIX_ACCURACY_M) continue;
    const part = parts[parts.length - 1] ?? [];
    const prev = part[part.length - 1];
    if (prev) {
      const d = haversine(prev, here);
      const dt = (f.t - prev[2]) / 1000;
      // Abaikan getaran GPS saat diam dan lompatan posisi yang mustahil.
      if (dt <= 0 || d < MIN_STEP_M || d / dt > MAX_SPEED_MPS) {
        // Diam terdeteksi dari titik-titik yang terlalu dekat untuk dicatat.
        if (state.autoPause && d < STILL_RADIUS_M) {
          stillSince ??= f.t;
          if (f.t - stillSince >= STILL_AFTER_MS) {
            if (runningSince != null) activeMs += Math.max(0, f.t - runningSince);
            runningSince = null;
            autoPaused = true;
            pauseAnchor = here;
            stillSince = null;
          }
        } else if (d >= STILL_RADIUS_M) {
          stillSince = null;
        }
        continue;
      }
      distanceM += d;
      stillSince = null;
    }
    const point: TrackPoint = [f.lat, f.lon, f.t, f.alt == null ? null : Math.round(f.alt * 10) / 10];
    parts = [...parts.slice(0, -1), [...part, point]];
  }
  const guide = here ? computeGuide(here) : state.guide;
  set({ parts, distanceM, here, accuracy, guide, autoPaused, activeMs, runningSince });
}

export function elapsedMs(s: RecState, now: number): number {
  return s.activeMs + (s.runningSince != null ? Math.max(0, now - s.runningSince) : 0);
}

export const recorder = {
  getState: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  clock,

  setType(type: ActivityType) {
    if (state.status === 'idle') set({ type });
  },

  /** Nyalakan/matikan jeda otomatis; pilihan disimpan untuk rekaman berikutnya. */
  setAutoPause(enabled: boolean) {
    if (enabled === state.autoPause) return;
    stillSince = null;
    pauseAnchor = null;
    if (!enabled && state.autoPaused && state.status === 'recording') {
      // Dimatikan saat sedang beku: lanjutkan hitungan sekarang juga.
      set({ autoPause: false, autoPaused: false, runningSince: clock(), parts: [...state.parts, []] });
    } else {
      set({ autoPause: enabled });
    }
    void AsyncStorage.setItem(AUTO_PAUSE_KEY, enabled ? '1' : '0');
  },

  /** Lanjutkan hitungan tanpa menunggu gerakan (mis. pengguna menekan Lanjut). */
  resumeFromAutoPause() {
    if (state.status !== 'recording' || !state.autoPaused) return;
    stillSince = null;
    pauseAnchor = null;
    set({ autoPaused: false, runningSince: clock(), parts: [...state.parts, []] });
  },

  setRoute(route: PlannedRoute | null) {
    if (state.status !== 'idle') return;
    loadRoute(route);
    state = { ...state, route };
    set({ guide: state.here ? computeGuide(state.here) : null });
  },

  setHere(here: LatLon) {
    if (state.status === 'recording') return;
    set({ here, guide: computeGuide(here) });
  },

  async start(makeSource: () => Promise<LocationSource>) {
    if (state.status !== 'idle') return;
    const src = await makeSource();
    source = src;
    warmupFrom = Date.now();
    stillSince = null;
    pauseAnchor = null;
    loadRoute(state.route);
    set({ status: 'recording', parts: [[]], distanceM: 0, activeMs: 0, runningSince: clock(), sourceKind: src.kind, autoPaused: false });
    try {
      await src.start(addFixes);
    } catch (e) {
      // GPS gagal menyala: jangan tampil seolah sedang merekam.
      source = null;
      set({ status: 'idle', parts: [], runningSince: null, sourceKind: null });
      throw e;
    }
    await save();
  },

  async pause() {
    if (state.status !== 'recording') return;
    const now = clock();
    stillSince = null;
    pauseAnchor = null;
    await source?.stop();
    set({ status: 'paused', activeMs: elapsedMs(state, now), runningSince: null, autoPaused: false });
    await save();
  },

  /** Lanjut setelah jeda atau setelah menekan Selesai. Sumber lokasi dibuat ulang bila perlu. */
  async resume(makeSource: () => Promise<LocationSource>) {
    if (state.status !== 'paused' && state.status !== 'finished') return;
    const before = state;
    const src = source ?? (await makeSource());
    stillSince = null;
    pauseAnchor = null;
    source = src;
    set({ status: 'recording', parts: [...state.parts, []], runningSince: clock(), sourceKind: src.kind, autoPaused: false });
    try {
      await src.start(addFixes);
    } catch (e) {
      source = null;
      set({ status: before.status, parts: before.parts, runningSince: null, sourceKind: null });
      throw e;
    }
  },

  async finish() {
    if (state.status === 'recording') await recorder.pause();
    await source?.stop();
    source = null;
    stillSince = null;
    pauseAnchor = null;
    set({ status: 'finished', sourceKind: null, autoPaused: false });
    await save();
  },

  async discard() {
    await source?.stop();
    source = null;
    stillSince = null;
    pauseAnchor = null;
    loadRoute(null);
    state = { ...initial(), type: state.type, here: state.here, autoPause: state.autoPause };
    listeners.forEach((l) => l());
    await save();
  },

  async upload(title: string, userId: number): Promise<{ activity: Activity; queued: false } | { queued: true }> {
    const track = state.parts.filter((p) => p.length > 0);
    const res = await uploadDraft({
      userId,
      clientId: state.clientId,
      type: state.type,
      title,
      track,
      routeId: state.route?.id ?? null,
      createdAt: new Date().toISOString(),
    });
    await recorder.discard();
    return res.ok ? { activity: res.activity, queued: false } : { queued: true };
  },

  /** Muat rekaman yang belum selesai (mis. app tertutup saat merekam). */
  async restore() {
    try {
      const pref = await AsyncStorage.getItem(AUTO_PAUSE_KEY);
      state = { ...state, autoPause: pref == null ? true : pref === '1' };
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        listeners.forEach((l) => l());
        return;
      }
      const saved = JSON.parse(raw) as Pick<
        RecState,
        'status' | 'type' | 'route' | 'parts' | 'distanceM' | 'activeMs'
      > & { clientId?: string };
      loadRoute(saved.route);
      // Rekaman lama (sebelum ada clientId) mendapat kunci baru saat dipulihkan.
      state = { ...initial(), ...saved, clientId: saved.clientId ?? newClientId(), runningSince: null };
      if (saved.status === 'recording') {
        // Titik yang terkumpul layanan latar selama app mati ikut dimasukkan.
        addFixes(await drainBackgroundBuffer());
        await stopBackgroundUpdates().catch(() => {});
        state = { ...state, status: 'paused' };
      }
      listeners.forEach((l) => l());
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  },
};

export function useRecorder(): RecState {
  return useSyncExternalStore(recorder.subscribe, recorder.getState, recorder.getState);
}
