import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Switch, Text, View } from 'react-native';

import type { ActivityType, PlannedRoute, RoutingResult } from '@shared/api';
import { pathDistance, type LatLon } from '@shared/geo';

import JejakMap from '@/components/Map';
import type { MapLine, MapPin } from '@/components/map-types';
import { Button, ErrorBox, Field, Row, Sheet, Stat, T, ToolButton, TypePicker } from '@/components/ui';
import { api } from '@/lib/api';
import { distanceParts, durationShort, TYPE_SPEED } from '@/lib/format';
import { currentPosition } from '@/lib/gps';
import { font, space, useColors } from '@/lib/theme';

export default function RouteBuilderScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const [type, setType] = useState<ActivityType>('run');
  const [snap, setSnap] = useState(true);
  const [waypoints, setWaypoints] = useState<LatLon[]>([]);
  const [snapped, setSnapped] = useState<{ key: string; plan: RoutingResult } | null>(null);
  const [name, setName] = useState('');
  const [here, setHere] = useState<LatLon | null>(null);

  useEffect(() => {
    void currentPosition().then(setHere);
  }, []);

  const key = JSON.stringify([type, waypoints]);
  const straight = useMemo<RoutingResult | null>(
    () => (waypoints.length >= 2 ? { geometry: waypoints, distanceM: pathDistance(waypoints), steps: [], snapped: false } : null),
    [waypoints],
  );

  // Minta rute yang mengikuti jalan setiap titik berubah (ditunda sebentar supaya ketukan beruntun tidak membanjiri server).
  useEffect(() => {
    if (!snap || !straight) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const plan = await api<RoutingResult>('/routing', { body: { type, waypoints } }).catch(() => straight);
      if (!cancelled) setSnapped({ key, plan });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, snap, straight, type, waypoints]);

  const planning = snap && straight != null && snapped?.key !== key;
  // Selama menunggu server, tetap tampilkan rute sebelumnya supaya garis tidak berkedip.
  const plan = !straight ? null : !snap ? straight : snapped?.key === key ? snapped.plan : (snapped?.plan ?? straight);

  const saveRoute = useMutation({
    mutationFn: () =>
      api<PlannedRoute>('/routes', {
        body: { name: name.trim(), type, waypoints, geometry: plan!.geometry, steps: plan!.steps },
      }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['routes'] });
      router.replace(`/rute/${r.id}`);
    },
  });

  const lines = useMemo<MapLine[]>(
    () => (plan ? [{ id: 'plan', coords: plan.geometry, color: c.route, width: 5, dashed: !plan.snapped }] : []),
    [plan, c.route],
  );
  const pins = useMemo<MapPin[]>(
    () =>
      waypoints.map((w, i) => ({
        id: `w${i}`,
        at: w,
        color: i === 0 ? c.start : i === waypoints.length - 1 ? c.finish : c.route,
        label: String(i + 1),
      })),
    [waypoints, c],
  );

  const fitHere = useMemo(() => (here ? [here] : null), [here]);
  const add = (p: LatLon) => setWaypoints((w) => (w.length >= 50 ? w : [...w, p]));
  const d = plan?.distanceM ?? 0;
  const dist = distanceParts(d);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <JejakMap lines={lines} pins={pins} me={here} initialCenter={here ?? undefined} fit={fitHere} onPress={add} />
      <View style={[styles.hint, { backgroundColor: c.slab }]} pointerEvents="none">
        <Ionicons name={planning ? 'sync' : 'hand-left-outline'} size={14} color="#C6F03C" />
        <Text style={styles.hintText}>
          {waypoints.length === 0
            ? 'Ketuk peta untuk titik awal'
            : waypoints.length === 1
              ? 'Ketuk lagi untuk titik berikutnya'
              : planning
                ? 'Menghitung rute…'
                : plan && !plan.snapped && snap
                  ? 'Layanan rute tidak tersedia, pakai garis lurus'
                  : `${waypoints.length} titik · ketuk untuk menambah`}
        </Text>
      </View>
      <Sheet>
        <TypePicker value={type} onChange={setType} />
        <Row gap={space.lg}>
          <Stat label="Jarak" value={dist.value} unit={dist.unit} size={34} />
          <Stat label="Perkiraan" value={d > 0 ? durationShort(d / TYPE_SPEED[type]) : '–'} size={34} />
        </Row>
        <Row gap={0}>
          <ToolButton
            icon="arrow-undo"
            label="Batal"
            disabled={waypoints.length === 0}
            onPress={() => setWaypoints((w) => w.slice(0, -1))}
          />
          <ToolButton
            icon="repeat"
            label="Pergi-pulang"
            disabled={waypoints.length < 2}
            onPress={() => setWaypoints((w) => (w.length >= 2 ? [...w, ...w.slice(0, -1).reverse()].slice(0, 50) : w))}
          />
          <ToolButton
            icon="sync"
            label="Ke awal"
            disabled={waypoints.length < 2}
            onPress={() => setWaypoints((w) => (w.length >= 2 ? [...w, w[0]].slice(0, 50) : w))}
          />
          <ToolButton
            icon="trash-outline"
            label="Hapus"
            color={c.danger}
            disabled={waypoints.length === 0}
            onPress={() => setWaypoints([])}
          />
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="small">Ikuti jalan (OpenStreetMap)</T>
          <Switch value={snap} onValueChange={setSnap} trackColor={{ true: c.accentText }} />
        </Row>
        <Field
          icon="bookmark-outline"
          value={name}
          onChangeText={setName}
          placeholder="Nama rute, mis. Keliling Waduk"
          maxLength={80}
        />
        {saveRoute.error ? <ErrorBox error={saveRoute.error} /> : null}
        <Button
          title="Simpan rute"
          icon="checkmark"
          disabled={!plan || planning || !name.trim()}
          loading={saveRoute.isPending}
          onPress={() => saveRoute.mutate()}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    position: 'absolute',
    top: space.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  hintText: { color: '#fff', fontFamily: font.semibold, fontSize: 13 },
});
