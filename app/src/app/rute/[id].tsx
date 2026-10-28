import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { PlannedRoute } from '@shared/api';

import JejakMap from '@/components/Map';
import { endPins } from '@/components/map-types';
import { Button, Card, ErrorBox, Loading, Row, Screen, SectionTitle, Stat, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { distance, distanceParts, durationShort, TYPE_ICON, TYPE_LABEL, TYPE_SPEED } from '@/lib/format';
import { recorder, useRecorder } from '@/lib/recorder';
import { radius, space, useColors } from '@/lib/theme';

function stepIcon(text: string): keyof typeof Ionicons.glyphMap {
  if (text.startsWith('Sampai')) return 'flag';
  if (text.includes('bundaran') || text.startsWith('Putar')) return 'refresh';
  if (text.includes('kiri')) return 'arrow-back';
  if (text.includes('kanan')) return 'arrow-forward';
  return 'arrow-up';
}

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
  const d = distanceParts(r.distanceM);

  return (
    <Screen padded={false}>
      <View style={{ height: 300 }}>
        <JejakMap lines={[{ id: 'r', coords: g, color: c.route, width: 5 }]} pins={endPins(g)} fit={g} />
      </View>
      <View style={[styles.body, { backgroundColor: c.bg }]}>
        <View style={{ gap: 4 }}>
          <Row gap={6}>
            <Ionicons name={TYPE_ICON[r.type]} size={14} color={c.muted} />
            <T v="label">Rute {TYPE_LABEL[r.type].toLowerCase()}</T>
          </Row>
          <T v="h1">{r.name}</T>
          <T v="small">Dibuat {r.user.name}</T>
        </View>

        <Row gap={space.lg}>
          <Stat label="Jarak" value={d.value} unit={d.unit} size={32} />
          <Stat label="Perkiraan" value={durationShort(r.distanceM / TYPE_SPEED[r.type])} size={32} />
          <Stat label="Belokan" value={String(r.steps.length)} size={32} />
        </Row>

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
          <T v="small" center>
            Selesaikan rekaman yang sedang berjalan dulu.
          </T>
        ) : null}

        {r.steps.length > 0 ? (
          <>
            <SectionTitle>Petunjuk arah</SectionTitle>
            <Card style={{ gap: 0, paddingVertical: space.sm }}>
              {r.steps.map((s, i) => (
                <Row
                  key={i}
                  style={[styles.step, { borderTopColor: c.line, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth }]}>
                  <View style={[styles.stepIcon, { backgroundColor: s.text.startsWith('Sampai') ? c.finish : c.surface2 }]}>
                    <Ionicons name={stepIcon(s.text)} size={16} color={s.text.startsWith('Sampai') ? '#fff' : c.text} />
                  </View>
                  <T v="strong" style={{ flex: 1 }}>
                    {s.text}
                  </T>
                  <T v="num" size={18} muted>
                    {distance(s.atM)}
                  </T>
                </Row>
              ))}
            </Card>
          </>
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
  step: { paddingVertical: 10 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
