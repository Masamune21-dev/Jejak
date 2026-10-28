import { Redirect } from 'expo-router';

/** Alamat lama halaman depan. Halaman depan kini di alamat utama `/`; tautan lama tetap berfungsi. */
export default function OldLandingAddress() {
  return <Redirect href="/" />;
}
