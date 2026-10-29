import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { Post, Profile } from '@shared/api';

import { useRefreshPosts } from '@/components/PostCard';
import { Avatar, Button, Card, ErrorBox, KeyboardAvoid, Row, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { appendPhoto, pickPhoto } from '@/lib/photo';
import { font, radius, space, useColors } from '@/lib/theme';

const MAX_CHARS = 500;
const MAX_PHOTOS = 4;

/** Tulis postingan: teks, sampai 4 foto, dan (bila dibuka dari halaman segmen) tanda segmen. */
export default function ComposeScreen() {
  const c = useColors();
  const me = useMe();
  const refresh = useRefreshPosts();
  // Foto profil dari profil terbaru; alamat di data login bisa basi setelah ganti foto.
  const profile = useQuery({ queryKey: ['user', me.id], queryFn: () => api<Profile>(`/users/${me.id}`) });
  const params = useLocalSearchParams<{ segmentId?: string; segmentName?: string }>();
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [segment, setSegment] = useState(params.segmentId ? { id: params.segmentId, name: params.segmentName ?? 'Segmen' } : null);
  const [pickError, setPickError] = useState<unknown>(null);

  const addPhoto = async (camera: boolean) => {
    setPickError(null);
    try {
      const uri = await pickPhoto({ camera, maxWidth: 1600 });
      if (uri) setPhotos((p) => [...p, uri].slice(0, MAX_PHOTOS));
    } catch (e) {
      setPickError(e);
    }
  };

  const send = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('body', text.trim());
      if (segment) form.append('segmentId', segment.id);
      for (const uri of photos) await appendPhoto(form, 'foto', uri);
      return api<Post>('/posts', { method: 'POST', body: form, timeoutMs: 90_000 });
    },
    onSuccess: () => {
      refresh();
      // Dibuka langsung (mis. lewat tautan) tidak punya halaman sebelumnya: pulang ke Beranda.
      if (router.canGoBack()) router.back();
      else router.replace('/');
    },
  });

  const canSend = (text.trim().length > 0 || photos.length > 0) && text.length <= MAX_CHARS && !send.isPending;

  return (
    <KeyboardAvoid style={{ backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <Row>
          <Avatar name={me.name} uri={profile.data?.avatarUrl ?? null} size={40} />
          <T v="strong">{me.name}</T>
        </Row>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={segment ? `Ceritakan tentang ${segment.name}…` : 'Apa kabar lari atau gowesmu hari ini?'}
          placeholderTextColor={c.muted}
          multiline
          autoFocus
          maxLength={MAX_CHARS + 50}
          style={[styles.input, { color: c.text, borderColor: c.line, backgroundColor: c.surface }]}
        />
        <Text style={{ alignSelf: 'flex-end', color: text.length > MAX_CHARS ? c.danger : c.muted, fontFamily: font.medium, fontSize: 12 }}>
          {text.length}/{MAX_CHARS}
        </Text>

        {segment ? (
          <Row gap={space.sm}>
            <View style={[styles.tag, { borderColor: c.line, backgroundColor: c.surface2 }]}>
              <Ionicons name="flag" size={14} color={c.segment} />
              <Text style={{ color: c.text, fontFamily: font.semibold, fontSize: 13 }}>{segment.name}</Text>
              <Pressable onPress={() => setSegment(null)} hitSlop={8} accessibilityLabel="Hapus tanda segmen">
                <Ionicons name="close" size={16} color={c.muted} />
              </Pressable>
            </View>
          </Row>
        ) : null}

        {photos.length > 0 ? (
          <View style={styles.grid}>
            {photos.map((uri) => (
              <View key={uri} style={styles.thumbWrap}>
                <Image source={{ uri }} style={[styles.thumb, { backgroundColor: c.surface2 }]} contentFit="cover" />
                <Pressable
                  onPress={() => setPhotos((p) => p.filter((x) => x !== uri))}
                  style={[styles.remove, { backgroundColor: c.overlay }]}
                  accessibilityLabel="Hapus foto">
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <Row gap={space.sm}>
          <Button
            style={{ flex: 1 }}
            kind="soft"
            icon="images-outline"
            title={`Foto (${photos.length}/${MAX_PHOTOS})`}
            disabled={photos.length >= MAX_PHOTOS}
            onPress={() => addPhoto(false)}
          />
          {Platform.OS !== 'web' ? (
            <Button style={{ flex: 1 }} kind="soft" icon="camera-outline" title="Kamera" disabled={photos.length >= MAX_PHOTOS} onPress={() => addPhoto(true)} />
          ) : null}
        </Row>
        {pickError ? <ErrorBox error={pickError} /> : null}
        {send.error ? <ErrorBox error={send.error} /> : null}
        <Card flat style={{ backgroundColor: c.surface2, borderWidth: 0 }}>
          <T v="small">
            Postingan tampil di Beranda orang yang mengikutimu{segment ? ' dan di Diskusi segmen untuk semua pengguna' : ''}. Lokasi di foto
            dihapus sebelum diunggah.
          </T>
        </Card>
        <Button title="Kirim" icon="send" loading={send.isPending} disabled={!canSend} onPress={() => send.mutate()} />
      </ScrollView>
    </KeyboardAvoid>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  input: {
    minHeight: 140,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    fontFamily: font.regular,
    fontSize: 16,
    lineHeight: 23,
    textAlignVertical: 'top',
  },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  thumbWrap: { width: '48%', aspectRatio: 1 },
  thumb: { width: '100%', height: '100%', borderRadius: radius.sm },
  remove: { position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
