// Tugas lokasi latar harus terdaftar sebelum navigasi apa pun berjalan.
import '@/lib/location-task';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/lib/auth';
import { recorder } from '@/lib/recorder';
import { useColors } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function Root() {
  const scheme = useColorScheme();
  const c = useColors();
  const { user, ready } = useAuth();

  useEffect(() => {
    void recorder.restore();
  }, []);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: c.primary, background: c.bg, card: c.card, text: c.text, border: c.border },
  };

  return (
    <ThemeProvider value={theme}>
      <Stack screenOptions={{ headerTitleStyle: { fontWeight: '700' } }}>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="aktivitas/[id]/index" options={{ title: 'Aktivitas' }} />
          <Stack.Screen name="aktivitas/[id]/segmen" options={{ title: 'Buat segmen' }} />
          <Stack.Screen name="segmen/[id]" options={{ title: 'Segmen' }} />
          <Stack.Screen name="rute/baru" options={{ title: 'Buat rute' }} />
          <Stack.Screen name="rute/[id]" options={{ title: 'Rute' }} />
          <Stack.Screen name="atlet/[id]" options={{ title: 'Atlet' }} />
          <Stack.Screen name="cari" options={{ title: 'Cari teman' }} />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="masuk" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
