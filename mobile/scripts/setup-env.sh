#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo ""
echo "=== Al Manar Firebase .env Setup ==="
echo ""
echo "Get these from Firebase Console → Project settings → Your apps → Web app"
echo "https://console.firebase.google.com"
echo ""

read -rp "EXPO_PUBLIC_FIREBASE_API_KEY: " API_KEY
read -rp "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: " AUTH_DOMAIN
read -rp "EXPO_PUBLIC_FIREBASE_PROJECT_ID: " PROJECT_ID
read -rp "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: " STORAGE_BUCKET
read -rp "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: " SENDER_ID
read -rp "EXPO_PUBLIC_FIREBASE_APP_ID: " APP_ID
echo ""
read -rp "EXPO_PUBLIC_UPLOAD_WORKER_URL (optional, press Enter to skip): " WORKER_URL

cat > .env <<EOF
EXPO_PUBLIC_FIREBASE_API_KEY=${API_KEY}
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=${AUTH_DOMAIN}
EXPO_PUBLIC_FIREBASE_PROJECT_ID=${PROJECT_ID}
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=${STORAGE_BUCKET}
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${SENDER_ID}
EXPO_PUBLIC_FIREBASE_APP_ID=${APP_ID}
EXPO_PUBLIC_UPLOAD_WORKER_URL=${WORKER_URL}
EOF

echo ""
echo "✓ Wrote mobile/.env"
echo ""
echo "Next: deploy Firestore rules (from firebase/ folder):"
echo "  cd ../firebase && npm install && npx firebase use ${PROJECT_ID} && npm run deploy-rules"
echo ""
echo "Then restart Expo:"
echo "  cd ../mobile && npm start"
echo ""
