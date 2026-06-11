import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Income, Period, Purchase, Wage, Withdrawal } from '@/types';

const KEYS = {
  income: 'almanar_income',
  purchases: 'almanar_purchases',
  wages: 'almanar_wages',
  withdrawals: 'almanar_withdrawals',
};

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function getDateRange(period: Period): { start: Date; end: Date } | null {
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

function filterByPeriod<T extends { date: string }>(items: T[], period: Period): T[] {
  const range = getDateRange(period);
  if (!range) return items;
  return items.filter(item => {
    const d = new Date(item.date);
    return d >= range.start && d <= range.end;
  });
}

interface FinanceContextValue {
  income: Income[];
  purchases: Purchase[];
  wages: Wage[];
  withdrawals: Withdrawal[];
  period: Period;
  setPeriod: (p: Period) => void;
  addIncome: (item: Omit<Income, 'id'>) => Promise<void>;
  addPurchase: (item: Omit<Purchase, 'id'>) => Promise<void>;
  addWage: (item: Omit<Wage, 'id'>) => Promise<void>;
  addWithdrawal: (item: Omit<Withdrawal, 'id'>) => Promise<void>;
  editIncome: (id: string, updates: Partial<Income>) => Promise<void>;
  editPurchase: (id: string, updates: Partial<Purchase>) => Promise<void>;
  editWage: (id: string, updates: Partial<Wage>) => Promise<void>;
  editWithdrawal: (id: string, updates: Partial<Withdrawal>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  deleteWage: (id: string) => Promise<void>;
  deleteWithdrawal: (id: string) => Promise<void>;
  filteredIncome: Income[];
  filteredPurchases: Purchase[];
  filteredWages: Wage[];
  filteredWithdrawals: Withdrawal[];
  totalIncome: number;
  totalPurchases: number;
  totalWages: number;
  totalWithdrawals: number;
  netBalance: number;
  allTimeIncome: number;
  allTimePurchases: number;
  allTimeWages: number;
  allTimeWithdrawals: number;
  allTimeNet: number;
  payRecurringWages: () => Promise<number>;
  getMonthlyTrend: () => Array<{ label: string; income: number; expenses: number }>;
  getPurchasesByCategory: () => Array<{ category: string; total: number }>;
  getWagesByWorker: () => Array<{ worker: string; total: number }>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [income, setIncome] = useState<Income[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [wages, setWages] = useState<Wage[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [period, setPeriod] = useState<Period>('month');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [inc, pur, wag, wit] = await Promise.all([
        AsyncStorage.getItem(KEYS.income),
        AsyncStorage.getItem(KEYS.purchases),
        AsyncStorage.getItem(KEYS.wages),
        AsyncStorage.getItem(KEYS.withdrawals),
      ]);
      if (inc) setIncome(JSON.parse(inc));
      if (pur) setPurchases(JSON.parse(pur));
      if (wag) setWages(JSON.parse(wag));
      if (wit) setWithdrawals(JSON.parse(wit));
    } catch {}
  }

  const saveIncome = useCallback(async (updated: Income[]) => {
    setIncome(updated);
    await AsyncStorage.setItem(KEYS.income, JSON.stringify(updated));
  }, []);

  const savePurchases = useCallback(async (updated: Purchase[]) => {
    setPurchases(updated);
    await AsyncStorage.setItem(KEYS.purchases, JSON.stringify(updated));
  }, []);

  const saveWages = useCallback(async (updated: Wage[]) => {
    setWages(updated);
    await AsyncStorage.setItem(KEYS.wages, JSON.stringify(updated));
  }, []);

  const saveWithdrawals = useCallback(async (updated: Withdrawal[]) => {
    setWithdrawals(updated);
    await AsyncStorage.setItem(KEYS.withdrawals, JSON.stringify(updated));
  }, []);

  const addIncome = useCallback(async (item: Omit<Income, 'id'>) => {
    setIncome(prev => {
      const updated = [{ ...item, id: genId() }, ...prev];
      AsyncStorage.setItem(KEYS.income, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addPurchase = useCallback(async (item: Omit<Purchase, 'id'>) => {
    setPurchases(prev => {
      const updated = [{ ...item, id: genId() }, ...prev];
      AsyncStorage.setItem(KEYS.purchases, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addWage = useCallback(async (item: Omit<Wage, 'id'>) => {
    setWages(prev => {
      const updated = [{ ...item, id: genId() }, ...prev];
      AsyncStorage.setItem(KEYS.wages, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addWithdrawal = useCallback(async (item: Omit<Withdrawal, 'id'>) => {
    setWithdrawals(prev => {
      const updated = [{ ...item, id: genId() }, ...prev];
      AsyncStorage.setItem(KEYS.withdrawals, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const editIncome = useCallback(async (id: string, updates: Partial<Income>) => {
    setIncome(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, ...updates } : i);
      AsyncStorage.setItem(KEYS.income, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const editPurchase = useCallback(async (id: string, updates: Partial<Purchase>) => {
    setPurchases(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      AsyncStorage.setItem(KEYS.purchases, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const editWage = useCallback(async (id: string, updates: Partial<Wage>) => {
    setWages(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, ...updates } : w);
      AsyncStorage.setItem(KEYS.wages, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const editWithdrawal = useCallback(async (id: string, updates: Partial<Withdrawal>) => {
    setWithdrawals(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, ...updates } : w);
      AsyncStorage.setItem(KEYS.withdrawals, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteIncome = useCallback(async (id: string) => {
    setIncome(prev => {
      const updated = prev.filter(i => i.id !== id);
      AsyncStorage.setItem(KEYS.income, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deletePurchase = useCallback(async (id: string) => {
    setPurchases(prev => {
      const updated = prev.filter(p => p.id !== id);
      AsyncStorage.setItem(KEYS.purchases, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteWage = useCallback(async (id: string) => {
    setWages(prev => {
      const updated = prev.filter(w => w.id !== id);
      AsyncStorage.setItem(KEYS.wages, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteWithdrawal = useCallback(async (id: string) => {
    setWithdrawals(prev => {
      const updated = prev.filter(w => w.id !== id);
      AsyncStorage.setItem(KEYS.withdrawals, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const payRecurringWages = useCallback(async (): Promise<number> => {
    const now = new Date();
    const today = now.toISOString().split('T')[0]!;
    const newWages: Wage[] = [];
    for (const w of wages) {
      if (!w.recurring) continue;
      const lastDate = new Date(w.date);
      const daysAgo = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (w.recurringType === 'weekly' && daysAgo >= 7) {
        newWages.push({ worker: w.worker, amount: w.amount, date: today, note: w.note, recurring: w.recurring, recurringType: w.recurringType, id: genId() });
      } else if (w.recurringType === 'monthly' && daysAgo >= 28) {
        newWages.push({ worker: w.worker, amount: w.amount, date: today, note: w.note, recurring: w.recurring, recurringType: w.recurringType, id: genId() });
      }
    }
    if (newWages.length > 0) {
      const updated = [...newWages, ...wages];
      await saveWages(updated);
    }
    return newWages.length;
  }, [wages, saveWages]);

  const getMonthlyTrend = useCallback(() => {
    const months: Array<{ label: string; income: number; expenses: number }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      const label = d.toLocaleString('default', { month: 'short' });
      const inc = income.filter(x => { const dd = new Date(x.date); return dd.getMonth() === month && dd.getFullYear() === year; }).reduce((s, x) => s + x.amount, 0);
      const pur = purchases.filter(x => { const dd = new Date(x.date); return dd.getMonth() === month && dd.getFullYear() === year; }).reduce((s, x) => s + x.amount, 0);
      const wag = wages.filter(x => { const dd = new Date(x.date); return dd.getMonth() === month && dd.getFullYear() === year; }).reduce((s, x) => s + x.amount, 0);
      const wit = withdrawals.filter(x => { const dd = new Date(x.date); return dd.getMonth() === month && dd.getFullYear() === year; }).reduce((s, x) => s + x.amount, 0);
      months.push({ label, income: inc, expenses: pur + wag + wit });
    }
    return months;
  }, [income, purchases, wages, withdrawals]);

  const getPurchasesByCategory = useCallback(() => {
    const map: Record<string, number> = {};
    for (const p of purchases) {
      map[p.category] = (map[p.category] ?? 0) + p.amount;
    }
    return Object.entries(map).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
  }, [purchases]);

  const getWagesByWorker = useCallback(() => {
    const map: Record<string, number> = {};
    for (const w of wages) {
      map[w.worker] = (map[w.worker] ?? 0) + w.amount;
    }
    return Object.entries(map).map(([worker, total]) => ({ worker, total })).sort((a, b) => b.total - a.total);
  }, [wages]);

  const filteredIncome = filterByPeriod(income, period);
  const filteredPurchases = filterByPeriod(purchases, period);
  const filteredWages = filterByPeriod(wages, period);
  const filteredWithdrawals = filterByPeriod(withdrawals, period);

  const totalIncome = filteredIncome.reduce((s, i) => s + i.amount, 0);
  const totalPurchases = filteredPurchases.reduce((s, p) => s + p.amount, 0);
  const totalWages = filteredWages.reduce((s, w) => s + w.amount, 0);
  const totalWithdrawals = filteredWithdrawals.reduce((s, w) => s + w.amount, 0);
  const netBalance = totalIncome - totalPurchases - totalWages - totalWithdrawals;

  const allTimeIncome = income.reduce((s, i) => s + i.amount, 0);
  const allTimePurchases = purchases.reduce((s, p) => s + p.amount, 0);
  const allTimeWages = wages.reduce((s, w) => s + w.amount, 0);
  const allTimeWithdrawals = withdrawals.reduce((s, w) => s + w.amount, 0);
  const allTimeNet = allTimeIncome - allTimePurchases - allTimeWages - allTimeWithdrawals;

  return (
    <FinanceContext.Provider value={{
      income, purchases, wages, withdrawals,
      period, setPeriod,
      addIncome, addPurchase, addWage, addWithdrawal,
      editIncome, editPurchase, editWage, editWithdrawal,
      deleteIncome, deletePurchase, deleteWage, deleteWithdrawal,
      filteredIncome, filteredPurchases, filteredWages, filteredWithdrawals,
      totalIncome, totalPurchases, totalWages, totalWithdrawals, netBalance,
      allTimeIncome, allTimePurchases, allTimeWages, allTimeWithdrawals, allTimeNet,
      payRecurringWages,
      getMonthlyTrend, getPurchasesByCategory, getWagesByWorker,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
