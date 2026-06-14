import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { useFinance } from '@/context/FinanceContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { buildFinanceCsv } from '@/services/csvExport';
import {
  authenticate,
  disableBiometricLogin,
  hasStoredCredentials,
  isBiometricHardwareAvailable,
  setBiometricEnabledFlag,
} from '@/services/biometricAuth';
import type { AppLanguage } from '@/types';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, isDark, biometricEnabled, refreshBiometricEnabled, language } = useSettings();
  const { signOut, isConfigured } = useAuth();
  const { income, purchases, wages, withdrawals } = useFinance();
  const { workspace, role, memberCount, members, createInvite } = useWorkspace();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const topPad = Platform.OS === 'web' ? insets.top + 67 : insets.top;

  const [goalInput, setGoalInput] = useState(settings.incomeGoal?.toString() ?? '');
  const [thresholdInput, setThresholdInput] = useState(settings.lowBalanceThreshold?.toString() ?? '');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioToggling, setBioToggling] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    isBiometricHardwareAvailable().then(setBioAvailable);
  }, []);

  useEffect(() => {
    setGoalInput(settings.incomeGoal?.toString() ?? '');
    setThresholdInput(settings.lowBalanceThreshold?.toString() ?? '');
  }, [settings]);

  async function saveGoal() {
    const val = parseFloat(goalInput);
    if (!isNaN(val) && val > 0) {
      await updateSettings({ incomeGoal: val });
      showToast(t('toasts.goalSaved'));
    } else if (goalInput === '') {
      await updateSettings({ incomeGoal: undefined });
      showToast(t('toasts.goalCleared'));
    }
  }

  async function saveThreshold() {
    const val = parseFloat(thresholdInput);
    if (!isNaN(val) && val >= 0) {
      await updateSettings({ lowBalanceThreshold: val });
      showToast(t('toasts.thresholdSaved'));
    } else if (thresholdInput === '') {
      await updateSettings({ lowBalanceThreshold: undefined });
      showToast(t('toasts.thresholdCleared'));
    }
  }

  async function handleBiometricToggle(enabled: boolean) {
    if (Platform.OS === 'web' || bioToggling) return;
    setBioToggling(true);
    try {
      if (enabled) {
        if (!bioAvailable) {
          showToast(t('biometric.unavailable'), 'error');
          return;
        }
        const ok = await authenticate(t('biometric.unlockReason'));
        if (!ok) return;
        const hasCreds = await hasStoredCredentials();
        if (!hasCreds) {
          showToast(t('biometric.setupRequired'), 'error');
          return;
        }
        await setBiometricEnabledFlag(true);
        await refreshBiometricEnabled();
        showToast(t('biometric.enabled'));
      } else {
        await disableBiometricLogin();
        await refreshBiometricEnabled();
        showToast(t('biometric.disabled'));
      }
    } finally {
      setBioToggling(false);
    }
  }

  async function setTheme(dark: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateSettings({ darkMode: dark });
  }

  async function setLanguage(language: AppLanguage) {
    if (settings.language === language) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateSettings({ language });
    showToast(t('toasts.languageChanged'));
    if (Platform.OS !== 'web') {
      showToast(t('toasts.restartForRtl'), 'info');
    }
  }

  async function handleCreateInvite() {
    setInviteLoading(true);
    try {
      const code = await createInvite();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('workspace.inviteCreated'));
      await Share.share({ message: t('workspace.inviteShareMessage', { code }) });
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('workspace.inviteFailed'), 'error');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCopyInviteCode() {
    const code = workspace?.inviteCode ?? (inviteLoading ? null : await createInvite().catch(() => null));
    if (!code) return;
    await Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(t('workspace.codeCopied'));
  }

  async function handleExportCsv() {
    if (exportLoading) return;
    setExportLoading(true);
    try {
      const csv = buildFinanceCsv({ income, purchases, wages, withdrawals }, language);
      const uri = `${FileSystem.cacheDirectory}almanar-export-${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
      }
      showToast(t('export.csvSuccess'));
    } catch {
      showToast(t('export.csvFailed'), 'error');
    } finally {
      setExportLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login' as Href);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 120 : 100) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>{t('settings.title')}</Text>

        {isConfigured ? (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t('settings.workspace')}</Text>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.incomeLight }]}>
              <Feather name="briefcase" size={18} color={colors.income} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>{workspace?.name ?? t('workspace.defaultName')}</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
                {t('workspace.memberCount', { count: memberCount })}
              </Text>
            </View>
          </View>
          {role === 'owner' && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              {workspace?.inviteCode ? (
                <>
                  <Text style={[styles.inviteCode, { color: colors.foreground }]}>{workspace.inviteCode}</Text>
                  <Text style={[styles.rowSub, { color: colors.mutedForeground, textAlign: 'center' }]}>
                    {t('workspace.permanentCode')}
                  </Text>
                </>
              ) : null}
              <TouchableOpacity
                onPress={handleCopyInviteCode}
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <Feather name="copy" size={16} color={colors.primary} />
                <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>{t('workspace.copyCode')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateInvite}
                style={[styles.primaryBtn, { backgroundColor: colors.income, opacity: inviteLoading ? 0.7 : 1 }]}
                disabled={inviteLoading}
                activeOpacity={0.8}
              >
                <Text style={[styles.primaryBtnText, { color: '#fff' }]}>{t('workspace.generateInvite')}</Text>
              </TouchableOpacity>
              {members.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 8 }]}>
                    {t('workspace.members')}
                  </Text>
                  {members.map(m => (
                    <View key={m.uid} style={styles.memberRow}>
                      <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
                        {m.email ?? m.uid.slice(0, 8)}
                      </Text>
                      <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{m.role}</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            onPress={handleExportCsv}
            disabled={exportLoading}
            style={[styles.secondaryBtn, { borderColor: colors.border, opacity: exportLoading ? 0.7 : 1 }]}
          >
            <Feather name="download" size={16} color={colors.primary} />
            <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>{t('export.csv')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={[styles.dangerBtn, { borderColor: colors.destructive + '40' }]}>
            <Feather name="log-out" size={16} color={colors.destructive} />
            <Text style={[styles.dangerBtnText, { color: colors.destructive }]}>{t('auth.signOut')}</Text>
          </TouchableOpacity>
        </View>
        ) : null}

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t('settings.goalsAlerts')}</Text>

          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.incomeLight }]}>
              <Feather name="target" size={18} color={colors.income} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>{t('settings.monthlyIncomeGoal')}</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{t('settings.monthlyIncomeGoalSub')}</Text>
            </View>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.inputSmall, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                value={goalInput}
                onChangeText={setGoalInput}
                onBlur={saveGoal}
                keyboardType="numeric"
                placeholder="500"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="done"
                onSubmitEditing={saveGoal}
              />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.destructive + '18' }]}>
              <Feather name="alert-triangle" size={18} color={colors.destructive} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>{t('settings.lowBalanceAlert')}</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{t('settings.lowBalanceAlertSub')}</Text>
            </View>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.inputSmall, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                value={thresholdInput}
                onChangeText={setThresholdInput}
                onBlur={saveThreshold}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="done"
                onSubmitEditing={saveThreshold}
              />
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t('settings.language')}</Text>
          <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{t('settings.languageSub')}</Text>
          <View style={styles.optionRow}>
            {(['en', 'ar'] as AppLanguage[]).map(lang => (
              <TouchableOpacity
                key={lang}
                onPress={() => setLanguage(lang)}
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: (settings.language ?? 'en') === lang ? colors.primary : colors.secondary,
                    borderColor: (settings.language ?? 'en') === lang ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionBtnText, { color: (settings.language ?? 'en') === lang ? colors.primaryForeground : colors.foreground }]}>
                  {lang === 'en' ? t('settings.english') : t('settings.arabic')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t('settings.appearance')}</Text>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name={isDark ? 'moon' : 'sun'} size={18} color={colors.primary} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>{t('settings.theme')}</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{t('settings.themeSub')}</Text>
            </View>
          </View>
          <View style={styles.optionRow}>
            <TouchableOpacity
              onPress={() => setTheme(false)}
              style={[styles.optionBtn, { backgroundColor: !isDark ? colors.primary : colors.secondary, borderColor: !isDark ? colors.primary : colors.border }]}
              activeOpacity={0.7}
            >
              <Feather name="sun" size={16} color={!isDark ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.optionBtnText, { color: !isDark ? colors.primaryForeground : colors.foreground }]}>{t('settings.lightMode')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTheme(true)}
              style={[styles.optionBtn, { backgroundColor: isDark ? colors.primary : colors.secondary, borderColor: isDark ? colors.primary : colors.border }]}
              activeOpacity={0.7}
            >
              <Feather name="moon" size={16} color={isDark ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[styles.optionBtnText, { color: isDark ? colors.primaryForeground : colors.foreground }]}>{t('settings.darkMode')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {Platform.OS !== 'web' && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t('settings.biometricSecurity')}</Text>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.incomeLight }]}>
              <Feather name="smartphone" size={18} color={colors.income} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>
                {biometricEnabled ? t('settings.biometricEnabled') : t('settings.biometricDisabled')}
              </Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{t('settings.biometricSub')}</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={bioToggling || !bioAvailable}
              trackColor={{ false: colors.border, true: colors.income + '80' }}
              thumbColor={biometricEnabled ? colors.income : colors.mutedForeground}
            />
          </View>
        </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t('settings.about')}</Text>
          <View style={styles.aboutRow}>
            <View style={[styles.appLogo, { backgroundColor: colors.secondary }]}>
              <Feather name="box" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.appName, { color: colors.foreground }]}>{t('settings.appName')}</Text>
              <Text style={[styles.appVersion, { color: colors.mutedForeground }]}>{t('settings.appVersion')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  section: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1 },
  rowTitle: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  rowSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  inputWrap: { width: 80 },
  inputSmall: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    textAlign: 'right',
  },
  divider: { height: 1 },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  dangerBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  appLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  appVersion: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  inviteCode: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 6,
    textAlign: 'center',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
});
