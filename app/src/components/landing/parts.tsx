import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import type { Activity } from '@shared/api';
import { pathDistance } from '@shared/geo';

import GuideBanner from '@/components/GuideBanner';
import { STICKERS } from '@/components/ShareStickers';
import { Rank } from '@/components/ui';
import { PATI } from '@/lib/demo-route';
import { km } from '@/lib/format';
import { font, palette as c, ROAD } from '@/lib/theme';

// Bagian-bagian landing page web. Warnanya tetap (aspal + marka), bukan tema pilihan pengguna,
// karena halaman ini wajah merek untuk pengunjung yang belum masuk.

export const DISPLAY = 'BigShouldersDisplay_900Black';
export const DISPLAY_BOLD = 'BigShouldersDisplay_800ExtraBold';

const DEMO_M = pathDistance(PATI);
/** Lari demo 18:22 untuk 3,05 km (pace ±6:01 /km). */
const DEMO_S = 1102;

const mmss = (s: number) => {
  const t = Math.round(s);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

/** Aktivitas contoh untuk pratinjau stiker (bukan data pengguna). */
export const DEMO_ACTIVITY: Activity = {
  id: 0,
  user: { id: 0, username: 'jejak', name: 'Jejak' },
  type: 'run',
  title: 'Keliling Alun-alun Pati',
  startedAt: '2026-10-28T22:10:00.000Z',
  elapsedS: DEMO_S,
  movingS: DEMO_S,
  distanceM: DEMO_M,
  elevGainM: 9,
  preview: PATI,
  kudos: 0,
  hasKudo: false,
  comments: 0,
  routeId: null,
  prCount: 0,
  track: [PATI.map(([lat, lon], i) => [lat, lon, i * 1000, 14 + (i % 5)])],
  maxSpeedMps: 3.9,
  splits: [],
  bestEfforts: [],
  efforts: [],
  kudosBy: [],
};

/**
 * Progres demo rekaman di hero (0..1, ±9 detik): rute Keliling Alun-alun Pati tergambar di peta latar dan angka berjalan.
 * Satu-satunya gerakan otomatis di halaman; bila pengguna memilih "kurangi gerakan", langsung 1 (rute utuh).
 */
export function useDemoProgress(): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!alive) return;
        if (reduce) return setP(1);
        const start = Date.now();
        timer = setInterval(() => {
          const f = Math.min(1, (Date.now() - start) / 9000);
          setP(f);
          if (f >= 1 && timer) clearInterval(timer);
        }, 50);
      });
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, []);
  return p;
}

/** Kartu angka rekaman yang mengambang di atas peta latar hero. `compact` untuk layar HP. */
export function HeroStats({ p, compact }: { p: number; compact?: boolean }) {
  const done = p >= 1;
  return (
    <View
      style={[styles.statsCard, compact && { padding: 14, gap: 8 }]}
      accessibilityLabel={`Contoh rekaman: ${km(DEMO_M * p)} km dalam ${mmss(DEMO_S * p)}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={styles.statusPill}>
          <View style={[styles.dot, { backgroundColor: done ? c.start : c.danger }]} />
          <Text style={styles.mapChipText}>{done ? 'Tersimpan' : 'Merekam'}</Text>
        </View>
        <Text style={[styles.panelTitle, { flex: 1 }]} numberOfLines={1}>
          Keliling Alun-alun Pati
        </Text>
      </View>
      <View style={styles.statRow}>
        <DemoStat label="Waktu" value={mmss(DEMO_S * p)} small={compact} />
        <DemoStat label="Jarak" value={km(DEMO_M * p)} unit="km" small={compact} />
        <DemoStat label="Pace" value="6:01" unit="/km" small={compact} />
      </View>
    </View>
  );
}

function DemoStat({ label, value, unit, small }: { label: string; value: string; unit?: string; small?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, small && { fontSize: 21 }]}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

// --- Potongan UI asli untuk tiap fitur ---

/** Layar kunci dengan notifikasi rekaman: "tetap merekam walau layar mati". */
export function LockScreenFragment() {
  return (
    <View style={[styles.fragment, { backgroundColor: '#121315', alignItems: 'center', paddingVertical: 28 }]}>
      <Text style={{ color: '#E9EAE6', fontFamily: DISPLAY_BOLD, fontSize: 64, lineHeight: 66 }}>05.42</Text>
      <Text style={{ color: c.muted, fontFamily: font.medium, fontSize: 13, marginBottom: 18 }}>Kamis, 29 Oktober</Text>
      <View style={styles.notif}>
        <View style={[styles.notifIcon, { backgroundColor: c.accent }]}>
          <Ionicons name="footsteps" size={18} color={c.accentInk} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontFamily: font.bold, fontSize: 14 }}>Jejak sedang merekam</Text>
          <Text style={{ color: c.muted, fontFamily: font.regular, fontSize: 13 }}>Rute kamu tetap tercatat walau layar mati.</Text>
        </View>
      </View>
    </View>
  );
}

export function GuideFragment() {
  return (
    <View style={[styles.fragment, { padding: 18, gap: 12 }]}>
      <GuideBanner icon="arrow-back" big="120 m" title="Belok kiri ke Jalan Pemuda" sub="Sisa 1,8 km dari rute 3,1 km" />
      <GuideBanner tone="danger" icon="warning" title="Keluar dari rute" sub="45 m dari garis rute, HP bergetar" />
    </View>
  );
}

export function BoardFragment() {
  const rows = [
    { rank: 1, name: 'Sekar', time: '3:53' },
    { rank: 2, name: 'Kamu', time: '4:00', me: true },
    { rank: 3, name: 'Rani', time: '4:12' },
  ];
  return (
    <View style={[styles.fragment, { padding: 18, gap: 4 }]}>
      <Text style={{ color: c.text, fontFamily: font.bold, fontSize: 16 }}>Sprint Jl. Diponegoro</Text>
      <Text style={{ color: c.muted, fontFamily: font.medium, fontSize: 13, marginBottom: 8 }}>741 m, 3 atlet minggu ini</Text>
      {rows.map((r) => (
        <View key={r.rank} style={[styles.boardRow, r.me && { backgroundColor: c.accentSoft, borderColor: c.accent + '55' }]}>
          <Rank rank={r.rank} />
          <Text style={{ flex: 1, color: c.text, fontFamily: r.me ? font.bold : font.semibold, fontSize: 15 }}>{r.name}</Text>
          <Text style={{ color: c.text, fontFamily: font.numBold, fontSize: 18 }}>{r.time}</Text>
        </View>
      ))}
    </View>
  );
}

/** Stiker transparan sungguhan (komponen yang sama dengan layar Bagikan) di atas pola papan catur. */
export function StickerFragment() {
  const w = 210;
  const h = Math.round((w * 16) / 9);
  const sticker = STICKERS.find((s) => s.key === 'tumpuk')!;
  return (
    <View style={[styles.fragment, { alignItems: 'center', paddingVertical: 20 }]}>
      <View style={{ width: w, height: h, borderRadius: 12, overflow: 'hidden' }}>
        <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
          <Defs>
            <Pattern id="papan-landing" width={24} height={24} patternUnits="userSpaceOnUse">
              <Rect width={24} height={24} fill="#3A3B3D" />
              <Rect width={12} height={12} fill="#2B2C2E" />
              <Rect x={12} y={12} width={12} height={12} fill="#2B2C2E" />
            </Pattern>
          </Defs>
          <Rect width={w} height={h} fill="url(#papan-landing)" />
        </Svg>
        {sticker.render({ a: DEMO_ACTIVITY, w, h, line: '#FF5A1F' })}
      </View>
    </View>
  );
}

export function ChatFragment() {
  const msgs = [
    { me: false, text: 'Besok jam 5 di alun-alun ya?' },
    { me: true, text: 'Siap. Aku mau kejar 3:53 di Diponegoro' },
    { me: false, text: 'Bawa air, nanti lanjut 2 putaran' },
  ];
  return (
    <View style={[styles.fragment, { padding: 18, gap: 8 }]}>
      {msgs.map((m) => (
        <View
          key={m.text}
          style={[
            styles.bubble,
            m.me
              ? { alignSelf: 'flex-end', backgroundColor: c.accent, borderBottomRightRadius: 4 }
              : { alignSelf: 'flex-start', backgroundColor: c.surface2, borderBottomLeftRadius: 4 },
          ]}>
          <Text style={{ color: m.me ? c.accentInk : c.text, fontFamily: font.regular, fontSize: 15, lineHeight: 21 }}>{m.text}</Text>
        </View>
      ))}
    </View>
  );
}

// --- Patok KM, rambu, FAQ ---

/** Patok kilometer pinggir jalan: badan putih, kepala merah. Dipakai hanya untuk langkah yang memang berurutan. */
export function Patok({ km: n }: { km: number }) {
  return (
    <View style={styles.patok} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.patokCap}>
        <Text style={{ color: '#fff', fontFamily: DISPLAY_BOLD, fontSize: 15, letterSpacing: 1 }}>KM</Text>
      </View>
      <Text style={{ color: ROAD.aspal, fontFamily: DISPLAY, fontSize: 40, lineHeight: 44 }}>{n}</Text>
    </View>
  );
}

/** Papan rambu hijau dengan garis tepi putih, untuk bagian privasi. */
export function Rambu({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.rambu}>
      <View style={styles.rambuInner}>
        <Text accessibilityRole="header" style={{ color: '#fff', fontFamily: DISPLAY, fontSize: 40, lineHeight: 42 }}>
          {title}
        </Text>
        {children}
      </View>
    </View>
  );
}

export function RambuItem({ children }: { children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, color: '#fff', fontFamily: font.medium, fontSize: 16, lineHeight: 24 }}>{children}</Text>
    </View>
  );
}

export function Faq({ q, children }: { q: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.faq, { borderColor: '#D9DAD4' }]}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.faqHead}>
        <Text style={{ flex: 1, color: ROAD.aspal, fontFamily: font.bold, fontSize: 17, lineHeight: 24 }}>{q}</Text>
        <Ionicons name="chevron-down" size={20} color={ROAD.aspal} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {open ? <Text style={{ color: '#45484C', fontFamily: font.regular, fontSize: 16, lineHeight: 25, paddingBottom: 18 }}>{children}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    padding: 18,
    gap: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(42,45,49,0.92)',
    borderWidth: 1,
    borderColor: c.line,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.bg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  mapChipText: { color: c.text, fontFamily: font.semibold, fontSize: 13 },
  panelTitle: { color: c.text, fontFamily: font.bold, fontSize: 16 },
  statRow: { flexDirection: 'row', gap: 12 },
  statLabel: { color: c.muted, fontFamily: font.medium, fontSize: 12 },
  statValue: { color: c.text, fontFamily: font.numBold, fontSize: 26, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statUnit: { color: c.muted, fontFamily: font.semibold, fontSize: 13 },
  fragment: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 22,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.line,
    overflow: 'hidden',
  },
  notif: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(53,57,62,0.9)',
    borderRadius: 18,
    padding: 14,
    width: '88%',
  },
  notifIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  patok: {
    width: 64,
    height: 88,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  patokCap: { alignSelf: 'stretch', height: 34, backgroundColor: ROAD.patok, alignItems: 'center', justifyContent: 'center' },
  rambu: { backgroundColor: ROAD.rambu, borderRadius: 18, padding: 7 },
  rambuInner: { borderWidth: 3, borderColor: '#fff', borderRadius: 12, padding: 26, gap: 16 },
  faq: { borderTopWidth: 1 },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 18 },
});
