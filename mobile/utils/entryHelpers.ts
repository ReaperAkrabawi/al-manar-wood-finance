import type { Income, Purchase, Wage, Withdrawal } from '@/types';

export type EntryType = 'income' | 'purchase' | 'wage' | 'withdrawal';

export function getLastEntry<T extends { date: string }>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

export function uniqueStrings(values: (string | undefined)[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    const trimmed = v?.trim();
    if (trimmed) set.add(trimmed);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function getUniqueSuppliers(purchases: Purchase[]): string[] {
  return uniqueStrings(purchases.map(p => p.supplier));
}

export function getUniqueWorkers(wages: Wage[]): string[] {
  return uniqueStrings(wages.map(w => w.worker));
}

export function addRouteForType(type: EntryType): string {
  if (type === 'income') return '/add-income';
  if (type === 'purchase') return '/add-purchase';
  if (type === 'wage') return '/add-wage';
  return '/add-withdrawal';
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0]!;
}
