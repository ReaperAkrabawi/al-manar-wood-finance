#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "Get a free key: https://aistudio.google.com/apikey"
  read -rsp "Paste GEMINI_API_KEY: " GEMINI_API_KEY
  echo ""
fi

if [ -z "$GEMINI_API_KEY" ]; then
  echo "No key provided."
  exit 1
fi

printf '%s' "$GEMINI_API_KEY" | npx wrangler secret put GEMINI_API_KEY
echo ""
echo "✓ GEMINI_API_KEY set on almanar-photo-worker"
echo "  Reload Expo and try voice again."
