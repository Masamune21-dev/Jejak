import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AuthResult } from '@shared/api';
import { pathDistance } from '@shared/geo';

import StaticMap from '@/components/StaticMap';
import { Button, Card, ErrorBox, Field, KeyboardAvoid, Segmented } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PATI } from '@/lib/demo-route';
import { km } from '@/lib/format';
import { alpha, font, glow, space, useColors } from '@/lib/theme';
import { OSM_ATTRIBUTION } from '@/lib/tiles';

const PATI_KM = km(pathDistance(PATI), 1);

const HERO = 300;

export default function SignInScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollHeight = useRef(0);
  // ?mode=daftar dari landing page membuka form daftar langsung.
  const [mode, setMode] = useState<'masuk' | 'daftar'>(useLocalSearchParams<{ mode?: string }>().mode === 'daftar' ? 'daftar' : 'masuk');
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

  // Keyboard muncul → ScrollView memendek. Geser ke bawah supaya form dan tombol ikut naik di atas keyboard.
  const onScrollLayout = (height: number) => {
    if (height < scrollHeight.current) scroll.current?.scrollToEnd({ animated: true });
    scrollHeight.current = height;
  };

  return (
    // Android selalu edge-to-edge (Expo SDK 54+), jadi jendela tidak mengecil sendiri saat keyboard muncul;
    // "padding" juga perlu di Android supaya form tidak tertutup.
    <KeyboardAvoid style={{ backgroundColor: c.bg }}>
      <ScrollView
        ref={scroll}
        onLayout={(e) => onScrollLayout(e.nativeEvent.layout.height)}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + space.xl }}
        keyboardShouldPersistTaps="handled">
        <View style={{ height: HERO + insets.top }}>
          <StaticMap
            points={PATI}
            height={HERO + insets.top}
            radius={0}
            pad={48}
            color={c.track}
            attribution={false}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[alpha(c.bg, 0.55), alpha(c.bg, 0), alpha(c.bg, 0), c.bg]}
            locations={[0, 0.3, 0.6, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Tepi bawah peta tertutup gradasi dan kartu, jadi atribusi OSM digambar di atasnya. */}
          <Text style={[styles.attrib, { color: c.muted }]}>{OSM_ATTRIBUTION}</Text>
          <View
            style={[
              styles.routeChip,
              { top: insets.top + space.md, backgroundColor: alpha(c.surface, 0.85), borderColor: c.line },
            ]}>
            <View style={[styles.liveDot, { backgroundColor: c.accent }, glow(c.accent, 0.6)]} />
            <Text style={[styles.routeChipText, { color: c.text }]}>Keliling Alun-alun Pati</Text>
            <Text style={[styles.routeChipText, { color: c.accentText }]}>{PATI_KM} km</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: c.accent }, glow(c.accent, 0.9)]}>
              <Ionicons name="footsteps" size={26} color={c.accentInk} />
            </View>
            <Text style={[styles.wordmark, { color: c.text }]}>
              jejak<Text style={{ color: c.accentText }}>.</Text>
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
              <Text style={{ color: c.accentText, fontFamily: font.bold }}>{daftar ? 'Masuk' : 'Daftar sekarang'}</Text>
            </Text>
          </Pressable>
          {Platform.OS === 'web' ? (
            <Pressable onPress={() => router.replace('/')} hitSlop={8} style={styles.switch} accessibilityRole="link">
              <Text style={[styles.switchText, { color: c.muted }]}>Kenali Jejak lebih dulu</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoid>
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
  attrib: { position: 'absolute', right: space.lg + 4, bottom: space.xxl + 6, fontFamily: font.medium, fontSize: 10 },
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
