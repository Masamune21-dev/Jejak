// Tugas lokasi latar harus terdaftar sebelum navigasi apa pun berjalan.
import '@/lib/location-task';

import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/lib/auth';
import { recorder } from '@/lib/recorder';
import { font, useColors, useIsDark } from '@/lib/theme';

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
  const dark = useIsDark();
  const c = useColors();
  const { user, ready } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
  });
  const loaded = ready && (fontsLoaded || !!fontError);

  useEffect(() => {
    void recorder.restore();
  }, []);

  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  const base = dark ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, primary: c.text, background: c.bg, card: c.bg, text: c.text, border: c.line },
  };

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.text,
          headerTitleStyle: { fontFamily: font.bold, fontSize: 17 },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: c.bg },
        }}>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="aktivitas/[id]/index" options={{ title: '' }} />
          <Stack.Screen name="aktivitas/[id]/segmen" options={{ title: 'Buat segmen' }} />
          <Stack.Screen name="segmen/[id]" options={{ title: '' }} />
          <Stack.Screen name="rute/baru" options={{ title: 'Rute baru' }} />
          <Stack.Screen name="rute/[id]" options={{ title: '' }} />
          <Stack.Screen name="atlet/[id]" options={{ title: '' }} />
          <Stack.Screen name="cari" options={{ title: 'Cari teman' }} />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="masuk" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
