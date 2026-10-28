// Tema Jejak: gelap (aspal) atau terang (beton), dengan satu dari lima warna aksen; bawaan gelap + marka kuning.
// Pilihan disimpan di HP. useColors() untuk komponen; currentColors() untuk kode di luar React.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Appearance, Platform } from 'react-native';

/** Warna tetap untuk template bagikan (nomor dada, patok, rambu) yang meniru benda nyata. */
export const ROAD = {
  aspal: '#2A2D31',
  beton: '#EEEEEA',
  marka: '#FFC629',
  patok: '#D7332A',
  rambu: '#0B7A55',
  putih: '#FFFFFF',
};

export type ThemeMode = 'system' | 'dark' | 'light';
export type AccentKey = 'kuning' | 'mint' | 'biru' | 'oranye' | 'pink';

/** `ink` = teks di atas aksen; `onLight` = aksen sebagai teks/garis di latar terang (warna aslinya terlalu pucat). */
export const ACCENTS: Record<AccentKey, { name: string; short: string; base: string; deep: string; ink: string; onLight: string }> = {
  kuning: { name: 'Kuning marka', short: 'Kuning', base: ROAD.marka, deep: '#E0A800', ink: ROAD.aspal, onLight: '#8F6400' },
  mint: { name: 'Hijau mint', short: 'Mint', base: '#2EE59D', deep: '#12B77A', ink: '#03170E', onLight: '#0B7A55' },
  biru: { name: 'Biru', short: 'Biru', base: '#4DA3FF', deep: '#2F7FE0', ink: '#06182E', onLight: '#1F5FBF' },
  oranye: { name: 'Oranye', short: 'Oranye', base: '#FF8A4C', deep: '#E56A2A', ink: '#2A1206', onLight: '#B04A10' },
  pink: { name: 'Merah muda', short: 'Pink', base: '#FF5C8A', deep: '#E03A6A', ink: '#2A0612', onLight: '#B8204F' },
};

/** Campur dua warna hex: t = bagian warna `a` (0..1). */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * t + ((pb >> sh) & 255) * (1 - t));
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1).toUpperCase()}`;
}

/** Warna hex dengan transparansi: alpha('#1E2023', 0.5) → 'rgba(30,32,35,0.5)'. */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function buildPalette(dark: boolean, key: AccentKey) {
  const acc = ACCENTS[key];
  const bg = dark ? '#1E2023' : ROAD.beton;
  const heroBottom = dark ? '#25272A' : '#FFFFFF';
  // Bila aksennya biru, garis rute rencana (biasanya biru) diganti toska supaya tidak tertukar dengan garis aktivitas.
  const route = key === 'biru' ? (dark ? '#2EC5D6' : '#0E8A99') : dark ? '#4DA3FF' : '#2F6BFF';
  return {
    bg,
    surface: dark ? ROAD.aspal : '#FFFFFF',
    surface2: dark ? '#35393E' : '#E3E4DF',
    /** Gradasi kartu: atas sedikit lebih terang dari bawah. */
    cardTop: dark ? '#2E3135' : '#FFFFFF',
    cardBottom: dark ? '#24272A' : '#F5F5F1',
    /** Gradasi kartu utama (Minggu ini, hero profil, CTA rute, waktu terbaik segmen): latar bersemu aksen. */
    heroTop: mix(acc.base, heroBottom, dark ? 0.12 : 0.22),
    heroBottom,
    text: dark ? '#F1F1EC' : ROAD.aspal,
    muted: dark ? '#A3A6A8' : '#6B6E70',
    line: dark ? '#3A3E43' : '#D9DAD4',
    accent: acc.base,
    accentDeep: acc.deep,
    accentInk: acc.ink,
    accentText: dark ? acc.base : acc.onLight,
    /** Latar lembut berwarna aksen (pil, ikon). */
    accentSoft: alpha(acc.base, dark ? 0.14 : 0.2),
    ink: dark ? '#F1F1EC' : ROAD.aspal,
    inkText: dark ? '#1E2023' : '#FFFFFF',
    /** Garis aktivitas; di peta terang memakai versi gelap aksen supaya terlihat. */
    track: dark ? acc.base : acc.deep,
    route,
    /** Ungu supaya segmen tidak tertukar dengan garis aktivitas. */
    segment: dark ? '#A07BFF' : '#7C4DFF',
    gold: dark ? '#FFC94D' : '#E8A800',
    silver: dark ? '#B9C3BF' : '#9EA3A8',
    bronze: dark ? '#D49A6A' : '#B8743F',
    danger: dark ? '#FF5C5C' : '#D7332A',
    start: dark ? '#2FA77C' : ROAD.rambu,
    finish: dark ? '#F0554B' : ROAD.patok,
    me: route,
    shadow: dark ? 'rgba(0,0,0,0.6)' : 'rgba(42,45,49,0.14)',
    overlay: dark ? 'rgba(0,0,0,0.6)' : 'rgba(42,45,49,0.5)',
    slab: dark ? '#26292D' : '#E9E9E4',
  };
}

export type Colors = ReturnType<typeof buildPalette>;

/** Palet bawaan (gelap + kuning) untuk tampilan yang muncul sebelum tema dimuat, misalnya layar crash. */
export const palette: Colors = buildPalette(true, 'kuning');

// --- Penyimpanan pilihan tema ---

export interface ThemePrefs {
  mode: ThemeMode;
  accent: AccentKey;
}

const PREFS_KEY = 'jejak.tema';
let prefs: ThemePrefs = { mode: 'dark', accent: 'kuning' };
let systemDark = Appearance.getColorScheme() !== 'light';
let state = { colors: palette, dark: true, prefs };
const listeners = new Set<() => void>();

function recompute() {
  const dark = prefs.mode === 'system' ? systemDark : prefs.mode === 'dark';
  state = { colors: buildPalette(dark, prefs.accent), dark, prefs };
  listeners.forEach((l) => l());
}

Appearance.addChangeListener(({ colorScheme }) => {
  systemDark = colorScheme !== 'light';
  if (prefs.mode === 'system') recompute();
});

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getState = () => state;

/** Baca pilihan tema dari HP; dipanggil sekali sebelum layar pembuka ditutup supaya tidak berkedip. */
export async function loadTheme(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<ThemePrefs>;
      prefs = {
        mode: saved.mode === 'system' || saved.mode === 'light' || saved.mode === 'dark' ? saved.mode : 'dark',
        accent: saved.accent && saved.accent in ACCENTS ? saved.accent : 'kuning',
      };
    }
  } catch {}
  recompute();
}

export function setThemePrefs(patch: Partial<ThemePrefs>) {
  prefs = { ...prefs, ...patch };
  recompute();
  AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)).catch(() => {});
}

export function useColors(): Colors {
  return useSyncExternalStore(subscribe, getState, getState).colors;
}

export function useIsDark(): boolean {
  return useSyncExternalStore(subscribe, getState, getState).dark;
}

export function useThemePrefs(): ThemePrefs {
  return useSyncExternalStore(subscribe, getState, getState).prefs;
}

/** Palet aktif untuk kode di luar React (notifikasi rekaman, cahaya). */
export function currentColors(): Colors {
  return state.colors;
}

/**
 * Durasi efek pudar saat gambar (ubin peta, foto) selesai dimuat. Di web 0: transisi expo-image di build produksi
 * bisa macet di opacity 0, sehingga ubin peta dan foto tidak pernah tampil.
 */
export const IMAGE_FADE = Platform.OS === 'web' ? 0 : 120;

/** Plus Jakarta Sans untuk teks dan angka; Big Shoulders Display hanya untuk template bagikan. */
export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  black: 'PlusJakartaSans_800ExtraBold',
  num: 'PlusJakartaSans_600SemiBold',
  numBold: 'PlusJakartaSans_700Bold',
  display: 'BigShouldersDisplay_900Black',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 12, md: 16, lg: 22, xl: 28, pill: 999 } as const;

export function shadow(_c: Colors, level: 1 | 2 = 1) {
  return {
    shadowColor: '#000',
    shadowOpacity: state.dark ? (level === 1 ? 0.35 : 0.55) : level === 1 ? 0.1 : 0.18,
    shadowRadius: level === 1 ? 10 : 22,
    shadowOffset: { width: 0, height: level === 1 ? 4 : 10 },
    elevation: level === 1 ? 3 : 10,
  };
}

/** Cahaya berwarna aksen di sekitar tombol/ikon utama; lebih lembut di tema terang. */
export function glow(color = state.colors.accent, strength = 1) {
  return {
    shadowColor: color,
    shadowOpacity: (state.dark ? 0.55 : 0.35) * strength,
    shadowRadius: 18 * strength,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  };
}

/** Filter yang mengubah ubin OpenStreetMap terang menjadi versi gelap tanpa menghilangkan jalan (hanya di tema gelap). */
export const DARK_MAP_FILTER = 'invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.88) saturate(0.6)';
