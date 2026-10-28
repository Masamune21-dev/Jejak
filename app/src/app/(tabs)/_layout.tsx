import { Redirect, usePathname } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Platform } from 'react-native';

import Landing from '@/components/landing/Landing';
import TabBar from '@/components/TabBar';
import { useAuth } from '@/lib/auth';

export default function TabsLayout() {
  const { user } = useAuth();
  const pathname = usePathname();

  // Hanya di web tamu bisa sampai ke sini (lihat app/_layout.tsx): alamat utama menampilkan halaman depan,
  // alamat tab lain dialihkan ke sana.
  if (!user) {
    if (Platform.OS !== 'web') return <Redirect href="/masuk" />;
    return pathname === '/' ? <Landing /> : <Redirect href="/" />;
  }

  return (
    // Pindah tab: konten bergeser sedikit sambil memudar.
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, animation: 'shift' }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="rute" />
      {/* Peta native di layar Rekam tidak ikut memudar di Android, jadi layar ini muncul tanpa animasi. */}
      <Tabs.Screen name="rekam" options={{ animation: 'none' }} />
      <Tabs.Screen name="segmen" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
