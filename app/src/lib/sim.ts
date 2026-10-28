// GPS simulasi untuk mencoba perekaman tanpa keluar rumah (mode uji).
// Bergerak di sepanjang jalur dengan jam sendiri yang berjalan `factor` kali lebih cepat.

import { cumulativeDistance, pointAtDistance, type LatLon } from '@shared/geo';

import type { LocationSource } from './location-source';

export function createSimSource(path: LatLon[], speedMps: number, factor = 8): LocationSource {
  const cum = cumulativeDistance(path);
  const total = cum[cum.length - 1] ?? 0;
  let simNow = Date.now();
  let along = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  return {
    kind: 'sim',
    now: () => simNow,
    async start(onFix) {
      timer = setInterval(() => {
        simNow += 1000;
        along = Math.min(total, along + speedMps * (0.85 + Math.random() * 0.3));
        const [lat, lon] = pointAtDistance(path, cum, along);
        const jitter = () => (Math.random() - 0.5) * 0.00002;
        onFix([{ lat: lat + jitter(), lon: lon + jitter(), t: simNow, alt: 110 + 12 * Math.sin(along / 350), acc: 5 }]);
      }, 1000 / factor);
    },
    async stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}

/** Putaran persegi ±500 m di sekitar `center`, diulang tiga kali. */
export function loopAround(center: LatLon, sideM = 500): LatLon[] {
  const dLat = sideM / 111_195;
  const dLon = sideM / (111_195 * Math.cos((center[0] * Math.PI) / 180));
  const square: LatLon[] = [
    center,
    [center[0] + dLat, center[1]],
    [center[0] + dLat, center[1] + dLon],
    [center[0], center[1] + dLon],
    center,
  ];
  return [...square, ...square.slice(1), ...square.slice(1)];
}
