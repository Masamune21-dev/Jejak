#!/usr/bin/env bash
# Deploy Jejak ke jejak.masamune.my.id.
#   deploy/deploy.sh          server dan versi web
#   deploy/deploy.sh server   hanya server
#   deploy/deploy.sh web      hanya versi web
#   deploy/deploy.sh apk      APK Android terbaru dari EAS ke /unduh/jejak.apk (tombol Unduh di landing page)
# Kode server dikirim lewat SSH dari commit HEAD (git archive), jadi server tidak
# butuh akses ke GitHub (repo boleh private). Commit dulu perubahan yang mau dipasang.
set -euo pipefail

HOST="${JEJAK_HOST:-root@103.189.249.115}"
ROOT=/var/www/jejak.masamune.my.id
HERE="$(cd "$(dirname "$0")/.." && pwd)"
WHAT="${1:-all}"

if [[ "$WHAT" == all || "$WHAT" == server ]]; then
  if [[ -n "$(git -C "$HERE" status --porcelain -- server shared deploy)" ]]; then
    echo "Ada perubahan server/shared/deploy yang belum di-commit. Commit dulu." >&2
    exit 1
  fi
  REV="$(git -C "$HERE" rev-parse --short HEAD)"
  echo "→ server: kirim $REV, npm ci, systemd"
  # Ekstrak ke folder baru, pasang dependensi, baru tukar; server lama tetap jalan bila ada yang gagal.
  git -C "$HERE" archive --format=tar HEAD server shared deploy |
    ssh "$HOST" "rm -rf $ROOT/repo.new && mkdir -p $ROOT/repo.new && tar -x -C $ROOT/repo.new && echo $REV > $ROOT/repo.new/REVISION"
  ssh "$HOST" bash -s <<EOF
set -euo pipefail
export NVM_DIR=/root/.nvm; . "\$NVM_DIR/nvm.sh" >/dev/null
mkdir -p $ROOT/web
# API berjalan sebagai user sistem tanpa login, bukan root; hanya user ini yang boleh membaca database.
id jejak >/dev/null 2>&1 || useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin jejak
install -d -o jejak -g jejak -m 700 $ROOT/data
chown -R jejak:jejak $ROOT/data
cd $ROOT/repo.new
npm ci --omit=dev --prefix server --no-audit --no-fund --loglevel=error
# Pasang config nginx; kalau gagal dites, kembalikan yang lama supaya situs lain tidak ikut rusak.
SITE=/etc/nginx/sites-enabled/jejak
[ -f \$SITE ] && cp \$SITE /tmp/jejak.nginx.bak || rm -f /tmp/jejak.nginx.bak
cp deploy/nginx-jejak.conf \$SITE
if ! nginx -t -q; then
  if [ -f /tmp/jejak.nginx.bak ]; then cp /tmp/jejak.nginx.bak \$SITE; else rm -f \$SITE; fi
  echo "config nginx gagal dites, dibatalkan" >&2; exit 1
fi
cd $ROOT
rm -rf repo.old
[ -d repo ] && mv repo repo.old
mv repo.new repo
systemctl reload nginx
# Node dari nvm (di /root, tertutup untuk user lain) disalin supaya bisa dijalankan user jejak.
install -d -m 755 /opt/jejak
install -m 755 "\$(command -v node)" /opt/jejak/node
install -m 644 repo/deploy/jejak.service /etc/systemd/system/jejak.service
systemctl daemon-reload
# Dulu API berjalan di PM2 sebagai root; hentikan sekali supaya port 3014 bebas.
if pm2 describe jejak >/dev/null 2>&1; then pm2 delete jejak >/dev/null && pm2 save >/dev/null; fi
systemctl enable --quiet jejak
systemctl restart jejak
for i in 1 2 3 4 5; do sleep 1; curl -fsS http://127.0.0.1:3014/health >/dev/null && break; done
if curl -fsS http://127.0.0.1:3014/health; then
  echo "  ← server sehat (\$(cat repo/REVISION))"
else
  journalctl -u jejak -n 30 --no-pager >&2
  exit 1
fi
EOF
fi

if [[ "$WHAT" == all || "$WHAT" == web ]]; then
  if [[ -n "$(git -C "$HERE" status --porcelain -- app shared)" ]]; then
    echo "Peringatan: versi web dibangun dari folder kerja, termasuk perubahan app/shared yang belum di-commit."
  fi
  echo "→ web: expo export"
  (cd "$HERE/app" && rm -rf dist && EXPO_PUBLIC_API_URL=https://jejak.masamune.my.id/api npx expo export --platform web --output-dir dist >/dev/null)
  rsync -az --no-owner --no-group --delete "$HERE/app/dist/" "$HOST:$ROOT/web/"
  echo "  ← web terpasang"
fi

if [[ "$WHAT" == apk ]]; then
  # Build APK terbaru (profil preview) yang sudah selesai di EAS. Diunduh di komputer ini lalu dikirim lewat SSH,
  # jadi server tidak butuh akun Expo. versi.json dibaca landing page untuk menampilkan versi dan ukuran.
  echo "→ apk: cari build EAS terbaru"
  json="$(cd "$HERE/app" && npx --yes eas-cli@latest build:list --platform android --build-profile preview --status finished --limit 1 --json --non-interactive 2>/dev/null)"
  read -r url versi build commit < <(node -e '
    const b = JSON.parse(process.argv[1])[0];
    if (!b) { console.error("Belum ada build APK preview yang selesai."); process.exit(1); }
    console.log(b.artifacts.applicationArchiveUrl ?? b.artifacts.buildUrl, b.appVersion, b.appBuildVersion || "-", (b.gitCommitHash || "-").slice(0, 7));
  ' "$json")
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  curl -fsSL "$url" -o "$tmp/jejak.apk"
  node -e '
    const [versi, build, commit, bytes] = process.argv.slice(1);
    const info = { versi, build: build === "-" ? undefined : Number(build), commit, ukuranMB: Math.round((Number(bytes) / 1048576) * 10) / 10, tanggal: new Date().toISOString().slice(0, 10) };
    require("node:fs").writeFileSync(process.argv[5], JSON.stringify(info));
  ' "$versi" "$build" "$commit" "$(wc -c < "$tmp/jejak.apk" | tr -d " ")" "$tmp/versi.json"
  ssh "$HOST" "mkdir -p $ROOT/unduh"
  # Kirim sebagai berkas sementara lalu ganti nama, supaya pengunjung tidak mengunduh APK yang setengah jadi.
  rsync -az --no-owner --no-group "$tmp/jejak.apk" "$HOST:$ROOT/unduh/jejak.apk.baru"
  rsync -az --no-owner --no-group "$tmp/versi.json" "$HOST:$ROOT/unduh/versi.json.baru"
  ssh "$HOST" "cd $ROOT/unduh && chmod 644 jejak.apk.baru versi.json.baru && mv jejak.apk.baru jejak.apk && mv versi.json.baru versi.json"
  echo "  ← APK $versi (build $build, $commit) terpasang di /unduh/jejak.apk"
fi
