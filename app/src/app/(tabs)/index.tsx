import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Profile, Stats, TimelineItem } from '@shared/api';

import ActivityCard from '@/components/ActivityCard';
import { PushCard, UpdateCard } from '@/components/NoticeCards';
import PostCard from '@/components/PostCard';
import { ActionTile, Avatar, Button, Empty, ErrorBox, IconButton, Loading, Row, SectionTitle, T } from '@/components/ui';
import WeekCard from '@/components/WeekCard';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { greeting, today } from '@/lib/format';
import { usePullToRefresh, useRefetchOnFocus } from '@/lib/hooks';
import { font, space, useColors } from '@/lib/theme';

const PAGE = 20;

export default function FeedScreen() {
  const c = useColors();
  const me = useMe();
  const insets = useSafeAreaInsets();
  // Aktivitas + postingan dari diri sendiri dan yang diikuti, urut waktu.
  const q = useInfiniteQuery({
    queryKey: ['timeline'],
    queryFn: ({ pageParam }) => api<TimelineItem[]>(`/timeline${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ''}`),
    initialPageParam: '',
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1].at : undefined),
  });
  // Foto profil terbaru (bisa berubah setelah masuk) dan jumlah pesan belum dibaca (dicek tiap 30 detik).
  const profile = useQuery({ queryKey: ['user', me.id], queryFn: () => api<Profile>(`/users/${me.id}`) });
  const unread = useQuery({
    queryKey: ['chats', 'unread'],
    queryFn: () => api<{ count: number }>('/chats/unread'),
    refetchInterval: 30_000,
  });
  const week = useQuery({
    queryKey: ['stats', me.id, 'all'],
    queryFn: () => api<Stats>(`/users/${me.id}/stats?type=all&tz=${-new Date().getTimezoneOffset()}`),
  });
  const refetchAll = () => Promise.all([q.refetch(), week.refetch(), unread.refetch()]);
  useRefetchOnFocus(refetchAll);
  const pull = usePullToRefresh(refetchAll);

  if (q.isPending) return <Loading />;
  const items = q.data?.pages.flat() ?? [];
  const firstName = me.name.split(' ')[0];

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.lg }}
      data={items}
      keyExtractor={(x) => `${x.kind}-${x.id}`}
      renderItem={({ item }) => (item.kind === 'post' ? <PostCard post={item} /> : <ActivityCard a={item} />)}
      refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={c.text} />}
      onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <View style={{ gap: space.lg, paddingTop: insets.top + space.md }}>
          <Row>
            <Pressable onPress={() => router.push('/profil')} accessibilityLabel="Profil saya" hitSlop={4}>
              <Avatar name={me.name} uri={profile.data?.avatarUrl ?? me.avatarUrl} size={46} ring />
            </Pressable>
            <View style={{ flex: 1 }}>
              <T v="small">{today()}</T>
              <T v="h2" numberOfLines={1}>
                {greeting()}, {firstName}
              </T>
            </View>
            <View>
              <IconButton icon="chatbubbles-outline" label="Pesan" onPress={() => router.push('/pesan')} />
              {unread.data && unread.data.count > 0 ? (
                <View style={[styles.badge, { backgroundColor: c.danger, borderColor: c.bg }]} pointerEvents="none">
                  <Text style={styles.badgeText}>{unread.data.count > 9 ? '9+' : unread.data.count}</Text>
                </View>
              ) : null}
            </View>
            <IconButton icon="person-add-outline" label="Cari teman" onPress={() => router.push('/cari')} />
          </Row>
          <UpdateCard />
          <PushCard />
          {week.data ? <WeekCard weeks={week.data.weeks} /> : null}
          <View style={{ gap: space.md }}>
            <SectionTitle>Aksi cepat</SectionTitle>
            <Row gap={space.sm}>
              <ActionTile active icon="radio-button-on" label="Rekam" onPress={() => router.push('/rekam')} />
              <ActionTile icon="git-branch-outline" label="Buat rute" onPress={() => router.push('/rute/baru')} />
              <ActionTile icon="create-outline" label="Tulis" onPress={() => router.push('/tulis')} />
              <ActionTile icon="trophy-outline" label="Segmen" onPress={() => router.push('/segmen')} />
            </Row>
          </View>
          {q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : null}
          {items.length > 0 ? <SectionTitle>Terbaru dari teman</SectionTitle> : null}
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

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontFamily: font.bold, fontSize: 10 },
});
