import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

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
