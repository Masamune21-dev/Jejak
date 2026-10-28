#!/usr/bin/env bash
# Deploy Jejak ke jejak.masamune.my.id.
#   deploy/deploy.sh          server (git pull + pm2) dan versi web
#   deploy/deploy.sh server   hanya server
#   deploy/deploy.sh web      hanya versi web
# Server mengambil kode dari GitHub, jadi push dulu perubahan yang mau dipasang.
set -euo pipefail

HOST="${JEJAK_HOST:-root@103.189.249.115}"
ROOT=/var/www/jejak.masamune.my.id
REPO=https://github.com/Masamune21-dev/Jejak.git
HERE="$(cd "$(dirname "$0")/.." && pwd)"
WHAT="${1:-all}"

if [[ "$WHAT" == all || "$WHAT" == server ]]; then
  if [[ -n "$(git -C "$HERE" status --porcelain -- server shared deploy)" ]]; then
    echo "Ada perubahan server/shared/deploy yang belum di-commit. Commit & push dulu." >&2
    exit 1
  fi
  git -C "$HERE" push --quiet
  echo "→ server: git pull + npm ci + pm2"
  ssh "$HOST" bash -s <<EOF
set -euo pipefail
export NVM_DIR=/root/.nvm; . "\$NVM_DIR/nvm.sh" >/dev/null
mkdir -p $ROOT/data $ROOT/web
if [ ! -d $ROOT/repo/.git ]; then git clone --quiet $REPO $ROOT/repo; fi
cd $ROOT/repo && git fetch --quiet && git reset --quiet --hard origin/main
npm ci --omit=dev --prefix server --no-audit --no-fund --loglevel=error
# Pasang config nginx; kalau gagal dites, kembalikan yang lama supaya situs lain tidak ikut rusak.
SITE=/etc/nginx/sites-enabled/jejak
[ -f \$SITE ] && cp \$SITE /tmp/jejak.nginx.bak || rm -f /tmp/jejak.nginx.bak
cp deploy/nginx-jejak.conf \$SITE
if ! nginx -t -q; then
  if [ -f /tmp/jejak.nginx.bak ]; then cp /tmp/jejak.nginx.bak \$SITE; else rm -f \$SITE; fi
  echo "config nginx gagal dites, dibatalkan" >&2; exit 1
fi
systemctl reload nginx
pm2 startOrReload deploy/ecosystem.config.cjs --update-env >/dev/null && pm2 save >/dev/null
sleep 1
curl -fsS http://127.0.0.1:3014/health && echo "  ← server sehat ($(git rev-parse --short HEAD))"
EOF
fi

if [[ "$WHAT" == all || "$WHAT" == web ]]; then
  echo "→ web: expo export"
  (cd "$HERE/app" && rm -rf dist && EXPO_PUBLIC_API_URL=https://jejak.masamune.my.id/api npx expo export --platform web --output-dir dist >/dev/null)
  rsync -az --delete "$HERE/app/dist/" "$HOST:$ROOT/web/"
  echo "  ← web terpasang"
fi
