// Konfigurasi utama ada di app.json. google-services.json tidak masuk repo: build EAS memakai variabel
// file GOOGLE_SERVICES_JSON (docs/build-apk.md), di komputer sendiri dipakai app/google-services.json.
import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    android: {
      ...config.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
    },
  }) as ExpoConfig;
