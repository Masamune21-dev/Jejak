import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import type { IconName } from '@/components/ui';

import { APP_VERSION } from './update';

/** Kontak pembuat di Pengaturan → Tentang aplikasi. */
export interface Contact {
  kind: 'email' | 'github';
  /** Alamat email, atau nama akun GitHub. */
  value: string;
}

export const CONTACTS: Contact[] = [
  { kind: 'email', value: 'info@masamune.my.id' },
  { kind: 'github', value: 'Masamune21-dev' },
];

const KIND: Record<Contact['kind'], { label: string; icon: IconName }> = {
  email: { label: 'Email', icon: 'mail-outline' },
  github: { label: 'GitHub', icon: 'logo-github' },
};

export function contactInfo(c: Contact) {
  return {
    ...KIND[c.kind],
    text: c.kind === 'github' ? `github.com/${c.value}` : c.value,
    url: c.kind === 'github' ? `https://github.com/${encodeURIComponent(c.value)}` : `mailto:${c.value}`,
  };
}

/**
 * Tombol Kirim masukan: email dengan versi app dan model HP sudah tertulis, supaya laporan masalah langsung
 * lengkap. null bila tidak ada kontak email.
 */
export function feedbackUrl(): string | null {
  const to = CONTACTS.find((c) => c.kind === 'email');
  if (!to) return null;
  const build = Application.nativeBuildVersion ? ` (build ${Application.nativeBuildVersion})` : '';
  const device = [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || Platform.OS;
  const os = Platform.OS === 'web' ? 'web' : `${Platform.OS === 'android' ? 'Android' : 'iOS'} ${Device.osVersion ?? ''}`.trim();
  const body = `Halo, masukan untuk Jejak:\n\n\n---\nJejak ${APP_VERSION}${build}, ${device}, ${os}`;
  return `mailto:${to.value}?subject=${encodeURIComponent(`Masukan Jejak ${APP_VERSION}`)}&body=${encodeURIComponent(body)}`;
}
