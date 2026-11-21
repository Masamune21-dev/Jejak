import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Empty, IconTile, Row, T } from '@/components/ui';
import { errorText } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { usePush } from '@/lib/push-state';
import { space, useColors } from '@/lib/theme';
import { APP_VERSION, openApkDownload, useUpdate, type ApkInfo } from '@/lib/update';
import { removeQueued, retryQueued, useUploadQueue } from '@/lib/upload-queue';

/** Kartu di Beranda saat ada APK yang lebih baru di situs. */
export function UpdateCard() {
  const u = useUpdate();
  if (!u.latest || u.dismissed) return null;
  const { versi, ukuranMB } = u.latest;
  return (
    <Card>
      <Row style={{ alignItems: 'flex-start' }}>
        <IconTile icon="arrow-down-circle-outline" />
        <View style={styles.text}>
          <T v="h3">Jejak {versi} tersedia</T>
          <T v="small">
            Kamu memakai {APP_VERSION}.{ukuranMB ? ` Ukuran unduhan ${String(ukuranMB).replace('.', ',')} MB.` : ''}
          </T>
        </View>
      </Row>
      <Notes info={u.latest} />
      <Row gap={space.sm}>
        <Button small title="Unduh" icon="download-outline" onPress={() => void openApkDownload(versi)} style={{ flex: 1 }} />
        <Button small kind="ghost" title="Nanti" onPress={() => void u.dismiss()} />
      </Row>
    </Card>
  );
}

/** Kartu di Beranda bila ada rekaman yang belum terunggah (server mati atau tanpa internet). */
export function UploadQueueCard() {
  const me = useMe();
  const all = useUploadQueue();
  const q = all.filter((x) => x.userId === me.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (q.length === 0) return null;
  const stuck = q.find((x) => x.stuck);
  const retry = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await retryQueued(me.id);
      if (r.error) setError(r.error);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    // Yang ditolak server dihapus lebih dulu; kalau tidak ada, tawarkan menghapus semua.
    const items = stuck ? q.filter((x) => x.stuck) : q;
    const ok = await confirm(
      'Hapus rekaman',
      `${items.length} rekaman yang belum terunggah akan dihapus dan tidak bisa dikembalikan.`,
      'Hapus',
    );
    if (!ok) return;
    for (const item of items) await removeQueued(item.clientId);
  };
  return (
    <Card>
      <Row style={{ alignItems: 'flex-start' }}>
        <IconTile icon="cloud-upload-outline" />
        <View style={styles.text}>
          <T v="h3">{q.length > 1 ? `${q.length} aktivitas menunggu diunggah` : 'Aktivitas menunggu diunggah'}</T>
          <T v="small">
            {stuck
              ? `Server menolak salah satu rekaman: ${stuck.lastError ?? 'tidak diketahui'}. Datanya tetap di HP sampai kamu menghapusnya.`
              : 'Tersimpan aman di HP. Jejak mencoba mengunggah lagi otomatis saat koneksi kembali.'}
          </T>
        </View>
      </Row>
      {error ? <ErrorLine text={error} /> : null}
      <Row gap={space.sm}>
        <Button
          small
          title="Coba lagi"
          icon="refresh-outline"
          loading={busy}
          onPress={() => void retry()}
          style={{ flex: 1 }}
        />
        <Button small kind="ghost" title="Hapus" icon="trash-outline" disabled={busy} onPress={() => void remove()} />
      </Row>
    </Card>
  );
}

/** Kartu di Beranda selama pengguna belum memilih menyalakan atau mematikan notifikasi. */
export function PushCard() {
  const p = usePush();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (p.state !== 'unasked') return null;
  const enable = async () => {
    setBusy(true);
    setError(null);
    try {
      await p.enable();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <Row style={{ alignItems: 'flex-start' }}>
        <IconTile icon="notifications-outline" />
        <View style={styles.text}>
          <T v="h3">Nyalakan notifikasi</T>
          <T v="small">Supaya kamu tahu saat ada versi baru Jejak atau pengumuman penting. Bisa dimatikan di Pengaturan.</T>
        </View>
      </Row>
      {error ? <ErrorLine text={error} /> : null}
      <Row gap={space.sm}>
        <Button small title="Nyalakan" icon="notifications-outline" loading={busy} onPress={() => void enable()} style={{ flex: 1 }} />
        <Button small kind="ghost" title="Nanti" disabled={busy} onPress={() => void p.later()} />
      </Row>
    </Card>
  );
}

/** Layar penuh bila versi app ini sudah tidak didukung server (`minimal` di versi.json). */
export function UpdateRequired({ info }: { info: ApkInfo }) {
  const c = useColors();
  return (
    <View style={[styles.required, { backgroundColor: c.bg }]}>
      <Empty
        icon="arrow-down-circle-outline"
        title="Perbarui Jejak dulu"
        text={`Versi ${APP_VERSION} sudah tidak bisa dipakai. Pasang Jejak ${info.versi} di atas versi ini; akun dan aktivitasmu tetap ada.`}
        action={
          <View style={{ alignSelf: 'stretch', gap: space.md }}>
            <Notes info={info} />
            <Button title={`Unduh Jejak ${info.versi}`} icon="download-outline" onPress={() => void openApkDownload(info.versi)} />
          </View>
        }
      />
    </View>
  );
}

function Notes({ info }: { info: ApkInfo }) {
  const c = useColors();
  const notes = (info.catatan ?? []).slice(0, 4);
  if (!notes.length) return null;
  return (
    <View style={{ gap: 6 }}>
      {notes.map((n) => (
        <Row key={n} gap={space.sm} style={{ alignItems: 'flex-start' }}>
          <View style={[styles.dot, { backgroundColor: c.accent }]} />
          <T v="small" color={c.text} style={{ flex: 1 }}>
            {n}
          </T>
        </Row>
      ))}
    </View>
  );
}

function ErrorLine({ text }: { text: string }) {
  const c = useColors();
  return (
    <T v="small" color={c.danger}>
      {text}
    </T>
  );
}

const styles = StyleSheet.create({
  text: { flex: 1, gap: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  required: { flex: 1, justifyContent: 'center', padding: space.lg },
});
