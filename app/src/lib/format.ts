import type { ActivityType } from '@shared/api';

export const TYPE_LABEL: Record<ActivityType, string> = { run: 'Lari', ride: 'Bersepeda', walk: 'Jalan kaki' };
export const TYPE_ICON: Record<ActivityType, 'walk' | 'bicycle' | 'footsteps'> = {
  run: 'walk',
  ride: 'bicycle',
  walk: 'footsteps',
};
/** Kecepatan rata-rata untuk perkiraan waktu rute (m/s). */
export const TYPE_SPEED: Record<ActivityType, number> = { run: 2.8, ride: 5.5, walk: 1.3 };

export function km(m: number, digits = 2): string {
  return (m / 1000).toFixed(digits).replace('.', ',');
}

export function distance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${km(m)} km`;
}

/** 1:05:09 atau 25:09 */
export function duration(s: number): string {
  const total = Math.max(0, Math.round(s));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** Durasi santai untuk ringkasan: "1j 5m" atau "25m". */
export function durationShort(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

/** Pace per km, "5:12 /km". */
export function pace(distanceM: number, seconds: number): string {
  if (distanceM < 10 || seconds <= 0) return '–';
  const perKm = seconds / (distanceM / 1000);
  if (perKm > 3600) return '–';
  return `${duration(perKm)} /km`;
}

export function speed(distanceM: number, seconds: number): string {
  if (seconds <= 0) return '–';
  return `${((distanceM / seconds) * 3.6).toFixed(1).replace('.', ',')} km/j`;
}

/** Pace untuk lari/jalan, kecepatan untuk sepeda. */
export function tempo(type: ActivityType, distanceM: number, seconds: number): { label: string; value: string } {
  return type === 'ride'
    ? { label: 'Kecepatan', value: speed(distanceM, seconds) }
    : { label: 'Pace', value: pace(distanceM, seconds) };
}

/** Angka dan satuan dipisah supaya angka bisa tampil besar. */
export interface Parts {
  value: string;
  unit: string;
}

export function distanceParts(m: number): Parts {
  return m < 1000 ? { value: String(Math.round(m)), unit: 'm' } : { value: km(m), unit: 'km' };
}

export function tempoParts(type: ActivityType, distanceM: number, seconds: number): Parts & { label: string } {
  if (type === 'ride') {
    const v = seconds > 0 ? ((distanceM / seconds) * 3.6).toFixed(1).replace('.', ',') : '–';
    return { label: 'Kecepatan', value: v, unit: 'km/j' };
  }
  const p = pace(distanceM, seconds);
  return { label: 'Pace', value: p.replace(' /km', ''), unit: p === '–' ? '' : '/km' };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** "Rabu, 28 Okt" */
export function today(d = new Date()): string {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
}

export function dateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function when(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
  const days = Math.floor((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days === 0) return `Hari ini pukul ${time}`;
  if (days === 1) return `Kemarin pukul ${time}`;
  if (days < 7) return `${days} hari lalu`;
  return dateShort(iso);
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Lari, kemarin pukul 06.12" */
export function activityMeta(type: ActivityType, iso: string): string {
  const w = when(iso);
  return `${TYPE_LABEL[type]}, ${w.charAt(0).toLowerCase()}${w.slice(1)}`;
}

export function defaultTitle(type: ActivityType, startedAt: number): string {
  const h = new Date(startedAt).getHours();
  const part = h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 18 ? 'sore' : 'malam';
  return `${TYPE_LABEL[type]} ${part}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}
