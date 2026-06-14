# Al Manar Photo Worker

Cloudflare Worker + R2 for receipt photo storage.

## Setup

1. Create an R2 bucket named `almanar-photos` in Cloudflare dashboard
2. Update `FIREBASE_PROJECT_ID` in `wrangler.toml`
3. Deploy:

```bash
cd worker
npm install
npx wrangler deploy
```

4. Set `EXPO_PUBLIC_UPLOAD_WORKER_URL` in `mobile/.env` to your worker URL (e.g. `https://almanar-photo-worker.your-subdomain.workers.dev`)

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/upload` | Upload photo (requires Firebase ID token + workspace headers) |
| GET | `/photos/{workspaceId}/{entryType}/{entryId}.jpg` | Serve photo |
| DELETE | `/photo` | Delete photo |

## Firebase

Deploy Firestore rules from `firebase/firestore.rules`:

```bash
firebase deploy --only firestore:rules
```
