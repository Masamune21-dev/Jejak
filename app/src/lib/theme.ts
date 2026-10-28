// Tema Jejak: aspal gelap dengan aksen marka kuning (warna desain jalan yang dipilih pemilik).
// Tata letak (kartu, cahaya, tab bar) tetap dari desain berikutnya. App selalu gelap, apa pun setelan HP.

/** Warna tetap untuk template bagikan (nomor dada, patok, rambu) yang meniru benda nyata. */
export const ROAD = {
  aspal: '#2A2D31',
  beton: '#EEEEEA',
  marka: '#FFC629',
  patok: '#D7332A',
  rambu: '#0B7A55',
  putih: '#FFFFFF',
};

/** Diekspor untuk StyleSheet statis; komponen biasa memakai useColors(). */
export const palette = {
  bg: '#1E2023',
  surface: ROAD.aspal,
  surface2: '#35393E',
  /** Gradasi kartu: atas sedikit lebih terang dari bawah. */
  cardTop: '#2E3135',
  cardBottom: '#24272A',
  /** Gradasi kartu utama (Minggu ini, hero profil, CTA rute, waktu terbaik segmen): aspal bersemu kuning. */
  heroTop: '#3E3A2A',
  heroBottom: '#25272A',
  text: '#F1F1EC',
  muted: '#A3A6A8',
  line: '#3A3E43',
  accent: ROAD.marka,
  accentDeep: '#E0A800',
  accentInk: ROAD.aspal,
  accentText: ROAD.marka,
  /** Latar lembut berwarna aksen (pil, ikon). */
  accentSoft: 'rgba(255,198,41,0.14)',
  ink: '#F1F1EC',
  inkText: '#1E2023',
  track: ROAD.marka,
  route: '#4DA3FF',
  /** Ungu supaya segmen tidak tertukar dengan garis aktivitas yang kuning. */
  segment: '#A07BFF',
  gold: '#FFC94D',
  silver: '#B9C3BF',
  bronze: '#D49A6A',
  danger: '#FF5C5C',
  start: '#2FA77C',
  finish: '#F0554B',
  me: '#4DA3FF',
  shadow: 'rgba(0,0,0,0.6)',
  overlay: 'rgba(0,0,0,0.6)',
  slab: '#26292D',
};

export type Colors = typeof palette;

export function useColors(): Colors {
  return palette;
}

/** Warna hex dengan transparansi: alpha('#1E2023', 0.5) → 'rgba(30,32,35,0.5)'. */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
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

/** Cahaya berwarna (kuning aksen) di sekitar tombol/ikon utama. */
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
