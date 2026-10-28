import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Activity, Segment } from '@shared/api';
import { flatten, haversine, pathDistance, toLatLon, type LatLon } from '@shared/geo';

import JejakMap from '@/components/Map';
import type { MapLine, MapPin } from '@/components/map-types';
import { Button, ErrorBox, Field, Loading, Row, Stat, T } from '@/components/ui';
import { api } from '@/lib/api';
import { distance, duration } from '@/lib/format';
import { radius, space, useColors } from '@/lib/theme';

type Which = 'start' | 'end';

export default function CreateSegmentScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const q = useQuery({ queryKey: ['activity', id], queryFn: () => api<Activity>(`/activities/${id}`) });
  const points = useMemo(() => (q.data ? flatten(q.data.track) : []), [q.data]);
  const n = points.length;
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);
  const [which, setWhich] = useState<Which>('start');
  const [name, setName] = useState('');
  const start = range?.start ?? Math.floor(n * 0.25);
  const end = range?.end ?? Math.max(Math.floor(n * 0.75), Math.min(n - 1, start + 1));

  const slice = useMemo(() => toLatLon(points.slice(start, end + 1)), [points, start, end]);
  const fit = useMemo<LatLon[] | null>(() => (n ? toLatLon(points) : null), [points, n]);
  const lines = useMemo<MapLine[]>(
    () => [
      { id: 'all', coords: toLatLon(points), color: c.muted, width: 4 },
      { id: 'seg', coords: slice, color: c.segment, width: 7 },
    ],
    [points, slice, c],
  );
  const pins = useMemo<MapPin[]>(
    () =>
      n
        ? [
            { id: 's', at: [points[start][0], points[start][1]], color: '#22A45D', label: 'S' },
            { id: 'e', at: [points[end][0], points[end][1]], color: '#D93B30', label: 'F' },
          ]
        : [],
    [points, start, end, n],
  );

  const create = useMutation({
    mutationFn: () => api<Segment>('/segments', { body: { activityId: id, startIndex: start, endIndex: end, name: name.trim() } }),
    onSuccess: (seg) => {
      void qc.invalidateQueries({ queryKey: ['activity', id] });
      void qc.invalidateQueries({ queryKey: ['segments'] });
      router.replace(`/segmen/${seg.id}`);
    },
  });

  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;

  const set = (w: Which, idx: number) => {
    const i = Math.max(0, Math.min(n - 1, idx));
    if (w === 'start') setRange({ start: Math.min(i, end - 1), end });
    else setRange({ start, end: Math.max(i, start + 1) });
  };

  // Ketuk peta: pilih titik track terdekat untuk ujung yang sedang aktif, lalu pindah ke ujung lainnya.
  const onPress = (p: LatLon) => {
    let best = 0;
    let bestD = Infinity;
    points.forEach((pt, i) => {
      const d = haversine(pt, p);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    set(which, best);
    setWhich(which === 'start' ? 'end' : 'start');
  };

  const lengthM = pathDistance(slice);
  const timeS = n ? (points[end][2] - points[start][2]) / 1000 : 0;
  const idx = which === 'start' ? start : end;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <JejakMap lines={lines} pins={pins} fit={fit} onPress={onPress} />
      <View style={[styles.panel, { backgroundColor: c.card }]}>
        <Row>
          {(['start', 'end'] as Which[]).map((w) => (
            <Pressable
              key={w}
              onPress={() => setWhich(w)}
              style={[styles.tab, { borderColor: which === w ? c.primary : c.border, backgroundColor: which === w ? c.primarySoft : 'transparent' }]}>
              <T weight="700" style={{ color: which === w ? c.primary : c.text }}>
                {w === 'start' ? 'Titik awal (S)' : 'Titik akhir (F)'}
              </T>
            </Pressable>
          ))}
        </Row>
        <T muted size={13}>
          Ketuk peta di dekat jalurmu untuk memindahkan {which === 'start' ? 'titik awal' : 'titik akhir'}, atau geser sedikit-sedikit:
        </T>
        <Row gap={space.sm}>
          {[-20, -5, 5, 20].map((step) => (
            <Button key={step} small kind="secondary" style={{ flex: 1 }} title={step > 0 ? `+${step}` : String(step)} onPress={() => set(which, idx + step)} />
          ))}
        </Row>
        <Row>
          <Stat label="Panjang segmen" value={distance(lengthM)} />
          <Stat label="Waktumu" value={duration(timeS)} />
        </Row>
        {lengthM < 100 ? <T style={{ color: c.danger }}>Segmen minimal 100 m.</T> : null}
        <Field value={name} onChangeText={setName} placeholder="Nama segmen, mis. Tanjakan Gunung Gandul" maxLength={80} />
        {create.error ? <ErrorBox error={create.error} /> : null}
        <Button
          title="Buat segmen"
          icon="trophy"
          disabled={!name.trim() || lengthM < 100}
          loading={create.isPending}
          onPress={() => create.mutate()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5 },
});
