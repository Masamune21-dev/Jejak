import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import type { AuthResult } from '@shared/api';

import { Button, ErrorBox, Field, Segmented, T } from '@/components/ui';
import { api, API_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { font, radius, space, useColors } from '@/lib/theme';

const INK = '#0E1114';
const VOLT = '#C6F03C';

/** Garis kontur & jejak rute sebagai ilustrasi sampul. */
function Trail() {
  const contours = [
    'M-20 60 C 80 20, 160 90, 260 50 S 420 10, 520 60',
    'M-20 110 C 70 70, 170 140, 270 100 S 420 60, 520 110',
    'M-20 160 C 90 120, 160 190, 280 150 S 430 110, 520 160',
    'M-20 210 C 80 170, 180 240, 280 200 S 420 160, 520 210',
  ];
  return (
    <Svg width="100%" height="100%" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
      {contours.map((d) => (
        <Path key={d} d={d} stroke="#ffffff" strokeOpacity={0.07} strokeWidth={1.5} fill="none" />
      ))}
      <Path
        d="M75 120 C 110 100, 100 66, 150 60 S 220 86, 250 56 S 290 28, 325 38"
        stroke={VOLT}
        strokeWidth={5}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={75} cy={120} r={7} fill="#17B26A" stroke="#fff" strokeWidth={3} />
      <Circle cx={325} cy={38} r={7} fill="#FF4F1A" stroke="#fff" strokeWidth={3} />
    </Svg>
  );
}

export default function SignInScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.hero, { paddingTop: insets.top + space.xl }]}>
          <Trail />
          <View style={styles.heroText}>
            <Text style={styles.wordmark}>
              jejak<Text style={{ color: VOLT }}>.</Text>
            </Text>
            <Text style={styles.tagline}>Lari, gowes, jalan.{'\n'}Buat rutemu sendiri, adu waktu dengan teman.</Text>
          </View>
        </View>

        <View style={[styles.form, { backgroundColor: c.bg, paddingBottom: insets.bottom + space.xl }]}>
          <Segmented
            options={[
              { key: 'masuk', label: 'Masuk' },
              { key: 'daftar', label: 'Daftar' },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
          />
          <Field
            icon="at"
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="mis. dicky_lari"
          />
          {daftar ? (
            <Field icon="person-outline" label="Nama tampilan" value={name} onChangeText={setName} placeholder="mis. Dicky" />
          ) : null}
          <Field
            icon="lock-closed-outline"
            label="Kata sandi"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={daftar ? 'minimal 6 karakter' : 'kata sandi'}
            onSubmitEditing={submit}
          />
          {error ? <ErrorBox error={error} /> : null}
          <Button
            title={daftar ? 'Buat akun' : 'Masuk'}
            icon="arrow-forward"
            onPress={submit}
            loading={busy}
            style={{ marginTop: space.xs }}
          />
          <T v="small" center style={{ marginTop: space.md }}>
            Server: {API_URL.replace(/^https?:\/\//, '')}
          </T>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: INK,
    minHeight: 330,
    justifyContent: 'flex-end',
    paddingHorizontal: space.xl,
    paddingBottom: space.xl + 12,
    overflow: 'hidden',
  },
  heroText: { gap: space.sm },
  wordmark: { fontFamily: font.numBold, fontSize: 76, color: '#fff', letterSpacing: -1, lineHeight: 80 },
  tagline: { fontFamily: font.medium, fontSize: 16, lineHeight: 23, color: 'rgba(255,255,255,0.75)' },
  form: {
    flex: 1,
    marginTop: -radius.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    gap: space.md,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
});
