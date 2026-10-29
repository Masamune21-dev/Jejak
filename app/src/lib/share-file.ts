import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

// Versi HP: file ditulis ke cache lalu dibuka lewat lembar berbagi sistem. Versi web ada di share-file.web.ts.

export async function shareTextFile(name: string, mimeType: string, content: string, dialogTitle = 'Ekspor aktivitas'): Promise<void> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  await file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}

/** `uri` dari captureRef (file sementara). */
export async function shareImage(uri: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Berbagi tidak tersedia di perangkat ini');
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Bagikan aktivitas' });
}

export async function saveImage(uri: string, _name: string): Promise<void> {
  const perm = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
  if (!perm.granted) throw new Error('Izin galeri ditolak. Aktifkan izin foto untuk Jejak di pengaturan HP.');
  await MediaLibrary.Asset.create(uri);
}

/** Hasil captureRef di HP berupa file sementara. */
export const CAPTURE_RESULT = 'tmpfile' as const;
