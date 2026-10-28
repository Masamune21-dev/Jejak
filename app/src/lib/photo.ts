import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/**
 * Pilih foto dari galeri atau kamera, potong sesuai rasio, perkecil, lalu simpan ulang sebagai JPEG.
 * Penyimpanan ulang ini membuang metadata EXIF, termasuk lokasi GPS tempat foto diambil
 * (server juga membuangnya sebagai pengaman kedua). Mengembalikan null bila dibatalkan.
 */
export async function pickPhoto(opts: { camera?: boolean; aspect?: [number, number]; maxWidth: number }): Promise<string | null> {
  if (opts.camera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Izin kamera ditolak. Aktifkan kamera untuk Jejak di pengaturan HP.');
  }
  const o: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: !!opts.aspect, aspect: opts.aspect };
  const res = opts.camera ? await ImagePicker.launchCameraAsync(o) : await ImagePicker.launchImageLibraryAsync(o);
  const asset = res.canceled ? null : res.assets[0];
  if (!asset) return null;
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (asset.width > opts.maxWidth) ctx.resize({ width: opts.maxWidth });
  const out = await (await ctx.renderAsync()).saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  return out.uri;
}

/** Tambahkan foto JPEG ke FormData dengan cara yang dimengerti fetch di HP maupun di browser. */
export async function appendPhoto(form: FormData, field: string, uri: string): Promise<void> {
  if (Platform.OS === 'web') {
    form.append(field, await (await fetch(uri)).blob(), 'foto.jpg');
  } else {
    // React Native mengunggah berkas lokal dari objek { uri, name, type }.
    form.append(field, { uri, name: 'foto.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
}
