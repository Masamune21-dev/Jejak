import { useColorScheme } from 'react-native';

// Identitas Jejak: tinta gelap + hijau volt, angka besar condensed.
const light = {
  bg: '#F2F3EE',
  surface: '#FFFFFF',
  surface2: '#E9EBE4',
  text: '#0E1114',
  muted: '#6A7068',
  line: '#E0E2DA',
  accent: '#C6F03C',
  accentInk: '#0E1114',
  /** Warna aksen untuk teks/ikon di atas latar terang (volt terlalu pucat untuk teks). */
  accentText: '#4F7A00',
  ink: '#0E1114',
  inkText: '#F2F4EE',
  track: '#FF4F1A',
  route: '#2F6BFF',
  segment: '#8B5CF6',
  gold: '#F2B705',
  silver: '#A3ABB4',
  bronze: '#C9814B',
  danger: '#E5484D',
  start: '#17B26A',
  finish: '#E5484D',
  me: '#2F6BFF',
  shadow: 'rgba(14,17,20,0.10)',
  overlay: 'rgba(14,17,20,0.45)',
  /** Panel gelap untuk ringkasan & banner (tetap gelap di tema terang). */
  slab: '#0E1114',
};

const dark: typeof light = {
  bg: '#0A0C0E',
  surface: '#15181C',
  surface2: '#1F2328',
  text: '#F2F4EE',
  muted: '#8B929A',
  line: '#262A30',
  accent: '#C6F03C',
  accentInk: '#0E1114',
  accentText: '#C6F03C',
  ink: '#F2F4EE',
  inkText: '#0E1114',
  track: '#FF5A26',
  route: '#5B8CFF',
  segment: '#A07BFF',
  gold: '#F5C400',
  silver: '#B9C0C8',
  bronze: '#D9925A',
  danger: '#FF6369',
  start: '#2FD07F',
  finish: '#FF6369',
  me: '#5B8CFF',
  shadow: 'rgba(0,0,0,0.5)',
  overlay: 'rgba(0,0,0,0.6)',
  slab: '#1A2015',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}

/** Nama keluarga font yang dimuat di _layout.tsx. */
export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  black: 'Inter_800ExtraBold',
  num: 'BarlowCondensed_600SemiBold',
  numBold: 'BarlowCondensed_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/** Bayangan lembut untuk kartu & panel (iOS/web pakai shadow*, Android pakai elevation). */
export function shadow(c: Colors, level: 1 | 2 = 1) {
  return {
    shadowColor: '#000',
    shadowOpacity: level === 1 ? 0.06 : 0.14,
    shadowRadius: level === 1 ? 10 : 18,
    shadowOffset: { width: 0, height: level === 1 ? 2 : 6 },
    elevation: level === 1 ? 2 : 8,
    ...(c.bg === dark.bg ? { shadowOpacity: level === 1 ? 0.3 : 0.5 } : {}),
  };
}
