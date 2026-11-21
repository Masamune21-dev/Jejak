// Antrean unggah aktivitas. Bila server tidak bisa dihubungi saat menyimpan,
// rekaman disimpan di HP dan dicoba lagi otomatis sampai berhasil. Setiap
// rekaman punya `clientId` tetap, jadi mengirim ulang tidak membuat duplikat.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import type { Activity, ActivityType, TrackPoint } from '@shared/api';

import { ApiError, api, errorText } from './api';

const KEY = 'jejak.antrean-unggah';

export interface PendingUpload {
  /** Pemilik rekaman; antrean bisa berisi sisa akun sebelumnya dan tidak boleh terunggah ke akun lain. */
  userId: number;
  clientId: string;
  type: ActivityType;
  title: string;
  track: TrackPoint[][];
  routeId: number | null;
  createdAt: string;
  attempts: number;
  lastError: string | null;
  /** Server menolak isinya (4xx): coba ulang otomatis hanya akan gagal lagi. */
  stuck: boolean;
}

export type FlushResult = { uploaded: number; remaining: number; error: string | null };

let queue: PendingUpload[] = [];
let loading: Promise<void> | null = null;
let flushing: { userId: number; promise: Promise<FlushResult> } | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
/** Pengguna yang tokennya sedang dipakai. Antrean akun lain tidak boleh ikut terunggah. */
let activeUser: number | null = null;
const listeners = new Set<() => void>();

export function setActiveUser(userId: number | null) {
  activeUser = userId;
}

/**
 * Saat app masih terbuka dan sinyal kembali, jangan tunggu pengguna menutup app:
 * coba lagi setiap 30 detik sekali selama masih ada rekaman yang menunggu.
 */
function scheduleRetry(userId: number) {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (activeUser === userId) void flushQueue(userId).catch(() => {});
  }, 30_000);
}

function emit() {
  listeners.forEach((l) => l());
}

function setQueue(next: PendingUpload[]) {
  queue = next;
  emit();
}

async function write() {
  // Penyimpanan penuh atau diblokir tidak boleh membuat rekaman hilang dari antrean di memori.
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(queue));
  } catch {}
}

/** Kunci idempoten untuk satu rekaman; dipakai server agar unggahan ulang tidak menggandakan. */
export function newClientId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Baca antrean dari penyimpanan (sekali per proses). */
export function loadQueue(): Promise<void> {
  loading ??= readQueue();
  return loading;
}

async function readQueue() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return;
    setQueue(parsed.filter((x): x is PendingUpload => !!x && typeof (x as PendingUpload).clientId === 'string'));
  } catch {
    await AsyncStorage.removeItem(KEY);
  }
}

/** Simpan rekaman yang gagal diunggah. Pemanggil sudah menghapus draf lokalnya. */
export async function enqueue(
  item: Omit<PendingUpload, 'attempts' | 'stuck' | 'lastError'> & { lastError?: string | null },
): Promise<void> {
  await loadQueue();
  if (queue.some((q) => q.clientId === item.clientId)) return;
  setQueue([...queue, { ...item, lastError: item.lastError ?? null, attempts: 0, stuck: false }]);
  await write();
  scheduleRetry(item.userId);
}

/**
 * Kirim satu draf aktivitas. Bila server tidak bisa dihubungi, draf masuk antrean
 * dan hasilnya `{ ok: false }`; penolakan server (4xx) tetap dilempar ke pemanggil.
 */
export async function uploadDraft(
  draft: Omit<PendingUpload, 'attempts' | 'lastError' | 'stuck'>,
): Promise<{ ok: true; activity: Activity } | { ok: false; queued: true }> {
  try {
    const activity = await api<Activity>('/activities', {
      body: { clientId: draft.clientId, type: draft.type, title: draft.title, track: draft.track, routeId: draft.routeId },
      timeoutMs: 60_000,
    });
    return { ok: true, activity };
  } catch (e) {
    const status = e instanceof ApiError ? e.status : 0;
    if (status >= 400 && status < 500) throw e;
    await enqueue({ ...draft, lastError: errorText(e) });
    return { ok: false, queued: true };
  }
}

/** Buang satu rekaman dari antrean (mis. pengguna memilih menghapus). */
export async function removeQueued(clientId: string): Promise<void> {
  await loadQueue();
  setQueue(queue.filter((q) => q.clientId !== clientId));
  await write();
}

/** Coba unggah semua rekaman milik `userId` yang menunggu. Aman dipanggil berkali-kali. */
export function flushQueue(userId: number): Promise<FlushResult> {
  if (flushing?.userId === userId) return flushing.promise;
  return (async () => {
    if (flushing) await flushing.promise.catch(() => {});
    const promise = run(userId).finally(() => {
      if (flushing?.promise === promise) flushing = null;
    });
    flushing = { userId, promise };
    return promise;
  })();
}

/** Coba ulang juga rekaman yang sebelumnya ditolak server. */
export async function retryQueued(userId: number, clientId?: string): Promise<FlushResult> {
  await loadQueue();
  if (flushing) await flushing.promise.catch(() => {});
  setQueue(
    queue.map((q) =>
      q.userId === userId && (!clientId || q.clientId === clientId) ? { ...q, stuck: false, lastError: null } : q,
    ),
  );
  await write();
  return flushQueue(userId);
}

async function run(userId: number): Promise<FlushResult> {
  await loadQueue();
  let uploaded = 0;
  let error: string | null = null;
  if (activeUser !== userId) return { uploaded, remaining: 0, error };
  for (const item of queue.filter((q) => q.userId === userId)) {
    // Akun berganti di tengah unggahan: hentikan, jangan kirim ke akun yang salah.
    if (activeUser !== userId) break;
    // Yang sudah ditolak server tidak dicoba diam-diam lagi; pengguna menekan "Coba lagi".
    if (item.stuck) continue;
    try {
      await api<Activity>('/activities', {
        body: { clientId: item.clientId, type: item.type, title: item.title, track: item.track, routeId: item.routeId },
        timeoutMs: 60_000,
      });
      setQueue(queue.filter((q) => q.clientId !== item.clientId));
      await write();
      uploaded++;
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      const stuck = status >= 400 && status < 500 && status !== 401 && status !== 408 && status !== 429;
      error = errorText(e);
      setQueue(
        queue.map((q) => (q.clientId === item.clientId ? { ...q, attempts: q.attempts + 1, lastError: error, stuck } : q)),
      );
      await write();
      // Jaringan mati atau server sedang bermasalah: hentikan, sisa antrean dicoba lagi nanti.
      if (!stuck) break;
    }
  }
  const remaining = queue.filter((q) => q.userId === userId);
  // Masih ada yang menunggu (mis. sinyal belum kembali): coba lagi sebentar lagi.
  if (remaining.some((q) => !q.stuck)) scheduleRetry(userId);
  return { uploaded, remaining: remaining.length, error };
}

export function useUploadQueue(): PendingUpload[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => queue,
    () => queue,
  );
}
