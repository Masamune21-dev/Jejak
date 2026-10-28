import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ActivityType } from '@shared/api';

import { mediaUri } from '@/lib/api';
import { initials, TYPE_ICON, TYPE_LABEL } from '@/lib/format';
import { font, glow, IMAGE_FADE, radius, shadow, space, useColors } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// --- Teks ---

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'strong' | 'small' | 'label' | 'num';

const VARIANT: Record<Variant, TextStyle> = {
  h1: { fontFamily: font.bold, fontSize: 26, letterSpacing: -0.5, lineHeight: 32 },
  h2: { fontFamily: font.bold, fontSize: 19, letterSpacing: -0.2, lineHeight: 25 },
  h3: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 21 },
  strong: { fontFamily: font.semibold, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  num: { fontFamily: font.numBold, fontSize: 26, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
};

export function T({
  children,
  v = 'body',
  style,
  muted,
  color,
  size,
  numberOfLines,
  center,
}: {
  children: ReactNode;
  v?: Variant;
  style?: StyleProp<TextStyle>;
  muted?: boolean;
  color?: string;
  size?: number;
  numberOfLines?: number;
  center?: boolean;
}) {
  const c = useColors();
  const base = VARIANT[v];
  const defaultColor = v === 'label' || v === 'small' ? c.muted : c.text;
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        base,
        { color: color ?? (muted ? c.muted : defaultColor) },
        size ? { fontSize: size, lineHeight: v === 'num' ? undefined : Math.round(size * 1.3) } : null,
        center && { textAlign: 'center' },
        style,
      ]}>
      {children}
    </Text>
  );
}

/** Angka besar + satuan kecil: "5,32 km". */
export function Num({
  value,
  unit,
  size = 28,
  color,
  style,
}: {
  value: string;
  unit?: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  const c = useColors();
  return (
    // Kolom sempit (mis. pace jalan kaki "12:45 /km" di HP 360 dp): huruf mengecil dulu sebelum terpotong "…".
    <Text style={[{ color: color ?? c.text }, style]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
      <Text style={{ fontFamily: font.numBold, fontSize: size, letterSpacing: -0.5, fontVariant: ['tabular-nums'] }}>{value}</Text>
      {unit ? (
        <Text style={{ fontFamily: font.medium, fontSize: Math.max(11, size * 0.45), color: c.muted }}>
          {' '}
          {unit}
        </Text>
      ) : null}
    </Text>
  );
}

export function Stat({
  label,
  value,
  unit,
  size = 24,
  align = 'left',
}: {
  label: string;
  value: string;
  unit?: string;
  size?: number;
  align?: 'left' | 'center';
}) {
  return (
    <View style={{ flex: 1, minWidth: 80, gap: 2, alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      <T v="label">{label}</T>
      <Num value={value} unit={unit} size={size} />
    </View>
  );
}

/** Kotak kecil berisi ikon + label + nilai (seperti "Indoor 24°C" di referensi). */
export function StatTile({ icon, label, value, unit, color }: { icon: IconName; label: string; value: string; unit?: string; color?: string }) {
  const c = useColors();
  return (
    <Card style={styles.statTile}>
      <Row gap={8}>
        <Ionicons name={icon} size={18} color={color ?? c.accent} />
        <T v="label">{label}</T>
      </Row>
      <Num value={value} unit={unit} size={20} />
    </Card>
  );
}

// --- Tata letak ---

export function Screen({
  children,
  scroll = true,
  style,
  padded = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const c = useColors();
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: c.bg }, style]}>{children}</View>;
  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[padded && styles.screen, { paddingBottom: 48 }, style]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

/** Judul besar di atas layar tab (pengganti header bawaan). */
export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.md, backgroundColor: c.bg }]}>
      <View style={{ flex: 1, gap: 2 }}>
        {subtitle ? <T v="small">{subtitle}</T> : null}
        <T v="h1">{title}</T>
      </View>
      {right}
    </View>
  );
}

/** Kartu dengan gradasi halus dan garis tepi tipis. */
export function Card({
  children,
  style,
  onPress,
  flat,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  /** Tanpa garis tepi (untuk kartu berwarna khusus). */
  flat?: boolean;
  raised?: boolean;
}) {
  const c = useColors();
  const body = (
    <LinearGradient
      colors={[c.cardTop, c.cardBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={[styles.card, { borderColor: flat ? 'transparent' : c.line }, style]}>
      {children}
    </LinearGradient>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.88 }}>
      {body}
    </Pressable>
  );
}

export function Row({ children, style, gap = space.md }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line }} />;
}

/** Panel bawah di atas peta (rekam, buat rute, buat segmen). */
export function Sheet({
  children,
  style,
  aboveTabBar,
  onHeight,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Di layar tab: beri ruang untuk tombol tengah yang menonjol dari tab bar. */
  aboveTabBar?: boolean;
  onHeight?: (h: number) => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const bottom = aboveTabBar ? 40 : Math.max(insets.bottom, space.lg);
  return (
    <View
      onLayout={onHeight ? (e) => onHeight(Math.round(e.nativeEvent.layout.height)) : undefined}
      style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.line, paddingBottom: bottom }, shadow(c, 2), style]}>
      <View style={[styles.grabber, { backgroundColor: c.line }]} />
      {children}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: space.sm, marginBottom: -space.xs }}>
      <T v="h2" size={18}>
        {children}
      </T>
      {right}
    </Row>
  );
}

// --- Kontrol ---

type ButtonKind = 'primary' | 'ink' | 'soft' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  loading,
  disabled,
  style,
  small,
}: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const c = useColors();
  const bg = { primary: c.accent, ink: c.surface2, soft: c.surface2, danger: c.danger, ghost: 'transparent' }[kind];
  const fg = { primary: c.accentInk, ink: c.text, soft: c.text, danger: '#fff', ghost: c.text }[kind];
  const off = disabled || loading;
  const bordered = kind === 'ink' || kind === 'soft';
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: off ? 0.45 : pressed ? 0.85 : 1 },
        bordered && { borderWidth: 1, borderColor: c.line },
        kind === 'primary' && !off && glow(c.accent, 0.6),
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 19} color={fg} /> : null}
          <Text style={{ color: fg, fontFamily: font.bold, fontSize: small ? 14 : 16 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Tombol ikon bulat. */
export function IconButton({
  icon,
  onPress,
  label,
  color,
  bg,
  size = 42,
  disabled,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  bg?: string;
  size?: number;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg ?? c.surface2,
          borderWidth: bg === 'transparent' ? 0 : 1,
          borderColor: c.line,
        },
        { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}>
      <Ionicons name={icon} size={Math.round(size * 0.46)} color={color ?? c.text} />
    </Pressable>
  );
}

/** Tombol ikon + teks kecil di bawahnya (alat di panel peta). */
export function ToolButton({
  icon,
  label,
  onPress,
  color,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <View style={{ alignItems: 'center', gap: 4, flex: 1 }}>
      <IconButton icon={icon} label={label} onPress={onPress} color={color} disabled={disabled} size={46} />
      <T v="label" size={11} center numberOfLines={1}>
        {label}
      </T>
    </View>
  );
}

/** Kotak aksi cepat: ikon + label di dalam kotak bersudut bulat; aktif = hijau. */
export function ActionTile({ icon, label, onPress, active }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionTile,
        { backgroundColor: active ? c.accent : c.surface, borderColor: active ? c.accent : c.line, opacity: pressed ? 0.85 : 1 },
        active && glow(c.accent, 0.6),
      ]}>
      <Ionicons name={icon} size={22} color={active ? c.accentInk : c.text} />
      <Text style={{ color: active ? c.accentInk : c.muted, fontFamily: font.semibold, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, icon, active, onPress }: { label: string; icon?: IconName; active?: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: active ? c.accent : c.surface2, borderColor: active ? c.accent : c.line, opacity: pressed ? 0.85 : 1 },
      ]}>
      {icon ? <Ionicons name={icon} size={16} color={active ? c.accentInk : c.text} /> : null}
      <Text style={{ color: active ? c.accentInk : c.text, fontFamily: font.semibold, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function TypePicker({ value, onChange }: { value: ActivityType; onChange: (t: ActivityType) => void }) {
  return (
    <Row gap={space.sm}>
      {(['run', 'ride', 'walk'] as ActivityType[]).map((t) => (
        <Chip key={t} label={TYPE_LABEL[t]} icon={TYPE_ICON[t]} active={t === value} onPress={() => onChange(t)} />
      ))}
    </Row>
  );
}

/** Pilihan dua/tiga opsi dalam satu kapsul. */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.segmented, { backgroundColor: c.surface2, borderColor: c.line }]}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.segment, on && { backgroundColor: c.accent }]}>
            <Text style={{ color: on ? c.accentInk : c.muted, fontFamily: font.semibold, fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({ label, icon, ...props }: TextInputProps & { label?: string; icon?: IconName }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      {label ? <T v="label">{label}</T> : null}
      <View style={[styles.input, { backgroundColor: c.surface2, borderColor: c.line }]}>
        {icon ? <Ionicons name={icon} size={18} color={c.muted} /> : null}
        <TextInput
          placeholderTextColor={c.muted}
          {...props}
          style={[{ flex: 1, color: c.text, fontFamily: font.medium, fontSize: 16, paddingVertical: 14 }, props.style]}
        />
      </View>
    </View>
  );
}

// --- Identitas ---

const AVATAR_COLORS = ['#12B77A', '#4DA3FF', '#A27BFF', '#FF8A4C', '#FF5C8A', '#2EC5D6', '#E7B33D', '#6C8CFF'];

/** Foto profil bila ada (`uri` = path bertanda tangan dari API), inisial berwarna bila belum. */
export function Avatar({ name, size = 40, ring, uri }: { name: string; size?: number; ring?: boolean; uri?: string | null }) {
  const c = useColors();
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bg = AVATAR_COLORS[h % AVATAR_COLORS.length];
  const src = mediaUri(uri);
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        cachePolicy="memory-disk"
        transition={IMAGE_FADE}
        style={[
          { width: size, height: size, borderRadius: size / 2, backgroundColor: c.surface2, borderWidth: ring ? 3 : 0, borderColor: c.accent },
          ring && glow(c.accent, 0.5),
        ]}
      />
    );
  }
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: ring ? 3 : 0,
          borderColor: c.accent,
        },
        ring && glow(c.accent, 0.5),
      ]}>
      <Text style={{ color: '#fff', fontFamily: font.bold, fontSize: size * 0.38 }}>{initials(name)}</Text>
    </View>
  );
}

export function Badge({ text, color, icon, textColor = '#fff' }: { text: string; color: string; icon?: IconName; textColor?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      {icon ? <Ionicons name={icon} size={12} color={textColor} /> : null}
      <Text style={{ color: textColor, fontSize: 12, fontFamily: font.bold }}>{text}</Text>
    </View>
  );
}

/** Pil kecil berwarna aksen, mis. "12% dari minggu lalu". */
export function Pill({ text, icon, tone = 'accent' }: { text: string; icon?: IconName; tone?: 'accent' | 'muted' | 'danger' }) {
  const c = useColors();
  const fg = tone === 'accent' ? c.accentText : tone === 'danger' ? c.danger : c.muted;
  const bg = tone === 'accent' ? c.accentSoft : tone === 'danger' ? 'rgba(255,92,92,0.14)' : c.surface2;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={13} color={fg} /> : null}
      <Text style={{ color: fg, fontFamily: font.semibold, fontSize: 12 }}>{text}</Text>
    </View>
  );
}

/** Medali peringkat: emas, perak, perunggu, lalu angka. */
export function Rank({ rank, size = 30 }: { rank: number; size?: number }) {
  const c = useColors();
  const medal = rank === 1 ? c.gold : rank === 2 ? c.silver : rank === 3 ? c.bronze : null;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: medal ?? c.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ color: medal ? '#1A1405' : c.text, fontFamily: font.bold, fontSize: size * 0.45 }}>{rank}</Text>
    </View>
  );
}

/** Ikon dalam kotak bulat berwarna (kartu, daftar). */
export function IconTile({ icon, color, size = 44, glowing }: { icon: IconName; color?: string; size?: number; glowing?: boolean }) {
  const c = useColors();
  const col = color ?? c.accent;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: col + '22',
        },
        glowing && glow(col, 0.5),
      ]}>
      <Ionicons name={icon} size={size * 0.5} color={col} />
    </View>
  );
}

// --- Status ---

export function Loading() {
  const c = useColors();
  return (
    <View style={[styles.center, { backgroundColor: c.bg }]}>
      <ActivityIndicator color={c.accentText} size="large" />
    </View>
  );
}

export function Empty({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.accentSoft, borderColor: c.accent + '55' }, glow(c.accent, 0.5)]}>
        <Ionicons name={icon} size={30} color={c.accentText} />
      </View>
      <T v="h2" center>
        {title}
      </T>
      {text ? (
        <T muted center style={{ maxWidth: 320 }}>
          {text}
        </T>
      ) : null}
      {action}
    </View>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const c = useColors();
  return (
    <View style={[styles.errorBox, { backgroundColor: 'rgba(255,92,92,0.1)', borderColor: 'rgba(255,92,92,0.3)' }]}>
      <Row gap={space.sm} style={{ alignItems: 'flex-start' }}>
        <Ionicons name="alert-circle" size={18} color={c.danger} />
        <T v="small" color={c.danger} style={{ flex: 1 }}>
          {error instanceof Error ? error.message : 'Terjadi kesalahan'}
        </T>
      </Row>
      {onRetry ? <Button small kind="soft" title="Coba lagi" icon="refresh" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: space.md, overflow: 'hidden' },
  statTile: { flex: 1, padding: space.md, gap: 6, borderRadius: radius.md },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: space.md,
  },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: space.xs },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radius.pill,
    paddingVertical: 15,
    paddingHorizontal: space.xl,
  },
  buttonSmall: { paddingVertical: 9, paddingHorizontal: space.lg },
  actionTile: {
    flex: 1,
    height: 78,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  segmented: { flexDirection: 'row', borderRadius: radius.pill, borderWidth: 1, padding: 4, gap: 4 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: radius.pill },
  input: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: 14, borderWidth: 1, paddingHorizontal: space.md },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl, paddingHorizontal: space.lg },
  emptyIcon: { width: 68, height: 68, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { borderRadius: radius.md, borderWidth: 1, padding: space.md, gap: space.sm },
});
