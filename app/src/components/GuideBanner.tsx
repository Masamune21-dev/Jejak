import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { font, glow, radius, useColors } from '@/lib/theme';

import type { IconName } from './ui';

/** Papan petunjuk arah di atas peta: ikon bercahaya, jarak besar, teks belokan. Merah saat keluar rute. */
export default function GuideBanner({
  tone = 'accent',
  icon,
  big,
  title,
  sub,
}: {
  tone?: 'accent' | 'danger';
  icon: IconName;
  big?: ReactNode;
  title: string;
  sub?: string;
}) {
  const c = useColors();
  const col = tone === 'danger' ? c.danger : c.accent;
  return (
    <View style={[styles.plate, { backgroundColor: c.surface, borderColor: col + '55' }]}>
      <View style={[styles.icon, { backgroundColor: col }, glow(col, 0.7)]}>
        <Ionicons name={icon} size={30} color={tone === 'danger' ? '#fff' : c.accentInk} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        {big ? <Text style={[styles.big, { color: col }]}>{big}</Text> : null}
        <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>
          {title}
        </Text>
        {sub ? <Text style={[styles.sub, { color: c.muted }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  icon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  big: { fontFamily: font.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
  title: { fontFamily: font.bold, fontSize: 16, lineHeight: 21 },
  sub: { fontFamily: font.medium, fontSize: 13 },
});
