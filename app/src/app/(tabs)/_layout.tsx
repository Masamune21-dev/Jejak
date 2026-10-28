import { Tabs } from 'expo-router/js-tabs';

import TabBar from '@/components/TabBar';

export default function TabsLayout() {
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
