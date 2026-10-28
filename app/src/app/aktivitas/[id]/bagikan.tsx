import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { FlatList, PixelRatio, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

import type { Activity } from '@shared/api';

import { STICKERS, type StickerKey } from '@/components/ShareStickers';
import { PlainBackground, TEMPLATES, type TemplateKey } from '@/components/ShareTemplates';
import { Button, ErrorBox, IconButton, Loading, Row, Segmented, T, type IconName } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { CAPTURE_RESULT, saveImage, shareImage } from '@/lib/share-file';
import { font, radius, space, useColors } from '@/lib/theme';

type Ratio = 'post' | 'story';
const RATIO: Record<Ratio, number> = { post: 4 / 5, story: 9 / 16 };
const EXPORT_WIDTH = 1080;

/** Stiker transparan dulu (gaya Strava), lalu template lama yang punya latar sendiri. */
type Item = { kind: 'sticker'; key: StickerKey; name: string } | { kind: 'template'; key: TemplateKey; name: string };
const ITEMS: Item[] = [
  ...STICKERS.map((s) => ({ kind: 'sticker' as const, key: s.key, name: s.name })),
  ...TEMPLATES.map((t) => ({ kind: 'template' as const, key: t.key, name: t.name })),
];

type Busy = 'share' | 'save' | 'copy' | null;

export default function ShareScreen() {
  const c = useColors();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const q = useQuery({ queryKey: ['activity', id], queryFn: () => api<Activity>(`/activities/${id}`) });
  const [index, setIndex] = useState(0);
  const [ratio, setRatio] = useState<Ratio>('story');
  const [photo, setPhoto] = useState<string | null>(null);
  const [lineKey, setLineKey] = useState<'oranye' | 'putih' | 'tema'>('oranye');
  const [busy, setBusy] = useState<Busy>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const canvas = useRef<ComponentRef<typeof View>>(null);
  const win = useWindowDimensions();

  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const a = q.data;

  const r = RATIO[ratio];
  const pageW = win.width;
  const w = Math.round(Math.min(pageW - space.lg * 2, win.height * 0.52 * r, 440));
  const h = Math.round(w / r);
  const item = ITEMS[index];
  const lines = { oranye: '#FF5A1F', putih: '#FFFFFF', tema: c.accent };
  const line = lines[lineKey];

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

  // Gambar diekspor 1080 px lebarnya, apa pun ukuran pratinjau di layar. Stiker tanpa foto tetap transparan (PNG).
  const capture = (result: typeof CAPTURE_RESULT | 'base64') =>
    captureRef(canvas, {
      format: 'png',
      quality: 1,
      result,
      width: EXPORT_WIDTH / PixelRatio.get(),
      height: EXPORT_WIDTH / r / PixelRatio.get(),
    });

  const run = async (kind: Exclude<Busy, null>) => {
    setBusy(kind);
    setNote(null);
    try {
      if (kind === 'copy') {
        await Clipboard.setImageAsync(await capture('base64'));
        setNote({ ok: true, text: 'Tersalin. Tempel sebagai stiker di Story atau aplikasi lain.' });
      } else {
        const uri = await capture(CAPTURE_RESULT);
        if (kind === 'share') await shareImage(uri);
        else {
          await saveImage(uri, `jejak-${a.id}-${item.key}.png`);
          setNote({ ok: true, text: Platform.OS === 'web' ? 'Gambar diunduh.' : 'Gambar tersimpan di galeri.' });
        }
      }
    } catch (e) {
      setNote({ ok: false, text: errorText(e) });
    } finally {
      setBusy(null);
    }
  };

  const renderItem = ({ item: it, index: i }: { item: Item; index: number }) => {
    const transparent = it.kind === 'sticker' && !photo;
    return (
      <View style={{ width: pageW, alignItems: 'center' }}>
        <View style={[styles.frame, { width: w, height: h }]}>
          {/* Pola kotak-kotak hanya penanda bagian transparan; ada di luar wadah yang diekspor. */}
          {transparent ? <Checker w={w} h={h} /> : null}
          {/* Yang ditangkap jadi gambar: tanpa sudut membulat dan tanpa warna latar. */}
          <View ref={i === index ? canvas : undefined} collapsable={false} style={{ width: w, height: h, overflow: 'hidden' }}>
            {photo ? (
              <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : it.kind === 'template' ? (
              <PlainBackground a={a} w={w} h={h} faintRoute={it.key !== 'rute'} />
            ) : null}
            {it.kind === 'sticker'
              ? STICKERS.find((s) => s.key === it.key)!.render({ a, w, h, line })
              : TEMPLATES.find((t) => t.key === it.key)!.render({ a, w, h })}
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.page}>
      <FlatList
        data={ITEMS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(it) => it.key}
        renderItem={renderItem}
        extraData={[index, photo, line, ratio, w]}
        getItemLayout={(_, i) => ({ length: pageW, offset: pageW * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / pageW))}
        onScroll={Platform.OS === 'web' ? (e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / pageW)) : undefined}
        scrollEventThrottle={64}
      />

      <View style={{ alignItems: 'center', gap: space.sm }}>
        <View style={styles.dots}>
          {ITEMS.map((it, i) => (
            <View key={it.key} style={[styles.dot, { backgroundColor: i === index ? c.text : c.line }]} />
          ))}
        </View>
        <Text style={{ color: c.muted, fontFamily: font.semibold, fontSize: 13 }}>
          {item.name}
          {item.kind === 'sticker' ? ' · stiker transparan' : ''}
        </Text>
      </View>

      <View style={styles.controls}>
        <T v="label">Bagikan ke</T>
        <Row gap={space.lg} style={{ justifyContent: 'center' }}>
          <ShareAction
            icon="download-outline"
            label={Platform.OS === 'web' ? 'Unduh' : 'Simpan'}
            busy={busy === 'save'}
            disabled={busy != null}
            onPress={() => run('save')}
          />
          {Platform.OS !== 'web' ? (
            <ShareAction icon="copy-outline" label="Salin" busy={busy === 'copy'} disabled={busy != null} onPress={() => run('copy')} />
          ) : null}
          <ShareAction
            icon="share-social-outline"
            label="Lainnya"
            busy={busy === 'share'}
            disabled={busy != null}
            onPress={() => run('share')}
          />
        </Row>
        {note ? (
          <Row gap={space.sm}>
            <Ionicons name={note.ok ? 'checkmark-circle' : 'alert-circle'} size={18} color={note.ok ? c.start : c.danger} />
            <T v="small" color={note.ok ? c.text : c.danger} style={{ flex: 1 }}>
              {note.text}
            </T>
          </Row>
        ) : null}

        {item.kind === 'sticker' ? (
          <>
            <T v="label">Warna garis</T>
            <Row gap={space.sm}>
              {(
                [
                  ['oranye', 'Oranye'],
                  ['putih', 'Putih'],
                  ['tema', 'Warna tema'],
                ] as const
              ).map(([key, label]) => {
                const on = key === lineKey;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setLineKey(key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.chip, { backgroundColor: on ? c.accentSoft : c.surface, borderColor: on ? c.accent : c.line }]}>
                    <View style={[styles.swatch, { backgroundColor: lines[key], borderColor: c.line }]} />
                    <Text style={{ color: c.text, fontFamily: font.semibold, fontSize: 13 }}>{label}</Text>
                  </Pressable>
                );
              })}
            </Row>
          </>
        ) : null}

        <Segmented
          options={[
            { key: 'story', label: 'Story 9:16' },
            { key: 'post', label: 'Postingan 4:5' },
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
        <T v="small">
          {photo
            ? 'Stiker ditempel di atas fotomu.'
            : item.kind === 'sticker'
              ? 'Tanpa foto, stiker disimpan transparan: tempel di atas fotomu di Story. Geser untuk template lain.'
              : 'Tanpa foto, template memakai latar aspal dengan garis rutemu.'}
        </T>
      </View>
    </ScrollView>
  );
}

function ShareAction({
  icon,
  label,
  busy,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, { opacity: disabled && !busy ? 0.5 : pressed ? 0.8 : 1 }]}>
      <View style={[styles.actionIcon, { backgroundColor: c.surface2, borderColor: c.line }]}>
        <Ionicons name={busy ? 'hourglass-outline' : icon} size={26} color={c.text} />
      </View>
      <Text style={{ color: c.text, fontFamily: font.medium, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

/** Pola papan catur untuk menandai bagian transparan (tidak ikut diekspor). */
function Checker({ w, h }: { w: number; h: number }) {
  const s = 14;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="papan" width={s * 2} height={s * 2} patternUnits="userSpaceOnUse">
          <Rect width={s * 2} height={s * 2} fill="#3A3B3D" />
          <Rect width={s} height={s} fill="#2B2C2E" />
          <Rect x={s} y={s} width={s} height={s} fill="#2B2C2E" />
        </Pattern>
      </Defs>
      <Rect width={w} height={h} fill="url(#papan)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: { paddingVertical: space.lg, gap: space.lg, alignItems: 'stretch', paddingBottom: 48 },
  frame: { borderRadius: radius.sm, overflow: 'hidden' },
  dots: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: space.lg },
  dot: { width: 7, height: 7, borderRadius: 4 },
  controls: { paddingHorizontal: space.lg, gap: space.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 1 },
  action: { alignItems: 'center', gap: 6, width: 72 },
  actionIcon: { width: 60, height: 60, borderRadius: 30, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
