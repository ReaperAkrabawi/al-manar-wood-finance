import type { PurchaseCategory } from '@/types';

export type DraftType = 'income' | 'purchase' | 'wage' | 'withdrawal';

export interface ParsedEntryDraft {
  type: DraftType;
  desc?: string;
  name?: string;
  worker?: string;
  amount: number;
  date?: string;
  category?: PurchaseCategory;
  supplier?: string;
  note?: string;
}

export interface AiParseResult {
  transcript?: string;
  entries: ParsedEntryDraft[];
}

export interface AiSummarizePayload {
  periodLabel: string;
  totals: {
    income: number;
    purchases: number;
    wages: number;
    withdrawals: number;
    net: number;
  };
  lines: string[];
}
