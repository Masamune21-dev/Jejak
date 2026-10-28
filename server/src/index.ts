import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

import { serve } from '@hono/node-server';

import { createApp } from './app.ts';
import { openDb } from './db.ts';

const port = Number(process.env.PORT ?? 4000);
// Di server produksi cukup 127.0.0.1 (di belakang nginx); saat dev 0.0.0.0 supaya HP di WiFi bisa masuk.
const hostname = process.env.HOST ?? '0.0.0.0';
const dbPath = process.env.DB_PATH ?? fileURLToPath(new URL('../data/jejak.db', import.meta.url));

const app = createApp(openDb(dbPath));

serve({ fetch: app.fetch, port, hostname }, () => {
  const lan = (hostname === '0.0.0.0' ? Object.values(networkInterfaces()) : [])
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => `http://${i!.address}:${port}`);
  console.log(`Server Jejak jalan di http://${hostname === '0.0.0.0' ? 'localhost' : hostname}:${port}`);
  for (const url of lan) console.log(`  dari HP di WiFi yang sama: ${url}`);
  console.log(`  database: ${dbPath}`);
});
