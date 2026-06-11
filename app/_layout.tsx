import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PinLock } from '@/components/PinLock';
import { FinanceProvider } from '@/context/FinanceContext';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { ToastProvider } from '@/context/ToastContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function PinGuard({ children }: { children: React.ReactNode }) {
  const { isPinLocked, settings, unlockPin } = useSettings();
  if (isPinLocked && settings.pin) {
    return <PinLock correctPin={settings.pin} onUnlock={unlockPin} />;
  }
  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-income"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="add-purchase"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="add-wage"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="add-withdrawal"
        options={{ presentation: 'modal', headerShown: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <SettingsProvider>
          <FinanceProvider>
            <ToastProvider>
              <QueryClientProvider client={queryClient}>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <PinGuard>
                    <RootLayoutNav />
                  </PinGuard>
                </GestureHandlerRootView>
              </QueryClientProvider>
            </ToastProvider>
          </FinanceProvider>
        </SettingsProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
