import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import type { LatLon } from '@shared/geo';

import { useColors, useIsDark } from '@/lib/theme';

const TILE = 256;

/** Ubin Esri Light/Dark Gray Canvas: bersih, tanpa kunci API, wajib atribusi. */
const MAX_ZOOM = 16;
function tileUrl(dark: boolean, z: number, x: number, y: number) {
  const layer = dark ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base';
  return `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${layer}/MapServer/tile/${z}/${y}/${x}`;
}

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
}: {
  points: LatLon[];
  height?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  radius?: number;
}) {
  const c = useColors();
  const dark = useIsDark();
  const [width, setWidth] = useState(0);
  const lineColor = color ?? c.track;

  let content = null;
  if (width > 0 && points.length >= 2) {
    const pad = 28;
    let z = MAX_ZOOM;
    for (; z > 2; z--) {
      const px = points.map((p) => project(p, z));
      const xs = px.map((p) => p[0]);
      const ys = px.map((p) => p[1]);
      if (Math.max(...xs) - Math.min(...xs) <= width - pad * 2 && Math.max(...ys) - Math.min(...ys) <= height - pad * 2) break;
    }
    const px = points.map((p) => project(p, z));
    const xs = px.map((p) => p[0]);
    const ys = px.map((p) => p[1]);
    const ox = (Math.min(...xs) + Math.max(...xs)) / 2 - width / 2;
    const oy = (Math.min(...ys) + Math.max(...ys)) / 2 - height / 2;
    const n = 2 ** z;
    const tiles: { key: string; uri: string; left: number; top: number }[] = [];
    for (let ty = Math.floor(oy / TILE); ty <= Math.floor((oy + height) / TILE); ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = Math.floor(ox / TILE); tx <= Math.floor((ox + width) / TILE); tx++) {
        const wx = ((tx % n) + n) % n;
        tiles.push({ key: `${z}/${tx}/${ty}`, uri: tileUrl(dark, z, wx, ty), left: tx * TILE - ox, top: ty * TILE - oy });
      }
    }
    const line = px.map(([x, y]) => `${(x - ox).toFixed(1)},${(y - oy).toFixed(1)}`).join(' ');
    const [sx, sy] = [px[0][0] - ox, px[0][1] - oy];
    const [ex, ey] = [px[px.length - 1][0] - ox, px[px.length - 1][1] - oy];
    content = (
      <>
        {tiles.map((t) => (
          <Image
            key={t.key}
            source={{ uri: t.uri }}
            style={{ position: 'absolute', left: t.left, top: t.top, width: TILE, height: TILE }}
            cachePolicy="memory-disk"
            transition={120}
          />
        ))}
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Polyline
            points={line}
            fill="none"
            stroke={dark ? '#000' : '#fff'}
            strokeOpacity={0.9}
            strokeWidth={7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline points={line} fill="none" stroke={lineColor} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={ex} cy={ey} r={5.5} fill={c.finish} stroke="#fff" strokeWidth={2} />
          <Circle cx={sx} cy={sy} r={5.5} fill={c.start} stroke="#fff" strokeWidth={2} />
        </Svg>
        <Text style={[styles.attrib, { color: dark ? '#9aa' : '#667' }]}>© Esri, OpenStreetMap</Text>
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

const styles = StyleSheet.create({
  attrib: { position: 'absolute', right: 6, bottom: 3, fontSize: 8, opacity: 0.8 },
});
