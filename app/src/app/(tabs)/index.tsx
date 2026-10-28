import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, RefreshControl, View } from 'react-native';

import type { ActivitySummary } from '@shared/api';

import ActivityCard from '@/components/ActivityCard';
import { Button, Empty, ErrorBox, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { useRefetchOnFocus } from '@/lib/hooks';
import { space, useColors } from '@/lib/theme';

const PAGE = 20;

export default function FeedScreen() {
  const c = useColors();
  const q = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => api<ActivitySummary[]>(`/feed${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ''}`),
    initialPageParam: '',
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1].startedAt : undefined),
  });
  useRefetchOnFocus(q.refetch);

  if (q.isPending) return <Loading />;
  const items = q.data?.pages.flat() ?? [];
  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: space.lg, gap: space.md }}
      data={items}
      keyExtractor={(a) => String(a.id)}
      renderItem={({ item }) => <ActivityCard a={item} />}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={c.primary} />}
      onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : undefined}
      ListEmptyComponent={
        q.error ? undefined : (
          <Empty
            icon="people-outline"
            title="Feed masih kosong"
            text="Rekam aktivitas pertamamu atau ikuti teman supaya aktivitas mereka muncul di sini."
            action={
              <View style={{ gap: space.sm, alignSelf: 'stretch' }}>
                <Button title="Mulai rekam" icon="radio-button-on" onPress={() => router.push('/rekam')} />
                <Button kind="secondary" title="Cari teman" icon="person-add-outline" onPress={() => router.push('/cari')} />
              </View>
            }
          />
        )
      }
    />
  );
}
