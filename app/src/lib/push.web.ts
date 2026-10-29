import type { PushState } from './push';

/** Versi web tidak memakai notifikasi push; semua fungsi kosong dan bagian notifikasi disembunyikan. */
export type { PushState };

export const PUSH_SUPPORTED = false;

export const getPushState = async (): Promise<PushState> => 'unsupported';
export const enablePush = async (): Promise<PushState> => 'unsupported';
export const disablePush = async (): Promise<void> => {};
export const declinePush = async (): Promise<void> => {};
export function usePushSync(_userId: number | null) {}
export function useNotificationTaps(_ready: boolean) {}
