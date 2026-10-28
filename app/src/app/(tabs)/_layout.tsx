import { Tabs } from 'expo-router/js-tabs';

import TabBar from '@/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="rute" />
      <Tabs.Screen name="rekam" />
      <Tabs.Screen name="segmen" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
