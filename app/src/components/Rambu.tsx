import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { font } from '@/lib/theme';

import type { IconName } from './ui';

/**
 * Papan petunjuk arah ala rambu jalan Indonesia: pelat berwarna, bingkai putih di dalam,
 * panah besar, huruf putih. Warnanya tetap (tidak ikut tema) supaya terbaca seperti rambu sungguhan.
 */
export default function Rambu({
  color,
  icon,
  big,
  title,
  sub,
}: {
  color: string;
  icon: IconName;
  big?: ReactNode;
  title: string;
  sub?: string;
}) {
  return (
    <View style={[styles.plate, { backgroundColor: color }]}>
      <View style={styles.frame}>
        <Ionicons name={icon} size={44} color="#fff" />
        <View style={{ flex: 1, gap: 1 }}>
          {big ? <Text style={styles.big}>{big}</Text> : null}
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  frame: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 2.5,
    borderColor: '#fff',
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  big: { color: '#fff', fontFamily: font.display, fontSize: 36, lineHeight: 38 },
  title: { color: '#fff', fontFamily: font.bold, fontSize: 17, lineHeight: 22 },
  sub: { color: 'rgba(255,255,255,0.85)', fontFamily: font.medium, fontSize: 13 },
});
