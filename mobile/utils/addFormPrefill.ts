import type { TemplatePayload } from '@/types';

export function parseTemplateParam(raw?: string | string[]): {
  payload: TemplatePayload;
  defaultAmount?: number;
} | null {
  if (!raw || Array.isArray(raw)) return null;
  try {
    const parsed = JSON.parse(raw) as { payload?: TemplatePayload; defaultAmount?: number };
    if (!parsed.payload) return null;
    return { payload: parsed.payload, defaultAmount: parsed.defaultAmount };
  } catch {
    return null;
  }
}

export function templateParamValue(payload: TemplatePayload, defaultAmount?: number): string {
  return JSON.stringify({ payload, defaultAmount });
}
