import { StyleSheet, Text, View } from 'react-native';

import { font, ROAD } from '@/lib/theme';

/** Patok kilometer pinggir jalan (tugu putih berkepala merah) sebagai nomor split. */
export default function Patok({ km, size = 1 }: { km: number | string; size?: number }) {
  return (
    <View style={[styles.post, { width: 28 * size, height: 34 * size, borderRadius: 7 * size }]}>
      <View style={[styles.cap, { height: 10 * size, borderTopLeftRadius: 7 * size, borderTopRightRadius: 7 * size }]} />
      <Text style={[styles.num, { fontSize: 16 * size, lineHeight: 20 * size }]}>{km}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  post: {
    backgroundColor: ROAD.putih,
    borderWidth: 1.5,
    borderColor: '#C9CAC4',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cap: { alignSelf: 'stretch', backgroundColor: ROAD.patok },
  num: { color: ROAD.aspal, fontFamily: font.numBold },
});
