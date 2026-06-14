import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { authenticate, getBiometricLabelType } from '@/services/biometricAuth';

interface BiometricLockProps {
  onUnlock: () => void;
}

export function BiometricLock({ onUnlock }: BiometricLockProps) {
  const colors = useColors();
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [labelType, setLabelType] = useState<'faceId' | 'fingerprint' | 'deviceUnlock'>('deviceUnlock');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const labelKey =
    labelType === 'faceId'
      ? 'biometric.faceId'
      : labelType === 'fingerprint'
        ? 'biometric.fingerprint'
        : 'biometric.deviceUnlock';

  const iconName =
    labelType === 'faceId' ? 'smartphone' : labelType === 'fingerprint' ? 'feather' : 'lock';

  const runAuth = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const ok = await authenticate(t('biometric.unlockReason'));
      if (ok) {
        onUnlock();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }, [busy, onUnlock, t]);

  useEffect(() => {
    getBiometricLabelType().then(setLabelType);
    authenticate(t('biometric.unlockReason')).then(ok => {
      if (ok) onUnlock();
      else setError(true);
    });
  }, [onUnlock, t]);

  async function handleUsePassword() {
    await signOut();
    router.replace('/(auth)/login' as Href);
  }

  const topPad = Platform.OS === 'web' ? insets.top + 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: insets.bottom + 34 }]}>
      <View style={styles.header}>
        <View style={[styles.logoWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="lock" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>{t('home.brandName')}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {t('biometric.unlockPrompt', { type: t(labelKey) })}
        </Text>
      </View>

      <TouchableOpacity
        onPress={runAuth}
        disabled={busy}
        style={[styles.unlockBtn, { backgroundColor: colors.income, opacity: busy ? 0.7 : 1 }]}
        activeOpacity={0.85}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Feather name={iconName} size={22} color="#fff" />
            <Text style={styles.unlockText}>{t('biometric.unlockButton', { type: t(labelKey) })}</Text>
          </>
        )}
      </TouchableOpacity>

      {error && (
        <Text style={[styles.errorText, { color: colors.destructive }]}>{t('biometric.failed')}</Text>
      )}

      <TouchableOpacity onPress={handleUsePassword} style={styles.passwordLink}>
        <Text style={[styles.passwordText, { color: colors.mutedForeground }]}>{t('biometric.usePassword')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    gap: 10,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: 240,
  },
  unlockText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  passwordLink: {
    padding: 12,
  },
  passwordText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});
