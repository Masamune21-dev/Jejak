import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';

import { api } from './api';
import { APP_VERSION } from './update';

/**
 * Notifikasi push lewat FCM. Server mengirim pesan data (judul, teks, kanal, `url`) yang ditampilkan
 * expo-notifications; lihat server/src/push.ts. Versi web: push.web.ts.
 */

/** Push jarak jauh butuh APK: Expo Go tidak lagi mendukungnya sejak SDK 53. */
export const PUSH_SUPPORTED = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

const PREF_KEY = 'jejak.notifikasi';

/** `unasked`: belum pernah memilih (kartu di Beranda tampil). `blocked`: dinyalakan di app tetapi izin HP ditolak. */
export type PushState = 'unsupported' | 'unasked' | 'on' | 'off' | 'blocked';

// Notifikasi yang datang saat app terbuka tetap tampil sebagai banner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Kanal harus ada sebelum token diminta; Android 13+ juga baru menampilkan dialog izin setelah ada kanal. */
async function ensureChannels() {
  await Notifications.setNotificationChannelAsync('info', {
    name: 'Info dan pengumuman',
    importance: AndroidImportance.HIGH,
  });
  await Notifications.setNotificationChannelAsync('pembaruan', {
    name: 'Pembaruan aplikasi',
    importance: AndroidImportance.DEFAULT,
  });
}

/** Token FCM HP ini ke server, terikat ke sesi yang sedang masuk. */
async function register(token?: string) {
  const t = token ?? (await Notifications.getDevicePushTokenAsync()).data;
  if (typeof t !== 'string') return;
  await api('/me/device', { method: 'PUT', body: { token: t, platform: Platform.OS, appVersion: APP_VERSION } });
}

export async function getPushState(): Promise<PushState> {
  if (!PUSH_SUPPORTED) return 'unsupported';
  const pref = await AsyncStorage.getItem(PREF_KEY);
  if (pref === 'off') return 'off';
  if (pref !== 'on') return 'unasked';
  return (await Notifications.getPermissionsAsync()).granted ? 'on' : 'blocked';
}

/** Minta izin (dialog Android 13+), daftarkan HP ke server, dan ingat pilihannya. */
export async function enablePush(): Promise<PushState> {
  await ensureChannels();
  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
  await AsyncStorage.setItem(PREF_KEY, 'on');
  if (!perm.granted) return 'blocked';
  await register();
  return 'on';
}

/** Hapus HP ini dari server dulu; bila gagal (tidak ada sinyal), pilihan tetap menyala supaya tidak menyesatkan. */
export async function disablePush(): Promise<void> {
  await api('/me/device', { method: 'DELETE' });
  await AsyncStorage.setItem(PREF_KEY, 'off');
}

/** "Nanti" di kartu Beranda: belum ada yang didaftarkan, cukup diingat. */
export async function declinePush(): Promise<void> {
  await AsyncStorage.setItem(PREF_KEY, 'off');
}

/**
 * Setiap masuk dan setiap app dibuka: daftarkan ulang token untuk sesi ini (sesi baru setelah masuk lagi,
 * token yang diganti FCM saat app tertutup). Token yang diganti saat app terbuka langsung didaftarkan.
 */
export function usePushSync(userId: number | null) {
  useEffect(() => {
    if (!PUSH_SUPPORTED || userId == null) return;
    const sync = (token?: string) =>
      getPushState()
        .then(async (s) => {
          if (s !== 'on') return;
          await ensureChannels();
          await register(token);
        })
        .catch((e) => console.warn('Notifikasi gagal didaftarkan', e));
    void sync();
    const sub = Notifications.addPushTokenListener((t) => void sync(typeof t.data === 'string' ? t.data : undefined));
    return () => sub.remove();
  }, [userId]);
}

/** Ketukan notifikasi membuka `url` dari server: path app (`/segmen/12`) atau alamat https (unduhan APK). */
export function useNotificationTaps(ready: boolean) {
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!ready || !response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    Notifications.clearLastNotificationResponse();
    const url = response.notification.request.content.data?.url;
    if (typeof url !== 'string') return;
    if (url.startsWith('https://')) void Linking.openURL(url);
    else if (url.startsWith('/')) router.push(url as Href);
  }, [ready, response]);
}
