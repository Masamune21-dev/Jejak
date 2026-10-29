import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, type PressableStateCallbackType } from 'react-native';

import { alpha, font, palette as c, ROAD } from '@/lib/theme';

import { DISPLAY } from './parts';

/** QR QRIS donasi (hitam-putih, dipotong dari kartu QRIS), di app/public sehingga tersaji di /donasi-qris.png. */
const QR_URL = '/donasi-qris.png';
const WAIT_S = 10;

/**
 * Muncul saat tombol Unduh APK di landing page ditekan: ajakan donasi lewat QRIS, dan tombol unduh yang baru
 * aktif setelah hitung mundur. Donasi tidak wajib. Dipasang hanya selama terbuka, jadi hitung mundurnya selalu
 * mulai dari awal.
 */
export default function DonationModal({ apkUrl, onClose }: { apkUrl: string; onClose: () => void }) {
  const [left, setLeft] = useState(WAIT_S);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      const rest = Math.max(0, WAIT_S - Math.floor((Date.now() - started) / 1000));
      setLeft(rest);
      if (rest === 0) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, []);

  const ready = left === 0;
  const download = () => {
    window.location.assign(apkUrl);
    onClose();
  };
  const saveQr = () => {
    const a = document.createElement('a');
    a.href = QR_URL;
    a.download = 'qris-donasi-jejak.png';
    a.click();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Tutup" />
      <ScrollView contentContainerStyle={styles.center} pointerEvents="box-none">
        <View style={styles.card} accessibilityViewIsModal>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Tutup" style={focusable(styles.close)}>
            <Ionicons name="close" size={22} color={c.muted} />
          </Pressable>

          <Text style={styles.title}>Bantu Jejak terus berlari</Text>
          <Text style={styles.body}>
            Jejak gratis dan tanpa iklan, dibuat dan dirawat sendiri oleh admin. Kalau aplikasi ini menemani lari dan gowesmu,
            bantu admin terus mengembangkannya dengan donasi berapa saja. Setiap donasi ikut membayar server dan waktu untuk fitur
            berikutnya.
          </Text>

          <View style={styles.qrPlate}>
            <Image source={{ uri: QR_URL }} style={styles.qr} accessibilityLabel="Kode QRIS untuk donasi ke admin Jejak" />
          </View>
          <Text style={styles.hint}>Pindai dengan aplikasi bank atau dompet digital apa pun yang mendukung QRIS.</Text>
          <Pressable onPress={saveQr} accessibilityRole="button" style={focusable(styles.saveQr)}>
            <Ionicons name="image-outline" size={16} color={c.accentText} />
            <Text style={styles.saveQrText}>Simpan gambar QR</Text>
          </Pressable>
          <Text style={styles.hint}>Membuka dari HP? Simpan gambarnya, lalu pilih dari galeri di aplikasi pembayaranmu.</Text>

          <Pressable
            onPress={download}
            disabled={!ready}
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready }}
            style={focusable({ ...styles.download, backgroundColor: ready ? c.accent : c.surface2 })}>
            <Ionicons name="logo-android" size={20} color={ready ? c.accentInk : c.muted} />
            <Text style={[styles.downloadText, { color: ready ? c.accentInk : c.muted }]}>
              {ready ? 'Unduh APK' : `Unduh APK dalam ${left} detik`}
            </Text>
          </Pressable>
          <Text style={styles.note} accessibilityLiveRegion="polite">
            {ready ? 'Terima kasih sudah mencoba Jejak.' : 'Donasi tidak wajib. Tombol unduh aktif setelah hitungan selesai.'}
          </Text>
        </View>
      </ScrollView>
    </Modal>
  );
}

function focusable(base: object) {
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

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: alpha('#000000', 0.72) },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: ROAD.aspal,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    gap: 14,
  },
  close: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  title: { color: c.text, fontFamily: DISPLAY, fontSize: 34, lineHeight: 36, letterSpacing: -0.5, paddingRight: 36 },
  body: { color: c.muted, fontFamily: font.regular, fontSize: 15, lineHeight: 23 },
  // QR selalu di atas putih supaya terbaca kamera, juga di tema gelap.
  qrPlate: { alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 10, marginTop: 4 },
  qr: { width: 232, height: 232 },
  hint: { color: c.muted, fontFamily: font.medium, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  saveQr: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10 },
  saveQrText: { color: c.accentText, fontFamily: font.semibold, fontSize: 14 },
  download: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 999,
    paddingVertical: 15,
    marginTop: 6,
  },
  downloadText: { fontFamily: font.bold, fontSize: 17 },
  note: { color: c.muted, fontFamily: font.regular, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
