import { useColorScheme } from 'react-native';

const light = {
  bg: '#F4F5F2',
  card: '#FFFFFF',
  text: '#16201B',
  muted: '#66706A',
  border: '#E1E4DF',
  primary: '#0F9D6B',
  primaryText: '#FFFFFF',
  primarySoft: '#DDF3E9',
  danger: '#D93B30',
  warn: '#E8A317',
  gold: '#D9A21B',
  route: '#2F6FED',
  segment: '#F26B1D',
  me: '#2F6FED',
};

const dark: typeof light = {
  bg: '#0E1311',
  card: '#18201C',
  text: '#EEF2EF',
  muted: '#9AA5A0',
  border: '#28322D',
  primary: '#22B67F',
  primaryText: '#04130C',
  primarySoft: '#16352A',
  danger: '#F0645A',
  warn: '#F2B63C',
  gold: '#E8B53A',
  route: '#5B8DF6',
  segment: '#FF8640',
  me: '#5B8DF6',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 8, md: 12, lg: 18 } as const;
