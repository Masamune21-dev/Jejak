import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import type { ActivitySummary, ActivityType, Profile, Stats } from '@shared/api';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { dateShort, distance, duration, durationShort, km, TYPE_LABEL } from '@/lib/format';
import { useRefetchOnFocus } from '@/lib/hooks';
import { space, useColors } from '@/lib/theme';

import ActivityCard from './ActivityCard';
import { Avatar, Button, Card, Empty, ErrorBox, Loading, Row, SectionTitle, Stat, T, TypePicker } from './ui';
import WeeklyChart from './WeeklyChart';

const PAGE = 20;

export default function ProfileView({ userId }: { userId: number }) {
  const c = useColors();
  const qc = useQueryClient();
  const { signOut } = useAuth();
  const [type, setType] = useState<ActivityType>('run');
  const tz = -new Date().getTimezoneOffset();

  const profile = useQuery({ queryKey: ['user', userId], queryFn: () => api<Profile>(`/users/${userId}`) });
  const stats = useQuery({
    queryKey: ['stats', userId, type],
    queryFn: () => api<Stats>(`/users/${userId}/stats?type=${type}&tz=${tz}`),
  });
  const acts = useInfiniteQuery({
    queryKey: ['userActivities', userId],
    queryFn: ({ pageParam }) =>
      api<ActivitySummary[]>(`/users/${userId}/activities${pageParam ? `?before=${encodeURIComponent(pageParam)}` : ''}`),
    initialPageParam: '',
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1].startedAt : undefined),
  });
  const refetchAll = () => {
    void profile.refetch();
    void stats.refetch();
    void acts.refetch();
  };
  useRefetchOnFocus(refetchAll);

  const follow = useMutation({
    mutationFn: (on: boolean) => api<Profile>(`/users/${userId}/follow`, { method: on ? 'POST' : 'DELETE' }),
    onSuccess: (p) => {
      qc.setQueryData(['user', userId], p);
      void qc.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  if (profile.isPending) return <Loading />;
  if (profile.error) return <ErrorBox error={profile.error} onRetry={() => profile.refetch()} />;
  const p = profile.data;
  const s = stats.data;

  const header = (
    <View style={{ gap: space.md }}>
      <Stack.Screen options={{ title: p.isMe ? 'Profil' : p.name }} />
      <Row>
        <Avatar name={p.name} size={64} />
        <View style={{ flex: 1 }}>
          <T weight="800" size={22}>
            {p.name}
          </T>
          <T muted>@{p.username}</T>
          <Row gap={space.lg} style={{ marginTop: 4 }}>
            <T>
              <T weight="800">{p.followers}</T> <T muted>pengikut</T>
            </T>
            <T>
              <T weight="800">{p.following}</T> <T muted>mengikuti</T>
            </T>
          </Row>
        </View>
      </Row>
      {p.isMe ? (
        <Row>
          <Button style={{ flex: 1 }} small kind="secondary" icon="person-add-outline" title="Cari teman" onPress={() => router.push('/cari')} />
          <Button
            style={{ flex: 1 }}
            small
            kind="ghost"
            icon="log-out-outline"
            title="Keluar"
            onPress={async () => {
              if (await confirm('Keluar', 'Keluar dari akun ini?', 'Keluar')) await signOut();
            }}
          />
        </Row>
      ) : (
        <Button
          kind={p.isFollowing ? 'secondary' : 'primary'}
          icon={p.isFollowing ? 'checkmark' : 'person-add'}
          title={p.isFollowing ? 'Mengikuti' : 'Ikuti'}
          loading={follow.isPending}
          onPress={() => follow.mutate(!p.isFollowing)}
        />
      )}
      <Card>
        <Row>
          <Stat label="Aktivitas" value={String(p.totals.count)} />
          <Stat label="Total jarak" value={`${km(p.totals.distanceM, 1)} km`} />
          <Stat label="Total waktu" value={durationShort(p.totals.movingS)} />
        </Row>
      </Card>

      <TypePicker value={type} onChange={setType} />
      {stats.error ? <ErrorBox error={stats.error} onRetry={() => stats.refetch()} /> : null}
      {s ? (
        <Card style={{ gap: space.md }}>
          <T weight="800">{TYPE_LABEL[type]} · 12 minggu terakhir</T>
          <WeeklyChart weeks={s.weeks} />
          <Row>
            <Stat label="Minggu ini" value={`${km(s.weeks[s.weeks.length - 1]?.distanceM ?? 0, 1)} km`} />
            <Stat label="Tahun ini" value={`${km(s.thisYear.distanceM, 1)} km`} />
            <Stat label="Sepanjang masa" value={`${km(s.allTime.distanceM, 1)} km`} />
          </Row>
        </Card>
      ) : null}
      {s && (s.records.length > 0 || s.longest) ? (
        <Card>
          <T weight="800">Rekor pribadi</T>
          {s.records.map((r) => (
            <Pressable key={r.name} onPress={() => router.push(`/aktivitas/${r.activityId}`)}>
              <Row style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                <T>{r.name}</T>
                <Row gap={space.sm}>
                  <T weight="700" style={{ fontVariant: ['tabular-nums'] }}>
                    {duration(r.elapsedS)}
                  </T>
                  <T muted size={12}>
                    {dateShort(r.date)}
                  </T>
                </Row>
              </Row>
            </Pressable>
          ))}
          {s.longest ? (
            <Pressable onPress={() => router.push(`/aktivitas/${s.longest!.activityId}`)}>
              <Row style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                <T>Terjauh</T>
                <T weight="700">{distance(s.longest.distanceM)}</T>
              </Row>
            </Pressable>
          ) : null}
        </Card>
      ) : null}
      <SectionTitle>Aktivitas</SectionTitle>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: space.lg, gap: space.md }}
      data={acts.data?.pages.flat() ?? []}
      keyExtractor={(a) => String(a.id)}
      renderItem={({ item }) => <ActivityCard a={item} />}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={profile.isRefetching} onRefresh={refetchAll} tintColor={c.primary} />}
      onEndReached={() => acts.hasNextPage && !acts.isFetchingNextPage && acts.fetchNextPage()}
      ListEmptyComponent={acts.isPending ? undefined : <Empty icon="walk-outline" title="Belum ada aktivitas" />}
    />
  );
}
