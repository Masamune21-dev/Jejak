import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LikeState, Post } from '@shared/api';

import { api, mediaUri } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { TYPE_ICON, when } from '@/lib/format';
import { font, radius, space, useColors } from '@/lib/theme';

import Sheet from './Sheet';
import { Avatar, Card, Row, T } from './ui';

/** Segarkan semua daftar yang bisa memuat postingan. */
export function useRefreshPosts() {
  const qc = useQueryClient();
  return () => {
    for (const key of ['timeline', 'post', 'segmentPosts']) void qc.invalidateQueries({ queryKey: [key] });
  };
}

/** Kartu postingan di feed Beranda dan tab Diskusi segmen. `detail` = tampilan penuh di layar postingan. */
export default function PostCard({ post, detail }: { post: Post; detail?: boolean }) {
  const c = useColors();
  const me = useMe();
  const refresh = useRefreshPosts();
  const [menu, setMenu] = useState(false);
  // Suka langsung berubah di layar; server menyusul.
  const [like, setLike] = useState<LikeState>({ likes: post.likes, hasLiked: post.hasLiked });
  const toggle = useMutation({
    mutationFn: (on: boolean) => api<LikeState>(`/posts/${post.id}/like`, { method: on ? 'POST' : 'DELETE' }),
    onMutate: (on) => setLike((l) => ({ likes: l.likes + (on ? 1 : -1), hasLiked: on })),
    onSuccess: setLike,
    onError: () => setLike({ likes: post.likes, hasLiked: post.hasLiked }),
  });
  const remove = useMutation({
    mutationFn: () => api(`/posts/${post.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      refresh();
      if (detail) {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }
    },
  });
  const report = useMutation({ mutationFn: () => api(`/posts/${post.id}/report`, { body: { reason: 'Dilaporkan dari aplikasi' } }) });

  const open = () => router.push(`/postingan/${post.id}`);
  const mine = post.user.id === me.id;
  const photos = post.photos.map((p) => mediaUri(p)!);

  return (
    <Pressable onPress={detail ? undefined : open} disabled={detail} style={({ pressed }) => pressed && { opacity: 0.94 }}>
      <Card style={{ gap: space.md }}>
        <Row>
          <Pressable onPress={() => router.push(`/atlet/${post.user.id}`)} hitSlop={4}>
            <Avatar name={post.user.name} uri={post.user.avatarUrl} size={40} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <T v="strong" numberOfLines={1}>
              {post.user.name}
            </T>
            <T v="small">{when(post.createdAt)}</T>
          </View>
          <Pressable onPress={() => setMenu(true)} hitSlop={10} accessibilityLabel="Pilihan postingan">
            <Ionicons name="ellipsis-horizontal" size={20} color={c.muted} />
          </Pressable>
        </Row>

        {post.body ? (
          <Text style={[styles.body, { color: c.text }]} numberOfLines={detail ? undefined : 8}>
            {post.body}
          </Text>
        ) : null}

        {photos.length > 0 ? (
          <View style={styles.grid}>
            {photos.map((uri, i) => (
              <Image
                key={uri}
                source={{ uri }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
                style={[
                  styles.photo,
                  { backgroundColor: c.surface2 },
                  photos.length === 1 ? { width: '100%', aspectRatio: 4 / 3 } : { width: '49%', aspectRatio: 1 },
                  photos.length === 3 && i === 0 ? { width: '100%', aspectRatio: 16 / 9 } : null,
                ]}
              />
            ))}
          </View>
        ) : null}

        {post.segment || post.activity ? (
          <Row gap={space.sm} style={{ flexWrap: 'wrap' }}>
            {post.segment ? (
              <Tag icon="flag" label={post.segment.name} color={c.segment} onPress={() => router.push(`/segmen/${post.segment!.id}`)} />
            ) : null}
            {post.activity ? (
              <Tag
                icon={TYPE_ICON[post.activity.type]}
                label={post.activity.title}
                color={c.accentText}
                onPress={() => router.push(`/aktivitas/${post.activity!.id}`)}
              />
            ) : null}
          </Row>
        ) : null}

        <Row gap={space.lg}>
          <Pressable
            onPress={() => toggle.mutate(!like.hasLiked)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={like.hasLiked ? 'Batal suka' : 'Suka'}
            style={styles.action}>
            <Ionicons name={like.hasLiked ? 'heart' : 'heart-outline'} size={20} color={like.hasLiked ? c.danger : c.muted} />
            <Text style={[styles.count, { color: c.muted }]}>{like.likes}</Text>
          </Pressable>
          <Pressable onPress={open} disabled={detail} hitSlop={8} style={styles.action} accessibilityLabel="Balasan">
            <Ionicons name="chatbubble-outline" size={19} color={c.muted} />
            <Text style={[styles.count, { color: c.muted }]}>{post.replies}</Text>
          </Pressable>
          {report.isSuccess ? <T v="small">Terima kasih, laporan terkirim.</T> : null}
        </Row>
      </Card>
      <Sheet
        visible={menu}
        options={
          mine
            ? [
                {
                  label: 'Hapus postingan',
                  icon: 'trash-outline',
                  danger: true,
                  onPress: async () => {
                    if (await confirm('Hapus postingan', 'Postingan ini akan dihapus permanen.', 'Hapus')) remove.mutate();
                  },
                },
              ]
            : [{ label: 'Laporkan', icon: 'flag-outline', danger: true, onPress: () => report.mutate() }]
        }
        onClose={() => setMenu(false)}
      />
    </Pressable>
  );
}

function Tag({ icon, label, color, onPress }: { icon: 'flag' | 'walk' | 'bicycle' | 'footsteps'; label: string; color: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={[styles.tag, { borderColor: c.line, backgroundColor: c.surface2 }]} accessibilityRole="link">
      <Ionicons name={icon} size={14} color={color} />
      <Text style={{ color: c.text, fontFamily: font.semibold, fontSize: 13 }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' },
  photo: { borderRadius: radius.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  count: { fontFamily: font.semibold, fontSize: 14 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '100%' },
});
