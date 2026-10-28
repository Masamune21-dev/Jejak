import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, RefreshControl } from 'react-native';

import type { RouteSummary } from '@shared/api';

import RouteShape from '@/components/RouteShape';
import { Button, Card, Empty, ErrorBox, Loading, Row, T } from '@/components/ui';
import { api } from '@/lib/api';
import { distance, durationShort, TYPE_ICON, TYPE_LABEL, TYPE_SPEED } from '@/lib/format';
import { useRefetchOnFocus } from '@/lib/hooks';
import { space, useColors } from '@/lib/theme';

export default function RoutesScreen() {
  const c = useColors();
  const q = useQuery({ queryKey: ['routes'], queryFn: () => api<RouteSummary[]>('/routes') });
  useRefetchOnFocus(q.refetch);
  if (q.isPending) return <Loading />;
  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: space.lg, gap: space.md }}
      data={q.data ?? []}
      keyExtractor={(r) => String(r.id)}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={c.primary} />}
      ListHeaderComponent={
        <>
          <Button title="Buat rute baru" icon="add" onPress={() => router.push('/rute/baru')} />
          {q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : null}
        </>
      }
      ListEmptyComponent={
        q.error ? undefined : (
          <Empty
            icon="map-outline"
            title="Belum ada rute"
            text="Ketuk titik-titik di peta, rute otomatis mengikuti jalan. Simpan, lalu ikuti saat merekam."
          />
        )
      }
      renderItem={({ item }) => (
        <Card onPress={() => router.push(`/rute/${item.id}`)}>
          <RouteShape points={item.preview} color={c.route} height={120} />
          <T weight="800" size={17}>
            {item.name}
          </T>
          <Row>
            <Ionicons name={TYPE_ICON[item.type]} size={15} color={c.muted} />
            <T muted>
              {TYPE_LABEL[item.type]} · {distance(item.distanceM)} · ±{durationShort(item.distanceM / TYPE_SPEED[item.type])}
            </T>
          </Row>
        </Card>
      )}
    />
  );
}
