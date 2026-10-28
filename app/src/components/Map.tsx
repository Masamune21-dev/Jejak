import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { ComponentType } from 'react';
import { Platform } from 'react-native';

import type { MapProps } from './map-types';

/**
 * Pemilih peta untuk HP. Di APK Android dipakai MapLibre (gratis, tanpa kunci Google).
 * Expo Go tidak membawa kode native MapLibre, jadi di sana (dan di iOS) tetap react-native-maps.
 * Hanya modul yang dipilih yang dimuat, supaya Expo Go tidak menyentuh MapLibre sama sekali.
 */
const LIBRE = Platform.OS === 'android' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/* eslint-disable @typescript-eslint/no-require-imports */
const Impl: ComponentType<MapProps> = LIBRE ? require('./LibreMap').default : require('./NativeMap').default;
/* eslint-enable @typescript-eslint/no-require-imports */

export default function JejakMap(props: MapProps) {
  return <Impl {...props} />;
}
