import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

import type { LatLon } from '@shared/geo';

import { toFix, type LocationSource } from './location-source';
import { backgroundAvailable, startBackgroundUpdates, stopBackgroundUpdates } from './location-task';

const ASKED_BG_KEY = 'jejak.izinLatarDitanya';
const KEEP_AWAKE_TAG = 'jejak-rekam';

export async function ensureLocationPermission(): Promise<void> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) throw new Error('Izin lokasi ditolak. Aktifkan lokasi untuk Jejak di pengaturan HP.');
}

/** Posisi sekarang (cepat, akurasi sedang) untuk memusatkan peta. */
export async function currentPosition(): Promise<LatLon | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted) {
      const asked = await Location.requestForegroundPermissionsAsync();
      if (!asked.granted) return null;
    }
    const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000 }).catch(() => null);
    if (last) return [last.coords.latitude, last.coords.longitude];
    const now = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return [now.coords.latitude, now.coords.longitude];
  } catch {
    return null;
  }
}

/**
 * GPS asli. Pakai lokasi latar bila tersedia (build sendiri + izin "Selalu"),
 * kalau tidak, pakai lokasi saat layar menyala dan cegah layar mati.
 */
export async function createGpsSource(): Promise<LocationSource> {
  await ensureLocationPermission();
  if (await backgroundAvailable()) {
    let bg = await Location.getBackgroundPermissionsAsync();
    // Di Android 11+ permintaan ini membuka Pengaturan, jadi cukup ditanya sekali.
    if (!bg.granted && bg.canAskAgain && !(await AsyncStorage.getItem(ASKED_BG_KEY))) {
      await AsyncStorage.setItem(ASKED_BG_KEY, '1');
      bg = await Location.requestBackgroundPermissionsAsync();
    }
    if (bg.granted) {
      return {
        kind: 'gps-bg',
        now: () => Date.now(),
        start: (onFix) => startBackgroundUpdates(onFix),
        stop: () => stopBackgroundUpdates(),
      };
    }
  }
  let sub: Location.LocationSubscription | null = null;
  return {
    kind: 'gps-fg',
    now: () => Date.now(),
    async start(onFix) {
      await activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 2 },
        (loc) => onFix([toFix(loc)]),
      );
    },
    async stop() {
      sub?.remove();
      sub = null;
      await deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    },
  };
}
