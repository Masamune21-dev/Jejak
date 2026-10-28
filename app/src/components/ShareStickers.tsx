import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { Activity } from '@shared/api';

import { distanceParts, tempoParts, TYPE_ICON } from '@/lib/format';
import { routePath } from '@/lib/route-path';
import { font } from '@/lib/theme';

/**
 * Stiker bagikan bergaya Strava: garis rute dan angka TANPA latar, diekspor sebagai PNG transparan
 * untuk ditempel di atas foto sendiri (Instagram Story dll). Merek yang dipakai tetap "jejak.".
 * Ukuran diskalakan dari lebar `w` (desain dasar 360 px); posisi vertikal relatif terhadap `h`.
 */
export interface StickerProps {
  a: Activity;
  w: number;
  h: number;
  /** Warna garis rute. */
  line: string;
}

export type StickerKey = 'samping' | 'daftar' | 'tumpuk' | 'ringkas' | 'baris';

export const STICKERS: { key: StickerKey; name: string; render: (p: StickerProps) => ReactNode }[] = [
  { key: 'samping', name: 'Samping', render: (p) => <SideSticker {...p} /> },
  { key: 'daftar', name: 'Daftar', render: (p) => <ListSticker {...p} /> },
  { key: 'tumpuk', name: 'Tumpuk', render: (p) => <StackSticker {...p} /> },
  { key: 'ringkas', name: 'Ringkas', render: (p) => <CompactSticker {...p} /> },
  { key: 'baris', name: 'Baris', render: (p) => <RowSticker {...p} /> },
];

interface Stat {
  label: string;
  value: string;
}

/** "25m 2d" atau "1j 5m", seperti di stiker Strava. */
function durasi(s: number): string {
  const t = Math.max(0, Math.round(s));
  const j = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  return j > 0 ? `${j}j ${m}m` : `${m}m ${t % 60}d`;
}

function stickerStats(a: Activity) {
  const d = distanceParts(a.distanceM);
  const tp = tempoParts(a.type, a.distanceM, a.movingS);
  const alts = a.track.flat().flatMap((p) => (p[3] == null ? [] : [p[3]]));
  const dist: Stat = { label: 'Jarak', value: `${d.value} ${d.unit}` };
  const gain: Stat = { label: 'Kenaikan Elev.', value: `${Math.round(a.elevGainM)} m` };
  const time: Stat = { label: 'Waktu', value: durasi(a.movingS) };
  const tempo: Stat = { label: tp.label, value: tp.unit ? `${tp.value} ${tp.unit}` : tp.value };
  const max: Stat | null =
    a.type === 'ride' ? { label: 'Kecepatan Maks', value: `${(a.maxSpeedMps * 3.6).toFixed(1).replace('.', ',')} km/j` } : null;
  const elevMax: Stat | null = alts.length ? { label: 'Elev Maks', value: `${Math.round(Math.max(...alts))} m` } : null;
  /** Urutan daftar lengkap, seperti stiker Strava. */
  const all = [dist, gain, time, tempo, max, elevMax].filter((x): x is Stat => x != null);
  return { dist, gain, time, tempo, max, elevMax, all };
}

/** Teks putih dengan bayangan tipis supaya terbaca di atas foto terang maupun gelap. */
const shade: TextStyle = { color: '#fff', textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 4 };

function Route({ a, w, h, line, stroke }: { a: Activity; w: number; h: number; line: string; stroke: number }) {
  const r = routePath(a.preview, w, h, stroke * 2);
  if (!r) return null;
  return (
    <Svg width={w} height={h}>
      <Path
        d={r.d}
        fill="none"
        stroke="#000"
        strokeOpacity={0.25}
        strokeWidth={stroke + 3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d={r.d} fill="none" stroke={line} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Wordmark({ k, size = 22, dot }: { k: number; size?: number; dot: string }) {
  return (
    <Text style={[shade, { fontFamily: font.black, fontSize: size * k, letterSpacing: -0.5 * k, lineHeight: size * k * 1.15 }]}>
      jejak<Text style={{ color: dot }}>.</Text>
    </Text>
  );
}

/** Kotak posisi mutlak relatif ukuran stiker. */
const box = (left: number, top: number, width: number, height: number) =>
  ({ position: 'absolute', left, top, width, height }) as const;

// --- 1. Samping: angka berpasangan diputar 90° di tepi kanan ---

function SideSticker({ a, w, h, line }: StickerProps) {
  const k = w / 360;
  const s = stickerStats(a);
  // Pasangan dari bawah ke atas: [Jarak, Kenaikan], [Waktu, Kecepatan/Pace], [sisanya].
  const pairs: Stat[][] = [];
  for (let i = 0; i < s.all.length; i += 2) pairs.push(s.all.slice(i, i + 2));
  const centersY = [0.84, 0.56, 0.28].map((f) => f * h);
  const strip = 0.24 * h;
  const thick = 34 * k;
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={box(0.16 * w, 0.2 * h, 0.5 * w, 40 * k)}>
        <Wordmark k={k} dot={line} />
      </View>
      <View style={box(0.14 * w, 0.34 * h, 0.58 * w, 0.44 * h)}>
        <Route a={a} w={0.58 * w} h={0.44 * h} line={line} stroke={4 * k} />
      </View>
      {pairs.map((pair, i) => (
        <View
          key={pair[0].label}
          style={[
            box(0.82 * w - strip / 2, centersY[i] - thick / 2, strip, thick),
            { transform: [{ rotate: '-90deg' }], justifyContent: 'center', gap: 2 * k },
          ]}>
          {pair.map((st) => (
            <View key={st.label} style={{ flexDirection: 'row', gap: 10 * k }}>
              <Text style={[shade, { fontFamily: font.medium, fontSize: 9 * k, minWidth: 0.42 * strip }]} numberOfLines={1}>
                {st.label}
              </Text>
              <Text style={[shade, { fontFamily: font.bold, fontSize: 10 * k }]} numberOfLines={1}>
                {st.value}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// --- 2. Daftar: garis rute besar, wordmark, dan daftar angka dengan titik-titik penuntun ---

function ListSticker({ a, w, h, line }: StickerProps) {
  const k = w / 360;
  const s = stickerStats(a);
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={box(0.1 * w, 0.1 * h, 0.8 * w, 0.52 * h)}>
        <Route a={a} w={0.8 * w} h={0.52 * h} line={line} stroke={4.5 * k} />
      </View>
      <View style={[box(0.09 * w, 0.66 * h, 0.82 * w, 0.3 * h), { gap: 3 * k }]}>
        <Wordmark k={k} dot={line} />
        <View style={{ height: 4 * k }} />
        {s.all.map((st) => (
          <View key={st.label} style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Text style={[shade, { fontFamily: font.medium, fontSize: 10.5 * k }]}>{st.label}</Text>
            <Text style={[shade, styles.dots, { fontSize: 10.5 * k }]} numberOfLines={1} ellipsizeMode="clip">
              {'.'.repeat(120)}
            </Text>
            <Text style={[shade, { fontFamily: font.semibold, fontSize: 10.5 * k }]}>{st.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// --- 3. Tumpuk: angka besar bertumpuk di tengah, garis rute besar di belakangnya ---

function StackSticker({ a, w, h, line }: StickerProps) {
  const k = w / 360;
  const s = stickerStats(a);
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={box(0.16 * w, 0.27 * h, 0.68 * w, 0.54 * h)}>
        <Route a={a} w={0.68 * w} h={0.54 * h} line={line} stroke={4.5 * k} />
      </View>
      <View style={[box(0, 0.25 * h, w, 0.7 * h), { alignItems: 'center', gap: 4 * k }]}>
        <Wordmark k={k} size={20} dot={line} />
        {s.all.map((st) => (
          <View key={st.label} style={{ alignItems: 'center', marginTop: 4 * k }}>
            <Text style={[shade, { fontFamily: font.medium, fontSize: 11 * k }]}>{st.label}</Text>
            <Text style={[shade, { fontFamily: font.black, fontSize: 25 * k, lineHeight: 30 * k, letterSpacing: -0.5 * k }]}>
              {st.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// --- 4. Ringkas: tiga angka besar, garis rute kecil, wordmark di bawah ---

function CompactSticker({ a, w, h, line }: StickerProps) {
  const k = w / 360;
  const s = stickerStats(a);
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[box(0, 0.16 * h, w, 0.4 * h), { alignItems: 'center', gap: 10 * k }]}>
        {[s.dist, s.gain, s.time].map((st) => (
          <View key={st.label} style={{ alignItems: 'center' }}>
            <Text style={[shade, { fontFamily: font.bold, fontSize: 13 * k }]}>{st.label}</Text>
            <Text style={[shade, { fontFamily: font.black, fontSize: 34 * k, lineHeight: 40 * k, letterSpacing: -1 * k }]}>
              {st.value}
            </Text>
          </View>
        ))}
      </View>
      <View style={box(0.39 * w, 0.58 * h, 0.22 * w, 0.15 * h)}>
        <Route a={a} w={0.22 * w} h={0.15 * h} line={line} stroke={2.2 * k} />
      </View>
      <View style={[box(0, 0.79 * h, w, 40 * k), { alignItems: 'center' }]}>
        <Wordmark k={k} dot={line} />
      </View>
    </View>
  );
}

// --- 5. Baris: garis rute, wordmark, tiga angka sebaris, ikon jenis aktivitas ---

function RowSticker({ a, w, h, line }: StickerProps) {
  const k = w / 360;
  const s = stickerStats(a);
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={box(0.24 * w, 0.2 * h, 0.52 * w, 0.32 * h)}>
        <Route a={a} w={0.52 * w} h={0.32 * h} line={line} stroke={4.5 * k} />
      </View>
      <View style={[box(0, 0.56 * h, w, 0.2 * h), { alignItems: 'center', gap: 10 * k }]}>
        <Wordmark k={k} size={19} dot={line} />
        <View style={{ flexDirection: 'row', gap: 22 * k }}>
          {[s.dist, s.gain, s.time].map((st) => (
            <View key={st.label} style={{ alignItems: 'center' }}>
              <Text style={[shade, { fontFamily: font.medium, fontSize: 8.5 * k }]}>{st.label}</Text>
              <Text style={[shade, { fontFamily: font.bold, fontSize: 15 * k }]}>{st.value}</Text>
            </View>
          ))}
        </View>
        <Ionicons name={TYPE_ICON[a.type]} size={20 * k} color="#fff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flex: 1, fontFamily: font.medium, overflow: 'hidden', marginHorizontal: 2 },
});
