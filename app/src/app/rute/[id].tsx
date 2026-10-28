import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import type { PlannedRoute } from '@shared/api';

import JejakMap from '@/components/Map';
import { endPins } from '@/components/map-types';
import { Button, Card, ErrorBox, Loading, Row, Screen, Stat, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { distance, durationShort, TYPE_ICON, TYPE_LABEL, TYPE_SPEED } from '@/lib/format';
import { recorder, useRecorder } from '@/lib/recorder';
import { useColors } from '@/lib/theme';

export default function RouteDetailScreen() {
  const c = useColors();
  const me = useMe();
  const qc = useQueryClient();
  const rec = useRecorder();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const q = useQuery({ queryKey: ['route', id], queryFn: () => api<PlannedRoute>(`/routes/${id}`) });
  const del = useMutation({
    mutationFn: () => api(`/routes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['routes'] });
      router.back();
    },
  });

  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const r = q.data;
  const g = r.geometry;

  return (
    <Screen>
      <Stack.Screen options={{ title: r.name }} />
      <View style={{ height: 300, borderRadius: 12, overflow: 'hidden' }}>
        <JejakMap
          lines={[{ id: 'r', coords: g, color: c.route, width: 5 }]}
          pins={endPins(g)}
          fit={g}
        />
      </View>
      <T weight="800" size={22}>
        {r.name}
      </T>
      <Row gap={6}>
        <Ionicons name={TYPE_ICON[r.type]} size={15} color={c.muted} />
        <T muted>
          {TYPE_LABEL[r.type]} · dibuat {r.user.name}
        </T>
      </Row>
      <Card>
        <Row>
          <Stat label="Jarak" value={distance(r.distanceM)} />
          <Stat label="Perkiraan waktu" value={durationShort(r.distanceM / TYPE_SPEED[r.type])} />
          <Stat label="Belokan" value={String(r.steps.length)} />
        </Row>
      </Card>
      <Button
        title="Ikuti rute ini"
        icon="navigate"
        disabled={rec.status !== 'idle'}
        onPress={() => {
          recorder.setRoute(r);
          recorder.setType(r.type);
          router.navigate('/rekam');
        }}
      />
      {rec.status !== 'idle' ? (
        <T muted size={13}>
          Selesaikan rekaman yang sedang berjalan dulu.
        </T>
      ) : null}
      {r.steps.length > 0 ? (
        <Card>
          <T weight="800">Petunjuk arah</T>
          {r.steps.map((s, i) => (
            <Row key={i} style={{ paddingVertical: 4 }}>
              <T muted size={13} style={{ width: 64, fontVariant: ['tabular-nums'] }}>
                {distance(s.atM)}
              </T>
              <T style={{ flex: 1 }}>{s.text}</T>
            </Row>
          ))}
        </Card>
      ) : null}
      {r.user.id === me.id ? (
        <Button
          kind="ghost"
          title="Hapus rute"
          icon="trash-outline"
          loading={del.isPending}
          onPress={async () => {
            if (await confirm('Hapus rute', `Hapus “${r.name}”?`, 'Hapus')) del.mutate();
          }}
        />
      ) : null}
      {del.error ? <ErrorBox error={del.error} /> : null}
    </Screen>
  );
}
