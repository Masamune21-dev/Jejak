import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Spinner tarik-untuk-segarkan yang hanya menyala saat pengguna menarik layar. Pembaruan diam-diam
 * (useRefetchOnFocus saat pindah tab) tidak boleh memunculkan spinner di atas halaman yang sudah tampil.
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  };
  return { refreshing, onRefresh };
}

/** Ambil ulang data saat layar kembali dibuka (bukan saat pertama kali). */
export function useRefetchOnFocus(refetch: () => unknown) {
  const first = useRef(true);
  const latest = useRef(refetch);
  useEffect(() => {
    latest.current = refetch;
  });
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      latest.current();
    }, []),
  );
}
