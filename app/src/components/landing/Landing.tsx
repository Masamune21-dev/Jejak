import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Head from 'expo-router/head';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type PressableStateCallbackType,
  type ViewStyle,
} from 'react-native';

import {
  BoardFragment,
  ChatFragment,
  DISPLAY,
  Faq,
  GuideFragment,
  HeroStats,
  LockScreenFragment,
  Patok,
  Rambu,
  RambuItem,
  StickerFragment,
  useDemoProgress,
} from '@/components/landing/parts';
import DonationModal from '@/components/landing/DonationModal';
import StaticMap from '@/components/StaticMap';
import { PATI } from '@/lib/demo-route';
import { alpha, font, palette as c, ROAD } from '@/lib/theme';

/** Info APK terbaru yang ditulis `deploy/deploy.sh apk` di /unduh/versi.json. */
interface ApkInfo {
  versi: string;
  build?: number;
  ukuranMB?: number;
}

const APK_URL = '/unduh/jejak.apk';
const NAV_H = 68;
/** Pergantian latar navigasi (transparan ↔ padat) memudar, bukan meloncat. Gaya khusus web. */
const FADE = { transitionProperty: 'opacity', transitionDuration: '220ms' } as ViewStyle;

/** Halaman depan versi web untuk pengunjung yang belum masuk, di alamat utama `/` (lihat `app/(tabs)/_layout.tsx`). */
export default function LandingScreen() {
  const { width, height: winH } = useWindowDimensions();
  const p = useDemoProgress();
  const [heroBox, setHeroBox] = useState(0);
  const [solid, setSolid] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const anchors = useRef<Record<string, number>>({});
  const [apk, setApk] = useState<ApkInfo | null>(null);
  const [donate, setDonate] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    fetch('/unduh/versi.json')
      .then((r) => (r.ok ? (r.json() as Promise<ApkInfo>) : null))
      .then(setApk)
      .catch(() => {});
  }, []);

  const wide = width >= 960;
  const mid = width >= 680;
  const gutter = mid ? 32 : 16;
  const goTo = (id: string) => scroll.current?.scrollTo({ y: Math.max(0, (anchors.current[id] ?? 0) - NAV_H), animated: true });
  // Unduhan lewat modal donasi dulu. ?v= supaya cache Cloudflare tidak memberi APK lama tepat setelah rilis.
  const apkUrl = apk ? `${APK_URL}?v=${encodeURIComponent(apk.versi)}` : APK_URL;
  const download = () => setDonate(true);
  const h1 = wide ? 104 : mid ? 80 : 50;
  // Hero setinggi layar, navigasi transparan melayang di atasnya. Di HP isinya bisa lebih tinggi; peta latar
  // mengikuti tinggi sebenarnya.
  const heroH = Math.max(winH, wide ? 680 : 660);
  const mapH = Math.max(heroH, heroBox);
  // Di HP teks dimulai di 40% ruang di bawah navigasi (bukan tinggi hero terukur, supaya tata letak tidak berputar).
  const textTop = NAV_H + (heroH - NAV_H) * 0.4;
  // Navigasi dan hero memenuhi layar kiri-kanan dengan jarak tepi 5% lebar layar; bagian lain tetap 1120 px di tengah.
  const edge = wide ? Math.max(gutter, Math.round(width * 0.05)) : gutter;
  const frame: ViewStyle = { width: '100%', paddingHorizontal: edge };
  // Rute demo di kanan (desktop, di atas kartu angka) atau di atas teks (HP).
  const mapPad = wide
    ? { top: mapH * 0.14, bottom: mapH * 0.34, left: width * 0.52, right: edge + 24 }
    : { top: NAV_H + 140, bottom: mapH - textTop + 12, left: gutter + 8, right: gutter + 8 };
  const h2 = wide ? 60 : mid ? 52 : 42;

  const features: { title: string; text: string; fragment: ReactNode }[] = [
    {
      title: 'Tetap merekam saat layar mati',
      text: 'Masukkan HP ke saku dan mulai lari. Rekaman berjalan di latar, tetap aman walau aplikasi tertutup, dan tersimpan di HP sampai sinyal kembali.',
      fragment: <LockScreenFragment />,
    },
    {
      title: 'Rute yang menempel ke jalan',
      text: 'Ketuk beberapa titik di peta, garisnya langsung mengikuti jalan dan gang. Saat merekam, Jejak memberi tahu belokan berikutnya dan bergetar bila kamu keluar jalur.',
      fragment: <GuideFragment />,
    },
    {
      title: 'Adu waktu di segmen',
      text: 'Jadikan tanjakan atau jalan lurus favoritmu sebagai segmen. Setiap aktivitas yang melewatinya otomatis masuk papan peringkat, termasuk aktivitas lama.',
      fragment: <BoardFragment />,
    },
    {
      title: 'Stiker untuk Story',
      text: 'Tempel garis rute dan angkamu di atas foto sendiri. Ada lima gaya stiker transparan yang tinggal disimpan atau disalin ke Instagram.',
      fragment: <StickerFragment />,
    },
    {
      title: 'Ramai bareng teman',
      text: 'Ikuti teman, beri kudos, tulis postingan, ngobrol di diskusi segmen, dan kirim pesan ke teman yang saling mengikuti.',
      fragment: <ChatFragment />,
    },
  ];

  const container: ViewStyle = { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: gutter };

  return (
    <>
      <Head>
        <title>Jejak: rekam lari dan gowes, adu waktu dengan teman</title>
        <meta
          name="description"
          content="Aplikasi gratis untuk merekam lari, gowes, dan jalan kaki dengan GPS, membuat rute yang mengikuti jalan, dan mengadu waktu di segmen bersama teman."
        />
        <meta property="og:title" content="Jejak" />
        <meta property="og:description" content="Rekam lari dan gowes, buat rute sendiri, lalu adu waktu dengan teman." />
      </Head>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          scrollEventThrottle={16}
          // Begitu digulir, navigasi jadi padat supaya judul hero tidak bertumpuk dengan tautan navigasi.
          onScroll={(e) => setSolid(e.nativeEvent.contentOffset.y > 8)}>
          {/* Hero satu layar: peta kota Pati sebagai latar, rute demo tergambar di lokasi aslinya. */}
          <View
            onLayout={(e) => setHeroBox(Math.round(e.nativeEvent.layout.height))}
            style={{ minHeight: heroH, overflow: 'hidden', justifyContent: wide ? 'center' : 'flex-end' }}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <StaticMap points={PATI} height={mapH} radius={0} color={c.accent} progress={p} pad={mapPad} />
            </View>
            {/* Gradasi gelap di sisi teks supaya judul terbaca di atas peta; tepi bawah menyatu ke bagian berikutnya. */}
            <LinearGradient
              colors={
                wide
                  ? [alpha(c.bg, 0.97), alpha(c.bg, 0.86), alpha(c.bg, 0.3), alpha(c.bg, 0.02)]
                  : [alpha(c.bg, 0.2), alpha(c.bg, 0.05), alpha(c.bg, 0.8), alpha(c.bg, 0.98)]
              }
              locations={wide ? [0, 0.4, 0.66, 1] : [0, 0.32, 0.56, 0.78]}
              start={wide ? { x: 0, y: 0 } : { x: 0, y: 0 }}
              end={wide ? { x: 1, y: 0 } : { x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <LinearGradient
              colors={[alpha(c.bg, 0), c.bg]}
              locations={[0.82, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={[frame, { paddingTop: wide ? NAV_H + 48 : textTop, paddingBottom: wide ? 96 : 56 }]}>
              <View style={{ maxWidth: wide ? 600 : undefined, gap: 22 }}>
                <Text accessibilityRole="header" style={[styles.h1, { fontSize: h1, lineHeight: h1 * 0.98 }]}>
                  Setiap jalan dekat rumah bisa jadi lintasanmu.
                </Text>
                <Text style={[styles.lead, { fontSize: mid ? 19 : 17 }]}>
                  Jejak merekam lari, gowes, dan jalan kaki dengan GPS, membuat rute yang menempel ke jalan, lalu mengadu waktumu
                  dengan teman di segmen favorit kalian.
                </Text>
                <View style={{ flexDirection: mid ? 'row' : 'column', gap: 12, marginTop: 6 }}>
                  <CtaButton primary block={!mid} icon="logo-android" label="Unduh untuk Android" onPress={download} />
                  <CtaButton block={!mid} icon="globe-outline" label="Masuk atau daftar" onPress={() => router.push('/masuk')} />
                </View>
                <Text style={styles.note}>
                  Gratis dan tanpa iklan. Aplikasi untuk Android 64‑bit; di iPhone dan komputer, pakai versi web ini.
                </Text>
              </View>
            </View>
            <View
              style={
                wide
                  ? { position: 'absolute', right: edge, bottom: 72, width: 360 }
                  : { position: 'absolute', top: NAV_H + 16, left: gutter, right: gutter }
              }>
              <HeroStats p={p} compact={!wide} />
            </View>
          </View>

          {/* Fitur: potongan UI asli, berselang-seling */}
          <View
            onLayout={(e) => {
              anchors.current.fitur = e.nativeEvent.layout.y;
            }}
            style={[container, { paddingTop: mid ? 120 : 80, gap: mid ? 96 : 64 }]}>
            <Text accessibilityRole="header" style={[styles.h2, { fontSize: h2, lineHeight: h2 * 1.02, maxWidth: 640 }]}>
              Dibuat untuk lari pagi di jalan kampung, bukan stadion.
            </Text>
            {features.map((f, i) => (
              <View
                key={f.title}
                style={{
                  flexDirection: wide ? (i % 2 ? 'row-reverse' : 'row') : 'column',
                  gap: wide ? 64 : 24,
                  alignItems: wide ? 'center' : 'stretch',
                }}>
                <View style={{ flex: wide ? 1 : undefined, gap: 12 }}>
                  <Text accessibilityRole="header" style={[styles.h3, { fontSize: mid ? 40 : 34 }]}>
                    {f.title}
                  </Text>
                  <Text style={styles.body}>{f.text}</Text>
                </View>
                <View style={{ flex: wide ? 1 : undefined }}>{f.fragment}</View>
              </View>
            ))}
          </View>

          {/* Cara pakai: tiga langkah berurutan di patok KM */}
          <View
            onLayout={(e) => {
              anchors.current.cara = e.nativeEvent.layout.y;
            }}
            style={[container, { paddingTop: mid ? 140 : 96, gap: 40 }]}>
            <Text accessibilityRole="header" style={[styles.h2, { fontSize: h2, lineHeight: h2 * 1.02 }]}>
              Dari nol sampai garis finis
            </Text>
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 32 : 28 }}>
              {[
                {
                  title: 'Pasang dan daftar',
                  text: 'Unduh APK atau langsung pakai versi web. Cukup username, nama, dan kata sandi.',
                },
                {
                  title: 'Rekam',
                  text: 'Pilih lari, gowes, atau jalan kaki, lalu tekan Mulai. Tunggu titik GPS hijau dulu supaya awal jejakmu rapi.',
                },
                {
                  title: 'Bagikan dan adu waktu',
                  text: 'Lihat split per km dan rekor barumu, tempel stikernya di Story, atau kejar peringkat di segmen.',
                },
              ].map((s, i) => (
                <View
                  key={s.title}
                  style={{ flex: wide ? 1 : undefined, flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}>
                  <Patok km={i} />
                  <View style={{ flex: 1, gap: 6, paddingTop: 4 }}>
                    <Text style={styles.stepTitle}>{s.title}</Text>
                    <Text style={styles.body}>{s.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Privasi: papan rambu hijau */}
          <View
            onLayout={(e) => {
              anchors.current.privasi = e.nativeEvent.layout.y;
            }}
            style={[container, { paddingTop: mid ? 140 : 96 }]}>
            <View style={{ maxWidth: 760, alignSelf: wide ? 'flex-start' : 'stretch' }}>
              <Rambu title="Rumahmu tidak ikut terlihat">
                <RambuItem>
                  Orang lain tidak melihat 300 m awal dan akhir jejakmu, jadi titik berangkat dari rumah tetap tersembunyi.
                </RambuItem>
                <RambuItem>Lokasi GPS yang tersimpan di foto dihapus sebelum foto diunggah.</RambuItem>
                <RambuItem>Foto, postingan, dan profil hanya bisa dilihat pengguna yang sudah masuk.</RambuItem>
                <RambuItem>
                  Pesan tersimpan di server Jejak dan tidak terenkripsi ujung-ke-ujung. Hanya kamu dan temanmu yang bisa
                  membukanya di aplikasi.
                </RambuItem>
              </Rambu>
            </View>
          </View>

          {/* Unduh + tanya jawab, di atas beton */}
          <View
            onLayout={(e) => {
              anchors.current.unduh = e.nativeEvent.layout.y;
            }}
            style={[styles.beton, { marginTop: mid ? 140 : 96, paddingVertical: mid ? 96 : 64 }]}>
            <View style={[container, { flexDirection: wide ? 'row' : 'column', gap: wide ? 72 : 48 }]}>
              <View style={{ flex: wide ? 1 : undefined, gap: 18 }}>
                <Text accessibilityRole="header" style={[styles.h2, { color: ROAD.aspal, fontSize: h2, lineHeight: h2 * 1.02 }]}>
                  Pasang Jejak di HP Android
                </Text>
                <Text style={[styles.body, { color: '#45484C' }]}>
                  {apk
                    ? `Versi ${apk.versi}${apk.build ? ` (build ${apk.build})` : ''}${apk.ukuranMB ? `, ${apk.ukuranMB.toLocaleString('id-ID')} MB` : ''}. Diunduh langsung dari server Jejak.`
                    : 'Versi terbaru, diunduh langsung dari server Jejak.'}
                </Text>
                <CtaButton primary dark block={!mid} icon="download-outline" label="Unduh APK" onPress={download} />
                <View style={{ gap: 14, marginTop: 8 }}>
                  {[
                    'Buka berkas jejak.apk dari notifikasi unduhan atau aplikasi Files.',
                    'Bila Android bertanya, izinkan "Instal aplikasi tidak dikenal" untuk browser atau Files, lalu tekan Instal.',
                    'Saat pertama merekam, pilih "Izinkan sepanjang waktu" supaya rekaman tetap jalan saat layar mati.',
                  ].map((t, i) => (
                    <View key={t} style={{ flexDirection: 'row', gap: 14 }}>
                      <View style={styles.stepNum}>
                        <Text style={{ color: ROAD.aspal, fontFamily: font.bold, fontSize: 14 }}>{i + 1}</Text>
                      </View>
                      <Text style={[styles.body, { flex: 1, color: ROAD.aspal, fontSize: 16 }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={{ flex: wide ? 1.1 : undefined }}>
                <Text accessibilityRole="header" style={[styles.h3, { color: ROAD.aspal, fontSize: 34, marginBottom: 8 }]}>
                  Sering ditanyakan
                </Text>
                <Faq q="Apakah Jejak gratis?">Ya. Tidak ada langganan dan tidak ada iklan.</Faq>
                <Faq q="Kenapa tidak ada di Play Store?">
                  Untuk sekarang Jejak dibagikan sebagai APK langsung dari situs ini. Versi baru cukup dipasang menimpa yang lama;
                  akun dan aktivitasmu tetap ada karena tersimpan di server.
                </Faq>
                <Faq q="Bisa dipakai di iPhone?">
                  Belum ada aplikasi iPhone. Buka versi web ini di Safari untuk melihat feed, profil, segmen, dan membuat rute.
                  Untuk merekam dengan layar mati, pakai aplikasi Android.
                </Faq>
                <Faq q={'Kenapa butuh izin lokasi "sepanjang waktu"?'}>
                  Supaya rekaman tetap berjalan saat layar mati atau HP di saku. Lokasi latar hanya dipakai selama kamu merekam.
                </Faq>
                <Faq q="Kenapa garis rekamanku kadang sedikit melenceng dari jalan?">
                  GPS HP bisa meleset beberapa meter, apalagi di menit pertama dan di antara gedung. Tunggu titik GPS di layar
                  Rekam berwarna hijau sebelum menekan Mulai.
                </Faq>
              </View>
            </View>
          </View>

          {/* Kaki halaman */}
          <View style={[container, styles.footer, { flexDirection: mid ? 'row' : 'column' }]}>
            <View style={{ gap: 6, flex: 1 }}>
              <Text style={styles.wordmark}>
                jejak<Text style={{ color: c.accent }}>.</Text>
              </Text>
              <Text style={styles.footText}>© {new Date().getFullYear()} Jejak. Gratis dan tanpa iklan.</Text>
              <Text style={styles.footText}>Peta © OpenStreetMap contributors. Rute dari OSRM (FOSSGIS).</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <FootLink label="Masuk" onPress={() => router.push('/masuk')} />
              <FootLink label="Daftar" onPress={() => router.push({ pathname: '/masuk', params: { mode: 'daftar' } })} />
              <FootLink label="Unduh APK" onPress={download} />
            </View>
          </View>
        </ScrollView>
        {/* Navigasi melayang: transparan di atas hero (dengan bayangan tipis supaya terbaca), padat saat halaman digulir. */}
        <View style={[styles.nav, { height: NAV_H }]}>
          <LinearGradient
            colors={[alpha(c.bg, 0.75), alpha(c.bg, 0)]}
            style={[StyleSheet.absoluteFill, FADE, { opacity: solid ? 0 : 1 }]}
            pointerEvents="none"
          />
          <View style={[StyleSheet.absoluteFill, styles.navSolid, FADE, { opacity: solid ? 1 : 0 }]} pointerEvents="none" />
          <View style={[frame, styles.navInner]}>
            <Text style={styles.wordmark} accessibilityRole="header">
              jejak<Text style={{ color: c.accent }}>.</Text>
            </Text>
            {wide ? (
              <View style={styles.navLinks}>
                {[
                  ['fitur', 'Fitur'],
                  ['cara', 'Cara pakai'],
                  ['privasi', 'Privasi'],
                  ['unduh', 'Unduh'],
                ].map(([id, label]) => (
                  <Pressable key={id} onPress={() => goTo(id)} accessibilityRole="link" style={focusable(styles.navLink)}>
                    <Text style={styles.navLinkText}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Pressable onPress={() => router.push('/masuk')} accessibilityRole="link" style={focusable(styles.navButton)}>
              <Text style={styles.navButtonText}>Masuk</Text>
            </Pressable>
          </View>
        </View>
      </View>
      {donate ? <DonationModal apkUrl={apkUrl} onClose={() => setDonate(false)} /> : null}
    </>
  );
}

/** Garis fokus keyboard yang terlihat jelas (web), selain efek tekan. */
function focusable(base: ViewStyle) {
  return (state: PressableStateCallbackType) => {
    const s = state as PressableStateCallbackType & { focused?: boolean; hovered?: boolean };
    return [
      base,
      s.hovered && { opacity: 0.86 },
      s.pressed && { opacity: 0.75 },
      s.focused && { outlineColor: c.accent, outlineStyle: 'solid' as const, outlineWidth: 2, outlineOffset: 3 },
    ];
  };
}

function CtaButton({
  label,
  icon,
  onPress,
  primary,
  dark,
  block,
}: {
  label: string;
  icon: 'logo-android' | 'globe-outline' | 'download-outline';
  onPress: () => void;
  primary?: boolean;
  /** Di latar beton: tombol aspal dengan teks marka. */
  dark?: boolean;
  /** Selebar wadah (layar HP), supaya mudah diketuk. */
  block?: boolean;
}) {
  const bg = dark ? ROAD.aspal : primary ? c.accent : 'transparent';
  const fg = dark ? c.accent : primary ? c.accentInk : c.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={focusable({
        ...styles.cta,
        backgroundColor: bg,
        borderColor: primary || dark ? bg : c.line,
        alignSelf: block ? 'stretch' : 'flex-start',
        justifyContent: 'center',
      })}>
      <Ionicons name={icon} size={20} color={fg} />
      <Text style={{ color: fg, fontFamily: font.bold, fontSize: 17 }}>{label}</Text>
    </Pressable>
  );
}

function FootLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={focusable({ paddingVertical: 6 })}>
      <Text style={{ color: c.text, fontFamily: font.semibold, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nav: { position: 'absolute', top: 0, left: 0, right: 0, justifyContent: 'center' },
  navSolid: { backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.line },
  navInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 24 },
  navLinks: { flexDirection: 'row', gap: 8, flex: 1, justifyContent: 'center' },
  navLink: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  navLinkText: { color: c.muted, fontFamily: font.semibold, fontSize: 15 },
  navButton: {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 9,
    backgroundColor: alpha(c.bg, 0.6),
  },
  navButtonText: { color: c.text, fontFamily: font.bold, fontSize: 15 },
  wordmark: { color: c.text, fontFamily: font.black, fontSize: 26, letterSpacing: -1 },
  h1: { color: c.text, fontFamily: DISPLAY, letterSpacing: -0.5 },
  h2: { color: c.text, fontFamily: DISPLAY },
  h3: { color: c.text, fontFamily: DISPLAY, lineHeight: 44 },
  lead: { color: '#C9CBC6', fontFamily: font.regular, lineHeight: 30, maxWidth: 560 },
  body: { color: '#C9CBC6', fontFamily: font.regular, fontSize: 17, lineHeight: 27, maxWidth: 560 },
  note: { color: c.muted, fontFamily: font.medium, fontSize: 14, lineHeight: 21, maxWidth: 520 },
  stepTitle: { color: c.text, fontFamily: font.bold, fontSize: 20 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
  },
  beton: { backgroundColor: ROAD.beton },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ROAD.marka,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  footer: { paddingVertical: 48, gap: 24, alignItems: 'flex-start' },
  footText: { color: c.muted, fontFamily: font.regular, fontSize: 14, lineHeight: 21 },
});
