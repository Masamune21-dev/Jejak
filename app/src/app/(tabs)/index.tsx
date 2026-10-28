import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ActivitySummary, Stats } from '@shared/api';

import ActivityCard from '@/components/ActivityCard';
import { ActionTile, Avatar, Button, Empty, ErrorBox, IconButton, Loading, Row, SectionTitle, T } from '@/components/ui';
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
  const insets = useSafeAreaInsets();
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
        <View style={{ gap: space.lg, paddingTop: insets.top + space.md }}>
          <Row>
            <Pressable onPress={() => router.push('/profil')} accessibilityLabel="Profil saya" hitSlop={4}>
              <Avatar name={me.name} size={46} ring />
            </Pressable>
            <View style={{ flex: 1 }}>
              <T v="small">{today()}</T>
              <T v="h2" numberOfLines={1}>
                {greeting()}, {firstName}
              </T>
            </View>
            <IconButton icon="person-add-outline" label="Cari teman" onPress={() => router.push('/cari')} />
          </Row>
          {week.data ? <WeekCard weeks={week.data.weeks} /> : null}
          <View style={{ gap: space.md }}>
            <SectionTitle>Aksi cepat</SectionTitle>
            <Row gap={space.sm}>
              <ActionTile active icon="radio-button-on" label="Rekam" onPress={() => router.push('/rekam')} />
              <ActionTile icon="git-branch-outline" label="Buat rute" onPress={() => router.push('/rute/baru')} />
              <ActionTile icon="trophy-outline" label="Segmen" onPress={() => router.push('/segmen')} />
              <ActionTile icon="people-outline" label="Teman" onPress={() => router.push('/cari')} />
            </Row>
          </View>
          {q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : null}
          {items.length > 0 ? <SectionTitle>Aktivitas terbaru</SectionTitle> : null}
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
