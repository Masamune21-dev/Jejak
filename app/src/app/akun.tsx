import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { Profile } from '@shared/api';

import { Button, Card, ErrorBox, Field, Screen, SectionTitle, T } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { useAuth, useMe } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { shareTextFile } from '@/lib/share-file';
import { useColors } from '@/lib/theme';

/** Pengaturan → Akun: ganti nama dan kata sandi, ekspor data, hapus akun. */
export default function AccountScreen() {
  return (
    <Screen>
      <NameCard />
      <PasswordCard />
      <ExportCard />
      <DeleteCard />
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

/** Unduh semua data pengguna sebagai satu berkas JSON lewat lembar berbagi. */
function ExportCard() {
  const me = useMe();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const download = async () => {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const data = await api<unknown>('/me/export', { timeoutMs: 60_000 });
      const stamp = new Date().toISOString().slice(0, 10);
      await shareTextFile(
        `jejak-${me.username}-${stamp}.json`,
        'application/json',
        JSON.stringify(data, null, 2),
        'Ekspor data Jejak',
      );
      setDone(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <SectionTitle>Data saya</SectionTitle>
      <Card>
        <T v="small">
          Unduh semua datamu dalam satu berkas JSON: profil, aktivitas beserta jejak GPS, rute, segmen, postingan,
          komentar, like, dan daftar teman.
        </T>
        <T v="small">
          Tautan foto di dalam berkas berlaku sekitar dua minggu. Pesan chat hanya memuat pesan yang kamu kirim.
        </T>
        {error ? <ErrorBox error={new Error(error)} /> : null}
        {done ? <Done text="Berkas ekspor sudah dibuat." /> : null}
        <Button title="Ekspor semua data" icon="download-outline" loading={busy} onPress={() => void download()} />
      </Card>
    </>
  );
}

/** Hapus akun permanen; kata sandi diminta supaya HP yang tertinggal tidak bisa menghapus akun. */
function DeleteCard() {
  const c = useColors();
  const me = useMe();
  const { signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = async () => {
    const ok = await confirm(
      'Hapus akun permanen',
      `Akun @${me.username}, seluruh aktivitas, rute, segmen, postingan, foto, komentar, like, dan pesan akan dihapus dan tidak bisa dikembalikan.`,
      'Hapus akun',
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await api('/me', { method: 'DELETE', body: { password } });
      await signOut();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };
  return (
    <>
      <SectionTitle>Hapus akun</SectionTitle>
      <Card>
        <T v="small">
          Tindakan ini permanen dan tidak bisa dibatalkan. Ekspor datamu lebih dulu bila masih diperlukan.
        </T>
        <Field
          icon="lock-closed-outline"
          label="Kata sandi"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setError(null);
          }}
          secureTextEntry
          autoComplete="current-password"
          placeholder="Masukkan kata sandi untuk konfirmasi"
        />
        {error ? (
          <T v="small" color={c.danger}>
            {error}
          </T>
        ) : null}
        <Button
          kind="danger"
          icon="trash-outline"
          title="Hapus akun permanen"
          loading={busy}
          disabled={!password}
          onPress={() => void remove()}
        />
      </Card>
    </>
  );
}
