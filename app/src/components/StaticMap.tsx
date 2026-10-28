import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { Platform, Image as RNImage, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { cumulativeDistance, type LatLon } from '@shared/geo';

import { alpha, DARK_MAP_FILTER, IMAGE_FADE, useColors, useIsDark } from '@/lib/theme';
import { OSM_ATTRIBUTION, OSM_MAX_ZOOM, osmTile, TILE_HEADERS } from '@/lib/tiles';

const TILE = 256;

/** Ubin cuplikan tidak perlu sedetail peta interaktif. */
const MAX_ZOOM = Math.min(OSM_MAX_ZOOM, 17);

/** iOS belum mendukung filter warna; di sana ubin terang diredupkan dengan lapisan gelap. */
const FILTER_OK = Platform.OS !== 'ios';

/** Proyeksi Web Mercator ke piksel dunia pada zoom z. */
function project([lat, lon]: LatLon, z: number): [number, number] {
  const scale = TILE * 2 ** z;
  const sin = Math.sin((lat * Math.PI) / 180);
  return [((lon + 180) / 360) * scale, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale];
}

/**
 * Cuplikan peta diam untuk daftar & feed: ubin peta + garis rute SVG.
 * Jauh lebih ringan dari peta interaktif, dan tampil sama di HP maupun web.
 */
export default function StaticMap({
  points,
  height = 180,
  color,
  style,
  radius = 16,
  pad = 28,
  attribution = true,
  progress,
}: {
  points: LatLon[];
  height?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  /** Jarak tepi garis rute ke tepi peta (px); per sisi untuk menggeser rute, mis. ke samping teks di landing page. */
  pad?: number | { top: number; right: number; bottom: number; left: number };
  /** false bila pemanggil menutup tepi bawah peta (mis. gradasi) dan menggambar atribusi OSM sendiri. */
  attribution?: boolean;
  /** 0..1: gambar sebagian garis (demo rekaman berjalan) dengan titik posisi di ujungnya. Zoom tetap dari garis penuh. */
  progress?: number;
}) {
  const c = useColors();
  const dark = useIsDark();
  const [width, setWidth] = useState(0);
  const lineColor = color ?? c.track;

  let content = null;
  if (width > 0 && points.length >= 2) {
    const p4 = typeof pad === 'number' ? { top: pad, right: pad, bottom: pad, left: pad } : pad;
    const roomW = width - p4.left - p4.right;
    const roomH = height - p4.top - p4.bottom;
    let z = MAX_ZOOM;
    for (; z > 2; z--) {
      const px = points.map((p) => project(p, z));
      const xs = px.map((p) => p[0]);
      const ys = px.map((p) => p[1]);
      if (Math.max(...xs) - Math.min(...xs) <= roomW && Math.max(...ys) - Math.min(...ys) <= roomH) break;
    }
    const px = points.map((p) => project(p, z));
    const xs = px.map((p) => p[0]);
    const ys = px.map((p) => p[1]);
    // Tengah rute jatuh di tengah ruang kosong (setelah dikurangi jarak tepi tiap sisi).
    const ox = (Math.min(...xs) + Math.max(...xs)) / 2 - (p4.left + roomW / 2);
    const oy = (Math.min(...ys) + Math.max(...ys)) / 2 - (p4.top + roomH / 2);
    const n = 2 ** z;
    const tiles: Tile[] = [];
    for (let ty = Math.floor(oy / TILE); ty <= Math.floor((oy + height) / TILE); ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = Math.floor(ox / TILE); tx <= Math.floor((ox + width) / TILE); tx++) {
        const wx = ((tx % n) + n) % n;
        tiles.push({ key: `${z}/${tx}/${ty}`, uri: osmTile(z, wx, ty), left: tx * TILE - ox, top: ty * TILE - oy });
      }
    }
    const shown = progress == null || progress >= 1 ? px : partial(points, px, progress);
    const line = shown.map(([x, y]) => `${(x - ox).toFixed(1)},${(y - oy).toFixed(1)}`).join(' ');
    const [sx, sy] = [px[0][0] - ox, px[0][1] - oy];
    const [ex, ey] = [shown[shown.length - 1][0] - ox, shown[shown.length - 1][1] - oy];
    const live = progress != null && progress < 1;
    content = (
      <>
        <View style={[StyleSheet.absoluteFill, dark && FILTER_OK && { filter: DARK_MAP_FILTER }]}>
          <TileLayer tiles={tiles} sig={tiles.map((t) => `${t.key}@${t.left.toFixed(1)},${t.top.toFixed(1)}`).join('|')} />
        </View>
        {dark && !FILTER_OK ? <View style={[StyleSheet.absoluteFill, { backgroundColor: alpha(c.bg, 0.55) }]} /> : null}
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Polyline
            points={line}
            fill="none"
            stroke="#000"
            strokeOpacity={0.9}
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline points={line} fill="none" stroke={lineColor} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
          {live ? (
            <>
              <Circle cx={sx} cy={sy} r={5.5} fill={c.start} stroke="#fff" strokeWidth={2} />
              <Circle cx={ex} cy={ey} r={11} fill={lineColor} fillOpacity={0.25} />
              <Circle cx={ex} cy={ey} r={6} fill={lineColor} stroke="#fff" strokeWidth={2.5} />
            </>
          ) : (
            <>
              <Circle cx={ex} cy={ey} r={5.5} fill={c.finish} stroke="#fff" strokeWidth={2} />
              <Circle cx={sx} cy={sy} r={5.5} fill={c.start} stroke="#fff" strokeWidth={2} />
            </>
          )}
        </Svg>
        {attribution ? <Text style={[styles.attrib, { color: c.muted }]}>{OSM_ATTRIBUTION}</Text> : null}
      </>
    );
  }

  return (
    <View
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
      style={[{ height, borderRadius: radius, overflow: 'hidden', backgroundColor: c.surface2 }, style]}>
      {content}
    </View>
  );
}

interface Tile {
  key: string;
  uri: string;
  left: number;
  top: number;
}

/**
 * Ubin peta dibekukan selama posisinya sama: saat hanya garis yang bergerak (demo rekaman di landing page),
 * ubin tidak dirender ulang.
 *
 * Di web dipakai Image bawaan React Native dengan alamat polos. expo-image web memuat gambar secara malas dan
 * menunggu ukuran wadah sebelum membuat <img>, sehingga sebagian dari puluhan ubin kecil tidak pernah tampil;
 * sumber dengan `headers` juga membuatnya mengunduh ulang setiap render (peta berkedip hilang). Browser memang
 * tidak mengizinkan mengganti User-Agent, jadi header itu hanya berguna di HP.
 */
const TileLayer = memo(
  function TileLayer({ tiles }: { tiles: Tile[]; sig: string }) {
    return tiles.map((t) => {
      const style = { position: 'absolute' as const, left: t.left, top: t.top, width: TILE, height: TILE };
      return Platform.OS === 'web' ? (
        <RNImage key={t.key} source={{ uri: t.uri }} style={style} />
      ) : (
        <Image
          key={t.key}
          source={{ uri: t.uri, headers: TILE_HEADERS }}
          style={style}
          cachePolicy="memory-disk"
          transition={IMAGE_FADE}
        />
      );
    });
  },
  (a, b) => a.sig === b.sig,
);

/** Potongan garis (dalam piksel) sepanjang `f` dari jarak total, dengan titik ujung yang diinterpolasi. */
function partial(points: LatLon[], px: [number, number][], f: number): [number, number][] {
  const cum = cumulativeDistance(points);
  const target = Math.max(0, f) * cum[cum.length - 1];
  let i = 1;
  while (i < cum.length - 1 && cum[i] < target) i++;
  const span = cum[i] - cum[i - 1];
  const t = span > 0 ? Math.min(1, Math.max(0, (target - cum[i - 1]) / span)) : 1;
  const head: [number, number] = [px[i - 1][0] + (px[i][0] - px[i - 1][0]) * t, px[i - 1][1] + (px[i][1] - px[i - 1][1]) * t];
  return [...px.slice(0, i), head];
}

const styles = StyleSheet.create({
  attrib: { position: 'absolute', right: 6, bottom: 3, fontSize: 8, opacity: 0.8 },
});
