import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import type { LatLon } from '@shared/geo';

import { useColors } from '@/lib/theme';

/** Bentuk rute tanpa peta (ringan untuk daftar/feed). */
export default function RouteShape({
  points,
  color,
  height = 150,
  strokeWidth = 4,
}: {
  points: LatLon[];
  color?: string;
  height?: number;
  strokeWidth?: number;
}) {
  const c = useColors();
  if (points.length < 2) return <View style={{ height, backgroundColor: c.primarySoft, borderRadius: 10 }} />;
  // Proyeksi sederhana: bujur dikali cos(lintang) supaya bentuk tidak gepeng.
  const k = Math.cos((points[0][0] * Math.PI) / 180);
  const xs = points.map((p) => p[1] * k);
  const ys = points.map((p) => -p[0]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX || 1e-6;
  const h = Math.max(...ys) - minY || 1e-6;
  const W = 300;
  const H = 150;
  const pad = 14;
  const scale = Math.min((W - pad * 2) / w, (H - pad * 2) / h);
  const ox = (W - w * scale) / 2;
  const oy = (H - h * scale) / 2;
  const pts = xs.map((x, i) => [ox + (x - minX) * scale, oy + (ys[i] - minY) * scale] as const);
  const last = pts[pts.length - 1];
  return (
    <View style={{ height, backgroundColor: c.primarySoft, borderRadius: 10, overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <Polyline
          points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
          fill="none"
          stroke={color ?? c.primary}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={pts[0][0]} cy={pts[0][1]} r={5} fill="#22A45D" stroke="#fff" strokeWidth={2} />
        <Circle cx={last[0]} cy={last[1]} r={5} fill="#D93B30" stroke="#fff" strokeWidth={2} />
      </Svg>
    </View>
  );
}
