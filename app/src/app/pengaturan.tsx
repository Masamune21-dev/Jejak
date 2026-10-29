import Ionicons from '@expo/vector-icons/Ionicons';
import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, Row, SectionTitle, Segmented, T, type IconName } from '@/components/ui';
import { API_URL, errorText } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { contactInfo, CONTACTS, feedbackUrl } from '@/lib/contact';
import { usePush } from '@/lib/push-state';
import { ACCENTS, font, glow, radius, setThemePrefs, space, useColors, useThemePrefs, type AccentKey, type ThemeMode } from '@/lib/theme';
import { APP_VERSION, openApkDownload, UPDATE_CHECKED, useUpdate } from '@/lib/update';

const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];

export default function SettingsScreen() {
  const c = useColors();
  const prefs = useThemePrefs();
  const { signOut } = useAuth();
  const update = useUpdate();
  const feedback = feedbackUrl();
  // Nomor build Android (versionCode) hanya dari APK sendiri. Di Expo Go angka build milik Expo Go.
  const build = Constants.executionEnvironment === ExecutionEnvironment.StoreClient ? null : Application.nativeBuildVersion;

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

      <NotificationSettings />

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
        <InfoRow label="Versi" value={build ? `${APP_VERSION} (build ${build})` : APP_VERSION} />
        {UPDATE_CHECKED && update.checked ? (
          <InfoRow label="Pembaruan" value={update.latest ? `Jejak ${update.latest.versi} tersedia` : 'Sudah versi terbaru'} />
        ) : null}
        {update.latest ? (
          <Button small title={`Unduh Jejak ${update.latest.versi}`} icon="download-outline" onPress={() => void openApkDownload(update.latest!.versi)} />
        ) : null}
        <InfoRow label="Pembuat" value="Dibuat oleh Masamune" />
        {CONTACTS.map((ct) => {
          const info = contactInfo(ct);
          return <LinkRow key={ct.kind} icon={info.icon} label={info.label} value={info.text} onPress={() => void Linking.openURL(info.url)} />;
        })}
        <InfoRow label="Server" value={API_URL.replace(/^https?:\/\//, '')} />
        <InfoRow label="Peta" value="© OpenStreetMap contributors" />
        <InfoRow label="Rute" value="OSRM, routing.openstreetmap.de (FOSSGIS)" />
        <T v="small">
          Pesan chat tersimpan di server Jejak dan tidak terenkripsi ujung-ke-ujung. Foto yang kamu unggah dibersihkan dari data
          lokasi sebelum disimpan. Bila notifikasi dinyalakan, token notifikasi HP ini disimpan di server Jejak dan notifikasi
          dikirim lewat Firebase Cloud Messaging (Google).
        </T>
        {feedback ? (
          <Button small kind="soft" title="Kirim masukan" icon="chatbox-ellipses-outline" onPress={() => void Linking.openURL(feedback)} />
        ) : null}
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

/** Hanya di APK: sakelar notifikasi info dan pembaruan, dengan jalan ke pengaturan HP bila izinnya ditolak. */
function NotificationSettings() {
  const c = useColors();
  const p = usePush();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!p.state || p.state === 'unsupported') return null;
  const on = p.state === 'on' || p.state === 'blocked';
  const toggle = async (next: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await (next ? p.enable() : p.disable());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <SectionTitle>Notifikasi</SectionTitle>
      <Card style={{ gap: space.md }}>
        <Row>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="strong">Info dan pembaruan</T>
            <T v="small">Pengumuman penting dan kabar versi baru Jejak.</T>
          </View>
          <Switch value={on} disabled={busy} onValueChange={(v) => void toggle(v)} trackColor={{ true: c.accentText }} />
        </Row>
        {p.state === 'blocked' ? (
          <>
            <T v="small" color={c.danger}>
              Izin notifikasi untuk Jejak dimatikan di pengaturan HP, jadi notifikasi tidak akan tampil.
            </T>
            <Button small kind="soft" title="Buka pengaturan HP" icon="settings-outline" onPress={() => void Linking.openSettings()} />
          </>
        ) : null}
        {error ? (
          <T v="small" color={c.danger}>
            {error}
          </T>
        ) : null}
      </Card>
    </>
  );
}

function LinkRow({ icon, label, value, onPress }: { icon: IconName; label: string; value: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.info, { borderTopColor: c.line, opacity: pressed ? 0.7 : 1 }]}>
      <Row gap={space.sm}>
        <Ionicons name={icon} size={16} color={c.muted} />
        <T v="label">{label}</T>
      </Row>
      <Row gap={6} style={{ flexShrink: 1 }}>
        <Text style={{ color: c.accentText, fontFamily: font.semibold, fontSize: 14, flexShrink: 1, textAlign: 'right' }}>{value}</Text>
        <Ionicons name="open-outline" size={14} color={c.muted} />
      </Row>
    </Pressable>
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
