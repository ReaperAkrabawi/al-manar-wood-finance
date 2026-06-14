import type { AppLanguage } from '@/types';

export function getLocale(lang: AppLanguage): string {
  return lang === 'ar' ? 'ar-JO' : 'en-US';
}

export function formatNumber(
  value: number,
  lang: AppLanguage,
  options?: Intl.NumberFormatOptions,
): string {
  return value.toLocaleString(getLocale(lang), options);
}

export function formatMonthShort(date: Date, lang: AppLanguage): string {
  return date.toLocaleString(getLocale(lang), { month: 'short' });
}

export function formatDateShort(date: Date | string, lang: AppLanguage): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(getLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatWeekRange(start: Date, end: Date, lang: AppLanguage): string {
  return `${formatDateShort(start, lang)} – ${formatDateShort(end, lang)}`;
}

export function formatCurrency(amount: number, lang: AppLanguage): string {
  return `JD ${formatNumber(amount, lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
