import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';

import { getFirebaseDb } from '@/lib/firebase';
import { uploadPhotoFromBase64 } from '@/services/photoUpload';
import type { Income, Purchase, Wage, Withdrawal } from '@/types';
import { isBase64Photo } from '@/utils/photoUri';

const KEYS = {
  income: 'almanar_income',
  purchases: 'almanar_purchases',
  wages: 'almanar_wages',
  withdrawals: 'almanar_withdrawals',
  settings: 'almanar_settings',
};

async function loadLocal<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function uploadEntryPhoto(
  workspaceId: string,
  entryType: 'income' | 'purchases',
  entryId: string,
  photo: string | undefined,
  user: User,
): Promise<string | undefined> {
  if (!photo || !isBase64Photo(photo)) return photo;
  try {
    return await uploadPhotoFromBase64(workspaceId, entryType, entryId, photo, user);
  } catch {
    return photo;
  }
}

async function isWorkspaceEmpty(workspaceId: string): Promise<boolean> {
  const db = getFirebaseDb();
  const collections = ['income', 'purchases', 'wages', 'withdrawals'] as const;
  for (const name of collections) {
    const snap = await getDocs(collection(db, 'workspaces', workspaceId, name));
    if (!snap.empty) return false;
  }
  return true;
}

export async function runSyncMigration(uid: string, workspaceId: string, user: User): Promise<void> {
  const db = getFirebaseDb();
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.data()?.migratedAt) return;

  const empty = await isWorkspaceEmpty(workspaceId);
  if (!empty) {
    await setDoc(userRef, { migratedAt: new Date().toISOString() }, { merge: true });
    return;
  }

  const [income, purchases, wages, withdrawals] = await Promise.all([
    loadLocal<Income>(KEYS.income),
    loadLocal<Purchase>(KEYS.purchases),
    loadLocal<Wage>(KEYS.wages),
    loadLocal<Withdrawal>(KEYS.withdrawals),
  ]);

  const hasLocalData = income.length + purchases.length + wages.length + withdrawals.length > 0;
  const settingsRaw = await AsyncStorage.getItem(KEYS.settings);
  const localSettings = settingsRaw ? JSON.parse(settingsRaw) : {};

  if (!hasLocalData && !localSettings.incomeGoal) {
    await setDoc(userRef, { migratedAt: new Date().toISOString() }, { merge: true });
    return;
  }

  for (const item of income) {
    if (item.photo) {
      item.photo = await uploadEntryPhoto(workspaceId, 'income', item.id, item.photo, user);
    }
  }
  for (const item of purchases) {
    if (item.photo) {
      item.photo = await uploadEntryPhoto(workspaceId, 'purchases', item.id, item.photo, user);
    }
  }

  const batch = writeBatch(db);
  const now = new Date().toISOString();

  for (const item of income) {
    batch.set(doc(db, 'workspaces', workspaceId, 'income', item.id), { ...item, updatedAt: now });
  }
  for (const item of purchases) {
    batch.set(doc(db, 'workspaces', workspaceId, 'purchases', item.id), { ...item, updatedAt: now });
  }
  for (const item of wages) {
    batch.set(doc(db, 'workspaces', workspaceId, 'wages', item.id), { ...item, updatedAt: now });
  }
  for (const item of withdrawals) {
    batch.set(doc(db, 'workspaces', workspaceId, 'withdrawals', item.id), { ...item, updatedAt: now });
  }

  const syncedSettings = {
    incomeGoal: localSettings.incomeGoal,
    lowBalanceThreshold: localSettings.lowBalanceThreshold,
    darkMode: localSettings.darkMode,
    language: localSettings.language,
  };
  const hasSettings = Object.values(syncedSettings).some(v => v !== undefined);
  if (hasSettings) {
    batch.set(
      doc(db, 'workspaces', workspaceId),
      { settings: syncedSettings },
      { merge: true },
    );
  }

  await batch.commit();
  await setDoc(userRef, { migratedAt: now }, { merge: true });

  await AsyncStorage.multiSet([
    [KEYS.income, JSON.stringify(income)],
    [KEYS.purchases, JSON.stringify(purchases)],
    [KEYS.wages, JSON.stringify(wages)],
    [KEYS.withdrawals, JSON.stringify(withdrawals)],
  ]);
}
