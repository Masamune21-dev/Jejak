import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import type { FollowItem, Profile } from '@shared/api';

import { Avatar, Button, Card, Empty, ErrorBox, Loading, Row, Segmented, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { space, useColors } from '@/lib/theme';

type Tab = 'pengikut' | 'mengikuti';
const PAGE = 30;

/** Daftar pengikut dan yang diikuti seseorang (terlihat oleh semua pengguna yang login). */
export default function ConnectionsScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const me = useMe();
  const params = useLocalSearchParams<{ id: string; tab?: string }>();
  const id = Number(params.id);
  const [tab, setTab] = useState<Tab>(params.tab === 'mengikuti' ? 'mengikuti' : 'pengikut');

  const profile = useQuery({ queryKey: ['user', id], queryFn: () => api<Profile>(`/users/${id}`) });
  const list = useInfiniteQuery({
    queryKey: ['connections', id, tab],
    queryFn: ({ pageParam }) =>
      api<FollowItem[]>(
        `/users/${id}/${tab === 'pengikut' ? 'followers' : 'following'}${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    initialPageParam: '',
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1].since : undefined),
  });
  const follow = useMutation({
    mutationFn: (u: FollowItem) => api(`/users/${u.id}/follow`, { method: u.isFollowing ? 'DELETE' : 'POST' }),
    onSuccess: () => {
      for (const key of ['connections', 'user', 'timeline', 'users']) void qc.invalidateQueries({ queryKey: [key] });
    },
  });

  const p = profile.data;
  return (
    <>
      <Stack.Screen options={{ title: p ? p.name : '' }} />
      <FlatList
        style={{ backgroundColor: c.bg }}
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        data={list.data?.pages.flat() ?? []}
        keyExtractor={(u) => String(u.id)}
        onEndReached={() => list.hasNextPage && !list.isFetchingNextPage && list.fetchNextPage()}
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
            <Segmented<Tab>
              options={[
                { key: 'pengikut', label: p ? `${p.followers} pengikut` : 'Pengikut' },
                { key: 'mengikuti', label: p ? `${p.following} mengikuti` : 'Mengikuti' },
              ]}
              value={tab}
              onChange={setTab}
            />
            {list.error ? <ErrorBox error={list.error} onRetry={() => list.refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={
          list.isPending ? (
            <Loading />
          ) : (
            <Empty
              icon="people"
              title={tab === 'pengikut' ? 'Belum ada pengikut' : 'Belum mengikuti siapa pun'}
              text={tab === 'pengikut' ? undefined : 'Cari teman lewat ikon tambah teman di Beranda.'}
            />
          )
        }
        renderItem={({ item }) => (
          <Card style={{ padding: space.md }}>
            <Row>
              <Pressable style={{ flex: 1 }} onPress={() => router.push(`/atlet/${item.id}`)} accessibilityRole="link">
                <Row>
                  <Avatar name={item.name} uri={item.avatarUrl} size={44} />
                  <View style={{ flex: 1 }}>
                    <T v="strong">{item.name}</T>
                    <T v="small">@{item.username}</T>
                  </View>
                </Row>
              </Pressable>
              {item.id === me.id ? null : (
                <Button
                  small
                  kind={item.isFollowing ? 'soft' : 'primary'}
                  icon={item.isFollowing ? 'checkmark' : 'person-add'}
                  title={item.isFollowing ? 'Mengikuti' : 'Ikuti'}
                  loading={follow.isPending && follow.variables?.id === item.id}
                  onPress={() => follow.mutate(item)}
                />
              )}
            </Row>
          </Card>
        )}
      />
    </>
  );
}
