import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

import { serve } from '@hono/node-server';

import { createApp } from './app.ts';
import { openDb } from './db.ts';

const port = Number(process.env.PORT ?? 4000);
const dbPath = process.env.DB_PATH ?? fileURLToPath(new URL('../data/jejak.db', import.meta.url));

const app = createApp(openDb(dbPath));

serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => {
  const lan = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => `http://${i!.address}:${port}`);
  console.log(`Server Jejak jalan di http://localhost:${port}`);
  for (const url of lan) console.log(`  dari HP di WiFi yang sama: ${url}`);
  console.log(`  database: ${dbPath}`);
});
