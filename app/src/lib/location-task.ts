// Tugas lokasi latar belakang. Harus didaftarkan di level modul, jadi file ini
// di-import paling atas di src/app/_layout.tsx.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { toFix, type Fix } from './location-source';
import { palette } from './theme';

const TASK = 'jejak-rekam-lokasi';
const BUFFER_KEY = 'jejak.bgbuffer';

let listener: ((fixes: Fix[]) => void) | null = null;

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  const fixes = data.locations.map(toFix);
  if (listener) {
    listener(fixes);
    return;
  }
  // Aplikasi sedang tidak hidup (hanya layanan latar): simpan dulu, diambil saat app dibuka.
  const prev = JSON.parse((await AsyncStorage.getItem(BUFFER_KEY)) ?? '[]') as Fix[];
  await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(prev.concat(fixes)));
});

/** Expo Go tidak mendukung lokasi latar; perlu build APK/IPA sendiri. */
export async function backgroundAvailable(): Promise<boolean> {
  try {
    return (await TaskManager.isAvailableAsync()) && (await Location.isBackgroundLocationAvailableAsync());
  } catch {
    return false;
  }
}

export async function startBackgroundUpdates(onFix: (fixes: Fix[]) => void): Promise<void> {
  listener = onFix;
  await Location.startLocationUpdatesAsync(TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000,
    distanceInterval: 2,
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Jejak sedang merekam',
      notificationBody: 'Rute kamu tetap tercatat walau layar mati.',
      notificationColor: palette.accent,
    },
  });
}

export async function stopBackgroundUpdates(): Promise<void> {
  listener = null;
  if (await Location.hasStartedLocationUpdatesAsync(TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(TASK);
  }
}

export async function drainBackgroundBuffer(): Promise<Fix[]> {
  const raw = await AsyncStorage.getItem(BUFFER_KEY);
  if (!raw) return [];
  await AsyncStorage.removeItem(BUFFER_KEY);
  return JSON.parse(raw) as Fix[];
}
