import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LeaderboardRow, Segment } from '@shared/api';

import JejakMap from '@/components/Map';
import { endPins } from '@/components/map-types';
import {
  Avatar,
  Button,
  Card,
  Empty,
  ErrorBox,
  Loading,
  Rank,
  Row,
  Screen,
  SectionTitle,
  Segmented,
  Stat,
  T,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { dateShort, distanceParts, duration, pace, speed, TYPE_ICON, TYPE_LABEL } from '@/lib/format';
import { font, palette, radius, space, useColors } from '@/lib/theme';

export default function SegmentScreen() {
  const c = useColors();
  const me = useMe();
  const qc = useQueryClient();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const [filter, setFilter] = useState<'all' | 'following'>('all');
  const q = useQuery({
    queryKey: ['segment', id, filter],
    queryFn: () => api<Segment>(`/segments/${id}${filter === 'following' ? '?filter=following' : ''}`),
    placeholderData: (prev) => prev,
  });
  const del = useMutation({
    mutationFn: () => api(`/segments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['segments'] });
      router.back();
    },
  });

  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const s = q.data;
  const g = s.geometry;
  const len = distanceParts(s.distanceM);
  const tempoOf = (r: LeaderboardRow) => (s.type === 'ride' ? speed(s.distanceM, r.elapsedS) : pace(s.distanceM, r.elapsedS));

  return (
    <Screen padded={false}>
      <View style={{ height: 260 }}>
        <JejakMap lines={[{ id: 'seg', coords: g, color: c.segment, width: 6 }]} pins={endPins(g, ['S', 'F'])} fit={g} />
      </View>

      <View style={[styles.body, { backgroundColor: c.bg }]}>
        <View style={{ gap: 4 }}>
          <Row gap={6}>
            <Ionicons name={TYPE_ICON[s.type]} size={14} color={c.muted} />
            <T v="label">Segmen {TYPE_LABEL[s.type].toLowerCase()}</T>
          </Row>
          <T v="h1">{s.name}</T>
          <T v="small">Dibuat {s.createdBy.name}</T>
        </View>

        <Row gap={space.lg}>
          <Stat label="Panjang" value={len.value} unit={len.unit} />
          <Stat label="Atlet" value={String(s.athletes)} />
          <Stat label="Rekor" value={s.leaderboard[0] && filter === 'all' ? duration(s.leaderboard[0].elapsedS) : '–'} />
        </Row>

        {s.myBest ? (
          <LinearGradient
            colors={[c.heroTop, c.heroBottom]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.mine, { borderColor: c.accent + '30' }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.mineLabel}>Waktu terbaikmu</Text>
              <Text style={styles.mineTime}>{duration(s.myBest.elapsedS)}</Text>
              <Text style={styles.mineSub}>
                {tempoOf(s.myBest)}, {dateShort(s.myBest.date)}
              </Text>
            </View>
            <View style={[styles.mineRank, { borderColor: s.myBest.rank <= 3 ? c.gold : c.line }]}>
              <Text style={styles.mineRankLabel}>Peringkat</Text>
              <Text style={[styles.mineRankNum, { color: s.myBest.rank <= 3 ? c.gold : c.text }]}>#{s.myBest.rank}</Text>
            </View>
          </LinearGradient>
        ) : (
          <Card flat style={{ backgroundColor: c.surface2, borderWidth: 0 }}>
            <Row>
              <Ionicons name="flag-outline" size={22} color={c.text} />
              <T v="small" style={{ flex: 1 }}>
                Kamu belum punya waktu di sini. Lewati segmen ini dari S ke F saat merekam.
              </T>
            </Row>
          </Card>
        )}

        <SectionTitle>Leaderboard</SectionTitle>
        <Segmented
          options={[
            { key: 'all', label: 'Semua' },
            { key: 'following', label: 'Yang kuikuti' },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <Card style={{ padding: 0, gap: 0 }}>
          {s.leaderboard.length === 0 ? <Empty icon="trophy" title="Belum ada waktu" /> : null}
          {s.leaderboard.map((r, i) => (
            <Pressable key={r.user.id} onPress={() => router.push(`/aktivitas/${r.activityId}`)}>
              <Row
                style={[
                  styles.row,
                  { borderTopColor: c.line, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth },
                  r.user.id === me.id && { backgroundColor: c.accent + '30' },
                ]}>
                <Rank rank={r.rank} />
                <Avatar name={r.user.name} size={36} />
                <View style={{ flex: 1 }}>
                  <T v="strong" numberOfLines={1}>
                    {r.user.name}
                    {r.user.id === me.id ? ' (kamu)' : ''}
                  </T>
                  <T v="small">
                    {dateShort(r.date)}, {tempoOf(r)}
                  </T>
                </View>
                <T v="num" size={24}>
                  {duration(r.elapsedS)}
                </T>
              </Row>
            </Pressable>
          ))}
        </Card>

        {s.createdBy.id === me.id ? (
          <Button
            kind="ghost"
            icon="trash-outline"
            title="Hapus segmen"
            loading={del.isPending}
            onPress={async () => {
              if (await confirm('Hapus segmen', 'Leaderboard segmen ini ikut terhapus.', 'Hapus')) del.mutate();
            }}
          />
        ) : null}
        {del.error ? <ErrorBox error={del.error} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: -radius.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    paddingTop: space.xl,
    gap: space.lg,
  },
  mine: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg, borderWidth: 1, padding: space.lg },
  mineLabel: { fontFamily: font.medium, fontSize: 13, color: palette.muted },
  mineTime: { fontFamily: font.numBold, fontSize: 40, color: palette.accent, lineHeight: 46, letterSpacing: -1 },
  mineSub: { fontFamily: font.medium, fontSize: 13, color: palette.muted },
  mineRank: {
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  mineRankLabel: { fontFamily: font.medium, fontSize: 11, color: palette.muted },
  mineRankNum: { fontFamily: font.numBold, fontSize: 30 },
  row: { paddingHorizontal: space.lg, paddingVertical: space.md },
});
