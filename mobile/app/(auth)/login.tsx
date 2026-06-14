import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import {
  authenticate,
  enableBiometricLogin,
  getBiometricLabelType,
  getStoredCredentials,
  hasStoredCredentials,
  isBiometricHardwareAvailable,
  isBiometricLoginEnabled,
} from '@/services/biometricAuth';
import { getAuthErrorKey } from '@/utils/authErrors';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, resetPassword, isConfigured } = useAuth();
  const { refreshBiometricEnabled } = useSettings();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [canQuickSignIn, setCanQuickSignIn] = useState(false);
  const [labelType, setLabelType] = useState<'faceId' | 'fingerprint' | 'deviceUnlock'>('deviceUnlock');
  const autoPrompted = useRef(false);

  const labelKey =
    labelType === 'faceId'
      ? 'biometric.faceId'
      : labelType === 'fingerprint'
        ? 'biometric.fingerprint'
        : 'biometric.deviceUnlock';

  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      const [enabled, hasCreds, available] = await Promise.all([
        isBiometricLoginEnabled(),
        hasStoredCredentials(),
        isBiometricHardwareAvailable(),
      ]);
      if (available) {
        setLabelType(await getBiometricLabelType());
      }
      setCanQuickSignIn(enabled && hasCreds && available);
    })();
  }, []);

  const navigateAfterAuth = useCallback(() => {
    router.replace('/join-workspace' as Href);
  }, []);

  const maybeOfferBiometricSetup = useCallback(
    (userEmail: string, userPassword: string) => {
      if (Platform.OS === 'web') {
        navigateAfterAuth();
        return;
      }
      (async () => {
        const [available, alreadyEnabled] = await Promise.all([
          isBiometricHardwareAvailable(),
          isBiometricLoginEnabled(),
        ]);
        if (!available || alreadyEnabled) {
          navigateAfterAuth();
          return;
        }
        Alert.alert(
          t('biometric.enablePromptTitle'),
          t('biometric.enablePromptBody', { type: t(labelKey) }),
          [
            {
              text: t('biometric.notNow'),
              style: 'cancel',
              onPress: navigateAfterAuth,
            },
            {
              text: t('biometric.enable'),
              onPress: async () => {
                try {
                  await enableBiometricLogin(userEmail, userPassword);
                  await refreshBiometricEnabled();
                  showToast(t('biometric.enabled'));
                } catch {
                  showToast(t('biometric.enableFailed'), 'error');
                }
                navigateAfterAuth();
              },
            },
          ],
        );
      })();
    },
    [labelKey, navigateAfterAuth, refreshBiometricEnabled, showToast, t],
  );

  const handleBiometricSignIn = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const ok = await authenticate(t('biometric.signInReason'));
      if (!ok) {
        setLoading(false);
        return;
      }
      const creds = await getStoredCredentials();
      if (!creds) {
        showToast(t('biometric.setupRequired'), 'error');
        setLoading(false);
        return;
      }
      await signIn(creds.email, creds.password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('auth.welcomeBack'));
      router.replace('/join-workspace' as Href);
    } catch (err: unknown) {
      showToast(t(getAuthErrorKey(err)), 'error');
    } finally {
      setLoading(false);
    }
  }, [loading, showToast, signIn, t]);

  useEffect(() => {
    if (Platform.OS === 'web' || !canQuickSignIn || autoPrompted.current) return;
    autoPrompted.current = true;
    handleBiometricSignIn();
  }, [canQuickSignIn, handleBiometricSignIn]);

  async function handleForgotPassword() {
    const target = email.trim();
    if (!target) {
      showToast(t('auth.fillAllFields'), 'error');
      return;
    }
    Alert.alert(t('auth.forgotPassword'), target, [
      { text: t('delete.cancel'), style: 'cancel' },
      {
        text: t('auth.forgotPassword'),
        onPress: async () => {
          try {
            await resetPassword(target);
            showToast(t('auth.resetSent'));
          } catch {
            showToast(t('auth.resetFailed'), 'error');
          }
        },
      },
    ]);
  }

  async function handleSubmit() {
    if (!email.trim() || !password) {
      showToast(t('auth.fillAllFields'), 'error');
      return;
    }
    if (password.length < 6) {
      showToast(t('auth.passwordMin'), 'error');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        showToast(t('auth.welcomeBack'));
      } else {
        await signUp(email, password, displayName.trim() || undefined);
        showToast(t('auth.accountCreated'));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      maybeOfferBiometricSetup(email.trim(), password);
    } catch (err: unknown) {
      showToast(t(getAuthErrorKey(err)), 'error');
    } finally {
      setLoading(false);
    }
  }

  if (!isConfigured) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Feather name="alert-circle" size={48} color={colors.destructive} />
        <Text style={[styles.configTitle, { color: colors.foreground }]}>{t('auth.notConfigured')}</Text>
        <Text style={[styles.configSub, { color: colors.mutedForeground }]}>{t('auth.notConfiguredSub')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.logoWrap, { backgroundColor: colors.incomeLight }]}>
            <Feather name="trending-up" size={28} color={colors.income} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('home.brandName')}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {mode === 'signin' ? t('auth.signInSub') : t('auth.signUpSub')}
          </Text>
        </View>

        {canQuickSignIn && mode === 'signin' && (
          <TouchableOpacity
            onPress={handleBiometricSignIn}
            disabled={loading}
            style={[styles.bioBtn, { backgroundColor: colors.income, opacity: loading ? 0.7 : 1 }]}
            activeOpacity={0.85}
          >
            <Feather name="smartphone" size={20} color="#fff" />
            <Text style={styles.bioBtnText}>{t('biometric.unlockButton', { type: t(labelKey) })}</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {mode === 'signup' && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('auth.displayName')}</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t('auth.displayNamePlaceholder')}
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('auth.email')}</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('auth.password')}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            {mode === 'signin' && (
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotLink}>
                <Text style={[styles.forgotText, { color: colors.income }]}>{t('auth.forgotPassword')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.income, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          style={styles.switchMode}
        >
          <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
            {mode === 'signin' ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
            <Text style={{ color: colors.income, fontFamily: 'Inter_600SemiBold' }}>
              {mode === 'signin' ? t('auth.signUp') : t('auth.signIn')}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  configTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginTop: 8,
  },
  configSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  bioBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  form: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  switchMode: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});
