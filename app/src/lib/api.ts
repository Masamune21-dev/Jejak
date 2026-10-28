import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 4000;

/**
 * Alamat server dari EXPO_PUBLIC_API_URL (app/.env berisi server produksi).
 * Nilai `lan` (mis. di app/.env.local) berarti server di komputer yang menjalankan
 * `expo start`; HP di Expo Go otomatis tahu IP komputer itu.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv !== 'lan') return fromEnv.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:${API_PORT}`;
}

export const API_URL = resolveApiUrl();

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setApiToken(t: string | null) {
  token = t;
}

export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Alamat lengkap foto dari path bertanda tangan yang dikirim API (`/media/…?exp=…&sig=…`). */
export function mediaUri(path: string | null | undefined): string | null {
  return path ? API_URL + path : null;
}

/** `body` berupa FormData dikirim apa adanya (unggah foto); selain itu dikirim sebagai JSON. */
export async function api<T>(path: string, init: { method?: string; body?: unknown; timeoutMs?: number } = {}): Promise<T> {
  const form = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 20_000);
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: {
        ...(form ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body === undefined ? undefined : form ? (init.body as FormData) : JSON.stringify(init.body),
      signal: controller.signal,
    });
  } catch (e) {
    // Alasan asli dari fetch ikut ditampilkan: tanpa itu, unggahan yang gagal disusun di HP tampak seperti server mati.
    const why = controller.signal.aborted ? 'batas waktu habis' : errorText(e);
    const hint = API_URL.startsWith('https:')
      ? 'Periksa koneksi internet HP.'
      : 'Pastikan server jalan dan HP satu WiFi dengan komputer.';
    throw new ApiError(0, `Tidak bisa terhubung ke server (${API_URL}): ${why}. ${hint}`);
  } finally {
    clearTimeout(timer);
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, data.error ?? `Permintaan gagal (${res.status})`);
  }
  return data as T;
}

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : 'Terjadi kesalahan';
}
