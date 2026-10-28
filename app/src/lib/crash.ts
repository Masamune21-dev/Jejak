// Catat error JavaScript fatal sebelum app tertutup, lalu tampilkan saat app dibuka lagi.
// Di APK tidak ada layar merah seperti saat pengembangan, jadi tanpa ini crash tidak meninggalkan petunjuk.
// File ini di-import paling awal di src/app/_layout.tsx.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'jejak.crash';

export interface CrashReport {
  message: string;
  stack: string;
  at: string;
}

type Handler = (error: unknown, isFatal?: boolean) => void;
const errorUtils = (globalThis as { ErrorUtils?: { getGlobalHandler(): Handler; setGlobalHandler(h: Handler): void } })
  .ErrorUtils;

export function toReport(error: unknown): CrashReport {
  const e = error instanceof Error ? error : new Error(String(error));
  return { message: e.message, stack: (e.stack ?? '').split('\n').slice(0, 14).join('\n'), at: new Date().toISOString() };
}

if (errorUtils) {
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    if (!isFatal) {
      previous(error, isFatal);
      return;
    }
    // Simpan dulu, baru serahkan ke penanganan bawaan (yang menutup app).
    AsyncStorage.setItem(KEY, JSON.stringify(toReport(error)))
      .catch(() => {})
      .finally(() => previous(error, isFatal));
  });
}

/** Ambil laporan crash terakhir (sekali saja). */
export async function takeLastCrash(): Promise<CrashReport | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    await AsyncStorage.removeItem(KEY);
    return JSON.parse(raw) as CrashReport;
  } catch {
    return null;
  }
}
