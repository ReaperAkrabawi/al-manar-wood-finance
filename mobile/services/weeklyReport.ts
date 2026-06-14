import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { AppLanguage, Income, Purchase, PurchaseCategory, Wage, Withdrawal } from '@/types';
import { CATEGORY_KEYS, translations, type TranslationKey } from '@/locales';
import { filterByDateRange, getMonthRange, getWeekRange } from '@/utils/dateRange';
import { buildWeeklyReportHtml } from './weeklyReportHtml';

export interface WeeklyReportLabels {
  appName: string;
  title: string;
  summary: string;
  income: string;
  purchases: string;
  wages: string;
  withdrawals: string;
  netBalance: string;
  categoryBreakdown: string;
  category: string;
  amount: string;
  date: string;
  note: string;
  description: string;
  supplier: string;
  worker: string;
  photo: string;
  emptyWeek: string;
  photoUnavailable: string;
  generatedAt: string;
  weekOf: string;
}

export type ReportPeriod = 'week' | 'month';

export interface WeeklyReportData {
  period: ReportPeriod;
  periodOffset: number;
  weekOffset: number;
  range: { start: Date; end: Date };
  workspaceName: string;
  generatedAt: Date;
  income: Income[];
  purchases: Purchase[];
  wages: Wage[];
  withdrawals: Withdrawal[];
  totals: {
    income: number;
    purchases: number;
    wages: number;
    withdrawals: number;
    net: number;
  };
  categoryBreakdown: { category: PurchaseCategory; categoryLabel: string; total: number }[];
  labels: WeeklyReportLabels;
  lang: AppLanguage;
  isRTL: boolean;
}

function t(lang: AppLanguage, key: TranslationKey): string {
  return translations[lang][key] ?? translations.en[key] ?? key;
}

function categoryLabel(lang: AppLanguage, category: PurchaseCategory): string {
  return t(lang, CATEGORY_KEYS[category]);
}

export function buildReportLabels(lang: AppLanguage, period: ReportPeriod = 'week'): WeeklyReportLabels {
  return {
    appName: t(lang, 'home.brandName'),
    title: period === 'month' ? t(lang, 'report.monthlyTitle') : t(lang, 'report.title'),
    summary: t(lang, 'report.summary'),
    income: t(lang, 'common.income'),
    purchases: t(lang, 'common.purchases'),
    wages: t(lang, 'common.wages'),
    withdrawals: t(lang, 'common.withdrawals'),
    netBalance: t(lang, 'home.netBalance'),
    categoryBreakdown: t(lang, 'report.categoryBreakdown'),
    category: t(lang, 'report.category'),
    amount: t(lang, 'report.amount'),
    date: t(lang, 'common.date'),
    note: t(lang, 'common.note'),
    description: t(lang, 'common.description'),
    supplier: t(lang, 'report.supplier'),
    worker: t(lang, 'report.worker'),
    photo: t(lang, 'common.photo'),
    emptyWeek: t(lang, 'report.emptyWeek'),
    photoUnavailable: t(lang, 'report.photoUnavailable'),
    generatedAt: t(lang, 'report.generatedAt'),
    weekOf: period === 'month' ? t(lang, 'report.monthOf') : t(lang, 'report.weekOf'),
  };
}

export function buildPeriodReportData(
  period: ReportPeriod,
  periodOffset: number,
  data: {
    income: Income[];
    purchases: Purchase[];
    wages: Wage[];
    withdrawals: Withdrawal[];
    workspaceName: string;
    lang: AppLanguage;
    isRTL: boolean;
  },
): WeeklyReportData {
  const range = period === 'month' ? getMonthRange(periodOffset) : getWeekRange(periodOffset);
  const periodIncome = filterByDateRange(data.income, range).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const periodPurchases = filterByDateRange(data.purchases, range).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const periodWages = filterByDateRange(data.wages, range).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const periodWithdrawals = filterByDateRange(data.withdrawals, range).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const totalIncome = periodIncome.reduce((s, i) => s + i.amount, 0);
  const totalPurchases = periodPurchases.reduce((s, p) => s + p.amount, 0);
  const totalWages = periodWages.reduce((s, w) => s + w.amount, 0);
  const totalWithdrawals = periodWithdrawals.reduce((s, w) => s + w.amount, 0);

  const catMap: Partial<Record<PurchaseCategory, number>> = {};
  for (const p of periodPurchases) {
    catMap[p.category] = (catMap[p.category] ?? 0) + p.amount;
  }
  const categoryBreakdown = Object.entries(catMap)
    .map(([category, total]) => ({
      category: category as PurchaseCategory,
      categoryLabel: categoryLabel(data.lang, category as PurchaseCategory),
      total,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    period,
    periodOffset,
    weekOffset: period === 'week' ? periodOffset : 0,
    range,
    workspaceName: data.workspaceName,
    generatedAt: new Date(),
    income: periodIncome,
    purchases: periodPurchases,
    wages: periodWages,
    withdrawals: periodWithdrawals,
    totals: {
      income: totalIncome,
      purchases: totalPurchases,
      wages: totalWages,
      withdrawals: totalWithdrawals,
      net: totalIncome - totalPurchases - totalWages - totalWithdrawals,
    },
    categoryBreakdown,
    labels: buildReportLabels(data.lang, period),
    lang: data.lang,
    isRTL: data.isRTL,
  };
}

export function buildWeeklyReportData(
  weekOffset: number,
  data: {
    income: Income[];
    purchases: Purchase[];
    wages: Wage[];
    withdrawals: Withdrawal[];
    workspaceName: string;
    lang: AppLanguage;
    isRTL: boolean;
  },
): WeeklyReportData {
  return buildPeriodReportData('week', weekOffset, data);
}

export async function generateWeeklyReportPdf(data: WeeklyReportData): Promise<string> {
  const html = buildWeeklyReportHtml(data);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function shareWeeklyReportPdf(uri: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Weekly Report',
  });
}
