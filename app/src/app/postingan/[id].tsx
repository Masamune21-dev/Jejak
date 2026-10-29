import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Post, PostReply } from '@shared/api';

import PostCard from '@/components/PostCard';
import { Avatar, ErrorBox, KeyboardAvoid, Loading, Row, SectionTitle, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { when } from '@/lib/format';
import { font, radius, space, useColors } from '@/lib/theme';

export default function PostScreen() {
  const c = useColors();
  const me = useMe();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const [text, setText] = useState('');

  const post = useQuery({ queryKey: ['post', id], queryFn: () => api<Post>(`/posts/${id}`) });
  const replies = useQuery({ queryKey: ['post', id, 'replies'], queryFn: () => api<PostReply[]>(`/posts/${id}/replies`) });
  const refresh = () => {
    for (const key of [['post', id], ['timeline'], ['segmentPosts']]) void qc.invalidateQueries({ queryKey: key });
  };
  const send = useMutation({
    mutationFn: () => api<PostReply>(`/posts/${id}/replies`, { body: { body: text.trim() } }),
    onSuccess: () => {
      setText('');
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (replyId: number) => api(`/replies/${replyId}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });

  if (post.isPending) return <Loading />;
  if (post.error) return <ErrorBox error={post.error} onRetry={() => post.refetch()} />;
  const p = post.data;

  return (
    <KeyboardAvoid style={{ backgroundColor: c.bg }}>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        data={replies.data ?? []}
        keyExtractor={(r) => String(r.id)}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: space.md }}>
            <PostCard key={`${p.id}-${p.likes}-${p.hasLiked}`} post={p} detail />
            <SectionTitle>Balasan</SectionTitle>
            {replies.error ? <ErrorBox error={replies.error} onRetry={() => replies.refetch()} /> : null}
            {replies.data && replies.data.length === 0 ? <T v="small">Belum ada balasan. Jadilah yang pertama.</T> : null}
          </View>
        }
        renderItem={({ item }) => (
          <Row style={{ alignItems: 'flex-start' }}>
            <Pressable onPress={() => router.push(`/atlet/${item.user.id}`)}>
              <Avatar name={item.user.name} uri={item.user.avatarUrl} size={34} />
            </Pressable>
            <View style={[styles.bubble, { backgroundColor: c.surface, borderColor: c.line }]}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="strong" size={13}>
                  {item.user.name}
                </T>
                <T v="small" size={11}>
                  {when(item.createdAt)}
                </T>
              </Row>
              <T>{item.body}</T>
            </View>
            {item.user.id === me.id || p.user.id === me.id ? (
              <Pressable onPress={() => remove.mutate(item.id)} hitSlop={8} accessibilityLabel="Hapus balasan">
                <Ionicons name="trash-outline" size={16} color={c.muted} />
              </Pressable>
            ) : null}
          </Row>
        )}
      />
      {send.error ? (
        <View style={{ paddingHorizontal: space.lg }}>
          <ErrorBox error={send.error} />
        </View>
      ) : null}
      <View style={[styles.composer, { borderTopColor: c.line, backgroundColor: c.surface, paddingBottom: insets.bottom + space.sm }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Tulis balasan…"
          placeholderTextColor={c.muted}
          multiline
          maxLength={500}
          style={[styles.input, { color: c.text, backgroundColor: c.surface2 }]}
        />
        <Pressable
          onPress={() => send.mutate()}
          disabled={!text.trim() || send.isPending}
          accessibilityLabel="Kirim balasan"
          style={[styles.send, { backgroundColor: text.trim() ? c.accent : c.surface2 }]}>
          <Ionicons name={send.isPending ? 'hourglass-outline' : 'send'} size={18} color={text.trim() ? c.accentInk : c.muted} />
        </Pressable>
      </View>
    </KeyboardAvoid>
  );
}

const styles = StyleSheet.create({
  bubble: { flex: 1, borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: 4 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, borderTopWidth: 1, paddingHorizontal: space.md, paddingTop: space.sm },
  input: { flex: 1, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10, maxHeight: 120, fontFamily: font.regular, fontSize: 15 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
