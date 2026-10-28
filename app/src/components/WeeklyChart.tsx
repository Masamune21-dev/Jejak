import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import type { WeekTotal } from '@shared/api';

import { km } from '@/lib/format';
import { font, useColors } from '@/lib/theme';

const H = 150;
const PAD_TOP = 34;
const PAD_BOTTOM = 8;

/**
 * Garis halus (Catmull-Rom → Bézier) melewati semua titik. Titik kendali dijepit di antara
 * dua titik yang dihubungkan, jadi kurva tidak pernah turun di bawah nol atau melewati puncak.
 */
function smooth(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, Math.min(a, b)), Math.max(a, b));
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, clamp(p1[1] + (p2[1] - p0[1]) / 6, p1[1], p2[1])];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, clamp(p2[1] - (p3[1] - p1[1]) / 6, p1[1], p2[1])];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Grafik area jarak per minggu (12 minggu) dengan gelembung nilai minggu ini. */
export default function WeeklyChart({ weeks }: { weeks: WeekTotal[] }) {
  const c = useColors();
  const [w, setW] = useState(0);
  const max = Math.max(1, ...weeks.map((x) => x.distanceM));
  const label = (iso: string) => {
    const [, m, d] = iso.split('-');
    return `${Number(d)}/${Number(m)}`;
  };

  const n = weeks.length;
  const pts: [number, number][] = weeks.map((x, i) => [
    n > 1 ? (i / (n - 1)) * w : w / 2,
    PAD_TOP + (1 - x.distanceM / max) * (H - PAD_TOP - PAD_BOTTOM),
  ]);
  const line = smooth(pts);
  const area = pts.length ? `${line} L${pts[pts.length - 1][0]} ${H} L${pts[0][0]} ${H} Z` : '';
  const last = pts[pts.length - 1];
  const lastWeek = weeks[weeks.length - 1];
  const bubbleX = last ? Math.min(Math.max(last[0], 36), w - 36) : 0;

  return (
    <View style={{ gap: 8 }}>
      <View style={{ height: H }} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
        {w > 0 ? (
          <Svg width={w} height={H}>
            <Defs>
              <LinearGradient id="isi" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={c.accent} stopOpacity={0.35} />
                <Stop offset="1" stopColor={c.accent} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0.33, 0.66].map((f) => (
              <Line key={f} x1={0} x2={w} y1={PAD_TOP + f * (H - PAD_TOP)} y2={PAD_TOP + f * (H - PAD_TOP)} stroke={c.line} strokeWidth={1} />
            ))}
            <Path d={area} fill="url(#isi)" />
            <Path d={line} fill="none" stroke={c.accent} strokeWidth={3} strokeLinecap="round" />
            {last ? (
              <>
                <Line x1={last[0]} x2={last[0]} y1={last[1]} y2={H} stroke={c.accent} strokeOpacity={0.4} strokeWidth={1} strokeDasharray="3 3" />
                <Circle cx={last[0]} cy={last[1]} r={9} fill={c.accent} fillOpacity={0.25} />
                <Circle cx={last[0]} cy={last[1]} r={5} fill={c.accent} stroke={c.bg} strokeWidth={2} />
              </>
            ) : null}
          </Svg>
        ) : null}
        {w > 0 && last && lastWeek ? (
          <View style={[styles.bubble, { left: bubbleX - 34, top: Math.max(0, last[1] - 34), backgroundColor: c.text }]}>
            <Text style={[styles.bubbleText, { color: c.bg }]}>{km(lastWeek.distanceM, 1)} km</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.axis}>
        {weeks.map((x, i) =>
          i % 3 === 0 || i === n - 1 ? (
            <Text key={x.start} style={[styles.tick, { color: i === n - 1 ? c.accent : c.muted }]}>
              {i === n - 1 ? 'Kini' : label(x.start)}
            </Text>
          ) : null,
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { position: 'absolute', width: 68, alignItems: 'center', borderRadius: 10, paddingVertical: 4 },
  bubbleText: { fontFamily: font.bold, fontSize: 12 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  tick: { fontFamily: font.medium, fontSize: 11 },
});
