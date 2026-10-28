import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { Activity, Comment } from '@shared/api';
import { flatten, toLatLon, type LatLon } from '@shared/geo';

import { useKudos } from '@/components/ActivityCard';
import JejakMap from '@/components/Map';
import type { MapLine } from '@/components/map-types';
import { Avatar, Badge, Button, Card, ErrorBox, Field, Loading, Row, Screen, SectionTitle, Stat, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { distance, duration, pace, speed, tempo, TYPE_ICON, TYPE_LABEL, when } from '@/lib/format';
import { space, useColors } from '@/lib/theme';

export default function ActivityScreen() {
  const c = useColors();
  const me = useMe();
  const qc = useQueryClient();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const q = useQuery({ queryKey: ['activity', id], queryFn: () => api<Activity>(`/activities/${id}`) });
  const [selectedEffort, setSelectedEffort] = useState<number | null>(null);

  const points = useMemo(() => (q.data ? flatten(q.data.track) : []), [q.data]);
  const fit = useMemo<LatLon[] | null>(() => (points.length ? toLatLon(points) : null), [points]);
  const lines = useMemo<MapLine[]>(() => {
    if (!q.data) return [];
    const out: MapLine[] = q.data.track
      .filter((p) => p.length > 1)
      .map((p, i) => ({ id: `t${i}`, coords: toLatLon(p), color: c.primary, width: 4 }));
    const e = q.data.efforts.find((x) => x.id === selectedEffort);
    if (e) out.push({ id: 'effort', coords: toLatLon(points.slice(e.startIndex, e.endIndex + 1)), color: c.segment, width: 7 });
    return out;
  }, [q.data, points, selectedEffort, c]);

  const del = useMutation({
    mutationFn: () => api(`/activities/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      for (const key of ['feed', 'userActivities', 'stats', 'user']) void qc.invalidateQueries({ queryKey: [key] });
      router.back();
    },
  });

  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const a = q.data;
  const mine = a.user.id === me.id;
  const t = tempo(a.type, a.distanceM, a.movingS);
  const fastestSplit = Math.min(...a.splits.filter((s) => s.distanceM >= 900).map((s) => s.elapsedS / s.distanceM));

  return (
    <Screen>
      <Stack.Screen options={{ title: TYPE_LABEL[a.type] }} />
      <Pressable onPress={() => router.push(`/atlet/${a.user.id}`)}>
        <Row>
          <Avatar name={a.user.name} />
          <View style={{ flex: 1 }}>
            <T weight="700">{a.user.name}</T>
            <Row gap={6}>
              <Ionicons name={TYPE_ICON[a.type]} size={13} color={c.muted} />
              <T muted size={13}>
                {when(a.startedAt)}
              </T>
            </Row>
          </View>
        </Row>
      </Pressable>
      <T weight="800" size={22}>
        {a.title}
      </T>

      <View style={{ height: 300, borderRadius: 12, overflow: 'hidden' }}>
        <JejakMap
          lines={lines}
          pins={
            points.length
              ? [
                  { id: 's', at: [points[0][0], points[0][1]], color: '#22A45D' },
                  { id: 'e', at: [points[points.length - 1][0], points[points.length - 1][1]], color: '#D93B30' },
                ]
              : []
          }
          fit={fit}
        />
      </View>

      <Card>
        <Row>
          <Stat label="Jarak" value={distance(a.distanceM)} />
          <Stat label={t.label} value={t.value} />
          <Stat label="Waktu bergerak" value={duration(a.movingS)} />
        </Row>
        <Row>
          <Stat label="Tanjakan" value={`${Math.round(a.elevGainM)} m`} />
          <Stat label="Waktu total" value={duration(a.elapsedS)} />
          <Stat label="Kec. maks" value={speed(a.maxSpeedMps, 1)} />
        </Row>
      </Card>

      <KudosRow a={a} mine={mine} />

      {a.efforts.length > 0 ? (
        <>
          <SectionTitle>Segmen</SectionTitle>
          {a.efforts.map((e) => (
            <Card key={e.id} onPress={() => setSelectedEffort(e.id === selectedEffort ? null : e.id)}>
              <Row>
                <Ionicons name="trophy" size={20} color={e.isPr ? c.gold : c.segment} />
                <View style={{ flex: 1 }}>
                  <T weight="700">{e.segmentName}</T>
                  <T muted size={13}>
                    {distance(e.distanceM)} · {a.type === 'ride' ? speed(e.distanceM, e.elapsedS) : pace(e.distanceM, e.elapsedS)}
                  </T>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <T weight="800" style={{ fontVariant: ['tabular-nums'] }}>
                    {duration(e.elapsedS)}
                  </T>
                  <Row gap={4}>
                    {e.isPr ? <Badge text="PR" color={c.gold} /> : null}
                    {e.rank != null && e.rank <= 10 ? <Badge text={`#${e.rank}`} color={c.segment} /> : null}
                  </Row>
                </View>
              </Row>
              {selectedEffort === e.id ? (
                <Button small kind="secondary" title="Lihat leaderboard" onPress={() => router.push(`/segmen/${e.segmentId}`)} />
              ) : null}
            </Card>
          ))}
        </>
      ) : null}

      {a.splits.length > 0 ? (
        <Card>
          <T weight="800">Split per km</T>
          {a.splits.map((s) => {
            const per = s.elapsedS / s.distanceM;
            return (
              <Row key={s.index} style={{ paddingVertical: 3 }}>
                <T muted style={{ width: 28 }}>
                  {s.index}
                </T>
                <T style={{ width: 92, fontVariant: ['tabular-nums'] }}>
                  {a.type === 'ride' ? speed(s.distanceM, s.elapsedS) : pace(s.distanceM, s.elapsedS).replace(' /km', '')}
                </T>
                <View style={{ flex: 1, height: 10, backgroundColor: c.border, borderRadius: 5 }}>
                  <View
                    style={{
                      width: `${Math.min(100, (fastestSplit / per) * 100)}%`,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: per === fastestSplit ? c.primary : c.primary + '88',
                    }}
                  />
                </View>
              </Row>
            );
          })}
        </Card>
      ) : null}

      {a.bestEfforts.length > 0 ? (
        <Card>
          <T weight="800">Waktu terbaik</T>
          {a.bestEfforts.map((b) => (
            <Row key={b.name} style={{ justifyContent: 'space-between', paddingVertical: 3 }}>
              <Row gap={6}>
                <T>{b.name}</T>
                {b.isPr ? <Badge text="🏆 PR" color={c.gold} /> : null}
              </Row>
              <T weight="700" style={{ fontVariant: ['tabular-nums'] }}>
                {duration(b.elapsedS)}
              </T>
            </Row>
          ))}
        </Card>
      ) : null}

      <Comments activityId={a.id} ownerId={a.user.id} />

      {mine ? (
        <View style={{ gap: space.sm, marginTop: space.md }}>
          <Button kind="secondary" icon="trophy-outline" title="Buat segmen dari aktivitas ini" onPress={() => router.push(`/aktivitas/${a.id}/segmen`)} />
          <Button
            kind="ghost"
            icon="trash-outline"
            title="Hapus aktivitas"
            loading={del.isPending}
            onPress={async () => {
              if (await confirm('Hapus aktivitas', 'Aktivitas, kudos, komentar, dan waktu segmennya ikut terhapus.', 'Hapus')) del.mutate();
            }}
          />
          {del.error ? <ErrorBox error={del.error} /> : null}
        </View>
      ) : null}
    </Screen>
  );
}

function KudosRow({ a, mine }: { a: Activity; mine: boolean }) {
  const c = useColors();
  const kudos = useKudos(a);
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={6}>
          <Ionicons name="thumbs-up" size={18} color={c.primary} />
          <T weight="700">{a.kudos} kudos</T>
        </Row>
        {mine ? null : (
          <Button
            small
            kind={a.hasKudo ? 'secondary' : 'primary'}
            icon={a.hasKudo ? 'thumbs-up' : 'thumbs-up-outline'}
            title={a.hasKudo ? 'Sudah kudos' : 'Beri kudos'}
            loading={kudos.isPending}
            onPress={() => kudos.mutate()}
          />
        )}
      </Row>
      {a.kudosBy.length > 0 ? (
        <T muted size={13}>
          {a.kudosBy.map((u) => u.name).join(', ')}
        </T>
      ) : null}
    </Card>
  );
}

function Comments({ activityId, ownerId }: { activityId: number; ownerId: number }) {
  const c = useColors();
  const me = useMe();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const q = useQuery({ queryKey: ['comments', activityId], queryFn: () => api<Comment[]>(`/activities/${activityId}/comments`) });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['comments', activityId] });
    void qc.invalidateQueries({ queryKey: ['feed'] });
  };
  const send = useMutation({
    mutationFn: () => api<Comment>(`/activities/${activityId}/comments`, { body: { body: text } }),
    onSuccess: () => {
      setText('');
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/comments/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
  return (
    <Card>
      <T weight="800">Komentar</T>
      {(q.data ?? []).map((cm) => (
        <Row key={cm.id} style={{ alignItems: 'flex-start', paddingVertical: 4 }}>
          <Avatar name={cm.user.name} size={30} />
          <View style={{ flex: 1 }}>
            <T size={13} weight="700">
              {cm.user.name} <T muted size={12}>{when(cm.createdAt)}</T>
            </T>
            <T>{cm.body}</T>
          </View>
          {cm.user.id === me.id || ownerId === me.id ? (
            <Pressable onPress={() => remove.mutate(cm.id)} hitSlop={8} accessibilityLabel="Hapus komentar">
              <Ionicons name="close" size={16} color={c.muted} />
            </Pressable>
          ) : null}
        </Row>
      ))}
      {q.data?.length === 0 ? <T muted>Belum ada komentar.</T> : null}
      <Row>
        <View style={{ flex: 1 }}>
          <Field value={text} onChangeText={setText} placeholder="Tulis komentar…" maxLength={500} onSubmitEditing={() => text.trim() && send.mutate()} />
        </View>
        <Button small title="Kirim" disabled={!text.trim()} loading={send.isPending} onPress={() => send.mutate()} />
      </Row>
      {send.error ? <ErrorBox error={send.error} /> : null}
    </Card>
  );
}
