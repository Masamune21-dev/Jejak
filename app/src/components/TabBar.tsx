import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRecorder } from '@/lib/recorder';
import { font, glow, useColors } from '@/lib/theme';

import type { IconName } from './ui';

const TABS: Record<string, { label: string; icon: IconName; iconOn: IconName }> = {
  index: { label: 'Beranda', icon: 'home-outline', iconOn: 'home' },
  rute: { label: 'Rute', icon: 'map-outline', iconOn: 'map' },
  segmen: { label: 'Segmen', icon: 'trophy-outline', iconOn: 'trophy' },
  profil: { label: 'Profil', icon: 'person-outline', iconOn: 'person' },
};

/** Tab bar gelap dengan tombol Rekam bulat hijau bercahaya di tengah. */
export default function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const rec = useRecorder();
  const recording = rec.status === 'recording' || rec.status === 'paused' || rec.status === 'finished';

  return (
    <View style={[styles.bar, { backgroundColor: c.surface, borderColor: c.line, paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const go = () => {
          if (!focused) navigateToTab(route.key);
        };

        if (route.name === 'rekam') {
          const color = recording ? c.danger : c.accent;
          const icon = recording ? 'pulse' : 'radio-button-on';
          // Di layar Rekam sendiri tombol ini redup tanpa cahaya, supaya tidak bersaing dengan tombol Mulai di atasnya.
          return (
            <View key={route.key} style={styles.slot}>
              <Pressable
                onPress={go}
                accessibilityRole="button"
                accessibilityLabel="Rekam"
                accessibilityState={{ selected: focused }}
                style={({ pressed }) => [
                  styles.record,
                  { backgroundColor: focused ? c.surface2 : color, borderColor: c.bg, opacity: pressed ? 0.85 : 1 },
                  focused ? null : glow(color, 0.9),
                ]}>
                <Ionicons name={icon} size={32} color={focused ? color : recording ? '#fff' : c.accentInk} />
              </Pressable>
            </View>
          );
        }

        const t = TABS[route.name];
        if (!t) return null;
        return (
          <Pressable
            key={route.key}
            onPress={go}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t.label}
            style={styles.slot}>
            <Ionicons name={focused ? t.iconOn : t.icon} size={23} color={focused ? c.accent : c.muted} />
            <Text style={[styles.label, { color: focused ? c.accent : c.muted, fontFamily: focused ? font.semibold : font.medium }]}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
  },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  label: { fontSize: 11 },
  record: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -34,
    marginBottom: 6,
    borderWidth: 5,
  },
});
