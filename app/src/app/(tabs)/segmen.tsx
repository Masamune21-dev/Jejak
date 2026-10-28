import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import type { SegmentSummary } from '@shared/api';
import { haversine, type LatLon } from '@shared/geo';

import RouteShape from '@/components/RouteShape';
import { Card, Empty, ErrorBox, Loading, Row, T } from '@/components/ui';
import { api } from '@/lib/api';
import { distance, TYPE_ICON } from '@/lib/format';
import { currentPosition } from '@/lib/gps';
import { useRefetchOnFocus } from '@/lib/hooks';
import { space, useColors } from '@/lib/theme';

export default function SegmentsScreen() {
  const c = useColors();
  const [here, setHere] = useState<LatLon | null>(null);
  const [located, setLocated] = useState(false);
  useEffect(() => {
    currentPosition()
      .then(setHere)
      .finally(() => setLocated(true));
  }, []);
  const q = useQuery({
    queryKey: ['segments', here?.join(',') ?? ''],
    queryFn: () => api<SegmentSummary[]>(`/segments${here ? `?near=${here[0]},${here[1]}` : ''}`),
    enabled: located,
  });
  useRefetchOnFocus(q.refetch);
  if (!located || q.isPending) return <Loading />;
  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: space.lg, gap: space.md }}
      data={q.data ?? []}
      keyExtractor={(s) => String(s.id)}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={c.primary} />}
      ListHeaderComponent={
        <>
          <T muted>{here ? 'Segmen terdekat dari posisimu.' : 'Segmen paling ramai.'}</T>
          {q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : null}
        </>
      }
      ListEmptyComponent={
        q.error ? undefined : (
          <Empty
            icon="trophy-outline"
            title="Belum ada segmen"
            text="Segmen adalah potongan jalan yang waktunya diadu. Buka salah satu aktivitasmu, lalu ketuk “Buat segmen”."
          />
        )
      }
      renderItem={({ item }) => (
        <Card onPress={() => router.push(`/segmen/${item.id}`)}>
          <Row style={{ alignItems: 'flex-start' }}>
            <View style={{ width: 110 }}>
              <RouteShape points={item.preview} color={c.segment} height={70} strokeWidth={6} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T weight="800" size={16} numberOfLines={2}>
                {item.name}
              </T>
              <Row gap={6}>
                <Ionicons name={TYPE_ICON[item.type]} size={14} color={c.muted} />
                <T muted size={13}>
                  {distance(item.distanceM)} · {item.athletes} atlet
                </T>
              </Row>
              {here ? (
                <T muted size={13}>
                  {distance(haversine(here, item.start))} dari sini
                </T>
              ) : null}
            </View>
          </Row>
        </Card>
      )}
    />
  );
}
