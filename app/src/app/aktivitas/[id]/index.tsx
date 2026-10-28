import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Activity, Comment } from '@shared/api';
import { flatten, toLatLon, type LatLon } from '@shared/geo';

import { useKudos } from '@/components/ActivityCard';
import JejakMap from '@/components/Map';
import type { MapLine, MapPin } from '@/components/map-types';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ErrorBox,
  Field,
  IconButton,
  Loading,
  Row,
  Screen,
  SectionTitle,
  Stat,
  T,
} from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { buildGpx, gpxFileName } from '@/lib/gpx';
import { shareTextFile } from '@/lib/share-file';
import { activityMeta, distanceParts, duration, pace, speed, tempoParts, TYPE_ICON, when } from '@/lib/format';
import { font, radius, space, useColors } from '@/lib/theme';

export default function ActivityScreen() {
  const c = useColors();
  const me = useMe();
  const qc = useQueryClient();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const q = useQuery({ queryKey: ['activity', id], queryFn: () => api<Activity>(`/activities/${id}`) });
  const [selectedEffort, setSelectedEffort] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const points = useMemo(() => (q.data ? flatten(q.data.track) : []), [q.data]);
  const fit = useMemo<LatLon[] | null>(() => (points.length ? toLatLon(points) : null), [points]);
  const lines = useMemo<MapLine[]>(() => {
    if (!q.data) return [];
    const out: MapLine[] = q.data.track
      .filter((p) => p.length > 1)
      .map((p, i) => ({ id: `t${i}`, coords: toLatLon(p), color: c.track, width: 5 }));
    const e = q.data.efforts.find((x) => x.id === selectedEffort);
    if (e) out.push({ id: 'effort', coords: toLatLon(points.slice(e.startIndex, e.endIndex + 1)), color: c.segment, width: 7 });
    return out;
  }, [q.data, points, selectedEffort, c]);
  const pins = useMemo<MapPin[]>(
    () =>
      points.length
        ? [
            { id: 's', at: [points[0][0], points[0][1]], color: c.start },
            { id: 'e', at: [points[points.length - 1][0], points[points.length - 1][1]], color: c.finish },
          ]
        : [],
    [points, c],
  );

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
  const d = distanceParts(a.distanceM);
  const t = tempoParts(a.type, a.distanceM, a.movingS);
  const splitRate = (s: { distanceM: number; elapsedS: number }) => s.elapsedS / s.distanceM;
  // Km tercepat hanya dari km penuh; panjang batang = kecepatan relatif terhadap km tercepat (jujur, tidak dibesar-besarkan).
  const fullSplits = a.splits.filter((s) => s.distanceM >= 900);
  const fastest = fullSplits.length ? Math.min(...fullSplits.map(splitRate)) : Infinity;
  const quickest = Math.min(...(fullSplits.length ? fullSplits : a.splits).map(splitRate));

  return (
    <Screen padded={false}>
      <View style={{ height: 320 }}>
        <JejakMap lines={lines} pins={pins} fit={fit} />
      </View>

      <View style={[styles.body, { backgroundColor: c.bg }]}>
        <Pressable onPress={() => router.push(`/atlet/${a.user.id}`)}>
          <Row>
            <Avatar name={a.user.name} size={44} />
            <View style={{ flex: 1 }}>
              <T v="strong">{a.user.name}</T>
              <Row gap={5}>
                <Ionicons name={TYPE_ICON[a.type]} size={13} color={c.muted} />
                <T v="small">{activityMeta(a.type, a.startedAt)}</T>
              </Row>
            </View>
          </Row>
        </Pressable>
        <T v="h1">{a.title}</T>

        <Card style={{ gap: space.lg }}>
          <Row gap={space.lg}>
            <Stat label="Jarak" value={d.value} unit={d.unit} size={32} />
            <Stat label={t.label} value={t.value} unit={t.unit} size={32} />
            <Stat label="Bergerak" value={duration(a.movingS)} size={32} />
          </Row>
          <Row gap={space.lg}>
            <Stat label="Tanjakan" value={String(Math.round(a.elevGainM))} unit="m" size={22} />
            <Stat label="Total" value={duration(a.elapsedS)} size={22} />
            <Stat label="Kec. maks" value={speed(a.maxSpeedMps, 1).replace(' km/j', '')} unit="km/j" size={22} />
          </Row>
        </Card>

        {mine ? (
          <Row gap={space.sm}>
            <Button
              style={{ flex: 1 }}
              icon="image-outline"
              title="Bagikan"
              onPress={() => router.push(`/aktivitas/${a.id}/bagikan`)}
            />
            <Button
              style={{ flex: 1 }}
              kind="soft"
              icon="download-outline"
              title="Ekspor GPX"
              loading={exporting}
              onPress={async () => {
                setExporting(true);
                setExportError(null);
                try {
                  await shareTextFile(gpxFileName(a), 'application/gpx+xml', buildGpx(a));
                } catch (e) {
                  setExportError(errorText(e));
                } finally {
                  setExporting(false);
                }
              }}
            />
          </Row>
        ) : null}
        {exportError ? <ErrorBox error={new Error(exportError)} /> : null}

        <KudosRow a={a} mine={mine} />

        {a.efforts.length > 0 ? (
          <>
            <SectionTitle>Segmen</SectionTitle>
            {a.efforts.map((e) => {
              const on = e.id === selectedEffort;
              return (
                <Card
                  key={e.id}
                  onPress={() => setSelectedEffort(on ? null : e.id)}
                  style={on ? { borderColor: c.segment, borderWidth: 2 } : undefined}>
                  <Row>
                    <View style={[styles.segIcon, { backgroundColor: e.isPr ? c.gold : c.segment }]}>
                      <Ionicons name={e.isPr ? 'trophy' : 'flag'} size={18} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T v="strong" numberOfLines={1}>
                        {e.segmentName}
                      </T>
                      <T v="small">
                        {distanceParts(e.distanceM).value} {distanceParts(e.distanceM).unit},{' '}
                        {a.type === 'ride' ? speed(e.distanceM, e.elapsedS) : pace(e.distanceM, e.elapsedS)}
                      </T>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <T v="num" size={24}>
                        {duration(e.elapsedS)}
                      </T>
                      <Row gap={4}>
                        {e.isPr ? <Badge text="PR" color={c.gold} textColor="#1a1400" /> : null}
                        {e.rank != null ? <Badge text={`#${e.rank}`} color={c.segment} /> : null}
                      </Row>
                    </View>
                  </Row>
                  {on ? (
                    <Button
                      small
                      kind="soft"
                      icon="podium-outline"
                      title="Lihat leaderboard"
                      onPress={() => router.push(`/segmen/${e.segmentId}`)}
                    />
                  ) : null}
                </Card>
              );
            })}
          </>
        ) : null}

        {a.splits.length > 0 ? (
          <>
            <SectionTitle>Split per km</SectionTitle>
            <Card style={{ gap: 10 }}>
              {a.splits.map((s) => {
                const rate = splitRate(s);
                const best = rate === fastest;
                const w = (quickest / rate) * 100;
                return (
                  <Row key={s.index} gap={space.md}>
                    <View style={[styles.kmDot, { backgroundColor: best ? c.accentSoft : c.surface2, borderColor: best ? c.accent : c.line }]}>
                      <Text style={[styles.kmNum, { color: best ? c.accent : c.muted }]}>{s.index}</Text>
                    </View>
                    <Text style={[styles.splitPace, { color: c.text }]}>
                      {a.type === 'ride'
                        ? speed(s.distanceM, s.elapsedS).replace(' km/j', '')
                        : pace(s.distanceM, s.elapsedS).replace(' /km', '')}
                    </Text>
                    <View style={{ flex: 1, height: 14, justifyContent: 'center' }}>
                      <View
                        style={{
                          width: `${Math.min(100, Math.max(12, w))}%`,
                          height: 14,
                          borderRadius: 7,
                          backgroundColor: best ? c.track : c.surface2,
                        }}
                      />
                    </View>
                  </Row>
                );
              })}
              <T v="small">
                {a.type === 'ride' ? 'Kecepatan per km dalam km/j.' : 'Pace per km.'} Batang hijau menandai km tercepat.
              </T>
            </Card>
          </>
        ) : null}

        {a.bestEfforts.length > 0 ? (
          <>
            <SectionTitle>Waktu terbaik</SectionTitle>
            <View style={styles.tiles}>
              {a.bestEfforts.map((b) => (
                <View
                  key={b.name}
                  style={[styles.tile, { backgroundColor: b.isPr ? c.accentSoft : c.surface, borderColor: b.isPr ? c.accent + '55' : c.line }]}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T v="label">{b.name}</T>
                    {b.isPr ? <Ionicons name="trophy" size={14} color={c.gold} /> : null}
                  </Row>
                  <T v="num" size={28} color={b.isPr ? c.accent : undefined}>
                    {duration(b.elapsedS)}
                  </T>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Comments activityId={a.id} ownerId={a.user.id} />

        {mine ? (
          <View style={{ gap: space.sm, marginTop: space.md }}>
            <Button
              kind="ink"
              icon="flag-outline"
              title="Buat segmen dari aktivitas ini"
              onPress={() => router.push(`/aktivitas/${a.id}/segmen`)}
            />
            <Button
              kind="ghost"
              icon="trash-outline"
              title="Hapus aktivitas"
              loading={del.isPending}
              onPress={async () => {
                if (await confirm('Hapus aktivitas', 'Aktivitas, kudos, komentar, dan waktu segmennya ikut terhapus.', 'Hapus'))
                  del.mutate();
              }}
            />
            {del.error ? <ErrorBox error={del.error} /> : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function KudosRow({ a, mine }: { a: Activity; mine: boolean }) {
  const c = useColors();
  const kudos = useKudos(a);
  return (
    <Row>
      <View style={{ flex: 1 }}>
        <Row gap={space.sm}>
          <Ionicons name="thumbs-up" size={18} color={c.accentText} />
          <T v="h3">{a.kudos} kudos</T>
        </Row>
        {a.kudosBy.length > 0 ? (
          <T v="small" numberOfLines={1}>
            dari {a.kudosBy.map((u) => u.name.split(' ')[0]).join(', ')}
          </T>
        ) : null}
      </View>
      {mine ? null : (
        <Button
          small
          kind={a.hasKudo ? 'soft' : 'primary'}
          icon={a.hasKudo ? 'thumbs-up' : 'thumbs-up-outline'}
          title={a.hasKudo ? 'Sudah' : 'Beri kudos'}
          loading={kudos.isPending}
          onPress={() => kudos.mutate()}
        />
      )}
    </Row>
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
    <>
      <SectionTitle>Komentar</SectionTitle>
      <Card style={{ gap: space.md }}>
        {(q.data ?? []).map((cm) => (
          <Row key={cm.id} style={{ alignItems: 'flex-start' }}>
            <Avatar name={cm.user.name} size={34} />
            <View style={[styles.bubble, { backgroundColor: c.surface2 }]}>
              <Row gap={6}>
                <T v="strong" size={13}>
                  {cm.user.name}
                </T>
                <T v="small" size={12}>
                  {when(cm.createdAt)}
                </T>
              </Row>
              <T>{cm.body}</T>
            </View>
            {cm.user.id === me.id || ownerId === me.id ? (
              <IconButton
                icon="close"
                label="Hapus komentar"
                size={28}
                bg="transparent"
                color={c.muted}
                onPress={() => remove.mutate(cm.id)}
              />
            ) : null}
          </Row>
        ))}
        {q.data?.length === 0 ? <T v="small">Belum ada komentar. Jadi yang pertama!</T> : null}
        <Row gap={space.sm}>
          <View style={{ flex: 1 }}>
            <Field
              value={text}
              onChangeText={setText}
              placeholder="Tulis komentar…"
              maxLength={500}
              onSubmitEditing={() => text.trim() && send.mutate()}
            />
          </View>
          <IconButton
            icon="send"
            label="Kirim komentar"
            bg={c.accent}
            color={c.accentInk}
            size={46}
            disabled={!text.trim() || send.isPending}
            onPress={() => send.mutate()}
          />
        </Row>
        {send.error ? <ErrorBox error={send.error} /> : null}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  kmDot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kmNum: { fontFamily: font.bold, fontSize: 13 },
  body: {
    marginTop: -radius.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    paddingTop: space.xl,
    gap: space.lg,
  },
  segIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  splitPace: { width: 52, fontFamily: font.numBold, fontSize: 20, fontVariant: ['tabular-nums'] },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.md,
    gap: 4,
  },
  bubble: { flex: 1, borderRadius: radius.md, padding: space.md, gap: 2 },
});
