import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import type { Activity, Segment } from '@shared/api';
import { flatten, haversine, pathDistance, toLatLon, type LatLon } from '@shared/geo';

import JejakMap from '@/components/Map';
import type { MapLine, MapPin } from '@/components/map-types';
import { Button, ErrorBox, Field, Loading, Row, Segmented, Sheet, Stat, T, ToolButton } from '@/components/ui';
import { api } from '@/lib/api';
import { distanceParts, duration } from '@/lib/format';
import { space, useColors } from '@/lib/theme';

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
      { id: 'all', coords: toLatLon(points), color: c.track, width: 4 },
      { id: 'seg', coords: slice, color: c.segment, width: 7 },
    ],
    [points, slice, c],
  );
  const pins = useMemo<MapPin[]>(
    () =>
      n
        ? [
            { id: 's', at: [points[start][0], points[start][1]], color: c.start, label: 'S' },
            { id: 'e', at: [points[end][0], points[end][1]], color: c.finish, label: 'F' },
          ]
        : [],
    [points, start, end, n, c],
  );

  const create = useMutation({
    mutationFn: () =>
      api<Segment>('/segments', { body: { activityId: id, startIndex: start, endIndex: end, name: name.trim() } }),
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
  const len = distanceParts(lengthM);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <JejakMap lines={lines} pins={pins} fit={fit} onPress={onPress} />
      <Sheet>
        <Segmented
          options={[
            { key: 'start', label: 'Titik awal (S)' },
            { key: 'end', label: 'Titik akhir (F)' },
          ]}
          value={which}
          onChange={setWhich}
        />
        <T v="small">
          Ketuk peta di dekat jalurmu untuk memindahkan {which === 'start' ? 'titik awal' : 'titik akhir'}, atau geser
          sedikit-sedikit.
        </T>
        <Row gap={0}>
          {[-20, -5, 5, 20].map((step) => (
            <ToolButton
              key={step}
              icon={step < 0 ? (step < -10 ? 'play-back' : 'caret-back') : step > 10 ? 'play-forward' : 'caret-forward'}
              label={step > 0 ? `+${step} titik` : `${step} titik`}
              onPress={() => set(which, idx + step)}
            />
          ))}
        </Row>
        <Row gap={space.lg}>
          <Stat label="Panjang" value={len.value} unit={len.unit} size={32} />
          <Stat label="Waktumu" value={duration(timeS)} size={32} />
        </Row>
        {lengthM < 100 ? (
          <T v="small" color={c.danger}>
            Segmen minimal 100 m.
          </T>
        ) : null}
        <Field
          icon="flag-outline"
          value={name}
          onChangeText={setName}
          placeholder="Nama segmen, mis. Tanjakan Gunung Gandul"
          maxLength={80}
        />
        {create.error ? <ErrorBox error={create.error} /> : null}
        <Button
          title="Buat segmen"
          icon="trophy"
          disabled={!name.trim() || lengthM < 100}
          loading={create.isPending}
          onPress={() => create.mutate()}
        />
      </Sheet>
    </View>
  );
}
