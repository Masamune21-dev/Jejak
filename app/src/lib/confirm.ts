import { Alert, Platform } from 'react-native';

/** Dialog konfirmasi yang juga jalan di web (Alert RN tidak tampil di browser). */
export function confirm(title: string, message: string, okText = 'Ya'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Batal', style: 'cancel', onPress: () => resolve(false) },
      { text: okText, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
