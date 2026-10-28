// PM2 untuk server produksi jejak.masamune.my.id.
// Kode dikirim deploy/deploy.sh (git archive lewat SSH) ke /var/www/jejak.masamune.my.id/repo.
const ROOT = '/var/www/jejak.masamune.my.id';

module.exports = {
  apps: [
    {
      name: 'jejak',
      cwd: `${ROOT}/repo/server`,
      script: 'src/index.ts',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3014',
        DB_PATH: `${ROOT}/data/jejak.db`,
      },
      max_memory_restart: '300M',
    },
  ],
};
