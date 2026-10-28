import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import type { UserListItem } from '@shared/api';

import { Avatar, Button, Card, Empty, ErrorBox, Field, Row, T } from '@/components/ui';
import { api } from '@/lib/api';
import { space, useColors } from '@/lib/theme';

export default function SearchScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);

  const q = useQuery({
    queryKey: ['users', query],
    queryFn: () => api<UserListItem[]>(`/users?q=${encodeURIComponent(query)}`),
    placeholderData: (prev) => prev,
  });
  const follow = useMutation({
    mutationFn: (u: UserListItem) => api(`/users/${u.id}/follow`, { method: u.isFollowing ? 'DELETE' : 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      void qc.invalidateQueries({ queryKey: ['timeline'] });
      void qc.invalidateQueries({ queryKey: ['user'] });
    },
  });

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: space.lg, gap: space.md }}
      keyboardShouldPersistTaps="handled"
      data={q.data ?? []}
      keyExtractor={(u) => String(u.id)}
      ListHeaderComponent={
        <View style={{ gap: space.sm }}>
          <Field
            icon="search"
            value={text}
            onChangeText={setText}
            placeholder="Cari nama atau username"
            autoCapitalize="none"
            autoFocus
          />
          {q.error ? <ErrorBox error={q.error} onRetry={() => q.refetch()} /> : null}
        </View>
      }
      ListEmptyComponent={
        q.isPending ? undefined : <Empty icon="people" title="Tidak ada yang cocok" text="Ajak temanmu daftar di Jejak dulu." />
      }
      renderItem={({ item }) => (
        <Card style={{ padding: space.md }}>
          <Row>
            <Pressable style={{ flex: 1 }} onPress={() => router.push(`/atlet/${item.id}`)}>
              <Row>
                <Avatar name={item.name} uri={item.avatarUrl} size={44} />
                <View style={{ flex: 1 }}>
                  <T v="strong">{item.name}</T>
                  <T v="small">@{item.username}</T>
                </View>
              </Row>
            </Pressable>
            <Button
              small
              kind={item.isFollowing ? 'soft' : 'primary'}
              icon={item.isFollowing ? 'checkmark' : 'person-add'}
              title={item.isFollowing ? 'Mengikuti' : 'Ikuti'}
              loading={follow.isPending && follow.variables?.id === item.id}
              onPress={() => follow.mutate(item)}
            />
          </Row>
        </Card>
      )}
    />
  );
}
