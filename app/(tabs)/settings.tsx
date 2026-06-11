import React, { useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, isDark } = useSettings();
  const { showToast } = useToast();
  const topPad = Platform.OS === 'web' ? insets.top + 67 : insets.top;

  const [goalInput, setGoalInput] = useState(settings.incomeGoal?.toString() ?? '');
  const [thresholdInput, setThresholdInput] = useState(settings.lowBalanceThreshold?.toString() ?? '');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');

  useEffect(() => {
    setGoalInput(settings.incomeGoal?.toString() ?? '');
    setThresholdInput(settings.lowBalanceThreshold?.toString() ?? '');
  }, [settings]);

  async function saveGoal() {
    const val = parseFloat(goalInput);
    if (!isNaN(val) && val > 0) {
      await updateSettings({ incomeGoal: val });
      showToast('Monthly goal saved');
    } else if (goalInput === '') {
      await updateSettings({ incomeGoal: undefined });
      showToast('Goal cleared');
    }
  }

  async function saveThreshold() {
    const val = parseFloat(thresholdInput);
    if (!isNaN(val) && val >= 0) {
      await updateSettings({ lowBalanceThreshold: val });
      showToast('Threshold saved');
    } else if (thresholdInput === '') {
      await updateSettings({ lowBalanceThreshold: undefined });
      showToast('Threshold cleared');
    }
  }

  async function savePin() {
    if (pinInput.length !== 4) {
      showToast('PIN must be 4 digits', 'error');
      return;
    }
    if (pinInput !== confirmPin) {
      showToast('PINs do not match', 'error');
      return;
    }
    await updateSettings({ pin: pinInput });
    setPinInput('');
    setConfirmPin('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('PIN set successfully');
  }

  async function clearPin() {
    await updateSettings({ pin: '' });
    showToast('PIN removed');
  }

  async function toggleDark() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateSettings({ darkMode: !isDark });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 120 : 100) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>

        {/* Goals */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>GOALS & ALERTS</Text>

          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.incomeLight }]}>
              <Feather name="target" size={18} color={colors.income} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>Monthly Income Goal</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>JD amount per month</Text>
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
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>Low Balance Alert</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>Show warning below JD</Text>
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

        {/* Appearance */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>APPEARANCE</Text>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name="moon" size={18} color={colors.primary} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>Dark Mode</Text>
              <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>Override system theme</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleDark}
              thumbColor={isDark ? colors.primary : '#f4f3f4'}
              trackColor={{ false: colors.muted, true: colors.primary + '70' }}
            />
          </View>
        </View>

        {/* PIN Security */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PIN SECURITY</Text>

          {settings.pin ? (
            <>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.incomeLight }]}>
                  <Feather name="lock" size={18} color={colors.income} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]}>PIN is active</Text>
                  <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>App requires PIN on open</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={clearPin}
                style={[styles.dangerBtn, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '40' }]}
              >
                <Feather name="unlock" size={15} color={colors.destructive} />
                <Text style={[styles.dangerBtnText, { color: colors.destructive }]}>Remove PIN</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>New PIN (4 digits)</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                value={pinInput}
                onChangeText={t => setPinInput(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="numeric"
                placeholder="Enter 4-digit PIN"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                maxLength={4}
              />
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Confirm PIN</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
                value={confirmPin}
                onChangeText={t => setConfirmPin(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="numeric"
                placeholder="Confirm PIN"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                maxLength={4}
              />
              <TouchableOpacity
                onPress={savePin}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Set PIN</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* About */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ABOUT</Text>
          <View style={styles.aboutRow}>
            <View style={[styles.appLogo, { backgroundColor: colors.secondary }]}>
              <Feather name="box" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.appName, { color: colors.foreground }]}>Al Manar Wood Finance</Text>
              <Text style={[styles.appVersion, { color: colors.mutedForeground }]}>Version 1.0 · All data stored locally</Text>
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
});
