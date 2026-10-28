import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ChatSummary } from '@shared/api';

import { Avatar, Button, Card, Empty, ErrorBox, Loading, Row, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { when } from '@/lib/format';
import { usePullToRefresh, useRefetchOnFocus } from '@/lib/hooks';
import { font, space, useColors } from '@/lib/theme';

/** Daftar percakapan, terbaru di atas. Diperbarui tiap 15 detik selama layar terbuka (tanpa notifikasi push). */
export default function ChatsScreen() {
  const c = useColors();
  const me = useMe();
  const q = useQuery({ queryKey: ['chats'], queryFn: () => api<ChatSummary[]>('/chats'), refetchInterval: 15_000 });
  useRefetchOnFocus(q.refetch);
  const pull = usePullToRefresh(q.refetch);

  if (q.isPending) return <Loading />;
  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: space.lg, gap: space.sm }}
      data={q.data ?? []}
      keyExtractor={(x) => String(x.user.id)}
      refreshing={pull.refreshing}
      onRefresh={pull.onRefresh}
      ListHeaderComponent={q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : undefined}
      ListEmptyComponent={
        <Empty
          icon="chatbubbles-outline"
          title="Belum ada pesan"
          text="Pesan bisa dikirim ke teman yang saling mengikuti. Buka profil teman lalu ketuk ikon pesan."
          action={<Button kind="soft" icon="people-outline" title="Lihat yang kuikuti" onPress={() => router.push(`/koneksi/${me.id}?tab=mengikuti`)} />}
        />
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/pesan/${item.user.id}`)} style={({ pressed }) => pressed && { opacity: 0.9 }}>
          <Card style={{ padding: space.md }}>
            <Row>
              <Avatar name={item.user.name} uri={item.user.avatarUrl} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="strong" numberOfLines={1} style={{ flex: 1 }}>
                    {item.user.name}
                  </T>
                  <T v="small" size={11}>
                    {when(item.last.createdAt)}
                  </T>
                </Row>
                <Row>
                  <Text
                    numberOfLines={1}
                    style={[styles.last, { color: item.unread ? c.text : c.muted, fontFamily: item.unread ? font.semibold : font.regular }]}>
                    {item.last.fromMe ? 'Kamu: ' : ''}
                    {item.last.body}
                  </Text>
                  {item.unread ? (
                    <View style={[styles.badge, { backgroundColor: c.accent }]}>
                      <Text style={{ color: c.accentInk, fontFamily: font.bold, fontSize: 11 }}>{item.unread}</Text>
                    </View>
                  ) : null}
                </Row>
              </View>
            </Row>
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  last: { flex: 1, fontSize: 14 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
});
