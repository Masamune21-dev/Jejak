import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { PixelRatio, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import type { Activity } from '@shared/api';

import { PlainBackground, TEMPLATES, type TemplateKey } from '@/components/ShareTemplates';
import { Button, ErrorBox, IconButton, Loading, Row, Segmented, T } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { CAPTURE_RESULT, saveImage, shareImage } from '@/lib/share-file';
import { font, radius, space, useColors } from '@/lib/theme';

type Ratio = 'post' | 'story';
const RATIO: Record<Ratio, number> = { post: 4 / 5, story: 9 / 16 };
const EXPORT_WIDTH = 1080;

export default function ShareScreen() {
  const c = useColors();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const q = useQuery({ queryKey: ['activity', id], queryFn: () => api<Activity>(`/activities/${id}`) });
  const [template, setTemplate] = useState<TemplateKey>('bib');
  const [ratio, setRatio] = useState<Ratio>('post');
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const canvas = useRef<ComponentRef<typeof View>>(null);
  const win = useWindowDimensions();

  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const a = q.data;

  const r = RATIO[ratio];
  const w = Math.round(Math.min(win.width - space.lg * 2, win.height * 0.55 * r, 440));
  const h = Math.round(w / r);
  const current = TEMPLATES.find((t) => t.key === template)!;

  const pick = async (camera: boolean) => {
    setNote(null);
    if (camera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setNote({ ok: false, text: 'Izin kamera ditolak. Aktifkan kamera untuk Jejak di pengaturan HP.' });
        return;
      }
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9 };
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled && res.assets[0]) setPhoto(res.assets[0].uri);
  };

  // Gambar diekspor 1080 px lebarnya, apa pun ukuran pratinjau di layar.
  const capture = () =>
    captureRef(canvas, {
      format: 'png',
      quality: 1,
      result: CAPTURE_RESULT,
      width: EXPORT_WIDTH / PixelRatio.get(),
      height: EXPORT_WIDTH / r / PixelRatio.get(),
    });

  const run = async (kind: 'share' | 'save') => {
    setBusy(kind);
    setNote(null);
    try {
      const uri = await capture();
      if (kind === 'share') await shareImage(uri);
      else {
        await saveImage(uri, `jejak-${a.id}-${template}.png`);
        setNote({ ok: true, text: Platform.OS === 'web' ? 'Gambar diunduh.' : 'Gambar tersimpan di galeri.' });
      }
    } catch (e) {
      setNote({ ok: false, text: errorText(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.page}>
      <View style={[styles.frame, { width: w, height: h }]}>
        {/* Yang ditangkap jadi gambar: tanpa sudut membulat supaya hasil ekspor persegi penuh. */}
        <View ref={canvas} collapsable={false} style={{ width: w, height: h, overflow: 'hidden' }}>
          {photo ? (
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <PlainBackground a={a} w={w} h={h} faintRoute={template !== 'rute'} />
          )}
          {current.render({ a, w, h })}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm, paddingHorizontal: space.lg }}>
        {TEMPLATES.map((t) => {
          const on = t.key === template;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTemplate(t.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.tpl, { backgroundColor: on ? c.ink : c.surface, borderColor: on ? c.ink : c.line }]}>
              <Text style={{ color: on ? c.inkText : c.text, fontFamily: font.semibold, fontSize: 14 }}>{t.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.controls}>
        <Segmented
          options={[
            { key: 'post', label: 'Postingan 4:5' },
            { key: 'story', label: 'Story 9:16' },
          ]}
          value={ratio}
          onChange={setRatio}
        />
        <Row gap={space.sm}>
          <Button
            style={{ flex: 1 }}
            kind="soft"
            icon="images-outline"
            title={photo ? 'Ganti foto' : 'Pilih foto'}
            onPress={() => pick(false)}
          />
          {Platform.OS !== 'web' ? (
            <Button style={{ flex: 1 }} kind="soft" icon="camera-outline" title="Kamera" onPress={() => pick(true)} />
          ) : null}
          {photo ? <IconButton icon="close" label="Hapus foto" onPress={() => setPhoto(null)} size={50} /> : null}
        </Row>
        {photo ? null : <T v="small">Tanpa foto, template memakai latar aspal dengan garis rutemu.</T>}
        <Button
          title="Bagikan"
          icon="share-social-outline"
          loading={busy === 'share'}
          disabled={busy != null}
          onPress={() => run('share')}
        />
        <Button
          kind="ink"
          title={Platform.OS === 'web' ? 'Unduh gambar' : 'Simpan ke galeri'}
          icon="download-outline"
          loading={busy === 'save'}
          disabled={busy != null}
          onPress={() => run('save')}
        />
        {note ? (
          <Row gap={space.sm}>
            <Ionicons name={note.ok ? 'checkmark-circle' : 'alert-circle'} size={18} color={note.ok ? c.start : c.danger} />
            <T v="small" color={note.ok ? c.text : c.danger} style={{ flex: 1 }}>
              {note.text}
            </T>
          </Row>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingVertical: space.lg, gap: space.lg, alignItems: 'stretch', paddingBottom: 48 },
  frame: { alignSelf: 'center', borderRadius: radius.sm, overflow: 'hidden' },
  tpl: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  controls: { paddingHorizontal: space.lg, gap: space.md },
});
