// Melengkapi app.json dengan nilai rahasia dari variabel lingkungan (EAS env / shell),
// supaya kunci API tidak masuk repo publik.
module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? [])];
  const mapsKey = process.env.GOOGLE_MAPS_ANDROID_KEY;
  // Expo Go tidak butuh kunci; build APK/AAB butuh kunci Maps SDK for Android supaya peta tampil.
  if (mapsKey) plugins.push(['react-native-maps', { androidGoogleMapsApiKey: mapsKey }]);
  return { ...config, plugins };
};
