import type { Fix } from './location-source';

// Browser tidak punya lokasi latar belakang.
export async function backgroundAvailable(): Promise<boolean> {
  return false;
}

export async function startBackgroundUpdates(_onFix: (fixes: Fix[]) => void): Promise<void> {
  throw new Error('Lokasi latar tidak tersedia di web');
}

export async function stopBackgroundUpdates(): Promise<void> {}

export async function drainBackgroundBuffer(): Promise<Fix[]> {
  return [];
}
