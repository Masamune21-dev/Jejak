import Constants, { ExecutionEnvironment } from 'expo-constants';
import { lazy, Suspense, type ComponentType } from 'react';
import { Platform, View } from 'react-native';

import type { MapProps } from './map-types';

/**
 * Pemilih peta untuk HP. Di APK Android dipakai MapLibre (gratis, tanpa kunci Google).
 * Expo Go tidak membawa kode native MapLibre, jadi di sana (dan di iOS) tetap react-native-maps.
 * Modul peta baru dimuat saat peta pertama kali tampil, dan bila MapLibre gagal dimuat,
 * app memakai react-native-maps supaya tidak tertutup.
 */
const WANT_LIBRE = Platform.OS === 'android' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

let impl: ComponentType<MapProps> | null = null;

/* eslint-disable @typescript-eslint/no-require-imports */
function loadImpl(): ComponentType<MapProps> {
  if (impl) return impl;
  if (WANT_LIBRE) {
    try {
      impl = require('./LibreMap').default as ComponentType<MapProps>;
      return impl;
    } catch (e) {
      console.warn('[peta] MapLibre gagal dimuat, pakai react-native-maps:', e);
    }
  }
  impl = require('./NativeMap').default as ComponentType<MapProps>;
  return impl;
}
/* eslint-enable @typescript-eslint/no-require-imports */

const LazyMap = lazy(async () => ({ default: loadImpl() }));

export default function JejakMap(props: MapProps) {
  return (
    <Suspense fallback={<View style={[{ flex: 1 }, props.style]} />}>
      <LazyMap {...props} />
    </Suspense>
  );
}
