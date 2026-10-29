import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { declinePush, disablePush, enablePush, getPushState, PUSH_SUPPORTED, type PushState } from './push';

const KEY = ['notifikasi'];

/** Status notifikasi bersama untuk kartu Beranda dan Pengaturan; mengubahnya di satu tempat langsung terlihat di tempat lain. */
export function usePush() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: KEY, queryFn: getPushState, staleTime: Infinity });
  // Izin bisa diubah dari pengaturan HP; cek lagi saat kembali ke app.
  useEffect(() => {
    if (!PUSH_SUPPORTED) return;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void qc.invalidateQueries({ queryKey: KEY });
    });
    return () => sub.remove();
  }, [qc]);
  const set = (s: PushState) => qc.setQueryData(KEY, s);
  return {
    state: q.data ?? null,
    enable: async () => set(await enablePush()),
    disable: async () => {
      await disablePush();
      set('off');
    },
    later: async () => {
      await declinePush();
      set('off');
    },
  };
}
