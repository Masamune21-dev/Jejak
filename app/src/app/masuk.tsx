import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AuthResult } from '@shared/api';
import type { LatLon } from '@shared/geo';

import StaticMap from '@/components/StaticMap';
import { Button, Card, ErrorBox, Field, Segmented } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { font, glow, space, useColors } from '@/lib/theme';

/** Rute sungguhan "Keliling Giripurwo", Wonogiri (disederhanakan), sebagai sampul halaman masuk. */
const GIRIPURWO: LatLon[] = [
  [-7.813612, 110.923116],
  [-7.813863, 110.924519],
  [-7.813986, 110.926186],
  [-7.814421, 110.926166],
  [-7.814676, 110.929772],
  [-7.814343, 110.930069],
  [-7.814338, 110.930473],
  [-7.813814, 110.931964],
  [-7.814377, 110.932048],
  [-7.814997, 110.932207],
  [-7.816554, 110.932169],
  [-7.818498, 110.931954],
  [-7.818379, 110.931477],
  [-7.818089, 110.931113],
  [-7.818379, 110.931477],
  [-7.818498, 110.931954],
  [-7.816554, 110.932169],
  [-7.814997, 110.932207],
  [-7.814377, 110.932048],
  [-7.813814, 110.931964],
  [-7.814313, 110.930583],
  [-7.814676, 110.929772],
  [-7.814553, 110.92797],
  [-7.816202, 110.92792],
  [-7.816606, 110.92769],
  [-7.81745, 110.927509],
  [-7.817739, 110.927349],
  [-7.819084, 110.926837],
  [-7.818962, 110.925775],
  [-7.819693, 110.925645],
  [-7.820072, 110.925404],
  [-7.819741, 110.923622],
  [-7.818783, 110.923801],
  [-7.817481, 110.923938],
  [-7.813863, 110.924519],
  [-7.813612, 110.923116],
];

const HERO = 300;

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

  const switchMode = (m: 'masuk' | 'daftar') => {
    setMode(m);
    setError(null);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + space.xl }} keyboardShouldPersistTaps="handled">
        <View style={{ height: HERO + insets.top }}>
          <StaticMap
            points={GIRIPURWO}
            height={HERO + insets.top}
            radius={0}
            pad={48}
            color={c.accent}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(8,13,11,0.55)', 'rgba(8,13,11,0)', 'rgba(8,13,11,0)', c.bg]}
            locations={[0, 0.3, 0.6, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={[styles.routeChip, { top: insets.top + space.md, backgroundColor: 'rgba(17,25,22,0.85)', borderColor: c.line }]}>
            <View style={[styles.liveDot, { backgroundColor: c.accent }, glow(c.accent, 0.6)]} />
            <Text style={[styles.routeChipText, { color: c.text }]}>Keliling Giripurwo, Wonogiri</Text>
            <Text style={[styles.routeChipText, { color: c.accent }]}>4,7 km</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: c.accent }, glow(c.accent, 0.9)]}>
              <Ionicons name="footsteps" size={26} color={c.accentInk} />
            </View>
            <Text style={[styles.wordmark, { color: c.text }]}>
              jejak<Text style={{ color: c.accent }}>.</Text>
            </Text>
          </View>
          <Text style={[styles.tagline, { color: c.muted }]}>
            Rekam lari dan gowesmu, buat rute sendiri, lalu adu waktu dengan teman.
          </Text>

          <Card style={styles.form}>
            <Segmented
              options={[
                { key: 'masuk', label: 'Masuk' },
                { key: 'daftar', label: 'Daftar baru' },
              ]}
              value={mode}
              onChange={switchMode}
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
              icon={daftar ? 'person-add' : 'arrow-forward'}
              loading={busy}
              onPress={submit}
              style={{ marginTop: space.xs }}
            />
          </Card>

          <Pressable onPress={() => switchMode(daftar ? 'masuk' : 'daftar')} hitSlop={8} style={styles.switch}>
            <Text style={[styles.switchText, { color: c.muted }]}>
              {daftar ? 'Sudah punya akun? ' : 'Belum punya akun? '}
              <Text style={{ color: c.accent, fontFamily: font.bold }}>{daftar ? 'Masuk' : 'Daftar sekarang'}</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  routeChip: {
    position: 'absolute',
    left: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  routeChipText: { fontFamily: font.semibold, fontSize: 12 },
  body: {
    marginTop: -space.xxl,
    paddingHorizontal: space.lg + 4,
    gap: space.md,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  logo: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: font.black, fontSize: 42, letterSpacing: -1.5, lineHeight: 50 },
  tagline: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, maxWidth: 340, marginBottom: space.sm },
  form: { gap: space.lg, padding: space.lg + 2 },
  switch: { alignSelf: 'center', paddingVertical: space.sm },
  switchText: { fontFamily: font.medium, fontSize: 14 },
});
