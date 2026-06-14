import { decodeProtectedHeader, importX509, jwtVerify } from 'jose';

import { parseEntries, summarizePeriod } from './ai';

export interface Env {
  PHOTOS: R2Bucket;
  FIREBASE_PROJECT_ID: string;
  GEMINI_API_KEY?: string;
  AI: Ai;
}

let cachedCerts: Record<string, string> | null = null;
let certsFetchedAt = 0;

async function getFirebaseCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCerts && now - certsFetchedAt < 60 * 60 * 1000) return cachedCerts;
  const res = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  cachedCerts = await res.json() as Record<string, string>;
  certsFetchedAt = now;
  return cachedCerts;
}

async function verifyToken(token: string, projectId: string) {
  const header = decodeProtectedHeader(token);
  const kid = header.kid;
  if (!kid) throw new Error('Invalid token');

  const certs = await getFirebaseCerts();
  const pem = certs[kid];
  if (!pem) throw new Error('Unknown signing key');

  const key = await importX509(pem, 'RS256');
  const { payload } = await jwtVerify(token, key, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  return payload.sub as string;
}

function photoKey(workspaceId: string, entryType: string, entryId: string) {
  return `workspaces/${workspaceId}/${entryType}/${entryId}.jpg`;
}

function corsHeaders(origin?: string | null) {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Workspace-Id, X-Entry-Type, X-Entry-Id',
  };
}

async function isWorkspaceMember(env: Env, workspaceId: string, uid: string, idToken: string): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/workspaces/${workspaceId}/members/${uid}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return res.ok;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request.headers.get('Origin'));

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return json({ error: 'Unauthorized' }, 401, cors);
      }

      const token = authHeader.slice(7);
      const uid = await verifyToken(token, env.FIREBASE_PROJECT_ID);

      if (request.method === 'POST' && url.pathname === '/upload') {
        const workspaceId = request.headers.get('X-Workspace-Id');
        const entryType = request.headers.get('X-Entry-Type');
        const entryId = request.headers.get('X-Entry-Id');

        if (!workspaceId || !entryType || !entryId) {
          return json({ error: 'Missing headers' }, 400, cors);
        }

        if (!(await isWorkspaceMember(env, workspaceId, uid, token))) {
          return json({ error: 'Forbidden' }, 403, cors);
        }

        const key = photoKey(workspaceId, entryType, entryId);
        const body = await request.arrayBuffer();
        await env.PHOTOS.put(key, body, {
          httpMetadata: { contentType: 'image/jpeg' },
        });

        const publicUrl = `${url.origin}/photos/${workspaceId}/${entryType}/${entryId}.jpg`;
        return json({ url: publicUrl }, 200, cors);
      }

      if (request.method === 'GET' && url.pathname.startsWith('/photos/')) {
        const parts = url.pathname.replace('/photos/', '').split('/');
        if (parts.length !== 3) return json({ error: 'Not found' }, 404, cors);
        const [workspaceId, entryType, fileName] = parts;
        const entryId = fileName.replace('.jpg', '');
        const key = photoKey(workspaceId!, entryType!, entryId);
        const object = await env.PHOTOS.get(key);
        if (!object) return json({ error: 'Not found' }, 404, cors);
        return new Response(object.body, {
          headers: {
            ...cors,
            'Content-Type': object.httpMetadata?.contentType ?? 'image/jpeg',
            'Cache-Control': 'public, max-age=31536000',
          },
        });
      }

      if (request.method === 'DELETE' && url.pathname === '/photo') {
        const body = await request.json() as { workspaceId?: string; entryType?: string; entryId?: string };
        if (!body.workspaceId || !body.entryType || !body.entryId) {
          return json({ error: 'Missing body fields' }, 400, cors);
        }
        if (!(await isWorkspaceMember(env, body.workspaceId, uid, token))) {
          return json({ error: 'Forbidden' }, 403, cors);
        }
        const key = photoKey(body.workspaceId, body.entryType, body.entryId);
        await env.PHOTOS.delete(key);
        return json({ ok: true }, 200, cors);
      }

      if (request.method === 'POST' && url.pathname === '/ai/parse') {
        const body = await request.json() as {
          workspaceId?: string;
          lang?: 'en' | 'ar';
          text?: string;
          audioBase64?: string;
          audioMimeType?: string;
        };
        if (!body.workspaceId || !body.lang) {
          return json({ error: 'Missing workspaceId or lang' }, 400, cors);
        }
        if (!(await isWorkspaceMember(env, body.workspaceId, uid, token))) {
          return json({ error: 'Forbidden' }, 403, cors);
        }
        const backend = { geminiApiKey: env.GEMINI_API_KEY, ai: env.AI };
        const result = await parseEntries(backend, {
          lang: body.lang,
          text: body.text,
          audioBase64: body.audioBase64,
          audioMimeType: body.audioMimeType,
        });
        return json(result, 200, cors);
      }

      if (request.method === 'POST' && url.pathname === '/ai/summarize') {
        const body = await request.json() as {
          workspaceId?: string;
          lang?: 'en' | 'ar';
          periodLabel?: string;
          totals?: { income: number; purchases: number; wages: number; withdrawals: number; net: number };
          lines?: string[];
        };
        if (!body.workspaceId || !body.lang || !body.periodLabel || !body.totals || !body.lines) {
          return json({ error: 'Missing summarize fields' }, 400, cors);
        }
        if (!(await isWorkspaceMember(env, body.workspaceId, uid, token))) {
          return json({ error: 'Forbidden' }, 403, cors);
        }
        const backend = { geminiApiKey: env.GEMINI_API_KEY, ai: env.AI };
        const summary = await summarizePeriod(backend, {
          lang: body.lang,
          periodLabel: body.periodLabel,
          totals: body.totals,
          lines: body.lines,
        });
        return json({ summary }, 200, cors);
      }

      return json({ error: 'Not found' }, 404, cors);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Server error';
      return json({ error: message }, 500, cors);
    }
  },
};

function json(data: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
