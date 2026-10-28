import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import type { WeekTotal } from '@shared/api';

import { durationShort, km } from '@/lib/format';
import { font, radius, space, useColors } from '@/lib/theme';

import { IconTile, Pill } from './ui';

/** Kartu utama beranda: jarak minggu ini, perbandingan dengan minggu lalu, ikon bercahaya. */
export default function WeekCard({ weeks, title = 'Minggu ini' }: { weeks: WeekTotal[]; title?: string }) {
  const c = useColors();
  const now = weeks[weeks.length - 1] ?? { distanceM: 0, count: 0, movingS: 0, start: '' };
  const prev = weeks[weeks.length - 2];
  let change: { text: string; up: boolean } | null = null;
  if (prev && prev.distanceM > 0) {
    const pct = Math.round(((now.distanceM - prev.distanceM) / prev.distanceM) * 100);
    change = { text: `${Math.abs(pct)}% ${pct >= 0 ? 'lebih jauh' : 'lebih pendek'} dari minggu lalu`, up: pct >= 0 };
  } else if (now.distanceM > 0) {
    change = { text: 'Awal yang bagus minggu ini', up: true };
  }
  return (
    <LinearGradient
      colors={['#16372A', '#0E1A15']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderColor: c.accent + '30' }]}>
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={[styles.label, { color: c.muted }]}>{title}</Text>
        <Text style={[styles.big, { color: c.text }]}>
          {km(now.distanceM, 1)}
          <Text style={[styles.unit, { color: c.muted }]}> km</Text>
        </Text>
        {change ? (
          <Pill icon={change.up ? 'trending-up' : 'trending-down'} text={change.text} tone={change.up ? 'accent' : 'muted'} />
        ) : (
          <Pill icon="walk" text="Belum ada aktivitas" tone="muted" />
        )}
        <Text style={[styles.meta, { color: c.muted }]}>
          {now.count} aktivitas, {durationShort(now.movingS)} bergerak
        </Text>
      </View>
      <IconTile icon="footsteps" size={62} glowing />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg + 2,
    gap: space.md,
  },
  label: { fontFamily: font.medium, fontSize: 13 },
  big: { fontFamily: font.bold, fontSize: 42, letterSpacing: -1, lineHeight: 48 },
  unit: { fontFamily: font.medium, fontSize: 18, letterSpacing: 0 },
  meta: { fontFamily: font.medium, fontSize: 12 },
});
