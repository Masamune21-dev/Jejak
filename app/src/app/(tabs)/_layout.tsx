import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';

import { IconButton } from '@/components/ui';
import { useRecorder } from '@/lib/recorder';
import { useColors } from '@/lib/theme';

export default function TabsLayout() {
  const c = useColors();
  const rec = useRecorder();
  const recording = rec.status === 'recording' || rec.status === 'paused';
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '800' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Beranda',
          headerTitle: 'Jejak',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color as string} />,
          headerRight: () => (
            <View style={{ paddingRight: 8 }}>
              <IconButton icon="person-add-outline" label="Cari teman" onPress={() => router.push('/cari')} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="rute"
        options={{ title: 'Rute', tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color as string} /> }}
      />
      <Tabs.Screen
        name="rekam"
        options={{
          title: 'Rekam',
          headerShown: false,
          tabBarIcon: ({ size }) => (
            <View>
              <Ionicons name="radio-button-on" size={size + 4} color={recording ? c.danger : c.primary} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="segmen"
        options={{ title: 'Segmen', tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color as string} /> }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: 'Profil', tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color as string} /> }}
      />
    </Tabs>
  );
}
