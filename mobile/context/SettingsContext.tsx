import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { I18nManager, Platform, useColorScheme } from 'react-native';

import { useWorkspace } from '@/context/WorkspaceContext';
import { getFirebaseDb, isFirebaseConfigured } from '@/lib/firebase';
import {
  isBiometricLoginEnabled,
  migrateLegacyPin,
} from '@/services/biometricAuth';
import type { AppLanguage, AppSettings, WorkspaceSettings } from '@/types';

const LEGACY_KEY = 'almanar_settings';

const SYNCED_KEYS: (keyof WorkspaceSettings)[] = [
  'incomeGoal',
  'lowBalanceThreshold',
  'darkMode',
  'language',
];

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  isDark: boolean;
  isRTL: boolean;
  language: AppLanguage;
  biometricEnabled: boolean;
  isBiometricLocked: boolean;
  unlockBiometric: () => void;
  lockBiometric: () => void;
  refreshBiometricEnabled: () => Promise<void>;
  pinMigrated: boolean;
  clearPinMigrated: () => void;
  syncing: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function applyRTL(language: AppLanguage) {
  const shouldRTL = language === 'ar';
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL !== shouldRTL) {
    I18nManager.forceRTL(shouldRTL);
  }
}

function pickSynced(settings: AppSettings): WorkspaceSettings {
  return {
    incomeGoal: settings.incomeGoal,
    lowBalanceThreshold: settings.lowBalanceThreshold,
    darkMode: settings.darkMode,
    language: settings.language,
  };
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { workspaceId } = useWorkspace();
  const [synced, setSynced] = useState<WorkspaceSettings>({});
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);
  const [pinMigrated, setPinMigrated] = useState(false);
  const [syncing, setSyncing] = useState(true);

  const refreshBiometricEnabled = useCallback(async () => {
    if (Platform.OS === 'web') {
      setBiometricEnabled(false);
      setIsBiometricLocked(false);
      return;
    }
    const enabled = await isBiometricLoginEnabled();
    setBiometricEnabled(enabled);
    setIsBiometricLocked(enabled);
  }, []);

  useEffect(() => {
    (async () => {
      const migrated = await migrateLegacyPin();
      if (migrated) setPinMigrated(true);
      await refreshBiometricEnabled();
    })();
  }, [refreshBiometricEnabled]);

  useEffect(() => {
    if (!isFirebaseConfigured || !workspaceId) {
      (async () => {
        try {
          const legacy = await AsyncStorage.getItem(LEGACY_KEY);
          if (legacy) {
            const parsed: AppSettings = JSON.parse(legacy);
            setSynced(pickSynced(parsed));
            applyRTL(parsed.language ?? 'en');
          }
        } catch {}
        setSyncing(false);
      })();
      return;
    }

    setSyncing(true);
    const db = getFirebaseDb();
    const unsub = onSnapshot(doc(db, 'workspaces', workspaceId), snap => {
      const wsSettings = (snap.data()?.settings ?? {}) as WorkspaceSettings;
      setSynced(wsSettings);
      if (wsSettings.language) applyRTL(wsSettings.language);
      setSyncing(false);
    });
    return unsub;
  }, [workspaceId]);

  async function updateSettings(updates: Partial<AppSettings>) {
    const syncedUpdates: Partial<WorkspaceSettings> = {};
    for (const key of SYNCED_KEYS) {
      if (key in updates) {
        (syncedUpdates as Record<string, unknown>)[key] = updates[key];
      }
    }

    if (Object.keys(syncedUpdates).length > 0) {
      const nextSynced = { ...synced, ...syncedUpdates };
      setSynced(nextSynced);
      if (syncedUpdates.language !== undefined) {
        applyRTL(syncedUpdates.language ?? 'en');
      }

      if (workspaceId && isFirebaseConfigured) {
        const db = getFirebaseDb();
        await updateDoc(doc(db, 'workspaces', workspaceId), {
          settings: nextSynced,
        });
      } else {
        const legacyRaw = await AsyncStorage.getItem(LEGACY_KEY);
        const legacy = legacyRaw ? JSON.parse(legacyRaw) : {};
        await AsyncStorage.setItem(LEGACY_KEY, JSON.stringify({ ...legacy, ...syncedUpdates }));
      }
    }
  }

  function unlockBiometric() {
    setIsBiometricLocked(false);
  }

  function lockBiometric() {
    if (biometricEnabled) setIsBiometricLocked(true);
  }

  function clearPinMigrated() {
    setPinMigrated(false);
  }

  const settings: AppSettings = { ...synced };
  const language: AppLanguage = settings.language ?? 'en';
  const isRTL = language === 'ar';
  const isDark = settings.darkMode !== undefined ? settings.darkMode : systemScheme === 'dark';

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        isDark,
        isRTL,
        language,
        biometricEnabled,
        isBiometricLocked,
        unlockBiometric,
        lockBiometric,
        refreshBiometricEnabled,
        pinMigrated,
        clearPinMigrated,
        syncing,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
