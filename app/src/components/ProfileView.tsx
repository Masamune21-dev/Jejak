import Ionicons from '@expo/vector-icons/Ionicons';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BlurTargetView, BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ActivitySummary, ActivityType, Profile, Stats } from '@shared/api';

import { api, mediaUri } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { dateShort, distanceParts, duration, durationShort, km, TYPE_LABEL } from '@/lib/format';
import { usePullToRefresh, useRefetchOnFocus } from '@/lib/hooks';
import { appendPhoto, pickPhoto } from '@/lib/photo';
import { alpha, font, IMAGE_FADE, radius, space, useColors, useIsDark } from '@/lib/theme';

import ActivityCard from './ActivityCard';
import Sheet, { type SheetOption } from './Sheet';
import { Avatar, Button, Card, Empty, ErrorBox, IconButton, Loading, Row, SectionTitle, Stat, T, TypePicker } from './ui';
import WeeklyChart from './WeeklyChart';

const PAGE = 20;

export default function ProfileView({ userId, inTab }: { userId: number; inTab?: boolean }) {
  const c = useColors();
  const dark = useIsDark();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<ActivityType>('run');
  const [sheet, setSheet] = useState<'avatar' | 'cover' | 'more' | null>(null);
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
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
      void qc.invalidateQueries({ queryKey: ['timeline'] });
    },
  });

  const block = useMutation({
    mutationFn: (on: boolean) => api<Profile>(`/users/${userId}/block`, { method: on ? 'POST' : 'DELETE' }),
    onSuccess: (p) => {
      qc.setQueryData(['user', userId], p);
      void qc.invalidateQueries({ queryKey: ['timeline'] });
    },
  });

  // Ganti/hapus foto profil atau sampul. Foto diperkecil dan dibersihkan dari EXIF (lokasi) sebelum diunggah.
  const photo = useMutation({
    mutationFn: async ({ kind, camera, remove }: { kind: 'avatar' | 'cover'; camera?: boolean; remove?: boolean }) => {
      if (remove) return api<Profile>(`/me/${kind}`, { method: 'DELETE' });
      const uri = await pickPhoto({ camera, aspect: kind === 'avatar' ? [1, 1] : [16, 9], maxWidth: kind === 'avatar' ? 512 : 1600 });
      if (!uri) return null;
      const form = new FormData();
      await appendPhoto(form, 'foto', uri);
      return api<Profile>(`/me/${kind}`, { method: 'PUT', body: form, timeoutMs: 60_000 });
    },
    onSuccess: (p) => {
      if (!p) return;
      qc.setQueryData(['user', userId], p);
      for (const key of ['timeline', 'userActivities', 'chats']) void qc.invalidateQueries({ queryKey: [key] });
    },
  });

  if (profile.isPending) return <Loading />;
  if (profile.error) return <ErrorBox error={profile.error} onRetry={() => profile.refetch()} />;
  const p = profile.data;
  const s = stats.data;
  const total = distanceParts(p.totals.distanceM);

  const cover = mediaUri(p.coverUrl);
  // Di atas foto sampul, teks diberi bayangan tipis supaya tetap terbaca di foto terang maupun gelap.
  const onPhoto = cover ? { textShadowColor: alpha(c.bg, 0.9), textShadowRadius: 6 } : null;
  const photoOptions = (kind: 'avatar' | 'cover'): SheetOption[] => [
    { label: 'Pilih dari galeri', icon: 'images-outline', onPress: () => photo.mutate({ kind }) },
    ...(Platform.OS !== 'web' ? [{ label: 'Ambil foto', icon: 'camera-outline' as const, onPress: () => photo.mutate({ kind, camera: true }) }] : []),
    ...((kind === 'avatar' ? p.avatarUrl : p.coverUrl)
      ? [{ label: 'Hapus foto', icon: 'trash-outline' as const, danger: true, onPress: () => photo.mutate({ kind, remove: true }) }]
      : []),
  ];
  const moreOptions: SheetOption[] = [
    p.blocked
      ? { label: 'Buka blokir', icon: 'lock-open-outline', onPress: () => block.mutate(false) }
      : {
          label: 'Blokir',
          icon: 'ban-outline',
          danger: true,
          onPress: async () => {
            if (await confirm('Blokir', `Blokir ${p.name}? Kalian berhenti saling mengikuti dan tidak bisa saling mengirim pesan.`, 'Blokir'))
              block.mutate(true);
          },
        },
  ];

  const header = (
    <View style={{ gap: space.lg }}>
      <View style={[styles.hero, { borderColor: c.accent + '30', marginHorizontal: -space.lg, backgroundColor: c.heroBottom }]}>
        {cover ? (
          <>
            {/* Foto sampul; bagian bawahnya (di belakang angka) diburamkan oleh BlurView di bawah. */}
            <BlurTargetView ref={blurTarget} style={StyleSheet.absoluteFill}>
              <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={IMAGE_FADE} />
            </BlurTargetView>
            <LinearGradient
              colors={[alpha(c.bg, 0.3), alpha(c.bg, 0.62), alpha(c.bg, 0.85)]}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </>
        ) : (
          <LinearGradient colors={[c.heroTop, c.heroBottom]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
        )}

        <View style={[styles.heroBody, { paddingTop: (inTab ? insets.top : 0) + space.xl }]}>
          {inTab ? (
            <View style={[styles.heroActions, { top: insets.top + space.sm }]}>
              <IconButton icon="person-add-outline" label="Cari teman" onPress={() => router.push('/cari')} />
              <IconButton icon="settings-outline" label="Pengaturan" onPress={() => router.push('/pengaturan')} />
            </View>
          ) : null}
          {p.isMe ? (
            <View style={[styles.coverAction, { top: (inTab ? insets.top : 0) + space.sm }]}>
              <IconButton icon="image-outline" label="Ganti foto sampul" onPress={() => setSheet('cover')} />
            </View>
          ) : null}

          <Pressable
            disabled={!p.isMe}
            onPress={() => setSheet('avatar')}
            accessibilityRole={p.isMe ? 'button' : undefined}
            accessibilityLabel={p.isMe ? 'Ganti foto profil' : undefined}>
            <Avatar name={p.name} uri={p.avatarUrl} size={84} ring />
            {p.isMe ? (
              <View style={[styles.camBadge, { backgroundColor: c.accent, borderColor: c.heroBottom }]}>
                <Ionicons name={photo.isPending ? 'hourglass-outline' : 'camera'} size={14} color={c.accentInk} />
              </View>
            ) : null}
          </Pressable>
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={[styles.name, { color: c.text }, onPhoto]}>{p.name}</Text>
            <Text style={[styles.handle, { color: c.text, opacity: cover ? 0.85 : 1 }, !cover && { color: c.muted }, onPhoto]}>@{p.username}</Text>
          </View>
          <Row gap={space.xl}>
            <Pressable onPress={() => router.push(`/koneksi/${p.id}?tab=pengikut`)} hitSlop={8} accessibilityRole="link">
              <Text style={[styles.count, { color: cover ? c.text : c.muted }, onPhoto]}>
                <Text style={[styles.countNum, { color: c.text }]}>{p.followers}</Text> pengikut
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/koneksi/${p.id}?tab=mengikuti`)} hitSlop={8} accessibilityRole="link">
              <Text style={[styles.count, { color: cover ? c.text : c.muted }, onPhoto]}>
                <Text style={[styles.countNum, { color: c.text }]}>{p.following}</Text> mengikuti
              </Text>
            </Pressable>
          </Row>
          {p.isMe ? null : p.blocked ? (
            <Button kind="soft" icon="lock-open-outline" title="Buka blokir" loading={block.isPending} onPress={() => block.mutate(false)} style={{ alignSelf: 'stretch' }} />
          ) : (
            <Row gap={space.sm} style={{ alignSelf: 'stretch' }}>
              <Button
                kind={p.isFollowing ? 'soft' : 'primary'}
                icon={p.isFollowing ? 'checkmark' : 'person-add'}
                title={p.isFollowing ? 'Mengikuti' : 'Ikuti'}
                loading={follow.isPending}
                onPress={() => follow.mutate(!p.isFollowing)}
                style={{ flex: 1 }}
              />
              {p.canMessage ? (
                <IconButton icon="chatbubble-ellipses-outline" label="Kirim pesan" size={50} onPress={() => router.push(`/pesan/${p.id}`)} />
              ) : null}
              <IconButton icon="ellipsis-horizontal" label="Lainnya" size={50} onPress={() => setSheet('more')} />
            </Row>
          )}
          {photo.error ? <ErrorBox error={photo.error} /> : null}
        </View>

        <View style={[styles.totals, { borderTopColor: cover ? 'transparent' : c.line }]}>
          {cover ? (
            <BlurView
              blurTarget={blurTarget}
              blurMethod="dimezisBlurViewSdk31Plus"
              intensity={45}
              tint={dark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <HeroStat label="Aktivitas" value={String(p.totals.count)} />
          <HeroStat label="Jarak" value={total.value} unit={total.unit} />
          <HeroStat label="Waktu" value={durationShort(p.totals.movingS)} />
        </View>
      </View>
      <Sheet
        visible={sheet != null}
        title={sheet === 'avatar' ? 'Foto profil' : sheet === 'cover' ? 'Foto sampul' : p.name}
        options={sheet === 'more' ? moreOptions : sheet ? photoOptions(sheet) : []}
        onClose={() => setSheet(null)}
      />

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
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[styles.heroNum, { color: c.accentText }]}>
        {value}
        {unit ? <Text style={[styles.heroUnit, { color: c.muted }]}> {unit}</Text> : null}
      </Text>
      <Text style={[styles.heroLabel, { color: c.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    overflow: 'hidden',
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  heroBody: { alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
  heroActions: { position: 'absolute', right: space.lg, flexDirection: 'row', gap: space.sm },
  coverAction: { position: 'absolute', left: space.lg },
  camBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: font.bold, fontSize: 24, letterSpacing: -0.3 },
  handle: { fontFamily: font.medium, fontSize: 14 },
  count: { fontFamily: font.medium, fontSize: 14 },
  countNum: { fontFamily: font.bold },
  totals: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    borderTopWidth: 1,
    paddingTop: space.md,
    paddingBottom: space.lg,
    paddingHorizontal: space.lg,
    overflow: 'hidden',
  },
  heroNum: { fontFamily: font.numBold, fontSize: 26, letterSpacing: -0.5 },
  heroUnit: { fontFamily: font.semibold, fontSize: 13 },
  heroLabel: { fontFamily: font.medium, fontSize: 12 },
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
