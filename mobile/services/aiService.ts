import type { User } from 'firebase/auth';

import type { AiParseResult, AiSummarizePayload } from '@/types/ai';
import type { AppLanguage } from '@/types';
import { validateParseResponse } from '@/services/aiParseSchema';
import { getWorkerBaseUrl, isWorkerConfigured } from '@/utils/workerUrl';

export { isWorkerConfigured };

export function getAiErrorToastKey(err: unknown): 'ai.notConfigured' | 'ai.geminiMissing' | 'ai.quotaExceeded' | 'ai.parseFailed' {
  const msg = err instanceof Error ? err.message : String(err);
  if (/gemini api key not set/i.test(msg)) return 'ai.geminiMissing';
  if (/429|quota|RESOURCE_EXHAUSTED|rate limit/i.test(msg)) return 'ai.quotaExceeded';
  if (/not configured/i.test(msg) && !/gemini/i.test(msg)) return 'ai.notConfigured';
  return 'ai.parseFailed';
}

async function workerPost<T>(
  user: User,
  path: string,
  body: unknown,
): Promise<T> {
  const base = getWorkerBaseUrl();
  if (!base) throw new Error('AI not configured');

  const idToken = await user.getIdToken();
  const response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let message = text || `Request failed (${response.status})`;
    try {
      const err = JSON.parse(text) as { error?: string };
      if (err.error) message = err.error;
    } catch {
      // use raw text
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function parseText(
  user: User,
  workspaceId: string,
  text: string,
  lang: AppLanguage,
): Promise<AiParseResult> {
  const raw = await workerPost<{ transcript?: string; entries: unknown[] }>(
    user,
    '/ai/parse',
    { workspaceId, lang, text },
  );
  return {
    transcript: raw.transcript,
    entries: validateParseResponse(raw),
  };
}

export async function parseVoice(
  user: User,
  workspaceId: string,
  audioBase64: string,
  audioMimeType: string,
  lang: AppLanguage,
): Promise<AiParseResult> {
  const raw = await workerPost<{ transcript?: string; entries: unknown[] }>(
    user,
    '/ai/parse',
    { workspaceId, lang, audioBase64, audioMimeType },
  );
  return {
    transcript: raw.transcript,
    entries: validateParseResponse(raw),
  };
}

export async function summarizePeriod(
  user: User,
  workspaceId: string,
  payload: AiSummarizePayload,
  lang: AppLanguage,
): Promise<string> {
  const raw = await workerPost<{ summary: string }>(
    user,
    '/ai/summarize',
    { workspaceId, lang, ...payload },
  );
  return raw.summary;
}
