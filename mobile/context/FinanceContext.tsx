import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';
import { uploadPhotoFromBase64 } from '@/services/photoUpload';
import type { Income, Period, Purchase, Wage, Withdrawal } from '@/types';
import { filterByDateRange, getDateRange } from '@/utils/dateRange';
import { formatMonthShort } from '@/utils/format';
import { genId } from '@/utils/id';
import { isBase64Photo } from '@/utils/photoUri';
import { toFirestoreDoc } from '@/utils/firestore';
import { useTranslation } from '@/hooks/useTranslation';

async function withSyncError<T>(fn: () => Promise<T>, onError: () => void): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error('Firestore sync error:', err);
    onError();
    throw err;
  }
}

const CACHE_KEYS = {
  income: 'almanar_income',
  purchases: 'almanar_purchases',
  wages: 'almanar_wages',
  withdrawals: 'almanar_withdrawals',
};

function filterByPeriod<T extends { date: string }>(items: T[], period: Period): T[] {
  const range = getDateRange(period);
  if (!range) return items;
  return filterByDateRange(items, range);
}

async function resolvePhotoForSave(
  workspaceId: string,
  entryType: 'income' | 'purchases',
  entryId: string,
  photo: string | undefined,
  user: ReturnType<typeof useAuth>['user'],
): Promise<string | undefined> {
  if (!photo || !isBase64Photo(photo) || !user) return photo;
  try {
    return await uploadPhotoFromBase64(workspaceId, entryType, entryId, photo, user);
  } catch {
    return photo;
  }
}

interface FinanceContextValue {
  income: Income[];
  purchases: Purchase[];
  wages: Wage[];
  withdrawals: Withdrawal[];
  syncing: boolean;
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
  const { language } = useSettings();
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const reportSyncError = useCallback(() => showToast(t('toasts.syncError'), 'error'), [showToast, t]);
  const [income, setIncome] = useState<Income[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [wages, setWages] = useState<Wage[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [period, setPeriod] = useState<Period>('month');
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !workspaceId) {
      (async () => {
        try {
          const [inc, pur, wag, wit] = await Promise.all([
            AsyncStorage.getItem(CACHE_KEYS.income),
            AsyncStorage.getItem(CACHE_KEYS.purchases),
            AsyncStorage.getItem(CACHE_KEYS.wages),
            AsyncStorage.getItem(CACHE_KEYS.withdrawals),
          ]);
          if (inc) setIncome(JSON.parse(inc));
          if (pur) setPurchases(JSON.parse(pur));
          if (wag) setWages(JSON.parse(wag));
          if (wit) setWithdrawals(JSON.parse(wit));
        } catch {}
        setSyncing(false);
      })();
      return;
    }

    setSyncing(true);
    const db = getFirebaseDb();
    const unsubs = [
      onSnapshot(collection(db, 'workspaces', workspaceId, 'income'), snap => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Income));
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setIncome(items);
        AsyncStorage.setItem(CACHE_KEYS.income, JSON.stringify(items)).catch(() => {});
      }),
      onSnapshot(collection(db, 'workspaces', workspaceId, 'purchases'), snap => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase));
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPurchases(items);
        AsyncStorage.setItem(CACHE_KEYS.purchases, JSON.stringify(items)).catch(() => {});
      }),
      onSnapshot(collection(db, 'workspaces', workspaceId, 'wages'), snap => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Wage));
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setWages(items);
        AsyncStorage.setItem(CACHE_KEYS.wages, JSON.stringify(items)).catch(() => {});
      }),
      onSnapshot(collection(db, 'workspaces', workspaceId, 'withdrawals'), snap => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Withdrawal));
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setWithdrawals(items);
        AsyncStorage.setItem(CACHE_KEYS.withdrawals, JSON.stringify(items)).catch(() => {});
        setSyncing(false);
      }),
    ];

    return () => unsubs.forEach(u => u());
  }, [workspaceId]);

  const addIncome = useCallback(async (item: Omit<Income, 'id'>) => {
    const id = genId();
    let photo = item.photo;
    if (workspaceId && user) {
      await withSyncError(async () => {
        photo = await resolvePhotoForSave(workspaceId, 'income', id, photo, user);
        const db = getFirebaseDb();
        await setDoc(doc(db, 'workspaces', workspaceId, 'income', id), toFirestoreDoc({
          ...item,
          photo,
          id,
          updatedAt: new Date().toISOString(),
        }));
      }, reportSyncError);
      return;
    }
    setIncome(prev => {
      const updated = [{ ...item, id, photo }, ...prev];
      AsyncStorage.setItem(CACHE_KEYS.income, JSON.stringify(updated));
      return updated;
    });
  }, [workspaceId, user]);

  const addPurchase = useCallback(async (item: Omit<Purchase, 'id'>) => {
    const id = genId();
    let photo = item.photo;
    if (workspaceId && user) {
      await withSyncError(async () => {
        photo = await resolvePhotoForSave(workspaceId, 'purchases', id, photo, user);
        const db = getFirebaseDb();
        await setDoc(doc(db, 'workspaces', workspaceId, 'purchases', id), toFirestoreDoc({
          ...item,
          photo,
          id,
          updatedAt: new Date().toISOString(),
        }));
      }, reportSyncError);
      return;
    }
    setPurchases(prev => {
      const updated = [{ ...item, id, photo }, ...prev];
      AsyncStorage.setItem(CACHE_KEYS.purchases, JSON.stringify(updated));
      return updated;
    });
  }, [workspaceId, user]);

  const addWage = useCallback(async (item: Omit<Wage, 'id'>) => {
    const id = genId();
    if (workspaceId) {
      await withSyncError(async () => {
        const db = getFirebaseDb();
        await setDoc(doc(db, 'workspaces', workspaceId, 'wages', id), toFirestoreDoc({
          ...item,
          id,
          updatedAt: new Date().toISOString(),
        }));
      }, reportSyncError);
      return;
    }
    setWages(prev => {
      const updated = [{ ...item, id }, ...prev];
      AsyncStorage.setItem(CACHE_KEYS.wages, JSON.stringify(updated));
      return updated;
    });
  }, [workspaceId]);

  const addWithdrawal = useCallback(async (item: Omit<Withdrawal, 'id'>) => {
    const id = genId();
    if (workspaceId) {
      await withSyncError(async () => {
        const db = getFirebaseDb();
        await setDoc(doc(db, 'workspaces', workspaceId, 'withdrawals', id), toFirestoreDoc({
          ...item,
          id,
          updatedAt: new Date().toISOString(),
        }));
      }, reportSyncError);
      return;
    }
    setWithdrawals(prev => {
      const updated = [{ ...item, id }, ...prev];
      AsyncStorage.setItem(CACHE_KEYS.withdrawals, JSON.stringify(updated));
      return updated;
    });
  }, [workspaceId]);

  const editIncome = useCallback(async (id: string, updates: Partial<Income>) => {
    let nextUpdates = { ...updates };
    if (workspaceId && user && updates.photo !== undefined) {
      nextUpdates.photo = await resolvePhotoForSave(workspaceId, 'income', id, updates.photo, user);
    }
    if (workspaceId) {
      await withSyncError(async () => {
        const db = getFirebaseDb();
        await updateDoc(doc(db, 'workspaces', workspaceId, 'income', id), toFirestoreDoc({
          ...nextUpdates,
          updatedAt: new Date().toISOString(),
        }));
      }, reportSyncError);
      return;
    }
    setIncome(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, ...nextUpdates } : i);
      AsyncStorage.setItem(CACHE_KEYS.income, JSON.stringify(updated));
      return updated;
    });
  }, [workspaceId, user]);

  const editPurchase = useCallback(async (id: string, updates: Partial<Purchase>) => {
    let nextUpdates = { ...updates };
    if (workspaceId && user && updates.photo !== undefined) {
      nextUpdates.photo = await resolvePhotoForSave(workspaceId, 'purchases', id, updates.photo, user);
    }
    if (workspaceId) {
      await withSyncError(async () => {
        const db = getFirebaseDb();
        await updateDoc(doc(db, 'workspaces', workspaceId, 'purchases', id), toFirestoreDoc({
          ...nextUpdates,
          updatedAt: new Date().toISOString(),
        }));
      }, reportSyncError);
      return;
    }
    setPurchases(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...nextUpdates } : p);
      AsyncStorage.setItem(CACHE_KEYS.purchases, JSON.stringify(updated));
      return updated;
    });
  }, [workspaceId, user]);

  const editWage = useCallback(async (id: string, updates: Partial<Wage>) => {
    if (workspaceId) {
      await withSyncError(async () => {
        const db = getFirebaseDb();
        await updateDoc(doc(db, 'workspaces', workspaceId, 'wages', id), toFirestoreDoc({
          ...updates,
          updatedAt: new Date().toISOString(),
        }));
      }, reportSyncError);
      return;
    }
    setWages(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, ...updates } : w);
      AsyncStorage.setItem(CACHE_KEYS.wages, JSON.stringify(updated));
      return updated;
    });
  }, [workspaceId]);

  const editWithdrawal = useCallback(async (id: string, updates: Partial<Withdrawal>) => {
    if (workspaceId) {
      await withSyncError(async () => {
        const db = getFirebaseDb();
        await updateDoc(doc(db, 'workspaces', workspaceId, 'withdrawals', id), toFirestoreDoc({
          ...updates,
          updatedAt: new Date().toISOString(),
        }));
      }, reportSyncError);
      return;
    }
    setWithdrawals(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, ...updates } : w);
      AsyncStorage.setItem(CACHE_KEYS.withdrawals, JSON.stringify(updated));
      return updated;
    });
  }, [workspaceId]);

  const deleteIncome = useCallback(async (id: string) => {
    if (workspaceId) {
      await deleteDoc(doc(getFirebaseDb(), 'workspaces', workspaceId, 'income', id));
      return;
    }
    setIncome(prev => {
      const updated = prev.filter(i => i.id !== id);
      AsyncStorage.setItem(CACHE_KEYS.income, JSON.stringify(updated));
      return updated;
    });
  }, [workspaceId]);

  const deletePurchase = useCallback(async (id: string) => {
    if (workspaceId) {
      await deleteDoc(doc(getFirebaseDb(), 'workspaces', workspaceId, 'purchases', id));
      return;
    }
    setPurchases(prev => {
      const updated = prev.filter(p => p.id !== id);
      AsyncStorage.setItem(CACHE_KEYS.purchases, JSON.stringify(updated));
      return updated;
    });
  }, [workspaceId]);

  const deleteWage = useCallback(async (id: string) => {
    if (workspaceId) {
      await deleteDoc(doc(getFirebaseDb(), 'workspaces', workspaceId, 'wages', id));
      return;
    }
    setWages(prev => {
      const updated = prev.filter(w => w.id !== id);
      AsyncStorage.setItem(CACHE_KEYS.wages, JSON.stringify(updated));
      return updated;
    });
  }, [workspaceId]);

  const deleteWithdrawal = useCallback(async (id: string) => {
    if (workspaceId) {
      await deleteDoc(doc(getFirebaseDb(), 'workspaces', workspaceId, 'withdrawals', id));
      return;
    }
    setWithdrawals(prev => {
      const updated = prev.filter(w => w.id !== id);
      AsyncStorage.setItem(CACHE_KEYS.withdrawals, JSON.stringify(updated));
      return updated;
    });
  }, [workspaceId]);

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
    for (const wage of newWages) {
      await addWage(wage);
    }
    return newWages.length;
  }, [wages, addWage]);

  const getMonthlyTrend = useCallback(() => {
    const months: Array<{ label: string; income: number; expenses: number }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      const label = formatMonthShort(d, language);
      const inc = income.filter(x => { const dd = new Date(x.date); return dd.getMonth() === month && dd.getFullYear() === year; }).reduce((s, x) => s + x.amount, 0);
      const pur = purchases.filter(x => { const dd = new Date(x.date); return dd.getMonth() === month && dd.getFullYear() === year; }).reduce((s, x) => s + x.amount, 0);
      const wag = wages.filter(x => { const dd = new Date(x.date); return dd.getMonth() === month && dd.getFullYear() === year; }).reduce((s, x) => s + x.amount, 0);
      const wit = withdrawals.filter(x => { const dd = new Date(x.date); return dd.getMonth() === month && dd.getFullYear() === year; }).reduce((s, x) => s + x.amount, 0);
      months.push({ label, income: inc, expenses: pur + wag + wit });
    }
    return months;
  }, [income, purchases, wages, withdrawals, language]);

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
      income, purchases, wages, withdrawals, syncing,
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
