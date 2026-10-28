import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import type { SegmentSummary } from '@shared/api';
import { haversine, type LatLon } from '@shared/geo';

import StaticMap from '@/components/StaticMap';
import { Card, Empty, ErrorBox, Header, Loading, Row, T } from '@/components/ui';
import { api } from '@/lib/api';
import { distance, TYPE_ICON } from '@/lib/format';
import { currentPosition } from '@/lib/gps';
import { usePullToRefresh, useRefetchOnFocus } from '@/lib/hooks';
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
  const pull = usePullToRefresh(q.refetch);
  if (!located || q.isPending) return <Loading />;
  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md }}
      data={q.data ?? []}
      keyExtractor={(s) => String(s.id)}
      refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={c.text} />}
      ListHeaderComponent={
        <View style={{ marginHorizontal: -space.lg, gap: space.sm }}>
          <Header subtitle={here ? 'Terdekat dari posisimu' : 'Paling ramai'} title="Segmen" />
          {q.error ? (
            <View style={{ paddingHorizontal: space.lg }}>
              <ErrorBox error={q.error} onRetry={() => q.refetch()} />
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        q.error ? undefined : (
          <Empty
            icon="flag"
            title="Belum ada segmen"
            text="Segmen adalah potongan jalan yang waktunya diadu. Buka salah satu aktivitasmu, lalu ketuk “Buat segmen”."
          />
        )
      }
      renderItem={({ item }) => (
        <Card onPress={() => router.push(`/segmen/${item.id}`)} style={{ padding: space.md }}>
          <Row style={{ alignItems: 'stretch' }}>
            <View style={{ width: 104 }}>
              <StaticMap points={item.preview} color={c.segment} height={84} radius={12} />
            </View>
            <View style={{ flex: 1, gap: 4, justifyContent: 'center' }}>
              <T v="h3" numberOfLines={2}>
                {item.name}
              </T>
              <Row gap={6}>
                <Ionicons name={TYPE_ICON[item.type]} size={14} color={c.muted} />
                <T v="small">
                  {distance(item.distanceM)}, {item.athletes} atlet
                </T>
              </Row>
              {here ? (
                <Row gap={6}>
                  <Ionicons name="location-outline" size={14} color={c.muted} />
                  <T v="small">{distance(haversine(here, item.start))} dari sini</T>
                </Row>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.muted} style={{ alignSelf: 'center' }} />
          </Row>
        </Card>
      )}
    />
  );
}
