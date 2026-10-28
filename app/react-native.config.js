// react-native-maps hanya dipakai di Expo Go dan iOS; APK Android memakai MapLibre (src/components/Map.tsx).
// Tanpa ini, react-native-maps ikut membawa WorkManager + Google Maps SDK ke APK, dan WorkManager
// membuat app tertutup saat dibuka karena databasenya rusak oleh R8 (minify bawaan SDK 58).
module.exports = {
  dependencies: {
    'react-native-maps': { platforms: { android: null } },
  },
};
