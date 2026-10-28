import { StyleSheet, Text, View } from 'react-native';

import type { WeekTotal } from '@shared/api';

import { durationShort, km } from '@/lib/format';
import { font, radius, space, useColors } from '@/lib/theme';

/** Panel gelap ringkasan minggu ini + batang 8 minggu terakhir. */
export default function WeekCard({ weeks, title = 'Minggu ini' }: { weeks: WeekTotal[]; title?: string }) {
  const c = useColors();
  const recent = weeks.slice(-8);
  const now = recent[recent.length - 1] ?? { distanceM: 0, count: 0, movingS: 0, start: '' };
  const max = Math.max(1, ...recent.map((w) => w.distanceM));
  return (
    <View style={[styles.card, { backgroundColor: c.slab }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.label}>{title}</Text>
        <Text style={styles.big}>
          {km(now.distanceM, 1)}
          <Text style={styles.unit}> km</Text>
        </Text>
        <Text style={styles.meta}>
          {now.count} aktivitas · {durationShort(now.movingS)}
        </Text>
      </View>
      <View style={styles.bars}>
        {recent.map((w, i) => {
          const last = i === recent.length - 1;
          return (
            <View key={w.start} style={styles.barSlot}>
              <View
                style={{
                  height: `${Math.max(w.distanceM > 0 ? 10 : 4, (w.distanceM / max) * 100)}%`,
                  borderRadius: 4,
                  backgroundColor: last ? c.accent : w.distanceM > 0 ? 'rgba(198,240,60,0.38)' : 'rgba(255,255,255,0.12)',
                }}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: radius.lg, padding: space.lg + 2, gap: space.lg, alignItems: 'flex-end' },
  label: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' },
  big: { fontFamily: font.numBold, fontSize: 54, color: '#C6F03C', lineHeight: 58 },
  unit: { fontFamily: font.semibold, fontSize: 18, color: 'rgba(255,255,255,0.7)' },
  meta: { fontFamily: font.medium, fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  bars: { width: 120, height: 70, flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
});
