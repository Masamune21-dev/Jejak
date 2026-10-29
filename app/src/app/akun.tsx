import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { Profile } from '@shared/api';

import { Button, Card, ErrorBox, Field, Screen, SectionTitle, T } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth, useMe } from '@/lib/auth';
import { useColors } from '@/lib/theme';

/** Pengaturan → Akun: ganti nama tampilan dan kata sandi. Username tidak bisa diganti. */
export default function AccountScreen() {
  return (
    <Screen>
      <NameCard />
      <PasswordCard />
    </Screen>
  );
}

function NameCard() {
  const me = useMe();
  const { updateUser } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState(me.name);
  const save = useMutation({
    mutationFn: () => api<Profile>('/me', { method: 'PATCH', body: { name } }),
    onSuccess: async (p) => {
      setName(p.name);
      await updateUser({ name: p.name });
      // Nama tampil di banyak tempat (feed, postingan, leaderboard): ambil ulang semuanya.
      void qc.invalidateQueries();
    },
  });
  const trimmed = name.trim();
  return (
    <>
      <SectionTitle>Nama tampilan</SectionTitle>
      <Card>
        <Field
          icon="person-outline"
          value={name}
          onChangeText={(t) => {
            setName(t);
            save.reset();
          }}
          placeholder="mis. Dicky"
          maxLength={50}
        />
        <T v="small">Username @{me.username} tidak bisa diganti.</T>
        {save.error ? <ErrorBox error={save.error} /> : null}
        {save.isSuccess ? <Done text="Nama disimpan." /> : null}
        <Button
          title="Simpan nama"
          icon="checkmark"
          loading={save.isPending}
          disabled={!trimmed || trimmed === me.name}
          onPress={() => save.mutate()}
        />
      </Card>
    </>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const change = useMutation({
    mutationFn: async () => {
      if (next !== repeat) throw new Error('Kata sandi baru dan ulangannya tidak sama');
      await api('/me/password', { method: 'PUT', body: { currentPassword: current, newPassword: next } });
    },
    onSuccess: () => {
      setCurrent('');
      setNext('');
      setRepeat('');
    },
  });
  const edit = (set: (v: string) => void) => (v: string) => {
    set(v);
    change.reset();
  };
  return (
    <>
      <SectionTitle>Kata sandi</SectionTitle>
      <Card>
        <Field
          icon="lock-closed-outline"
          label="Kata sandi sekarang"
          value={current}
          onChangeText={edit(setCurrent)}
          secureTextEntry
          autoComplete="current-password"
        />
        <Field
          icon="key-outline"
          label="Kata sandi baru"
          value={next}
          onChangeText={edit(setNext)}
          secureTextEntry
          autoComplete="new-password"
          placeholder="minimal 6 karakter"
        />
        <Field
          icon="key-outline"
          label="Ulangi kata sandi baru"
          value={repeat}
          onChangeText={edit(setRepeat)}
          secureTextEntry
          autoComplete="new-password"
          onSubmitEditing={() => current && next && repeat && change.mutate()}
        />
        {change.error ? <ErrorBox error={change.error} /> : null}
        {change.isSuccess ? (
          <Done text="Kata sandi diganti. HP dan browser lain yang masuk dengan akun ini sudah dikeluarkan." />
        ) : null}
        <Button
          title="Ganti kata sandi"
          icon="shield-checkmark-outline"
          loading={change.isPending}
          disabled={!current || !next || !repeat}
          onPress={() => change.mutate()}
        />
      </Card>
    </>
  );
}

function Done({ text }: { text: string }) {
  const c = useColors();
  return (
    <T v="small" color={c.accentText}>
      {text}
    </T>
  );
}
