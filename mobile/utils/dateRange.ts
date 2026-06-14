import type { Period } from '@/types';

export function getDateRange(period: Period): { start: Date; end: Date } | null {
  if (period === 'all') return null;
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  let start: Date;
  if (period === 'week') {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start = new Date(now);
    start.setDate(now.getDate() - diff);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    start = new Date(now.getFullYear(), 0, 1);
  }
  return { start, end };
}

/** Full calendar week Mon–Sun; weekOffset 0 = current week, -1 = previous, etc. */
export function getWeekRange(weekOffset = 0): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - diffToMonday + weekOffset * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Calendar month; monthOffset 0 = current month, -1 = previous, etc. */
export function getMonthRange(monthOffset = 0): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function filterByDateRange<T extends { date: string }>(
  items: T[],
  range: { start: Date; end: Date },
): T[] {
  return items.filter(item => {
    const d = new Date(item.date);
    return d >= range.start && d <= range.end;
  });
}

export function isInDateRange(dateStr: string, range: { start: Date; end: Date }): boolean {
  const d = new Date(dateStr);
  return d >= range.start && d <= range.end;
}
