import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ChatMessage, Profile } from '@shared/api';

import { Avatar, ErrorBox, Loading, T } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { font, radius, space, useColors } from '@/lib/theme';

const POLL_MS = 3_000;
const PAGE = 30;

const clock = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Percakapan 1-lawan-1. Tanpa notifikasi push: pesan baru diambil tiap 3 detik selama layar ini terbuka. */
export default function ChatScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const profile = useQuery({ queryKey: ['user', id], queryFn: () => api<Profile>(`/users/${id}`) });
  const [msgs, setMsgs] = useState<ChatMessage[] | null>(null);
  const [older, setOlder] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const lastId = useRef(0);

  const markRead = useCallback(() => {
    void api(`/chats/${id}/read`, { method: 'POST' })
      .then(() => {
        void qc.invalidateQueries({ queryKey: ['chats'] });
      })
      .catch(() => {});
  }, [id, qc]);

  const append = useCallback(
    (fresh: ChatMessage[]) => {
      if (fresh.length === 0) return;
      lastId.current = Math.max(lastId.current, ...fresh.map((m) => m.id));
      setMsgs((prev) => {
        const seen = new Set((prev ?? []).map((m) => m.id));
        return [...(prev ?? []), ...fresh.filter((m) => !seen.has(m.id))];
      });
      if (fresh.some((m) => !m.fromMe)) markRead();
    },
    [markRead],
  );

  // Muatan pertama: 30 pesan terakhir.
  useEffect(() => {
    let alive = true;
    api<ChatMessage[]>(`/chats/${id}`)
      .then((first) => {
        if (!alive) return;
        lastId.current = first.length ? first[first.length - 1].id : 0;
        setMsgs(first);
        setOlder(first.length === PAGE);
        markRead();
      })
      .catch((e) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, [id, markRead]);

  // Polling pesan baru selama layar terbuka.
  useFocusEffect(
    useCallback(() => {
      const t = setInterval(() => {
        if (msgs === null) return;
        api<ChatMessage[]>(`/chats/${id}?after=${lastId.current}`)
          .then(append)
          .catch(() => {});
      }, POLL_MS);
      return () => clearInterval(t);
    }, [id, msgs, append]),
  );

  const loadOlder = () => {
    if (!older || !msgs || msgs.length === 0) return;
    api<ChatMessage[]>(`/chats/${id}?before=${msgs[0].id}`)
      .then((page) => {
        setOlder(page.length === PAGE);
        setMsgs((prev) => [...page, ...(prev ?? [])]);
      })
      .catch(() => {});
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      append([await api<ChatMessage>(`/chats/${id}`, { body: { body } })]);
      setText('');
      void qc.invalidateQueries({ queryKey: ['chats'] });
    } catch (e) {
      setError(e);
    } finally {
      setSending(false);
    }
  };

  const p = profile.data;
  const canSend = p?.canMessage ?? false;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <Stack.Screen
        options={{
          headerTitle: () =>
            p ? (
              <Pressable onPress={() => router.push(`/atlet/${p.id}`)} style={styles.title} accessibilityRole="link">
                <Avatar name={p.name} uri={p.avatarUrl} size={30} />
                <Text style={{ color: c.text, fontFamily: font.bold, fontSize: 16 }} numberOfLines={1}>
                  {p.name}
                </Text>
              </Pressable>
            ) : null,
        }}
      />
      {msgs === null ? (
        error ? (
          <ErrorBox error={error} />
        ) : (
          <Loading />
        )
      ) : (
        <FlatList
          inverted
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: space.lg, gap: 6 }}
          data={[...msgs].reverse()}
          keyExtractor={(m) => String(m.id)}
          onEndReached={loadOlder}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={{ transform: [{ scaleY: -1 }], alignItems: 'center', paddingVertical: space.xxl }}>
              <T v="small">Belum ada pesan. Sapa {p?.name ?? 'temanmu'}!</T>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.fromMe
                  ? { alignSelf: 'flex-end', backgroundColor: c.accent, borderBottomRightRadius: 4 }
                  : { alignSelf: 'flex-start', backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderBottomLeftRadius: 4 },
              ]}>
              <Text style={{ color: item.fromMe ? c.accentInk : c.text, fontFamily: font.regular, fontSize: 15, lineHeight: 21 }}>
                {item.body}
              </Text>
              <Text style={[styles.meta, { color: item.fromMe ? c.accentInk : c.muted }]}>
                {clock(item.createdAt)}
                {item.fromMe ? (item.readAt ? ' · dibaca' : ' · terkirim') : ''}
              </Text>
            </View>
          )}
        />
      )}
      {error && msgs !== null ? (
        <Text style={{ color: c.danger, paddingHorizontal: space.lg, fontFamily: font.medium }}>{errorText(error)}</Text>
      ) : null}
      {p && !canSend ? (
        <View style={[styles.notice, { backgroundColor: c.surface2, paddingBottom: insets.bottom + space.md }]}>
          <T v="small" center>
            {p.blocked
              ? 'Kamu memblokir pengguna ini. Buka blokir dari profilnya untuk mengirim pesan.'
              : 'Pesan hanya bisa dikirim ke teman yang saling mengikuti.'}
          </T>
        </View>
      ) : (
        <View style={[styles.composer, { borderTopColor: c.line, backgroundColor: c.surface, paddingBottom: insets.bottom + space.sm }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Tulis pesan…"
            placeholderTextColor={c.muted}
            multiline
            maxLength={1000}
            style={[styles.input, { color: c.text, backgroundColor: c.surface2 }]}
          />
          <Pressable
            onPress={send}
            disabled={!text.trim() || sending}
            accessibilityLabel="Kirim pesan"
            style={[styles.send, { backgroundColor: text.trim() ? c.accent : c.surface2 }]}>
            <Ionicons name={sending ? 'hourglass-outline' : 'send'} size={18} color={text.trim() ? c.accentInk : c.muted} />
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { flexDirection: 'row', alignItems: 'center', gap: space.sm, maxWidth: 240 },
  bubble: { maxWidth: '80%', borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 8, gap: 2 },
  meta: { fontFamily: font.medium, fontSize: 10, opacity: 0.75, alignSelf: 'flex-end' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, borderTopWidth: 1, paddingHorizontal: space.md, paddingTop: space.sm },
  input: { flex: 1, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10, maxHeight: 120, fontFamily: font.regular, fontSize: 15 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notice: { paddingHorizontal: space.lg, paddingTop: space.md },
});
