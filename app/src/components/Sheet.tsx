import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { font, radius, space, useColors } from '@/lib/theme';

import type { IconName } from './ui';

export interface SheetOption {
  label: string;
  icon: IconName;
  onPress: () => void;
  danger?: boolean;
}

/** Menu pilihan yang muncul dari bawah layar (ganti foto, blokir, laporkan). */
/** Lama animasi `fade` Modal sebelum aksi pilihan dijalankan. */
const CLOSE_MS = 250;

export default function Sheet({
  visible,
  title,
  options,
  onClose,
}: {
  visible: boolean;
  title?: string;
  options: SheetOption[];
  onClose: () => void;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={onClose} accessibilityLabel="Tutup" />
      <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.line, paddingBottom: insets.bottom + space.md }]}>
        {title ? <Text style={[styles.title, { color: c.muted }]}>{title}</Text> : null}
        {options.map((o) => (
          <Pressable
            key={o.label}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              // Jalankan setelah lembar selesai memudar: membuka galeri/kamera saat Modal masih tertutup bisa gagal.
              setTimeout(o.onPress, CLOSE_MS);
            }}
            style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.surface2 : 'transparent' }]}>
            <Ionicons name={o.icon} size={22} color={o.danger ? c.danger : c.text} />
            <Text style={[styles.label, { color: o.danger ? c.danger : c.text }]}>{o.label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={onClose} accessibilityRole="button" style={[styles.row, styles.cancel, { borderTopColor: c.line }]}>
          <Text style={[styles.label, { color: c.muted, textAlign: 'center', flex: 1 }]}>Batal</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    paddingTop: space.md,
    paddingHorizontal: space.md,
  },
  title: { fontFamily: font.semibold, fontSize: 13, paddingHorizontal: space.md, paddingVertical: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: 14, borderRadius: radius.sm },
  label: { fontFamily: font.semibold, fontSize: 16 },
  cancel: { borderTopWidth: 1, borderRadius: 0, marginTop: space.xs },
});
