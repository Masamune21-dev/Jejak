import * as SecureStore from 'expo-secure-store';

// Token disimpan di Keychain/Keystore. Versi web ada di storage.web.ts.
export const secure = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};
