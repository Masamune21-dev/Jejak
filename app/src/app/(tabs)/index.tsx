import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, RefreshControl, View } from 'react-native';

import type { ActivitySummary, Stats } from '@shared/api';

import ActivityCard from '@/components/ActivityCard';
import { Button, Empty, ErrorBox, Header, IconButton, Loading, SectionTitle } from '@/components/ui';
import WeekCard from '@/components/WeekCard';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { greeting, today } from '@/lib/format';
import { useRefetchOnFocus } from '@/lib/hooks';
import { space, useColors } from '@/lib/theme';

const PAGE = 20;

export default function FeedScreen() {
  const c = useColors();
  const me = useMe();
  const q = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => api<ActivitySummary[]>(`/feed${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ''}`),
    initialPageParam: '',
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1].startedAt : undefined),
  });
  const week = useQuery({
    queryKey: ['stats', me.id, 'all'],
    queryFn: () => api<Stats>(`/users/${me.id}/stats?type=all&tz=${-new Date().getTimezoneOffset()}`),
  });
  useRefetchOnFocus(() => {
    void q.refetch();
    void week.refetch();
  });

  if (q.isPending) return <Loading />;
  const items = q.data?.pages.flat() ?? [];
  const firstName = me.name.split(' ')[0];

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.lg }}
      data={items}
      keyExtractor={(a) => String(a.id)}
      renderItem={({ item }) => <ActivityCard a={item} />}
      refreshControl={
        <RefreshControl
          refreshing={q.isRefetching}
          onRefresh={() => {
            void q.refetch();
            void week.refetch();
          }}
          tintColor={c.text}
        />
      }
      onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <View style={{ gap: space.lg, marginHorizontal: -space.lg }}>
          <Header
            subtitle={today()}
            title={`${greeting()}, ${firstName}`}
            right={<IconButton icon="person-add-outline" label="Cari teman" onPress={() => router.push('/cari')} />}
          />
          <View style={{ paddingHorizontal: space.lg, gap: space.lg }}>
            {week.data ? <WeekCard weeks={week.data.weeks} /> : null}
            {q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : null}
            {items.length > 0 ? <SectionTitle>Aktivitas terbaru</SectionTitle> : null}
          </View>
        </View>
      }
      ListEmptyComponent={
        q.error ? undefined : (
          <Empty
            icon="footsteps"
            title="Belum ada aktivitas"
            text="Rekam lari atau gowes pertamamu, atau ikuti teman supaya aktivitas mereka muncul di sini."
            action={
              <View style={{ gap: space.sm, alignSelf: 'stretch' }}>
                <Button title="Mulai rekam" icon="radio-button-on" onPress={() => router.push('/rekam')} />
                <Button kind="soft" title="Cari teman" icon="person-add-outline" onPress={() => router.push('/cari')} />
              </View>
            }
          />
        )
      }
    />
  );
}
