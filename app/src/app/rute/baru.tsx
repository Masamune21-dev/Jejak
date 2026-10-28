import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import type { ActivityType, PlannedRoute, RoutingResult } from '@shared/api';
import { pathDistance, type LatLon } from '@shared/geo';

import JejakMap from '@/components/Map';
import type { MapLine, MapPin } from '@/components/map-types';
import { Button, ErrorBox, Field, IconButton, Row, Stat, T, TypePicker } from '@/components/ui';
import { api } from '@/lib/api';
import { distance, durationShort, TYPE_SPEED } from '@/lib/format';
import { currentPosition } from '@/lib/gps';
import { radius, space, useColors } from '@/lib/theme';

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
        color: i === 0 ? '#22A45D' : i === waypoints.length - 1 ? '#D93B30' : c.route,
        label: String(i + 1),
      })),
    [waypoints, c.route],
  );

  const fitHere = useMemo(() => (here ? [here] : null), [here]);
  const add = (p: LatLon) => setWaypoints((w) => (w.length >= 50 ? w : [...w, p]));
  const d = plan?.distanceM ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <JejakMap lines={lines} pins={pins} me={here} initialCenter={here ?? undefined} fit={fitHere} onPress={add} />
      <View style={[styles.hint, { backgroundColor: c.card }]} pointerEvents="none">
        <T size={13}>
          {waypoints.length === 0
            ? 'Ketuk peta untuk titik awal'
            : waypoints.length === 1
              ? 'Ketuk lagi untuk titik berikutnya'
              : planning
                ? 'Menghitung rute…'
                : plan && !plan.snapped && snap
                  ? 'Layanan rute tidak tersedia, pakai garis lurus'
                  : 'Ketuk untuk menambah titik'}
        </T>
      </View>
      <View style={[styles.panel, { backgroundColor: c.card }]}>
        <TypePicker value={type} onChange={setType} />
        <Row style={{ justifyContent: 'space-between' }}>
          <Stat label="Jarak" value={distance(d)} />
          <Stat label="Perkiraan" value={d > 0 ? durationShort(d / TYPE_SPEED[type]) : '–'} />
          <Row gap={4}>
            <IconButton icon="arrow-undo" label="Batalkan titik terakhir" onPress={() => setWaypoints((w) => w.slice(0, -1))} />
            <IconButton
              icon="repeat"
              label="Pulang-pergi"
              onPress={() => setWaypoints((w) => (w.length >= 2 ? [...w, ...w.slice(0, -1).reverse()].slice(0, 50) : w))}
            />
            <IconButton
              icon="sync"
              label="Kembali ke titik awal"
              onPress={() => setWaypoints((w) => (w.length >= 2 ? [...w, w[0]].slice(0, 50) : w))}
            />
            <IconButton icon="trash-outline" label="Hapus semua" color={c.danger} onPress={() => setWaypoints([])} />
          </Row>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <T muted size={13}>
            Ikuti jalan (OpenStreetMap)
          </T>
          <Switch value={snap} onValueChange={setSnap} trackColor={{ true: c.primary }} />
        </Row>
        <Field value={name} onChangeText={setName} placeholder="Nama rute, mis. Keliling Waduk" maxLength={80} />
        {saveRoute.error ? <ErrorBox error={saveRoute.error} /> : null}
        <Button
          title="Simpan rute"
          icon="save-outline"
          disabled={!plan || planning || !name.trim()}
          loading={saveRoute.isPending}
          onPress={() => saveRoute.mutate()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    position: 'absolute',
    top: space.md,
    alignSelf: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
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
});
