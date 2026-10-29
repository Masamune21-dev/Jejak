// Pencatat crash dipasang paling awal; tugas lokasi latar harus terdaftar sebelum navigasi berjalan.
import '@/lib/crash';
import '@/lib/location-task';

import {
  BigShouldersDisplay_700Bold,
  BigShouldersDisplay_800ExtraBold,
  BigShouldersDisplay_900Black,
} from '@expo-google-fonts/big-shoulders-display';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import CrashReportView from '@/components/CrashReport';
import { UpdateRequired } from '@/components/NoticeCards';
import { AuthProvider, useAuth } from '@/lib/auth';
import { takeLastCrash, toReport, type CrashReport } from '@/lib/crash';
import { useNotificationTaps, usePushSync } from '@/lib/push';
import { recorder } from '@/lib/recorder';
import { font, loadTheme, useColors, useIsDark } from '@/lib/theme';
import { useUpdate, useUpdateCheckOnResume } from '@/lib/update';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

/** Error saat menampilkan layar: tunjukkan laporannya, jangan menutup app. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return <CrashReportView title="Ada yang gagal di layar ini" report={toReport(error)} onRetry={() => void retry()} />;
}

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
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    BigShouldersDisplay_700Bold,
    BigShouldersDisplay_800ExtraBold,
    BigShouldersDisplay_900Black,
  });
  const [themeReady, setThemeReady] = useState(false);
  const loaded = ready && themeReady && (fontsLoaded || !!fontError);

  const [lastCrash, setLastCrash] = useState<CrashReport | null>(null);
  const update = useUpdate();
  useUpdateCheckOnResume();
  usePushSync(user?.id ?? null);
  useNotificationTaps(loaded);

  useEffect(() => {
    void loadTheme().finally(() => setThemeReady(true));
    void recorder.restore();
    void takeLastCrash().then(setLastCrash);
  }, []);

  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;
  if (lastCrash) {
    return <CrashReportView title="Jejak sempat berhenti" report={lastCrash} onClose={() => setLastCrash(null)} />;
  }
  if (update.required && update.latest) return <UpdateRequired info={update.latest} />;

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
          // Halaman detail masuk dari kanan seperti iOS, juga di Android (bawaan Android hanya memudar sekilas).
          animation: 'ios_from_right',
        }}>
        {/* Di web grup tab terbuka untuk tamu: alamat utama `/` menampilkan halaman depan ((tabs)/_layout.tsx).
            Di HP tamu langsung ke halaman masuk. */}
        <Stack.Protected guard={!!user || Platform.OS === 'web'} redirectTo="/masuk">
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade', title: 'Jejak' }} />
        </Stack.Protected>
        <Stack.Protected guard={!!user} redirectTo={Platform.OS === 'web' ? '/' : '/masuk'}>
          <Stack.Screen name="aktivitas/[id]/index" options={{ title: '' }} />
          <Stack.Screen name="aktivitas/[id]/segmen" options={{ title: 'Buat segmen' }} />
          <Stack.Screen name="aktivitas/[id]/bagikan" options={{ title: 'Bagikan' }} />
          <Stack.Screen name="segmen/[id]" options={{ title: '' }} />
          <Stack.Screen name="rute/baru" options={{ title: 'Rute baru' }} />
          <Stack.Screen name="rute/[id]" options={{ title: '' }} />
          <Stack.Screen name="atlet/[id]" options={{ title: '' }} />
          <Stack.Screen name="cari" options={{ title: 'Cari teman' }} />
          <Stack.Screen name="pengaturan" options={{ title: 'Pengaturan' }} />
          <Stack.Screen name="koneksi/[id]" options={{ title: '' }} />
          <Stack.Screen name="pesan/index" options={{ title: 'Pesan' }} />
          <Stack.Screen name="pesan/[id]" options={{ title: '' }} />
          <Stack.Screen name="tulis" options={{ title: 'Tulis postingan' }} />
          <Stack.Screen name="postingan/[id]" options={{ title: 'Postingan' }} />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="sambut" options={{ headerShown: false }} />
          <Stack.Screen name="masuk" options={{ headerShown: false, animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
