import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ActivityType, PlannedRoute, RouteSummary } from '@shared/api';
import { flatten, toLatLon, type LatLon } from '@shared/geo';

import JejakMap from '@/components/Map';
import { DEFAULT_CENTER, endPins, type MapLine, type MapPin } from '@/components/map-types';
import GuideBanner from '@/components/GuideBanner';
import StaticMap from '@/components/StaticMap';
import { Button, ErrorBox, Field, IconButton, Row, Sheet, Stat, T, TypePicker, type IconName } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { defaultTitle, distance, distanceParts, duration, km, tempoParts, TYPE_LABEL } from '@/lib/format';
import { createGpsSource, currentPosition } from '@/lib/gps';
import { elapsedMs, FIRST_FIX_ACCURACY_M, recorder, useRecorder } from '@/lib/recorder';
import { createSimSource, loopAround } from '@/lib/sim';
import { font, glow, radius, shadow, space, useColors } from '@/lib/theme';

const SIM_SPEED: Record<ActivityType, number> = { run: 3.2, ride: 7, walk: 1.4 };

const SOURCE_TEXT = {
  'gps-bg': 'GPS aktif, tetap merekam saat layar mati',
  'gps-fg': 'GPS aktif. Biarkan layar menyala',
  sim: 'Simulasi GPS, 8× lebih cepat',
} as const;

export default function RecordScreen() {
  const c = useColors();
  const s = useRecorder();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ rute?: string }>();
  const [now, setNow] = useState(() => recorder.clock());
  const [sim, setSim] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [picking, setPicking] = useState(false);
  const [sheetH, setSheetH] = useState(0);

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
  const t = tempoParts(s.type, s.distanceM, elapsedS);
  const firstPoint = s.parts.find((p) => p.length > 0)?.[0];
  const titleGuess = defaultTitle(s.type, firstPoint?.[2] ?? now);

  const lines = useMemo(() => {
    const out: MapLine[] = [];
    if (s.route) out.push({ id: 'route', coords: s.route.geometry, color: c.route, width: 6 });
    s.parts.forEach((p, i) => {
      if (p.length > 1) out.push({ id: `part${i}`, coords: toLatLon(p), color: c.track, width: 5 });
    });
    return out;
  }, [s.route, s.parts, c]);

  const pins = useMemo<MapPin[]>(() => (s.route ? endPins(s.route.geometry) : []), [s.route]);
  const track = useMemo(() => toLatLon(flatten(s.parts)), [s.parts]);

  const fit = useMemo<LatLon[] | null>(() => {
    if (s.status === 'idle' && s.route) return s.route.geometry;
    return null;
  }, [s.status, s.route]);

  const save = () =>
    act(async () => {
      const a = await recorder.upload(title.trim() || titleGuess);
      setTitle('');
      for (const key of ['feed', 'userActivities', 'stats', 'user']) void qc.invalidateQueries({ queryKey: [key] });
      router.push(`/aktivitas/${a.id}`);
    });

  const active = s.status === 'recording' || s.status === 'paused';
  // Titik pertama ditahan sampai GPS cukup akurat (recorder.ts); beri tahu supaya jarak 0 tidak dikira macet.
  const waitingGps =
    s.status === 'recording' &&
    s.parts.every((p) => p.length === 0) &&
    s.accuracy != null &&
    s.accuracy > FIRST_FIX_ACCURACY_M;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {s.status === 'finished' ? null : (
        <JejakMap
          lines={lines}
          pins={pins}
          me={s.here}
          followMe={s.status === 'recording'}
          fit={fit}
          initialCenter={s.here ?? undefined}
          bottomInset={sheetH}
        />
      )}

      <TopOverlay
        sourceText={waitingGps ? 'Menunggu GPS akurat sebelum mencatat…' : s.sourceKind ? SOURCE_TEXT[s.sourceKind] : null}
        accuracy={s.sourceKind === 'sim' ? null : s.accuracy}
      />

      {s.status === 'finished' ? (
        <SaveView
          track={track}
          title={title}
          setTitle={setTitle}
          titleGuess={titleGuess}
          busy={busy}
          error={error}
          distanceM={s.distanceM}
          elapsedS={elapsedS}
          type={s.type}
          onSave={save}
          onResume={() => act(() => recorder.resume(makeSource))}
          onDiscard={async () => {
            if (await confirm('Buang rekaman', 'Rekaman ini akan dihapus dan tidak bisa dikembalikan.', 'Buang'))
              await recorder.discard();
          }}
        />
      ) : (
        <Sheet style={styles.sheet} aboveTabBar onHeight={setSheetH}>
          {error ? <ErrorBox error={new Error(error)} /> : null}

          {s.status === 'idle' ? (
            <>
              <TypePicker value={s.type} onChange={(ty) => recorder.setType(ty)} />
              <Pressable onPress={() => setPicking(true)} style={[styles.routeRow, { backgroundColor: c.surface2 }]}>
                <View style={[styles.routeIcon, { backgroundColor: s.route ? c.route : c.surface }]}>
                  <Ionicons name="navigate" size={16} color={s.route ? '#fff' : c.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <T v="label">Rute</T>
                  <T v="strong" numberOfLines={1}>
                    {s.route ? `${s.route.name}, ${distance(s.route.distanceM)}` : 'Bebas, tanpa rute'}
                  </T>
                </View>
                <Ionicons name="chevron-down" size={18} color={c.muted} />
              </Pressable>
              {__DEV__ ? (
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="small">Simulasi GPS (mode uji)</T>
                  <Switch value={sim} onValueChange={setSim} trackColor={{ true: c.accentText }} />
                </Row>
              ) : null}
              <View style={{ alignItems: 'center', paddingTop: space.xs }}>
                <RoundButton
                  size={86}
                  icon="play"
                  bg={c.accent}
                  color={c.accentInk}
                  label={`Mulai ${TYPE_LABEL[s.type].toLowerCase()}`}
                  disabled={busy}
                  onPress={() => act(() => recorder.start(makeSource))}
                />
              </View>
            </>
          ) : null}

          {active ? (
            <>
              <View style={{ alignItems: 'center' }}>
                <T v="label">{s.status === 'paused' ? 'Dijeda' : 'Waktu'}</T>
                <Text style={[styles.clock, { color: s.status === 'paused' ? c.muted : c.text }]}>{duration(elapsedS)}</Text>
              </View>
              <Row style={{ justifyContent: 'space-around' }}>
                <Stat align="center" label="Jarak" value={km(s.distanceM)} unit="km" size={40} />
                <View style={[styles.vr, { backgroundColor: c.line }]} />
                <Stat align="center" label={t.label} value={t.value} unit={t.unit} size={40} />
              </Row>
              <Row style={{ justifyContent: 'center', gap: space.xl, paddingTop: space.xs }}>
                {s.status === 'recording' ? (
                  <RoundButton
                    size={76}
                    icon="pause"
                    bg={c.surface2}
                    color={c.text}
                    label="Jeda"
                    disabled={busy}
                    onPress={() => act(recorder.pause)}
                  />
                ) : (
                  <>
                    <RoundButton
                      size={76}
                      icon="play"
                      bg={c.accent}
                      color={c.accentInk}
                      label="Lanjut"
                      disabled={busy}
                      onPress={() => act(() => recorder.resume(makeSource))}
                    />
                    <RoundButton
                      size={76}
                      icon="flag"
                      bg={c.track}
                      color="#fff"
                      label="Tahan untuk selesai"
                      hold
                      disabled={busy}
                      onPress={() => act(recorder.finish)}
                    />
                  </>
                )}
              </Row>
            </>
          ) : null}
        </Sheet>
      )}

      <RoutePicker visible={picking} onClose={() => setPicking(false)} />
    </View>
  );
}

function RoundButton({
  icon,
  label,
  onPress,
  bg,
  color,
  size,
  disabled,
  hold,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  bg: string;
  color: string;
  size: number;
  disabled?: boolean;
  /** Harus ditekan-tahan (untuk aksi yang tidak bisa dibatalkan, seperti Selesai). */
  hold?: boolean;
}) {
  const c = useColors();
  const [hint, setHint] = useState(false);
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(false), 2500);
    return () => clearTimeout(t);
  }, [hint]);
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Pressable
        onPress={hold ? () => setHint(true) : onPress}
        onLongPress={hold ? onPress : undefined}
        delayLongPress={600}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
          },
          bg === c.surface2 ? { borderWidth: 1, borderColor: c.line } : glow(bg, 0.7),
          { opacity: disabled ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
        ]}>
        <Ionicons
          name={icon}
          size={size * 0.42}
          color={color}
          style={icon === 'play' ? { marginLeft: size * 0.05 } : undefined}
        />
      </Pressable>
      <T v="strong" size={14} color={hint ? c.danger : undefined}>
        {hint ? 'Tekan lebih lama' : label}
      </T>
    </View>
  );
}

/** Status GPS + banner pemandu rute di atas peta. */
function TopOverlay({ sourceText, accuracy }: { sourceText: string | null; accuracy: number | null }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const s = useRecorder();
  const g = s.guide;
  const showGuide = !!s.route && !!g && s.status !== 'finished';
  const goodGps = accuracy == null || accuracy <= 20;

  return (
    <View style={[styles.top, { top: insets.top + space.sm }]} pointerEvents="box-none">
      {sourceText && s.status !== 'finished' ? (
        <View style={[styles.pill, { backgroundColor: c.surface, borderColor: c.line }, shadow(c)]}>
          <View style={[styles.dot, { backgroundColor: goodGps ? c.start : c.gold }]} />
          <T v="small" color={c.text}>
            {sourceText}
            {accuracy != null ? ` (±${Math.round(accuracy)} m)` : ''}
          </T>
        </View>
      ) : null}

      {showGuide && s.status === 'idle' ? (
        <GuideBanner
          icon="navigate"
          title={s.route!.name}
          sub={`${g!.offRoute ? `Titik terdekat rute ${distance(g!.offM)} dari sini` : 'Kamu sudah di rute'}. Total ${distance(s.route!.distanceM)}`}
        />
      ) : null}

      {showGuide && s.status !== 'idle' && g!.offRoute ? (
        <GuideBanner
          tone="danger"
          icon="warning"
          title="Keluar dari rute"
          sub={`${distance(g!.offM)} dari garis rute, sisa ${distance(g!.remainingM)}`}
        />
      ) : null}

      {showGuide && s.status !== 'idle' && !g!.offRoute ? (
        <GuideBanner
          icon={turnIcon(g!.next?.text)}
          big={g!.next ? distance(g!.next.inM) : undefined}
          title={g!.next ? g!.next.text : 'Ikuti garis rute'}
          sub={`Sisa ${distance(g!.remainingM)}`}
        />
      ) : null}
    </View>
  );
}

function turnIcon(text?: string): IconName {
  if (!text) return 'arrow-up';
  if (text.startsWith('Sampai')) return 'flag';
  if (text.includes('bundaran') || text.startsWith('Putar')) return 'refresh';
  if (text.includes('kiri')) return 'arrow-back';
  if (text.includes('kanan')) return 'arrow-forward';
  return 'arrow-up';
}

function SaveView(p: {
  track: LatLon[];
  title: string;
  setTitle: (t: string) => void;
  titleGuess: string;
  busy: boolean;
  error: string | null;
  distanceM: number;
  elapsedS: number;
  type: ActivityType;
  onSave: () => void;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const insets = useSafeAreaInsets();
  const t = tempoParts(p.type, p.distanceM, p.elapsedS);
  const d = distanceParts(p.distanceM);
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.xl, gap: space.lg }}
      keyboardShouldPersistTaps="handled">
      <View>
        <T v="label">Selesai</T>
        <T v="h1">Simpan aktivitas</T>
      </View>
      <StaticMap points={p.track} height={220} />
      <Row gap={space.lg}>
        <Stat label="Jarak" value={d.value} unit={d.unit} size={32} />
        <Stat label="Waktu" value={duration(p.elapsedS)} size={32} />
        <Stat label={t.label} value={t.value} unit={t.unit} size={32} />
      </Row>
      <Field label="Judul" value={p.title} onChangeText={p.setTitle} placeholder={p.titleGuess} maxLength={100} />
      {p.error ? <ErrorBox error={new Error(p.error)} /> : null}
      <Button title="Simpan aktivitas" icon="checkmark" loading={p.busy} onPress={p.onSave} />
      <Row>
        <Button style={{ flex: 1 }} kind="soft" icon="play" title="Lanjutkan" onPress={p.onResume} />
        <Button style={{ flex: 1 }} kind="ghost" icon="trash-outline" title="Buang" onPress={p.onDiscard} />
      </Row>
    </ScrollView>
  );
}

function RoutePicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const q = useQuery({ queryKey: ['routes'], queryFn: () => api<RouteSummary[]>('/routes'), enabled: visible });
  const [loading, setLoading] = useState<number | null>(null);
  const current = useRecorder().route;
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
      <Pressable style={[styles.backdrop, { backgroundColor: c.overlay }]} onPress={onClose} />
      <View style={[styles.picker, { backgroundColor: c.surface, paddingBottom: insets.bottom + space.lg }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="h2">Pilih rute</T>
          <IconButton icon="close" label="Tutup" onPress={onClose} size={36} />
        </Row>
        <ScrollView contentContainerStyle={{ gap: space.sm }}>
          <PickRow icon="shuffle" title="Bebas, tanpa rute" active={!current} onPress={() => pick(null)} />
          {q.error ? <ErrorBox error={q.error} /> : null}
          {(q.data ?? []).map((r) => (
            <PickRow
              key={r.id}
              preview={r.preview}
              title={r.name}
              subtitle={`${TYPE_LABEL[r.type]}, ${distance(r.distanceM)}`}
              active={current?.id === r.id}
              loading={loading === r.id}
              onPress={() => pick(r.id)}
            />
          ))}
          {q.data?.length === 0 ? (
            <T muted center style={{ padding: space.lg }}>
              Belum ada rute. Buat dulu di tab Rute.
            </T>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function PickRow({
  icon,
  preview,
  title,
  subtitle,
  active,
  loading,
  onPress,
}: {
  icon?: IconName;
  preview?: LatLon[];
  title: string;
  subtitle?: string;
  active?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.pickRow,
        {
          backgroundColor: active ? c.accent + '33' : c.surface2,
          borderColor: active ? c.accentText : 'transparent',
          opacity: pressed || loading ? 0.7 : 1,
        },
      ]}>
      {preview ? (
        <View style={{ width: 64 }}>
          <StaticMap points={preview} height={48} radius={10} color={c.route} />
        </View>
      ) : (
        <View style={[styles.pickIcon, { backgroundColor: c.surface }]}>
          <Ionicons name={icon ?? 'map'} size={20} color={c.text} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <T v="strong" numberOfLines={1}>
          {title}
        </T>
        {subtitle ? <T v="small">{subtitle}</T> : null}
      </View>
      {active ? <Ionicons name="checkmark-circle" size={22} color={c.accentText} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  top: { position: 'absolute', left: space.md, right: space.md, gap: space.sm, alignItems: 'stretch' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  clock: { fontFamily: font.numBold, fontSize: 72, lineHeight: 76, fontVariant: ['tabular-nums'] },
  vr: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.md, padding: space.md },
  routeIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1 },
  picker: { maxHeight: '75%', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.lg, gap: space.md },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.md,
    padding: space.sm,
    paddingRight: space.md,
    borderWidth: 1.5,
  },
  pickIcon: { width: 64, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
