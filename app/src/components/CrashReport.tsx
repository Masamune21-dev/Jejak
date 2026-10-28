import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CrashReport as Report } from '@/lib/crash';
import { font, ROAD } from '@/lib/theme';

import { Button } from './ui';

/**
 * Laporan error yang bisa difoto layarnya lalu dikirim ke pengembang.
 * Dipakai oleh ErrorBoundary (error saat tampil) dan oleh pemberitahuan crash sebelumnya.
 */
export default function CrashReportView({
  report,
  title,
  onRetry,
  onClose,
}: {
  report: Report;
  title: string;
  onRetry?: () => void;
  onClose?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.body}>
        <Ionicons name="warning" size={40} color={ROAD.marka} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.help}>Foto layar ini dan kirim ke pengembang supaya bisa diperbaiki.</Text>
        <View style={styles.box}>
          <Text style={styles.message}>{report.message}</Text>
          <Text style={styles.stack}>{report.stack}</Text>
          <Text style={styles.stack}>{report.at}</Text>
        </View>
        {onRetry ? <Button title="Coba lagi" icon="refresh" onPress={onRetry} /> : null}
        {onClose ? <Button kind="soft" title="Tutup" onPress={onClose} /> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: ROAD.aspal },
  body: { padding: 24, paddingTop: 72, gap: 14 },
  title: { color: '#fff', fontFamily: font.black, fontSize: 22 },
  help: { color: 'rgba(255,255,255,0.75)', fontFamily: font.medium, fontSize: 14 },
  box: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 14, gap: 8 },
  message: { color: ROAD.marka, fontFamily: font.bold, fontSize: 15 },
  stack: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'monospace' },
});
