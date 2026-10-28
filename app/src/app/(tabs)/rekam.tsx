import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ActivityType, PlannedRoute, RouteSummary } from '@shared/api';
import { flatten, toLatLon, type LatLon } from '@shared/geo';

import JejakMap from '@/components/Map';
import { DEFAULT_CENTER, endPins, type MapLine, type MapPin } from '@/components/map-types';
import { Button, Card, ErrorBox, Field, Row, Stat, T, TypePicker } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { defaultTitle, distance, duration, km, tempo, TYPE_LABEL } from '@/lib/format';
import { createGpsSource, currentPosition } from '@/lib/gps';
import { elapsedMs, recorder, useRecorder } from '@/lib/recorder';
import { createSimSource, loopAround } from '@/lib/sim';
import { radius, space, useColors } from '@/lib/theme';

const SIM_SPEED: Record<ActivityType, number> = { run: 3.2, ride: 7, walk: 1.4 };

const SOURCE_TEXT = {
  'gps-bg': 'GPS aktif, tetap merekam saat layar mati',
  'gps-fg': 'GPS aktif · biarkan layar menyala (Expo Go belum bisa merekam di latar)',
  sim: 'Simulasi GPS (mode uji, 8× lebih cepat)',
} as const;

export default function RecordScreen() {
  const c = useColors();
  const s = useRecorder();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ rute?: string }>();
  const [now, setNow] = useState(() => recorder.clock());
  const [sim, setSim] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [picking, setPicking] = useState(false);

  // Stopwatch berdetak hanya saat merekam.
  useEffect(() => {
    if (s.status !== 'recording') return;
    const id = setInterval(() => setNow(recorder.clock()), 250);
    return () => clearInterval(id);
  }, [s.status]);

  useEffect(() => {
    if (s.status === 'idle' && !s.here) void currentPosition().then((p) => p && recorder.setHere(p));
  }, [s.status, s.here]);

  // Rute dari tombol "Ikuti rute ini".
  const routeId = params.rute ? Number(params.rute) : null;
  const routeQ = useQuery({
    queryKey: ['route', routeId],
    queryFn: () => api<PlannedRoute>(`/routes/${routeId}`),
    enabled: routeId != null,
  });
  useEffect(() => {
    if (routeQ.data && recorder.getState().status === 'idle') {
      recorder.setRoute(routeQ.data);
      recorder.setType(routeQ.data.type);
    }
  }, [routeQ.data]);

  const makeSource = async () => {
    const st = recorder.getState();
    if (!sim) return createGpsSource();
    const path = st.route ? st.route.geometry : loopAround(st.here ?? DEFAULT_CENTER);
    return createSimSource(path, SIM_SPEED[st.type]);
  };

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const elapsedS = elapsedMs(s, now) / 1000;
  const t = tempo(s.type, s.distanceM, elapsedS);
  const firstPoint = s.parts.find((p) => p.length > 0)?.[0];
  const titleGuess = defaultTitle(s.type, firstPoint?.[2] ?? now);

  const lines = useMemo(() => {
    const out: MapLine[] = [];
    if (s.route) out.push({ id: 'route', coords: s.route.geometry, color: c.route, width: 6 });
    s.parts.forEach((p, i) => {
      if (p.length > 1) out.push({ id: `part${i}`, coords: toLatLon(p), color: c.primary, width: 5 });
    });
    return out;
  }, [s.route, s.parts, c]);

  const pins = useMemo<MapPin[]>(() => (s.route ? endPins(s.route.geometry) : []), [s.route]);

  const fit = useMemo<LatLon[] | null>(() => {
    if (s.status === 'finished') return toLatLon(flatten(s.parts));
    if (s.status === 'idle' && s.route) return s.route.geometry;
    return null;
  }, [s.status, s.route, s.parts]);

  const save = () =>
    act(async () => {
      const a = await recorder.upload(title.trim() || titleGuess);
      setTitle('');
      void qc.invalidateQueries({ queryKey: ['feed'] });
      void qc.invalidateQueries({ queryKey: ['userActivities'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      void qc.invalidateQueries({ queryKey: ['user'] });
      router.push(`/aktivitas/${a.id}`);
    });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <JejakMap
        lines={lines}
        pins={pins}
        me={s.status === 'finished' ? null : s.here}
        followMe={s.status === 'recording'}
        fit={fit}
        initialCenter={s.here ?? undefined}
      />

      <View style={[styles.top, { top: insets.top + space.sm }]} pointerEvents="box-none">
        <GuideBanner />
      </View>

      <View style={[styles.panel, { backgroundColor: c.card, paddingBottom: space.lg }]}>
        {error ? <ErrorBox error={new Error(error)} /> : null}

        {s.status === 'idle' ? (
          <>
            <TypePicker value={s.type} onChange={(t) => recorder.setType(t)} />
            <Pressable onPress={() => setPicking(true)} style={[styles.routeRow, { borderColor: c.border }]}>
              <Ionicons name="map-outline" size={18} color={s.route ? c.route : c.muted} />
              <T style={{ flex: 1 }} numberOfLines={1}>
                {s.route ? `${s.route.name} · ${distance(s.route.distanceM)}` : 'Tanpa rute (bebas)'}
              </T>
              <Ionicons name="chevron-down" size={18} color={c.muted} />
            </Pressable>
            {__DEV__ ? (
              <Row style={{ justifyContent: 'space-between' }}>
                <T muted size={13}>
                  Simulasi GPS (mode uji)
                </T>
                <Switch value={sim} onValueChange={setSim} trackColor={{ true: c.primary }} />
              </Row>
            ) : null}
            <Button title={`Mulai ${TYPE_LABEL[s.type].toLowerCase()}`} icon="play" loading={busy} onPress={() => act(() => recorder.start(makeSource))} />
          </>
        ) : null}

        {s.status === 'recording' || s.status === 'paused' ? (
          <>
            <Row>
              <Stat big label="Waktu" value={duration(elapsedS)} />
              <Stat big label="Jarak (km)" value={km(s.distanceM)} />
            </Row>
            <Row>
              <Stat label={t.label} value={t.value} />
              <Stat label="Status" value={s.status === 'paused' ? 'Jeda' : 'Merekam'} />
            </Row>
            <T muted size={12}>
              {s.sourceKind ? SOURCE_TEXT[s.sourceKind] : 'GPS belum aktif'}
              {s.accuracy != null && s.sourceKind !== 'sim' ? ` · akurasi ±${Math.round(s.accuracy)} m` : ''}
            </T>
            {s.status === 'recording' ? (
              <Button kind="secondary" title="Jeda" icon="pause" loading={busy} onPress={() => act(recorder.pause)} />
            ) : (
              <Row>
                <Button style={{ flex: 1 }} title="Lanjut" icon="play" loading={busy} onPress={() => act(() => recorder.resume(makeSource))} />
                <Button style={{ flex: 1 }} kind="danger" title="Selesai" icon="flag" loading={busy} onPress={() => act(recorder.finish)} />
              </Row>
            )}
          </>
        ) : null}

        {s.status === 'finished' ? (
          <>
            <T weight="800" size={18}>
              Simpan aktivitas
            </T>
            <Row>
              <Stat label="Jarak" value={distance(s.distanceM)} />
              <Stat label="Waktu" value={duration(elapsedS)} />
              <Stat label={t.label} value={t.value} />
            </Row>
            <Field
              value={title}
              onChangeText={setTitle}
              placeholder={titleGuess}
              maxLength={100}
            />
            <Button title="Simpan" icon="cloud-upload-outline" loading={busy} onPress={save} />
            <Row>
              <Button style={{ flex: 1 }} small kind="secondary" title="Lanjut rekam" onPress={() => act(() => recorder.resume(makeSource))} />
              <Button
                style={{ flex: 1 }}
                small
                kind="ghost"
                title="Buang"
                onPress={async () => {
                  if (await confirm('Buang rekaman', 'Rekaman ini akan dihapus dan tidak bisa dikembalikan.', 'Buang')) await recorder.discard();
                }}
              />
            </Row>
          </>
        ) : null}
      </View>

      <RoutePicker visible={picking} onClose={() => setPicking(false)} />
    </View>
  );
}

function GuideBanner() {
  const c = useColors();
  const s = useRecorder();
  if (!s.route || !s.guide || s.status === 'finished') return null;
  const g = s.guide;
  if (s.status === 'idle') {
    return (
      <Card style={styles.banner}>
        <T weight="700">{s.route.name}</T>
        <T muted size={13}>
          {g.offRoute ? `Titik terdekat rute ${distance(g.offM)} dari sini` : 'Kamu sudah di rute'} · total {distance(s.route.distanceM)}
        </T>
      </Card>
    );
  }
  if (g.offRoute) {
    return (
      <Card style={[styles.banner, { backgroundColor: c.danger, borderColor: c.danger }]}>
        <Row>
          <Ionicons name="warning" size={22} color="#fff" />
          <View style={{ flex: 1 }}>
            <T weight="800" style={{ color: '#fff' }}>
              Keluar dari rute
            </T>
            <T size={13} style={{ color: '#fff' }}>
              {distance(g.offM)} dari garis rute · sisa {distance(g.remainingM)}
            </T>
          </View>
        </Row>
      </Card>
    );
  }
  return (
    <Card style={[styles.banner, { backgroundColor: c.route, borderColor: c.route }]}>
      <Row>
        <Ionicons name={turnIcon(g.next?.text)} size={26} color="#fff" />
        <View style={{ flex: 1 }}>
          <T weight="800" size={16} style={{ color: '#fff' }} numberOfLines={2}>
            {g.next ? g.next.text : 'Ikuti garis rute'}
          </T>
          <T size={13} style={{ color: '#fff' }}>
            {g.next ? `dalam ${distance(g.next.inM)} · ` : ''}sisa {distance(g.remainingM)}
          </T>
        </View>
      </Row>
    </Card>
  );
}

function turnIcon(text?: string): 'arrow-back' | 'arrow-forward' | 'arrow-up' | 'refresh' | 'flag' {
  if (!text) return 'arrow-up';
  if (text.startsWith('Sampai')) return 'flag';
  if (text.includes('bundaran') || text.startsWith('Putar')) return 'refresh';
  if (text.includes('kiri')) return 'arrow-back';
  if (text.includes('kanan')) return 'arrow-forward';
  return 'arrow-up';
}

function RoutePicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useColors();
  const q = useQuery({ queryKey: ['routes'], queryFn: () => api<RouteSummary[]>('/routes'), enabled: visible });
  const [loading, setLoading] = useState<number | null>(null);
  const pick = async (id: number | null) => {
    if (id == null) {
      recorder.setRoute(null);
      onClose();
      return;
    }
    setLoading(id);
    try {
      const r = await api<PlannedRoute>(`/routes/${id}`);
      recorder.setRoute(r);
      recorder.setType(r.type);
      onClose();
    } finally {
      setLoading(null);
    }
  };
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: c.card }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T weight="800" size={18}>
            Pilih rute
          </T>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={c.text} />
          </Pressable>
        </Row>
        <ScrollView contentContainerStyle={{ gap: space.sm }}>
          <Button kind="secondary" title="Tanpa rute (bebas)" onPress={() => pick(null)} />
          {q.error ? <ErrorBox error={q.error} /> : null}
          {(q.data ?? []).map((r) => (
            <Button
              key={r.id}
              kind="ghost"
              icon="map-outline"
              title={`${r.name} · ${distance(r.distanceM)}`}
              loading={loading === r.id}
              onPress={() => pick(r.id)}
            />
          ))}
          {q.data?.length === 0 ? (
            <T muted style={{ textAlign: 'center' }}>
              Belum ada rute. Buat dulu di tab Rute.
            </T>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: space.md, right: space.md },
  banner: { padding: space.md, gap: 2 },
  panel: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
});
