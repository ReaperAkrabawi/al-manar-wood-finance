import type { AppLanguage } from '@/types';
import { formatDateShort, getLocale } from '@/utils/format';

export function buildFinanceCsv(
  data: {
    income: Array<{ desc: string; amount: number; date: string; note?: string }>;
    purchases: Array<{ name: string; amount: number; date: string; category: string; supplier?: string; note?: string }>;
    wages: Array<{ worker: string; amount: number; date: string; note?: string }>;
    withdrawals: Array<{ desc: string; amount: number; date: string; note?: string }>;
  },
  lang: AppLanguage,
): string {
  const bom = '\uFEFF';
  const lines: string[] = [];

  function section(title: string, headers: string[], rows: string[][]) {
    lines.push(title);
    lines.push(headers.join(','));
    for (const row of rows) {
      lines.push(row.map(escapeCsv).join(','));
    }
    lines.push('');
  }

  section(
    lang === 'ar' ? 'الإيرادات' : 'Income',
    ['Description', 'Amount', 'Date', 'Note'],
    data.income.map(i => [i.desc, i.amount.toFixed(2), i.date, i.note ?? '']),
  );

  section(
    lang === 'ar' ? 'المشتريات' : 'Purchases',
    ['Name', 'Category', 'Supplier', 'Amount', 'Date', 'Note'],
    data.purchases.map(p => [p.name, p.category, p.supplier ?? '', p.amount.toFixed(2), p.date, p.note ?? '']),
  );

  section(
    lang === 'ar' ? 'الأجور' : 'Wages',
    ['Worker', 'Amount', 'Date', 'Note'],
    data.wages.map(w => [w.worker, w.amount.toFixed(2), w.date, w.note ?? '']),
  );

  section(
    lang === 'ar' ? 'السحوبات' : 'Withdrawals',
    ['Description', 'Amount', 'Date', 'Note'],
    data.withdrawals.map(w => [w.desc, w.amount.toFixed(2), w.date, w.note ?? '']),
  );

  lines.push(`${lang === 'ar' ? 'تاريخ التصدير' : 'Exported'}: ${new Date().toLocaleString(getLocale(lang))}`);
  return bom + lines.join('\n');
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function formatMonthRangeLabel(start: Date, end: Date, lang: AppLanguage): string {
  return `${formatDateShort(start, lang)} – ${formatDateShort(end, lang)}`;
}
