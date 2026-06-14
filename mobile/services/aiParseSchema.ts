import { z } from 'zod';

import type { ParsedEntryDraft } from '@/types/ai';
import { PURCHASE_CATEGORIES } from '@/types';

const draftSchema = z.object({
  type: z.enum(['income', 'purchase', 'wage', 'withdrawal']),
  desc: z.string().optional(),
  name: z.string().optional(),
  worker: z.string().optional(),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.enum(PURCHASE_CATEGORIES as [string, ...string[]]).optional(),
  supplier: z.string().optional(),
  note: z.string().optional(),
});

const responseSchema = z.object({
  transcript: z.string().optional(),
  entries: z.array(draftSchema),
});

export function validateParseResponse(data: unknown): ParsedEntryDraft[] {
  const parsed = responseSchema.parse(data);
  return parsed.entries.map(e => ({
    ...e,
    category: e.category as ParsedEntryDraft['category'],
    date: e.date ?? new Date().toISOString().split('T')[0]!,
  }));
}
