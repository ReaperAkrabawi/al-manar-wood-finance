import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BiometricLock } from '@/components/BiometricLock';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { TemplatesProvider } from '@/context/TemplatesContext';
import { FinanceProvider } from '@/context/FinanceContext';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { ToastProvider, useToast } from '@/context/ToastContext';
import { WorkspaceProvider, useWorkspace } from '@/context/WorkspaceContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function PinMigrationToast() {
  const { pinMigrated, clearPinMigrated } = useSettings();
  const { showToast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (pinMigrated) {
      showToast(t('biometric.pinReplaced'));
      clearPinMigrated();
    }
  }, [pinMigrated, clearPinMigrated, showToast, t]);

  return null;
}

function BiometricGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { biometricEnabled, isBiometricLocked, unlockBiometric, lockBiometric } = useSettings();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const sub = AppState.addEventListener('change', nextState => {
      if (
        appState.current.match(/active/) &&
        nextState.match(/inactive|background/)
      ) {
        lockBiometric();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [lockBiometric]);

  if (user && biometricEnabled && isBiometricLocked) {
    return <BiometricLock onUnlock={unlockBiometric} />;
  }

  return <>{children}</>;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const router = useRouter();
  const segments = useSegments();
  const { user, initializing: authInit, isConfigured } = useAuth();
  const { workspaceId, loading: wsLoading } = useWorkspace();

  useEffect(() => {
    if (!isConfigured || authInit || wsLoading) return;

    const root = segments[0] as string | undefined;
    const inAuthGroup = root === '(auth)';
    const onJoin = root === 'join-workspace';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login' as Href);
    } else if (user && !workspaceId && !onJoin && !inAuthGroup) {
      router.replace('/join-workspace' as Href);
    } else if (user && workspaceId && (inAuthGroup || onJoin)) {
      router.replace('/');
    }
  }, [user, workspaceId, authInit, wsLoading, segments, router, isConfigured]);

  if (!isConfigured) {
    return <>{children}</>;
  }

  if (authInit || wsLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.income} />
      </View>
    );
  }

  return (
    <BiometricGuard>
      {children}
    </BiometricGuard>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="join-workspace" options={{ headerShown: false }} />
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
      <Stack.Screen
        name="weekly-report"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="templates"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { isRTL } = useSettings();
  return (
    <GestureHandlerRootView style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
      <PinMigrationToast />
      <AuthGate>{children}</AuthGate>
    </GestureHandlerRootView>
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
      <AuthProvider>
        <WorkspaceProvider>
          <SettingsProvider>
            <ErrorBoundary>
              <ToastProvider>
                <TemplatesProvider>
                  <FinanceProvider>
                    <QueryClientProvider client={queryClient}>
                      <AppShell>
                        <RootLayoutNav />
                      </AppShell>
                    </QueryClientProvider>
                  </FinanceProvider>
                </TemplatesProvider>
              </ToastProvider>
            </ErrorBoundary>
          </SettingsProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
