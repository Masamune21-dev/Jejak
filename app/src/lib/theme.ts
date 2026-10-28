import { useColorScheme } from 'react-native';

// Warna diambil dari jalan (lihat docs/desain.md):
// aspal & beton untuk dasar, marka kuning untuk aksi, patok merah untuk rekaman/rekor,
// rambu hijau untuk rute & petunjuk arah.
export const ROAD = {
  aspal: '#2A2D31',
  beton: '#EEEEEA',
  marka: '#FFC629',
  patok: '#D7332A',
  rambu: '#0B7A55',
  putih: '#FFFFFF',
};

const light = {
  bg: ROAD.beton,
  surface: ROAD.putih,
  surface2: '#E3E4DF',
  text: ROAD.aspal,
  muted: '#6B6E70',
  line: '#D9DAD4',
  accent: ROAD.marka,
  accentInk: ROAD.aspal,
  /** Warna aksen untuk teks/ikon di atas latar terang (kuning terlalu pucat untuk teks). */
  accentText: '#8F6400',
  ink: ROAD.aspal,
  inkText: '#FFFFFF',
  track: ROAD.patok,
  route: ROAD.rambu,
  segment: '#E08A00',
  gold: '#E8A800',
  silver: '#9EA3A8',
  bronze: '#B8743F',
  danger: ROAD.patok,
  start: ROAD.rambu,
  finish: ROAD.patok,
  me: '#2F6BFF',
  shadow: 'rgba(42,45,49,0.12)',
  overlay: 'rgba(42,45,49,0.5)',
  /** Panel aspal untuk ringkasan & banner (tetap gelap di tema terang). */
  slab: ROAD.aspal,
};

const dark: typeof light = {
  bg: '#1E2023',
  surface: '#2A2D31',
  surface2: '#35393E',
  text: '#F1F1EC',
  muted: '#A3A6A8',
  line: '#3A3E43',
  accent: ROAD.marka,
  accentInk: ROAD.aspal,
  accentText: ROAD.marka,
  ink: '#F1F1EC',
  inkText: ROAD.aspal,
  track: '#F0554B',
  route: '#2FA77C',
  segment: '#F2A23A',
  gold: '#F2B705',
  silver: '#B9BEC3',
  bronze: '#D08A55',
  danger: '#F0554B',
  start: '#2FA77C',
  finish: '#F0554B',
  me: '#5B8CFF',
  shadow: 'rgba(0,0,0,0.45)',
  overlay: 'rgba(0,0,0,0.6)',
  slab: '#33373C',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}

/** Plus Jakarta Sans untuk teks, Big Shoulders Display untuk angka & wordmark (dimuat di _layout.tsx). */
export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  black: 'PlusJakartaSans_800ExtraBold',
  num: 'BigShouldersDisplay_700Bold',
  numBold: 'BigShouldersDisplay_800ExtraBold',
  display: 'BigShouldersDisplay_900Black',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
/** Radius mengikuti hierarki: panel 24, blok konten 14, peta/foto di dalam blok 10. */
export const radius = { sm: 10, md: 14, lg: 14, xl: 24, pill: 999 } as const;

/** Bayangan hanya untuk benda yang melayang di atas peta (panel bawah, banner). */
export function shadow(c: Colors, level: 1 | 2 = 1) {
  const darkMode = c.bg === dark.bg;
  return {
    shadowColor: '#000',
    shadowOpacity: darkMode ? 0.4 : level === 1 ? 0.08 : 0.16,
    shadowRadius: level === 1 ? 8 : 18,
    shadowOffset: { width: 0, height: level === 1 ? 2 : 6 },
    elevation: level === 1 ? 2 : 8,
  };
}
