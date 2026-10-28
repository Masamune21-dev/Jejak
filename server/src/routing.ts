// Rute mengikuti jalan lewat OSRM publik dari FOSSGIS (routing.openstreetmap.de).
// Bila layanan gagal, rute dibuat garis lurus antar titik supaya tetap bisa disimpan.

import type { ActivityType, RouteStep, RoutingResult } from '../../shared/api.ts';
import { cumulativeDistance, pathDistance, type LatLon } from '../../shared/geo.ts';

const BASE = process.env.ROUTING_URL ?? 'https://routing.openstreetmap.de';
const PROFILE: Record<ActivityType, string> = { run: 'routed-foot', walk: 'routed-foot', ride: 'routed-bike' };
const USER_AGENT = 'Jejak/0.1 (aplikasi olahraga pribadi)';

interface OsrmStep {
  distance: number;
  name: string;
  maneuver: { type: string; modifier?: string; location: [number, number]; exit?: number };
}

const MODIFIER: Record<string, string> = {
  left: 'Belok kiri',
  right: 'Belok kanan',
  'slight left': 'Agak ke kiri',
  'slight right': 'Agak ke kanan',
  'sharp left': 'Belok tajam ke kiri',
  'sharp right': 'Belok tajam ke kanan',
  straight: 'Lurus terus',
  uturn: 'Putar balik',
};

/** Ubah satu manuver OSRM jadi kalimat; null bila tidak perlu diumumkan. */
export function stepText(step: OsrmStep, isLast: boolean): string | null {
  const { type, modifier, exit } = step.maneuver;
  const name = step.name ? ` ke ${step.name}` : '';
  switch (type) {
    case 'depart':
      return null;
    case 'arrive':
      return isLast ? 'Sampai di tujuan' : null;
    case 'roundabout':
    case 'rotary':
      return exit ? `Di bundaran ambil keluar ke-${exit}${name}` : `Masuk bundaran${name}`;
    case 'new name':
    case 'continue':
      if (!modifier || modifier === 'straight') return null;
      break;
    case 'notification':
      return null;
  }
  const verb = (modifier && MODIFIER[modifier]) ?? 'Lanjut';
  return `${verb}${name}`;
}

export async function planRoute(type: ActivityType, waypoints: LatLon[]): Promise<RoutingResult> {
  try {
    const coords = waypoints.map(([lat, lon]) => `${lon.toFixed(6)},${lat.toFixed(6)}`).join(';');
    const url = `${BASE}/${PROFILE[type]}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`routing ${res.status}`);
    const body = (await res.json()) as {
      code: string;
      routes?: { geometry: { coordinates: [number, number][] }; legs: { steps: OsrmStep[] }[] }[];
    };
    const route = body.routes?.[0];
    if (body.code !== 'Ok' || !route) throw new Error(`routing ${body.code}`);
    const geometry: LatLon[] = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    const cum = cumulativeDistance(geometry);
    const allSteps = route.legs.flatMap((l) => l.steps);
    const steps: RouteStep[] = [];
    let searchFrom = 0;
    allSteps.forEach((s, i) => {
      const text = stepText(s, i === allSteps.length - 1);
      const at: LatLon = [s.maneuver.location[1], s.maneuver.location[0]];
      // Posisi manuver dicari maju di geometri, supaya rute yang lewat titik sama dua kali tetap urut.
      let best = searchFrom;
      let bestD = Infinity;
      for (let k = searchFrom; k < geometry.length; k++) {
        const d = Math.abs(geometry[k][0] - at[0]) + Math.abs(geometry[k][1] - at[1]);
        if (d < bestD) {
          bestD = d;
          best = k;
        }
        if (d < 1e-7) break;
      }
      searchFrom = best;
      if (text) steps.push({ atM: cum[best], text, at });
    });
    return { geometry, distanceM: pathDistance(geometry), steps, snapped: true };
  } catch (e) {
    console.warn('[routing] gagal, pakai garis lurus:', (e as Error).message);
    return { geometry: waypoints, distanceM: pathDistance(waypoints), steps: [], snapped: false };
  }
}
