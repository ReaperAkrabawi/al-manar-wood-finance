import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import type { AppSettings } from '@/types';

const STORAGE_KEY = 'almanar_settings';

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  isDark: boolean;
  isPinLocked: boolean;
  unlockPin: () => void;
  lockPin: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>({});
  const [isPinLocked, setIsPinLocked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const loaded: AppSettings = JSON.parse(raw);
          setSettings(loaded);
          if (loaded.pin) setIsPinLocked(true);
        }
      } catch {}
    })();
  }, []);

  async function updateSettings(updates: Partial<AppSettings>) {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (updates.pin !== undefined && updates.pin === '') {
      setIsPinLocked(false);
    }
  }

  function unlockPin() {
    setIsPinLocked(false);
  }

  function lockPin() {
    if (settings.pin) setIsPinLocked(true);
  }

  const isDark = settings.darkMode !== undefined ? settings.darkMode : systemScheme === 'dark';

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isDark, isPinLocked, unlockPin, lockPin }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
