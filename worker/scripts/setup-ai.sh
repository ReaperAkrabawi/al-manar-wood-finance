#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORKER_DIR="$ROOT/worker"
MOBILE_DIR="$ROOT/mobile"
ENV_FILE="$MOBILE_DIR/.env"
ACCOUNT_ID="f693600db957d61f08ddc2352096e786"

cd "$WORKER_DIR"

echo ""
echo "=== Al Manar AI Worker Setup ==="
echo ""

if ! npx wrangler whoami 2>/dev/null | grep -q "@"; then
  echo "Sign in to Cloudflare first:"
  npx wrangler login
fi

echo "Step 1: Register workers.dev subdomain (one-time, ~30 seconds)"
echo "  Open: https://dash.cloudflare.com/${ACCOUNT_ID}/workers/onboarding"
echo "  Pick any subdomain (e.g. almanar) and confirm."
echo ""
read -rp "Press Enter after subdomain is registered (or Ctrl+C to cancel)..."

echo ""
echo "Step 2: Deploy worker..."
DEPLOY_OUT=$(npx wrangler deploy 2>&1 | tee /dev/stderr)
WORKER_URL=$(echo "$DEPLOY_OUT" | grep -oE 'https://[a-zA-Z0-9.-]+\.workers\.dev' | head -1)

if [ -z "$WORKER_URL" ]; then
  echo "Could not detect worker URL from deploy output."
  read -rp "Paste your worker URL (https://....workers.dev): " WORKER_URL
fi

echo ""
echo "Step 3: Set Gemini API key (from https://aistudio.google.com/apikey)"
if [ -t 0 ]; then
  read -rsp "GEMINI_API_KEY: " GEMINI_KEY
  echo ""
  if [ -n "$GEMINI_KEY" ]; then
    printf '%s' "$GEMINI_KEY" | npx wrangler secret put GEMINI_API_KEY
  else
    echo "Skipped — run later: npx wrangler secret put GEMINI_API_KEY"
  fi
else
  echo "Run: npx wrangler secret put GEMINI_API_KEY"
fi

echo ""
echo "Step 4: Update mobile/.env"
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
echo "Done!"
echo "  Worker URL: $WORKER_URL"
echo "  Updated:    $ENV_FILE"
echo ""
echo "Restart Expo: cd mobile && npm start"
echo ""
echo "Local dev (same Wi‑Fi, no deploy):"
echo "  cp .dev.vars.example .dev.vars   # add GEMINI_API_KEY"
echo "  npm run dev                      # then set EXPO_PUBLIC_UPLOAD_WORKER_URL=http://YOUR_LAN_IP:8787"
echo ""
