import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { RouteSummary } from '@shared/api';

import StaticMap from '@/components/StaticMap';
import { Card, Empty, ErrorBox, Header, Loading, Row, SectionTitle, Stat, T } from '@/components/ui';
import { api } from '@/lib/api';
import { distanceParts, durationShort, TYPE_ICON, TYPE_LABEL, TYPE_SPEED } from '@/lib/format';
import { useRefetchOnFocus } from '@/lib/hooks';
import { font, radius, space, useColors } from '@/lib/theme';

export default function RoutesScreen() {
  const c = useColors();
  const q = useQuery({ queryKey: ['routes'], queryFn: () => api<RouteSummary[]>('/routes') });
  useRefetchOnFocus(q.refetch);
  if (q.isPending) return <Loading />;
  const routes = q.data ?? [];
  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.lg }}
      data={routes}
      keyExtractor={(r) => String(r.id)}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={c.text} />}
      ListHeaderComponent={
        <View style={{ gap: space.lg, marginHorizontal: -space.lg }}>
          <Header subtitle="Rencanakan jalurmu" title="Rute" />
          <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>
            <Pressable
              onPress={() => router.push('/rute/baru')}
              style={({ pressed }) => [styles.cta, { backgroundColor: c.slab, opacity: pressed ? 0.9 : 1 }]}>
              <View style={[styles.ctaIcon, { backgroundColor: c.accent }]}>
                <Ionicons name="add" size={28} color={c.accentInk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>Buat rute baru</Text>
                <Text style={styles.ctaSub}>Ketuk titik di peta, garisnya otomatis mengikuti jalan.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
            </Pressable>
            {q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : null}
            {routes.length > 0 ? <SectionTitle>Rute saya</SectionTitle> : null}
          </View>
        </View>
      }
      ListEmptyComponent={
        q.error ? undefined : (
          <Empty icon="map" title="Belum ada rute" text="Rute yang kamu simpan muncul di sini dan bisa diikuti saat merekam." />
        )
      }
      renderItem={({ item }) => {
        const d = distanceParts(item.distanceM);
        return (
          <Card onPress={() => router.push(`/rute/${item.id}`)} style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
            <StaticMap points={item.preview} color={c.route} height={150} radius={0} />
            <View style={{ padding: space.lg, gap: space.md }}>
              <Row gap={space.sm}>
                <Ionicons name={TYPE_ICON[item.type]} size={16} color={c.muted} />
                <T v="small">{TYPE_LABEL[item.type]}</T>
              </Row>
              <T v="h3" size={18} style={{ marginTop: -space.sm }}>
                {item.name}
              </T>
              <Row gap={space.lg}>
                <Stat label="Jarak" value={d.value} unit={d.unit} size={24} />
                <Stat label="Perkiraan" value={durationShort(item.distanceM / TYPE_SPEED[item.type])} size={24} />
              </Row>
            </View>
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  cta: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg, padding: space.lg },
  ctaIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { color: '#fff', fontFamily: font.bold, fontSize: 17 },
  ctaSub: { color: 'rgba(255,255,255,0.7)', fontFamily: font.medium, fontSize: 13, marginTop: 2 },
});
