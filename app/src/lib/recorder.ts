// Perekam aktivitas: menyimpan titik GPS, jarak, stopwatch, dan panduan rute.
// State hidup di luar React supaya tetap jalan saat layar berpindah, dan
// disimpan ke AsyncStorage supaya rekaman tidak hilang bila app ditutup.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { Activity, ActivityType, PlannedRoute } from '@shared/api';
import { cumulativeDistance, haversine, progressOnRoute, type LatLon, type TrackPoint } from '@shared/geo';

import { api } from './api';
import type { Fix, LocationSource, SourceKind } from './location-source';
import { drainBackgroundBuffer, stopBackgroundUpdates } from './location-task';

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
}

const STORAGE_KEY = 'jejak.rekaman';
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

const initial = (): RecState => ({
  status: 'idle',
  type: 'run',
  route: null,
  parts: [],
  distanceM: 0,
  activeMs: 0,
  runningSince: null,
  here: null,
  accuracy: null,
  sourceKind: null,
  guide: null,
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
  const { status, type, route, parts, distanceM } = state;
  const activeMs = elapsedMs(state, clock());
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ status, type, route, parts, distanceM, activeMs }));
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
  for (const f of fixes) {
    here = [f.lat, f.lon];
    accuracy = f.acc;
    if (state.status !== 'recording') continue;
    if (f.acc != null && f.acc > MAX_ACCURACY_M) continue;
    const warmingUp = f.t - warmupFrom < WARMUP_MS && parts.every((p) => p.length === 0);
    if (warmingUp && f.acc != null && f.acc > FIRST_FIX_ACCURACY_M) continue;
    const part = parts[parts.length - 1] ?? [];
    const prev = part[part.length - 1];
    if (prev) {
      const d = haversine(prev, here);
      const dt = (f.t - prev[2]) / 1000;
      // Abaikan getaran GPS saat diam dan lompatan posisi yang mustahil.
      if (dt <= 0 || d < MIN_STEP_M || d / dt > MAX_SPEED_MPS) continue;
      distanceM += d;
    }
    const point: TrackPoint = [f.lat, f.lon, f.t, f.alt == null ? null : Math.round(f.alt * 10) / 10];
    parts = [...parts.slice(0, -1), [...part, point]];
  }
  const guide = here ? computeGuide(here) : state.guide;
  set({ parts, distanceM, here, accuracy, guide });
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
    loadRoute(state.route);
    set({ status: 'recording', parts: [[]], distanceM: 0, activeMs: 0, runningSince: clock(), sourceKind: src.kind });
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
    await source?.stop();
    set({ status: 'paused', activeMs: elapsedMs(state, now), runningSince: null });
    await save();
  },

  /** Lanjut setelah jeda atau setelah menekan Selesai. Sumber lokasi dibuat ulang bila perlu. */
  async resume(makeSource: () => Promise<LocationSource>) {
    if (state.status !== 'paused' && state.status !== 'finished') return;
    const before = state;
    const src = source ?? (await makeSource());
    source = src;
    set({ status: 'recording', parts: [...state.parts, []], runningSince: clock(), sourceKind: src.kind });
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
    set({ status: 'finished', sourceKind: null });
    await save();
  },

  async discard() {
    await source?.stop();
    source = null;
    loadRoute(null);
    state = { ...initial(), type: state.type, here: state.here };
    listeners.forEach((l) => l());
    await save();
  },

  async upload(title: string): Promise<Activity> {
    const track = state.parts.filter((p) => p.length > 0);
    const activity = await api<Activity>('/activities', {
      body: { type: state.type, title, track, routeId: state.route?.id ?? null },
      timeoutMs: 60_000,
    });
    await recorder.discard();
    return activity;
  },

  /** Muat rekaman yang belum selesai (mis. app tertutup saat merekam). */
  async restore() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Pick<RecState, 'status' | 'type' | 'route' | 'parts' | 'distanceM' | 'activeMs'>;
      loadRoute(saved.route);
      state = { ...initial(), ...saved, runningSince: null };
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
