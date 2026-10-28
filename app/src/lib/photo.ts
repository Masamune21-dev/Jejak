import { File as LocalFile } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { errorText } from './api';

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
  // Kualitas di bawah 1 supaya hasil potongan galeri sudah terkompres bila harus dikirim tanpa diperkecil (lihat bawah).
  const o: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85, allowsEditing: !!opts.aspect, aspect: opts.aspect };
  let res: ImagePicker.ImagePickerResult;
  try {
    res = opts.camera ? await ImagePicker.launchCameraAsync(o) : await ImagePicker.launchImageLibraryAsync(o);
  } catch (e) {
    throw new Error(`Gagal membuka ${opts.camera ? 'kamera' : 'galeri'}: ${errorText(e)}`);
  }
  const asset = res.canceled ? null : res.assets[0];
  if (!asset) return null;
  try {
    const ctx = ImageManipulator.manipulate(asset.uri);
    if (asset.width > opts.maxWidth) ctx.resize({ width: opts.maxWidth });
    const out = await (await ctx.renderAsync()).saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
    return out.uri;
  } catch (e) {
    // Pengaman bila pengecilan gagal di HP tertentu: kirim foto dari galeri apa adanya. Server tetap membuang EXIF
    // dan menolak foto di atas 2 MB atau yang bukan JPEG, dengan pesan yang tampil di layar.
    console.warn('Foto gagal diperkecil, dikirim apa adanya', e);
    return asset.uri;
  }
}

/** Tambahkan foto JPEG ke FormData dengan cara yang dimengerti fetch di HP maupun di browser. */
export async function appendPhoto(form: FormData, field: string, uri: string): Promise<void> {
  if (Platform.OS === 'web') {
    form.append(field, await (await fetch(uri)).blob(), 'foto.jpg');
  } else {
    // fetch di HP adalah expo/fetch (bawaan sejak Expo SDK 58), yang tidak mengenal objek lama React Native
    // { uri, name, type }: unggahan gagal sebelum terkirim. File dari expo-file-system dibaca isinya oleh fetch;
    // nama dan jenis berkasnya (image/jpeg dari ekstensi .jpg) ikut terkirim.
    form.append(field, new LocalFile(uri));
  }
}
