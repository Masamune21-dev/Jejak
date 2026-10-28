import Ionicons from '@expo/vector-icons/Ionicons';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Row, SectionTitle, Segmented, T } from '@/components/ui';
import { API_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { ACCENTS, font, glow, radius, setThemePrefs, space, useColors, useThemePrefs, type AccentKey, type ThemeMode } from '@/lib/theme';

const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];

export default function SettingsScreen() {
  const c = useColors();
  const prefs = useThemePrefs();
  const { signOut } = useAuth();
  // Versi dari app.json; nomor build Android (versionCode) dari APK yang terpasang. Di web/Expo Go bisa kosong.
  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '–';
  const build = Application.nativeBuildVersion;

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.page}>
      <SectionTitle>Tampilan</SectionTitle>
      <Card style={{ gap: space.lg }}>
        <View style={{ gap: space.sm }}>
          <T v="label">Tema</T>
          <Segmented<ThemeMode>
            options={[
              { key: 'system', label: 'Ikuti HP' },
              { key: 'dark', label: 'Gelap' },
              { key: 'light', label: 'Terang' },
            ]}
            value={prefs.mode}
            onChange={(mode) => setThemePrefs({ mode })}
          />
        </View>
        <View style={{ gap: space.sm }}>
          <T v="label">Warna aksen</T>
          <View style={styles.swatches}>
            {ACCENT_KEYS.map((key) => {
              const on = prefs.accent === key;
              const a = ACCENTS[key];
              return (
                <Pressable
                  key={key}
                  onPress={() => setThemePrefs({ accent: key })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={a.name}
                  style={styles.swatchCell}>
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: a.base, borderColor: on ? c.text : 'transparent' },
                      on && glow(a.base, 0.6),
                    ]}>
                    {on ? <Ionicons name="checkmark" size={22} color={a.ink} /> : null}
                  </View>
                  <Text style={[styles.swatchLabel, { color: on ? c.text : c.muted }]} numberOfLines={1}>
                    {a.short}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        {/* Pratinjau kecil dengan warna yang dipilih. */}
        <Row gap={space.sm}>
          <View style={[styles.preview, { backgroundColor: c.accent }]}>
            <Text style={{ color: c.accentInk, fontFamily: font.bold }}>Mulai lari</Text>
          </View>
          <View style={[styles.preview, { backgroundColor: c.accentSoft, borderColor: c.accent + '55', borderWidth: 1 }]}>
            <Text style={{ color: c.accentText, fontFamily: font.bold }}>6,12 km</Text>
          </View>
        </Row>
      </Card>

      <SectionTitle>Tentang aplikasi</SectionTitle>
      <Card style={{ gap: space.md }}>
        <Row gap={space.md}>
          <View style={[styles.logo, { backgroundColor: c.accent }, glow(c.accent, 0.6)]}>
            <Ionicons name="footsteps" size={24} color={c.accentInk} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontFamily: font.black, fontSize: 24, letterSpacing: -0.8 }}>
              jejak<Text style={{ color: c.accentText }}>.</Text>
            </Text>
            <T v="small">Rekam lari dan gowes, buat rute, adu waktu dengan teman.</T>
          </View>
        </Row>
        <InfoRow label="Versi" value={build ? `${version} (build ${build})` : version} />
        <InfoRow label="Pembuat" value="Dibuat oleh Masamune" />
        <InfoRow label="Server" value={API_URL.replace(/^https?:\/\//, '')} />
        <InfoRow label="Peta" value="© OpenStreetMap contributors" />
        <InfoRow label="Rute" value="OSRM, routing.openstreetmap.de (FOSSGIS)" />
        <T v="small">
          Pesan chat tersimpan di server Jejak dan tidak terenkripsi ujung-ke-ujung. Foto yang kamu unggah dibersihkan dari data
          lokasi sebelum disimpan.
        </T>
      </Card>

      <Button
        kind="soft"
        icon="log-out-outline"
        title="Keluar"
        onPress={async () => {
          if (await confirm('Keluar', 'Keluar dari akun ini?', 'Keluar')) await signOut();
        }}
      />
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={[styles.info, { borderTopColor: c.line }]}>
      <T v="label">{label}</T>
      <Text style={{ color: c.text, fontFamily: font.semibold, fontSize: 14, flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md, paddingBottom: 48 },
  swatches: { flexDirection: 'row', justifyContent: 'space-between' },
  swatchCell: { alignItems: 'center', gap: 6, width: '19%' },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  swatchLabel: { fontFamily: font.medium, fontSize: 11 },
  preview: { flex: 1, borderRadius: radius.pill, paddingVertical: 12, alignItems: 'center' },
  logo: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  info: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md, borderTopWidth: 1, paddingTop: space.md },
});
