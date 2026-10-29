import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { API_URL } from './api';

/** Versi app ini (`expo.version` di app.json). */
export const APP_VERSION = Constants.expoConfig?.version ?? Application.nativeApplicationVersion ?? '0.0.0';

/** Situs Jejak (landing page dan /unduh): alamat API tanpa `/api`. */
const SITE = API_URL.replace(/\/api$/, '');

/** Pembaruan hanya dicek di APK: web selalu versi terbaru, dan Expo Go punya versinya sendiri. */
export const UPDATE_CHECKED = Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

const CHECK_EVERY_MS = 6 * 3_600_000;
const DISMISSED_KEY = 'jejak.pembaruan.nanti';
const INFO_KEY = ['pembaruan'];
const DISMISSED_QUERY = ['pembaruan', 'nanti'];

/** Isi /unduh/versi.json yang ditulis `deploy/deploy.sh apk`. */
export interface ApkInfo {
  versi: string;
  build?: number;
  ukuranMB?: number;
  tanggal?: string;
  catatan?: string[];
  /** Versi terendah yang masih didukung server; di bawahnya app wajib diperbarui. */
  minimal?: string;
}

/** Bandingkan versi `a.b.c`: negatif bila `a` lebih lama dari `b`, positif bila lebih baru. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** `?v=` supaya cache Cloudflare tidak memberi APK lama tepat setelah rilis. Dibuka di browser, yang mengunduh APK-nya. */
export function openApkDownload(versi: string) {
  return Linking.openURL(`${SITE}/unduh/jejak.apk?v=${encodeURIComponent(versi)}`);
}

/** Versi terbaru dari situs dibanding versi app ini, plus pilihan "Nanti" yang diingat per versi. */
export function useUpdate() {
  const qc = useQueryClient();
  const info = useQuery({
    queryKey: INFO_KEY,
    queryFn: async () => {
      const res = await fetch(`${SITE}/unduh/versi.json?t=${Date.now()}`);
      if (!res.ok) throw new Error(`versi.json ${res.status}`);
      return (await res.json()) as ApkInfo;
    },
    enabled: UPDATE_CHECKED,
    staleTime: CHECK_EVERY_MS,
    retry: false,
  });
  const dismissed = useQuery({
    queryKey: DISMISSED_QUERY,
    queryFn: () => AsyncStorage.getItem(DISMISSED_KEY),
    enabled: UPDATE_CHECKED,
    staleTime: Infinity,
  });
  const latest = info.data && compareVersions(info.data.versi, APP_VERSION) > 0 ? info.data : null;
  return {
    /** false selama belum terbaca (atau gagal dibaca): jangan katakan "sudah terbaru". */
    checked: info.isSuccess,
    latest,
    required: !!latest?.minimal && compareVersions(APP_VERSION, latest.minimal) < 0,
    dismissed: !!latest && dismissed.data === latest.versi,
    dismiss: async () => {
      if (!latest) return;
      await AsyncStorage.setItem(DISMISSED_KEY, latest.versi);
      qc.setQueryData(DISMISSED_QUERY, latest.versi);
    },
  };
}

/** Cek ulang saat app kembali ke depan, paling sering sekali per 6 jam. Dipasang sekali di layout akar. */
export function useUpdateCheckOnResume() {
  const qc = useQueryClient();
  useEffect(() => {
    if (!UPDATE_CHECKED) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void qc.refetchQueries({ queryKey: INFO_KEY, exact: true, stale: true });
    });
    return () => sub.remove();
  }, [qc]);
}
