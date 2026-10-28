import { View } from 'react-native';

import type { WeekTotal } from '@shared/api';

import { km } from '@/lib/format';
import { useColors, useIsDark } from '@/lib/theme';

import { Row, T } from './ui';

/** Batang jarak per minggu, 12 minggu terakhir. */
export default function WeeklyChart({ weeks }: { weeks: WeekTotal[] }) {
  const c = useColors();
  const dark = useIsDark();
  const max = Math.max(1, ...weeks.map((w) => w.distanceM));
  const label = (iso: string) => {
    const [, m, d] = iso.split('-');
    return `${Number(d)}/${Number(m)}`;
  };
  // Di tema terang batang volt kurang kontras, jadi pakai tinta gelap dengan minggu ini volt.
  const past = dark ? 'rgba(198,240,60,0.4)' : c.slab;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 6 }}>
        {weeks.map((w, i) => {
          const last = i === weeks.length - 1;
          return (
            <View key={w.start} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
              {last && w.distanceM > 0 ? (
                <T v="num" size={14}>
                  {km(w.distanceM, 1)}
                </T>
              ) : null}
              <View
                style={{
                  width: '100%',
                  height: `${Math.max(w.distanceM > 0 ? 8 : 3, (w.distanceM / max) * 80)}%`,
                  backgroundColor: last ? c.accent : w.distanceM > 0 ? past : c.line,
                  borderRadius: 6,
                  borderWidth: last && !dark ? 1.5 : 0,
                  borderColor: c.slab,
                }}
              />
            </View>
          );
        })}
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="small" size={11}>
          {weeks[0] ? label(weeks[0].start) : ''}
        </T>
        <T v="small" size={11}>
          puncak {km(max, 1)} km
        </T>
        <T v="small" size={11}>
          minggu ini
        </T>
      </Row>
    </View>
  );
}
