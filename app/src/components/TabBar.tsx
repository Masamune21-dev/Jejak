import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRecorder } from '@/lib/recorder';
import { font, shadow, useColors } from '@/lib/theme';

import type { IconName } from './ui';

const TABS: Record<string, { label: string; icon: IconName; iconOn: IconName }> = {
  index: { label: 'Beranda', icon: 'home-outline', iconOn: 'home' },
  rute: { label: 'Rute', icon: 'map-outline', iconOn: 'map' },
  segmen: { label: 'Segmen', icon: 'trophy-outline', iconOn: 'trophy' },
  profil: { label: 'Profil', icon: 'person-outline', iconOn: 'person' },
};

/** Tab bar dengan tombol Rekam bulat besar di tengah. */
export default function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const rec = useRecorder();
  const recording = rec.status === 'recording' || rec.status === 'paused' || rec.status === 'finished';

  return (
    <View style={[styles.bar, { backgroundColor: c.surface, borderTopColor: c.line, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const go = () => {
          if (!focused) navigateToTab(route.key);
        };

        if (route.name === 'rekam') {
          return (
            <View key={route.key} style={styles.slot}>
              <Pressable
                onPress={go}
                accessibilityRole="button"
                accessibilityLabel="Rekam"
                style={({ pressed }) => [
                  styles.record,
                  { backgroundColor: recording ? c.track : c.accent, borderColor: c.surface, opacity: pressed ? 0.85 : 1 },
                  shadow(c, 2),
                ]}>
                <Ionicons name={recording ? 'pulse' : 'radio-button-on'} size={30} color={recording ? '#fff' : c.accentInk} />
              </Pressable>
              <Text style={[styles.label, { color: focused ? c.text : c.muted, marginTop: 2 }]}>
                {recording ? 'Merekam' : 'Rekam'}
              </Text>
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
            <View style={[styles.iconWrap, focused && { backgroundColor: c.accent }]}>
              <Ionicons name={focused ? t.iconOn : t.icon} size={22} color={focused ? c.accentInk : c.muted} />
            </View>
            <Text style={[styles.label, { color: focused ? c.text : c.muted }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  iconWrap: { width: 52, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: font.semibold, fontSize: 11 },
  record: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    borderWidth: 4,
  },
});
