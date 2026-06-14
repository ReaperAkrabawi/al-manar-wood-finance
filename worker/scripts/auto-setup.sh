#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORKER_DIR="$ROOT/worker"
MOBILE_DIR="$ROOT/mobile"
BUCKET="almanar-photos"

cd "$WORKER_DIR"

echo ""
echo "=== Al Manar Cloudflare R2 + Worker Setup ==="
echo "Account: m.h.hamad708@gmail.com"
echo ""

if ! npx wrangler whoami 2>/dev/null | grep -q "@"; then
  echo "Opening browser to sign in to Cloudflare..."
  npx wrangler login
fi

echo ""
echo "Creating R2 bucket (if needed): $BUCKET"
npx wrangler r2 bucket create "$BUCKET" 2>/dev/null || echo "Bucket may already exist — continuing."

echo ""
echo "Deploying worker..."
DEPLOY_OUT=$(npx wrangler deploy 2>&1 | tee /dev/stderr)

WORKER_URL=$(echo "$DEPLOY_OUT" | grep -oE 'https://[a-zA-Z0-9.-]+\.workers\.dev' | head -1)

if [ -z "$WORKER_URL" ]; then
  WORKER_URL="https://almanar-photo-worker.$(npx wrangler whoami 2>/dev/null | grep -i 'Account Name' | awk '{print $NF}' | tr '[:upper:]' '[:lower:]' | tr ' ' '-').workers.dev"
  echo "Guessing worker URL: $WORKER_URL"
fi

ENV_FILE="$MOBILE_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  if grep -q '^EXPO_PUBLIC_UPLOAD_WORKER_URL=' "$ENV_FILE"; then
    sed -i '' "s|^EXPO_PUBLIC_UPLOAD_WORKER_URL=.*|EXPO_PUBLIC_UPLOAD_WORKER_URL=${WORKER_URL}|" "$ENV_FILE"
  else
    echo "EXPO_PUBLIC_UPLOAD_WORKER_URL=${WORKER_URL}" >> "$ENV_FILE"
  fi
else
  echo "EXPO_PUBLIC_UPLOAD_WORKER_URL=${WORKER_URL}" > "$ENV_FILE"
fi

echo ""
echo "✓ Worker URL: $WORKER_URL"
echo "✓ Updated $ENV_FILE"
echo ""
echo "Restart Expo to pick up the new URL:"
echo "  cd $MOBILE_DIR && npm start"
echo ""
