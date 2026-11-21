import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import type { ActivityType, TrackPoint } from '@shared/api';
import { haversine } from '@shared/geo';

import { Button, Card, ErrorBox, Field, Row, Screen, SectionTitle, T, TypePicker } from '@/components/ui';
import { useMe } from '@/lib/auth';
import { notice } from '@/lib/confirm';
import { defaultTitle, distance, duration } from '@/lib/format';
import { parseFit, parseGpx, type ImportedTrack } from '@/lib/import-track';
import { newClientId, uploadDraft } from '@/lib/upload-queue';
import { space, useColors } from '@/lib/theme';

const TYPE_HINT: Record<ActivityType, string> = {
  run: 'Lari',
  ride: 'Bersepeda',
  walk: 'Jalan kaki',
};

async function readTrack(asset: DocumentPickerAsset, kind: 'gpx' | 'fit'): Promise<ImportedTrack> {
  if (Platform.OS === 'web' && asset.file) {
    return kind === 'fit' ? parseFit(new Uint8Array(await asset.file.arrayBuffer())) : parseGpx(await asset.file.text());
  }
  // Impor dinamis: expo-file-system tidak dipakai di web.
  const { File } = await import('expo-file-system');
  const file = new File(asset.uri);
  return kind === 'fit' ? parseFit(await file.bytes()) : parseGpx(await file.text());
}

/** Impor aktivitas dari berkas GPX/FIT jam GPS, lalu unggah seperti rekaman biasa. */
export default function ImportScreen() {
  const c = useColors();
  const me = useMe();
  const qc = useQueryClient();
  const [track, setTrack] = useState<TrackPoint[][] | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ActivityType>('run');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    if (!track) return null;
    const points = track.flat();
    let distanceM = 0;
    let movingS = 0;
    for (const part of track) {
      for (let i = 1; i < part.length; i++) {
        distanceM += haversine([part[i - 1][0], part[i - 1][1]], [part[i][0], part[i][1]]);
        const gap = (part[i][2] - part[i - 1][2]) / 1000;
        if (gap > 0 && gap <= 120) movingS += gap;
      }
    }
    return { points: points.length, distanceM, movingS, start: points[0]?.[2] ?? 0 };
  }, [track]);

  const pick = async () => {
    setError(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: '*/*' });
      if (res.canceled) return;
      const asset = res.assets[0];
      const kind = asset.name.toLowerCase().split('.').pop();
      if (kind !== 'gpx' && kind !== 'fit') throw new Error('Pilih berkas .gpx atau .fit.');
      const parsed = await readTrack(asset, kind);
      setTrack(parsed.track);
      setFileName(asset.name);
      setTitle(parsed.name ?? asset.name.replace(/\.(gpx|fit)$/i, ''));
      if (parsed.type) setType(parsed.type);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Berkas tidak bisa dibaca');
    }
  };

  const save = async () => {
    if (!track || !stats) return;
    setBusy(true);
    setError(null);
    try {
      const res = await uploadDraft({
        userId: me.id,
        clientId: newClientId(),
        type,
        title: title.trim() || defaultTitle(type, stats.start || Date.now()),
        track,
        routeId: null,
        createdAt: new Date().toISOString(),
      });
      for (const key of ['timeline', 'userActivities', 'stats', 'user']) void qc.invalidateQueries({ queryKey: [key] });
      if (res.ok) {
        router.replace(`/aktivitas/${res.activity.id}`);
      } else {
        await notice(
          'Tersimpan di HP',
          'Server belum bisa dihubungi. Aktivitas impor aman di HP dan akan diunggah otomatis saat koneksi kembali.',
        );
        router.replace('/');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal menyimpan aktivitas');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <SectionTitle>Impor dari jam GPS</SectionTitle>
      <Card style={{ gap: space.md }}>
        <Row gap={space.md} style={{ alignItems: 'flex-start' }}>
          <View style={[styles.icon, { backgroundColor: c.surface2, borderColor: c.line }]}>
            <Ionicons name="watch-outline" size={22} color={c.text} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <T v="strong">Berkas GPX atau FIT</T>
            <T v="small">
              Ekspor aktivitas dari Garmin, COROS, Huawei, Amazfit, atau aplikasi lain, lalu pilih berkasnya di sini.
              Jejak dipakai apa adanya; jarak dan waktu dihitung server dari titik GPS.
            </T>
          </View>
        </Row>
        <Button kind="soft" icon="document-outline" title="Pilih berkas" onPress={() => void pick()} />
      </Card>

      {track && stats ? (
        <Card style={{ gap: space.md }}>
          <Row gap={space.sm}>
            <Ionicons name="document-text-outline" size={18} color={c.accentText} />
            <T v="strong" numberOfLines={1} style={{ flex: 1 }}>
              {fileName}
            </T>
          </Row>
          <Row gap={space.xl}>
            <Stat label="Jarak" value={distance(stats.distanceM)} />
            <Stat label="Waktu" value={duration(stats.movingS)} />
            <Stat label="Titik" value={String(stats.points)} />
          </Row>
          <View style={{ gap: space.sm }}>
            <T v="label">Jenis aktivitas</T>
            <TypePicker value={type} onChange={setType} />
          </View>
          <Field icon="create-outline" label="Judul" value={title} onChangeText={setTitle} maxLength={100} />
          <Button title="Simpan aktivitas" icon="checkmark" loading={busy} disabled={busy} onPress={() => void save()} />
          <T v="small">Jenis otomatis dari berkas: {TYPE_HINT[type]}. Kamu bisa mengubahnya sebelum menyimpan.</T>
        </Card>
      ) : null}

      {error ? <ErrorBox error={new Error(error)} /> : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <T v="label">{label}</T>
      <T v="h3">{value}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});