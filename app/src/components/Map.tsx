import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, type LatLng } from 'react-native-maps';

import type { LatLon } from '@shared/geo';

import { DEFAULT_CENTER, type MapProps } from './map-types';

const toLL = (p: LatLon): LatLng => ({ latitude: p[0], longitude: p[1] });

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
}: MapProps) {
  const ref = useRef<MapView>(null);
  const ready = useRef(false);
  const center = initialCenter ?? me ?? fit?.[0] ?? DEFAULT_CENTER;

  const doFit = useCallback(() => {
    const map = ref.current;
    if (!map || !fit || fit.length === 0) return;
    if (fit.length === 1) map.animateCamera({ center: toLL(fit[0]), zoom: 15 }, { duration: 300 });
    else map.fitToCoordinates(fit.map(toLL), { edgePadding: { top: 60, right: 50, bottom: 60, left: 50 }, animated: false });
  }, [fit]);

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
      initialRegion={{ latitude: center[0], longitude: center[1], latitudeDelta: 0.02, longitudeDelta: 0.02 }}
      onMapReady={() => {
        ready.current = true;
        doFit();
      }}
      onPress={(e) => onPress?.([e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude])}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      showsCompass={false}>
      {lines.map((l) => (
        <Polyline
          key={l.id}
          coordinates={l.coords.map(toLL)}
          strokeColor={l.color}
          strokeWidth={l.width ?? 4}
          lineDashPattern={l.dashed ? [10, 8] : undefined}
        />
      ))}
      {pins.map((p) => (
        <Marker key={p.id} coordinate={toLL(p.at)} anchor={{ x: 0.5, y: 0.5 }}>
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
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pinText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  meHalo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(47,111,237,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#2F6FED', borderWidth: 2, borderColor: '#fff' },
});
