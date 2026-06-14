import type { AppLanguage, Income, Purchase, Wage, Withdrawal } from '@/types';
import { formatCurrency, formatDateShort, formatMonthShort, formatWeekRange, getLocale } from '@/utils/format';
import { resolvePhotoUri } from '@/utils/photoUri';
import type { WeeklyReportData, WeeklyReportLabels } from './weeklyReport';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function photoBlock(photo: string | undefined, unavailableLabel: string): string {
  const uri = resolvePhotoUri(photo);
  if (!uri) return '';
  return `
    <div class="photo-wrap">
      <img src="${uri}" alt="" class="photo" onerror="this.outerHTML='<p class=\\'photo-missing\\'>${escapeHtml(unavailableLabel)}</p>'" />
    </div>`;
}

function entryRow(cells: string[]): string {
  return `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
}

function sectionTable(headers: string[], rows: string[]): string {
  if (rows.length === 0) return '';
  return `
    <table>
      <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;
}

function buildIncomeSection(items: Income[], labels: WeeklyReportLabels, lang: AppLanguage): string {
  if (items.length === 0) return '';
  const rows = items.map(item => {
    const photo = photoBlock(item.photo, labels.photoUnavailable);
    return entryRow([
      escapeHtml(item.desc),
      formatCurrency(item.amount, lang),
      formatDateShort(item.date, lang),
      item.note ? escapeHtml(item.note) : '—',
      photo,
    ]);
  });
  return `
    <section>
      <h2>${escapeHtml(labels.income)}</h2>
      ${sectionTable([labels.description, labels.amount, labels.date, labels.note, labels.photo], rows)}
    </section>`;
}

function buildPurchasesSection(items: Purchase[], labels: WeeklyReportLabels, lang: AppLanguage): string {
  if (items.length === 0) return '';
  const rows = items.map(item => {
    const photo = photoBlock(item.photo, labels.photoUnavailable);
    return entryRow([
      escapeHtml(item.name),
      escapeHtml(item.category),
      item.supplier ? escapeHtml(item.supplier) : '—',
      formatCurrency(item.amount, lang),
      formatDateShort(item.date, lang),
      item.note ? escapeHtml(item.note) : '—',
      photo,
    ]);
  });
  return `
    <section>
      <h2>${escapeHtml(labels.purchases)}</h2>
      ${sectionTable(
        [labels.description, labels.category, labels.supplier, labels.amount, labels.date, labels.note, labels.photo],
        rows,
      )}
    </section>`;
}

function buildWagesSection(items: Wage[], labels: WeeklyReportLabels, lang: AppLanguage): string {
  if (items.length === 0) return '';
  const rows = items.map(item => entryRow([
    escapeHtml(item.worker),
    formatCurrency(item.amount, lang),
    formatDateShort(item.date, lang),
    item.note ? escapeHtml(item.note) : '—',
  ]));
  return `
    <section>
      <h2>${escapeHtml(labels.wages)}</h2>
      ${sectionTable([labels.worker, labels.amount, labels.date, labels.note], rows)}
    </section>`;
}

function buildWithdrawalsSection(items: Withdrawal[], labels: WeeklyReportLabels, lang: AppLanguage): string {
  if (items.length === 0) return '';
  const rows = items.map(item => entryRow([
    escapeHtml(item.desc),
    formatCurrency(item.amount, lang),
    formatDateShort(item.date, lang),
    item.note ? escapeHtml(item.note) : '—',
  ]));
  return `
    <section>
      <h2>${escapeHtml(labels.withdrawals)}</h2>
      ${sectionTable([labels.description, labels.amount, labels.date, labels.note], rows)}
    </section>`;
}

function buildCategorySection(
  breakdown: WeeklyReportData['categoryBreakdown'],
  labels: WeeklyReportLabels,
  lang: AppLanguage,
): string {
  if (breakdown.length === 0) return '';
  const rows = breakdown.map(c => entryRow([
    escapeHtml(c.categoryLabel),
    formatCurrency(c.total, lang),
  ]));
  return `
    <section>
      <h2>${escapeHtml(labels.categoryBreakdown)}</h2>
      ${sectionTable([labels.category, labels.amount], rows)}
    </section>`;
}

export function buildWeeklyReportHtml(data: WeeklyReportData): string {
  const { labels, lang, isRTL, range, workspaceName, generatedAt, totals } = data;
  const dir = isRTL ? 'rtl' : 'ltr';
  const weekLabel = data.period === 'month'
    ? formatMonthShort(data.range.start, lang)
    : formatWeekRange(range.start, range.end, lang);
  const generatedLabel = generatedAt.toLocaleString(getLocale(lang), {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const hasEntries =
    data.income.length + data.purchases.length + data.wages.length + data.withdrawals.length > 0;

  const summaryRows = [
    { label: labels.income, value: totals.income, color: '#16a34a' },
    { label: labels.purchases, value: totals.purchases, color: '#dc2626' },
    { label: labels.wages, value: totals.wages, color: '#ca8a04' },
    { label: labels.withdrawals, value: totals.withdrawals, color: '#9333ea' },
    { label: labels.netBalance, value: totals.net, color: totals.net >= 0 ? '#16a34a' : '#dc2626' },
  ];

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a1a;
      margin: 0;
      padding: 24px;
      font-size: 12px;
      line-height: 1.4;
    }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { color: #666; margin-bottom: 20px; font-size: 11px; }
    h2 {
      font-size: 14px;
      margin: 24px 0 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #ddd;
      color: #333;
    }
    .summary-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 8px;
    }
    .summary-card {
      flex: 1 1 140px;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 10px 12px;
      background: #fafafa;
    }
    .summary-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.75; }
    .summary-value { font-size: 16px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { border: 1px solid #e5e5e5; padding: 6px 8px; text-align: ${isRTL ? 'right' : 'left'}; vertical-align: top; }
    th { background: #f5f5f5; font-size: 10px; text-transform: uppercase; }
    .photo-wrap { margin-top: 4px; }
    .photo { max-width: 100px; max-height: 100px; border-radius: 4px; object-fit: cover; }
    .photo-missing { color: #888; font-style: italic; font-size: 10px; margin: 0; }
    .empty { color: #888; font-style: italic; padding: 16px 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(labels.title)}</h1>
  <div class="meta">
    <div>${escapeHtml(labels.appName)} · ${escapeHtml(workspaceName)}</div>
    <div>${escapeHtml(labels.weekOf)}: ${escapeHtml(weekLabel)}</div>
    <div>${escapeHtml(labels.generatedAt)}: ${escapeHtml(generatedLabel)}</div>
  </div>

  <section>
    <h2>${escapeHtml(labels.summary)}</h2>
    <div class="summary-grid">
      ${summaryRows.map(r => `
        <div class="summary-card">
          <div class="summary-label">${escapeHtml(r.label)}</div>
          <div class="summary-value" style="color:${r.color}">${formatCurrency(r.value, lang)}</div>
        </div>`).join('')}
    </div>
  </section>

  ${!hasEntries ? `<p class="empty">${escapeHtml(labels.emptyWeek)}</p>` : ''}
  ${buildIncomeSection(data.income, labels, lang)}
  ${buildPurchasesSection(data.purchases, labels, lang)}
  ${buildWagesSection(data.wages, labels, lang)}
  ${buildWithdrawalsSection(data.withdrawals, labels, lang)}
  ${buildCategorySection(data.categoryBreakdown, labels, lang)}
</body>
</html>`;
}
