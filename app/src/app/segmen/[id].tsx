import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { LeaderboardRow, Segment } from '@shared/api';

import JejakMap from '@/components/Map';
import { endPins } from '@/components/map-types';
import { Avatar, Button, Card, Empty, ErrorBox, Loading, Row, Screen, Stat, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { dateShort, distance, duration, pace, speed, TYPE_ICON } from '@/lib/format';
import { radius, space, useColors } from '@/lib/theme';

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
  const tempoOf = (r: LeaderboardRow) => (s.type === 'ride' ? speed(s.distanceM, r.elapsedS) : pace(s.distanceM, r.elapsedS));

  return (
    <Screen>
      <Stack.Screen options={{ title: s.name }} />
      <View style={{ height: 240, borderRadius: 12, overflow: 'hidden' }}>
        <JejakMap
          lines={[{ id: 'seg', coords: g, color: c.segment, width: 6 }]}
          pins={endPins(g, ['S', 'F'])}
          fit={g}
        />
      </View>
      <T weight="800" size={22}>
        {s.name}
      </T>
      <Row gap={6}>
        <Ionicons name={TYPE_ICON[s.type]} size={15} color={c.muted} />
        <T muted>
          {distance(s.distanceM)} · {s.athletes} atlet · dibuat {s.createdBy.name}
        </T>
      </Row>

      {s.myBest ? (
        <Card style={{ borderColor: c.gold, borderWidth: 1.5 }}>
          <T weight="800">Waktu terbaikmu</T>
          <Row>
            <Stat label="Waktu" value={duration(s.myBest.elapsedS)} />
            <Stat label="Peringkat" value={`#${s.myBest.rank}`} />
            <Stat label={s.type === 'ride' ? 'Kecepatan' : 'Pace'} value={tempoOf(s.myBest)} />
          </Row>
        </Card>
      ) : (
        <T muted>Kamu belum punya waktu di segmen ini. Lewati dari S ke F saat merekam.</T>
      )}

      <Row>
        {(['all', 'following'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.tab, { borderColor: filter === f ? c.primary : c.border, backgroundColor: filter === f ? c.primarySoft : 'transparent' }]}>
            <T weight="700" style={{ color: filter === f ? c.primary : c.text }}>
              {f === 'all' ? 'Semua' : 'Yang kuikuti'}
            </T>
          </Pressable>
        ))}
      </Row>

      <Card style={{ padding: 0, gap: 0 }}>
        {s.leaderboard.length === 0 ? <Empty icon="trophy-outline" title="Belum ada waktu tercatat" /> : null}
        {s.leaderboard.map((r) => (
          <Pressable key={r.user.id} onPress={() => router.push(`/aktivitas/${r.activityId}`)}>
            <Row style={[styles.row, { borderColor: c.border, backgroundColor: r.user.id === me.id ? c.primarySoft : 'transparent' }]}>
              <T weight="800" style={{ width: 30, color: r.rank <= 3 ? c.gold : c.text }}>
                {r.rank}
              </T>
              <Avatar name={r.user.name} size={32} />
              <View style={{ flex: 1 }}>
                <T weight="700" numberOfLines={1}>
                  {r.user.name}
                </T>
                <T muted size={12}>
                  {dateShort(r.date)} · {tempoOf(r)}
                </T>
              </View>
              <T weight="800" style={{ fontVariant: ['tabular-nums'] }}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5 },
  row: { paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth },
});
