import Ionicons from '@expo/vector-icons/Ionicons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ActivitySummary, ActivityType, Profile, Stats } from '@shared/api';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { dateShort, distanceParts, duration, durationShort, km, TYPE_LABEL } from '@/lib/format';
import { usePullToRefresh, useRefetchOnFocus } from '@/lib/hooks';
import { font, radius, space, useColors } from '@/lib/theme';

import ActivityCard from './ActivityCard';
import { Avatar, Button, Card, Empty, ErrorBox, IconButton, Loading, Row, SectionTitle, Stat, T, TypePicker } from './ui';
import WeeklyChart from './WeeklyChart';

const PAGE = 20;

export default function ProfileView({ userId, inTab }: { userId: number; inTab?: boolean }) {
  const c = useColors();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
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
  const refetchAll = () => Promise.all([profile.refetch(), stats.refetch(), acts.refetch()]);
  useRefetchOnFocus(refetchAll);
  const pull = usePullToRefresh(refetchAll);

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
  const total = distanceParts(p.totals.distanceM);

  const header = (
    <View style={{ gap: space.lg }}>
      <LinearGradient
        colors={['#16372A', '#0B1310']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={[
          styles.hero,
          { borderColor: c.accent + '30', paddingTop: (inTab ? insets.top : 0) + space.xl, marginHorizontal: -space.lg },
        ]}>
        {inTab ? (
          <View style={[styles.heroActions, { top: insets.top + space.sm }]}>
            <IconButton
              icon="person-add-outline"
              label="Cari teman"
              onPress={() => router.push('/cari')}
            />
            <IconButton
              icon="log-out-outline"
              label="Keluar"
              onPress={async () => {
                if (await confirm('Keluar', 'Keluar dari akun ini?', 'Keluar')) await signOut();
              }}
            />
          </View>
        ) : null}
        <Avatar name={p.name} size={84} ring />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={styles.name}>{p.name}</Text>
          <Text style={styles.handle}>@{p.username}</Text>
        </View>
        <Row gap={space.xl}>
          <Text style={styles.count}>
            <Text style={styles.countNum}>{p.followers}</Text> pengikut
          </Text>
          <Text style={styles.count}>
            <Text style={styles.countNum}>{p.following}</Text> mengikuti
          </Text>
        </Row>
        {p.isMe ? null : (
          <Button
            kind={p.isFollowing ? 'soft' : 'primary'}
            icon={p.isFollowing ? 'checkmark' : 'person-add'}
            title={p.isFollowing ? 'Mengikuti' : 'Ikuti'}
            loading={follow.isPending}
            onPress={() => follow.mutate(!p.isFollowing)}
            style={{ alignSelf: 'stretch' }}
          />
        )}
        <View style={[styles.totals, { borderTopColor: c.line }]}>
          <HeroStat label="Aktivitas" value={String(p.totals.count)} />
          <HeroStat label="Jarak" value={total.value} unit={total.unit} />
          <HeroStat label="Waktu" value={durationShort(p.totals.movingS)} />
        </View>
      </LinearGradient>

      <TypePicker value={type} onChange={setType} />
      {stats.error ? <ErrorBox error={stats.error} onRetry={() => stats.refetch()} /> : null}
      {s ? (
        <Card style={{ gap: space.lg }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="h3">{TYPE_LABEL[type]}</T>
            <T v="small">12 minggu terakhir</T>
          </Row>
          <WeeklyChart weeks={s.weeks} />
          <Row gap={space.md}>
            <Stat label="Minggu ini" value={km(s.weeks[s.weeks.length - 1]?.distanceM ?? 0, 1)} unit="km" size={24} />
            <Stat label="Tahun ini" value={km(s.thisYear.distanceM, 1)} unit="km" size={24} />
            <Stat label="Total" value={km(s.allTime.distanceM, 1)} unit="km" size={24} />
          </Row>
        </Card>
      ) : null}

      {s && (s.records.length > 0 || s.longest) ? (
        <>
          <SectionTitle>Rekor pribadi</SectionTitle>
          <View style={styles.tiles}>
            {s.records.map((r) => (
              <Pressable
                key={r.name}
                onPress={() => router.push(`/aktivitas/${r.activityId}`)}
                style={({ pressed }) => [
                  styles.tile,
                  { backgroundColor: c.surface, borderColor: c.line, opacity: pressed ? 0.85 : 1 },
                ]}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="label">{r.name}</T>
                  <Ionicons name="trophy" size={14} color={c.gold} />
                </Row>
                <T v="num" size={28}>
                  {duration(r.elapsedS)}
                </T>
                <T v="small" size={12}>
                  {dateShort(r.date)}
                </T>
              </Pressable>
            ))}
            {s.longest ? (
              <Pressable
                onPress={() => router.push(`/aktivitas/${s.longest!.activityId}`)}
                style={({ pressed }) => [
                  styles.tile,
                  { backgroundColor: c.surface, borderColor: c.line, opacity: pressed ? 0.85 : 1 },
                ]}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="label">Terjauh</T>
                  <Ionicons name="trending-up" size={14} color={c.track} />
                </Row>
                <T v="num" size={28}>
                  {distanceParts(s.longest.distanceM).value}
                  <Text style={{ fontSize: 14, color: c.muted }}> {distanceParts(s.longest.distanceM).unit}</Text>
                </T>
                <T v="small" size={12}>
                  {dateShort(s.longest.date)}
                </T>
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}
      <SectionTitle>Aktivitas</SectionTitle>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.lg }}
      data={acts.data?.pages.flat() ?? []}
      keyExtractor={(a) => String(a.id)}
      renderItem={({ item }) => <ActivityCard a={item} />}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={pull.refreshing} onRefresh={pull.onRefresh} tintColor={c.text} />}
      onEndReached={() => acts.hasNextPage && !acts.isFetchingNextPage && acts.fetchNextPage()}
      ListEmptyComponent={acts.isPending ? undefined : <Empty icon="walk" title="Belum ada aktivitas" />}
    />
  );
}

function HeroStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.heroNum}>
        {value}
        {unit ? <Text style={styles.heroUnit}> {unit}</Text> : null}
      </Text>
      <Text style={styles.heroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroActions: { position: 'absolute', right: space.lg, flexDirection: 'row', gap: space.sm },
  name: { color: '#EEF4F1', fontFamily: font.bold, fontSize: 24, letterSpacing: -0.3 },
  handle: { color: '#86958F', fontFamily: font.medium, fontSize: 14 },
  count: { color: '#86958F', fontFamily: font.medium, fontSize: 14 },
  countNum: { color: '#EEF4F1', fontFamily: font.bold },
  totals: { flexDirection: 'row', alignSelf: 'stretch', borderTopWidth: 1, paddingTop: space.md, marginTop: space.xs },
  heroNum: { color: '#2EE59D', fontFamily: font.numBold, fontSize: 26, letterSpacing: -0.5 },
  heroUnit: { color: '#86958F', fontFamily: font.semibold, fontSize: 13 },
  heroLabel: { color: '#86958F', fontFamily: font.medium, fontSize: 12 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
    gap: 4,
  },
});
