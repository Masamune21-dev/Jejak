import { useCallback, useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, type LatLng, type MapStyleElement } from 'react-native-maps';

import type { LatLon } from '@shared/geo';

import { font, useIsDark } from '@/lib/theme';

import { DEFAULT_CENTER, type MapProps } from './map-types';

const toLL = (p: LatLon): LatLng => ({ latitude: p[0], longitude: p[1] });

// Google Maps (Android): sembunyikan POI & transit supaya garis rute menonjol.
const QUIET: MapStyleElement[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];
const NIGHT: MapStyleElement[] = [
  ...QUIET,
  { elementType: 'geometry', stylers: [{ color: '#1d2126' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a929a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d2126' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c3238' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a4249' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1418' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#1a1f23' }] },
];

// Peta native: Apple Maps di iOS, Google Maps di Android (tanpa kunci API di Expo Go).
export default function JejakMap({
  style,
  lines = [],
  pins = [],
  me,
  fit,
  followMe,
  initialCenter,
  onPress,
  interactive = true,
  bottomInset = 0,
}: MapProps) {
  const dark = useIsDark();
  const ref = useRef<MapView>(null);
  const ready = useRef(false);
  const center = initialCenter ?? me ?? fit?.[0] ?? DEFAULT_CENTER;

  const doFit = useCallback(() => {
    const map = ref.current;
    if (!map || !fit || fit.length === 0) return;
    if (fit.length === 1) map.animateCamera({ center: toLL(fit[0]), zoom: 15 }, { duration: 300 });
    else
      map.fitToCoordinates(fit.map(toLL), {
        edgePadding: { top: 70, right: 50, bottom: 70 + bottomInset, left: 50 },
        animated: false,
      });
  }, [fit, bottomInset]);

  useEffect(() => {
    if (ready.current) doFit();
  }, [doFit]);

  const meLat = me?.[0];
  const meLon = me?.[1];
  useEffect(() => {
    if (followMe && meLat != null && meLon != null) {
      ref.current?.animateCamera({ center: { latitude: meLat, longitude: meLon } }, { duration: 400 });
    }
  }, [followMe, meLat, meLon]);

  return (
    <MapView
      ref={ref}
      style={[styles.map, style]}
      mapPadding={{ top: 0, right: 0, bottom: bottomInset, left: 0 }}
      initialRegion={{ latitude: center[0], longitude: center[1], latitudeDelta: 0.02, longitudeDelta: 0.02 }}
      onMapReady={() => {
        ready.current = true;
        doFit();
      }}
      onPress={(e) => onPress?.([e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude])}
      mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
      userInterfaceStyle={dark ? 'dark' : 'light'}
      customMapStyle={Platform.OS === 'android' ? (dark ? NIGHT : QUIET) : undefined}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      showsCompass={false}
      showsPointsOfInterests={false}>
      {lines.map((l) => (
        <Polyline
          key={`${l.id}-casing`}
          coordinates={l.coords.map(toLL)}
          strokeColor={dark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)'}
          strokeWidth={(l.width ?? 4) + 4}
          zIndex={1}
        />
      ))}
      {lines.map((l) => (
        <Polyline
          key={l.id}
          coordinates={l.coords.map(toLL)}
          strokeColor={l.color}
          strokeWidth={l.width ?? 4}
          lineDashPattern={l.dashed ? [10, 8] : undefined}
          zIndex={2}
        />
      ))}
      {pins.map((p) => (
        <Marker key={p.id} coordinate={toLL(p.at)} anchor={{ x: 0.5, y: 0.5 }} zIndex={10}>
          <View style={[styles.pin, { backgroundColor: p.color }]}>
            {p.label ? <Text style={styles.pinText}>{p.label}</Text> : null}
          </View>
        </Marker>
      ))}
      {me ? (
        <Marker key="me" coordinate={toLL(me)} anchor={{ x: 0.5, y: 0.5 }} zIndex={1000}>
          <View style={styles.meHalo}>
            <View style={styles.meDot} />
          </View>
        </Marker>
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  pin: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  pinText: { color: '#fff', fontSize: 11, fontFamily: font.bold },
  meHalo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(47,107,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#2F6BFF', borderWidth: 3, borderColor: '#fff' },
});
