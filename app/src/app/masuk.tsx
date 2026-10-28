import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AuthResult } from '@shared/api';

import { Button, ErrorBox, Field, Screen, T } from '@/components/ui';
import { api, API_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { space, useColors } from '@/lib/theme';

export default function SignInScreen() {
  const c = useColors();
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'masuk' | 'daftar'>('masuk');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const daftar = mode === 'daftar';

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api<AuthResult>(daftar ? '/auth/register' : '/auth/login', {
        body: daftar ? { username, name, password } : { username, password },
      });
      await signIn(r);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Screen style={{ flexGrow: 1, justifyContent: 'center', maxWidth: 480, width: '100%', alignSelf: 'center' }}>
          <View style={{ gap: space.xs, marginBottom: space.lg }}>
            <T size={40} weight="900" style={{ color: c.primary }}>
              Jejak
            </T>
            <T muted size={16}>
              Rekam lari & bersepeda, buat rute sendiri, dan adu waktu di segmen bersama teman.
            </T>
          </View>
          <Field
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="mis. dicky_lari"
          />
          {daftar ? <Field label="Nama tampilan" value={name} onChangeText={setName} placeholder="mis. Dicky" /> : null}
          <Field
            label="Kata sandi"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={daftar ? 'minimal 6 karakter' : ''}
            onSubmitEditing={submit}
          />
          {error ? <ErrorBox error={error} /> : null}
          <Button title={daftar ? 'Daftar' : 'Masuk'} onPress={submit} loading={busy} />
          <Button
            kind="ghost"
            title={daftar ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
            onPress={() => {
              setMode(daftar ? 'masuk' : 'daftar');
              setError(null);
            }}
          />
          <T muted size={12} style={{ textAlign: 'center', marginTop: space.lg }}>
            Server: {API_URL}
          </T>
        </Screen>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
