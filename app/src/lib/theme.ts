// Tema Jejak: gelap kehijauan dengan aksen hijau mint yang menyala (mengikuti referensi pemilik).
// App selalu gelap, apa pun setelan HP.

/** Warna tetap untuk template bagikan (nomor dada, patok, rambu) yang meniru benda nyata. */
export const ROAD = {
  aspal: '#2A2D31',
  beton: '#EEEEEA',
  marka: '#FFC629',
  patok: '#D7332A',
  rambu: '#0B7A55',
  putih: '#FFFFFF',
};

const palette = {
  bg: '#080D0B',
  surface: '#111916',
  surface2: '#18221E',
  /** Gradasi kartu: atas sedikit lebih terang dari bawah. */
  cardTop: '#16211D',
  cardBottom: '#0E1512',
  text: '#EEF4F1',
  muted: '#86958F',
  line: '#1E2A25',
  accent: '#2EE59D',
  accentDeep: '#12B77A',
  accentInk: '#03170E',
  accentText: '#2EE59D',
  /** Latar lembut berwarna aksen (pil, ikon). */
  accentSoft: 'rgba(46,229,157,0.14)',
  ink: '#EEF4F1',
  inkText: '#080D0B',
  track: '#2EE59D',
  route: '#4DA3FF',
  segment: '#FFB547',
  gold: '#FFC94D',
  silver: '#B9C3BF',
  bronze: '#D49A6A',
  danger: '#FF5C5C',
  start: '#2EE59D',
  finish: '#FF5C5C',
  me: '#4DA3FF',
  shadow: 'rgba(0,0,0,0.6)',
  overlay: 'rgba(0,0,0,0.6)',
  slab: '#121C18',
};

export type Colors = typeof palette;

export function useColors(): Colors {
  return palette;
}

export function useIsDark(): boolean {
  return true;
}

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
    shadowOpacity: level === 1 ? 0.35 : 0.55,
    shadowRadius: level === 1 ? 10 : 22,
    shadowOffset: { width: 0, height: level === 1 ? 4 : 10 },
    elevation: level === 1 ? 3 : 10,
  };
}

/** Cahaya hijau di sekitar tombol/ikon utama. */
export function glow(color = palette.accent, strength = 1) {
  return {
    shadowColor: color,
    shadowOpacity: 0.55 * strength,
    shadowRadius: 18 * strength,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  };
}

/** Filter yang mengubah ubin OpenStreetMap terang menjadi versi gelap tanpa menghilangkan jalan. */
export const DARK_MAP_FILTER = 'invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.88) saturate(0.6)';
