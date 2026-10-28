import { View } from 'react-native';

import type { WeekTotal } from '@shared/api';

import { km } from '@/lib/format';
import { useColors } from '@/lib/theme';

import { Row, T } from './ui';

/** Batang jarak per minggu, 12 minggu terakhir. */
export default function WeeklyChart({ weeks }: { weeks: WeekTotal[] }) {
  const c = useColors();
  const max = Math.max(1, ...weeks.map((w) => w.distanceM));
  const label = (iso: string) => {
    const [, m, d] = iso.split('-');
    return `${Number(d)}/${Number(m)}`;
  };
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 4 }}>
        {weeks.map((w, i) => (
          <View key={w.start} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
            <View
              style={{
                height: `${Math.max(w.distanceM > 0 ? 6 : 2, (w.distanceM / max) * 100)}%`,
                backgroundColor: i === weeks.length - 1 ? c.primary : w.distanceM > 0 ? c.primary + '88' : c.border,
                borderRadius: 4,
              }}
            />
          </View>
        ))}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <T muted size={11}>
          {weeks[0] ? label(weeks[0].start) : ''}
        </T>
        <T muted size={11}>
          puncak {km(max, 1)} km
        </T>
        <T muted size={11}>
          minggu ini
        </T>
      </Row>
    </View>
  );
}
