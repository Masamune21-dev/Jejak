import { StyleSheet, Text, View } from 'react-native';

import { font } from '@/lib/theme';

import type { MapPin } from './map-types';

/** Bulatan berwarna (dengan label opsional) untuk titik awal/akhir/waypoint di peta native. */
export function PinView({ pin }: { pin: MapPin }) {
  return (
    <View style={[styles.pin, { backgroundColor: pin.color }]}>
      {pin.label ? <Text style={styles.pinText}>{pin.label}</Text> : null}
    </View>
  );
}

/** Titik biru posisi pengguna. */
export function MeDot() {
  return (
    <View style={styles.meHalo}>
      <View style={styles.meDot} />
    </View>
  );
}

const styles = StyleSheet.create({
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
