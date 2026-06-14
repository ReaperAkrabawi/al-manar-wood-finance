import React, { useState } from 'react';
import {
  Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TemplatePickerSheet } from '@/components/TemplatePickerSheet';
import { AiQuickAddSheet } from '@/components/AiQuickAddSheet';
import { GoalProgress } from '@/components/GoalProgress';
import { PeriodSwitcher } from '@/components/PeriodSwitcher';
import { SummaryCard } from '@/components/SummaryCard';
import { useFinance } from '@/context/FinanceContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber } from '@/utils/format';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    totalIncome, totalPurchases, totalWages, totalWithdrawals,
    netBalance, period, setPeriod, payRecurringWages, wages,
  } = useFinance();
  const { settings, language } = useSettings();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const topPad = Platform.OS === 'web' ? insets.top + 67 : insets.top;
  const hasLowBalance = settings.lowBalanceThreshold !== undefined && netBalance < settings.lowBalanceThreshold;
  const hasRecurring = wages.some(w => w.recurring);

  async function handlePayRecurring() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const count = await payRecurringWages();
    if (count > 0) {
      showToast(t(count > 1 ? 'toasts.paidRecurringPlural' : 'toasts.paidRecurring', { count }));
    } else {
      showToast(t('toasts.noRecurringDue'), 'info');
    }
  }

  const formatted = (n: number) => formatNumber(n, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const quickActions = [
    { label: t('common.income'), icon: 'trending-up', route: '/add-income', bg: colors.incomeLight, iconBg: colors.income + '20', color: colors.income, textColor: colors.incomeDark },
    { label: t('common.purchase'), icon: 'shopping-bag', route: '/add-purchase', bg: colors.purchasesLight, iconBg: colors.purchases + '20', color: colors.purchases, textColor: colors.purchasesDark },
    { label: t('common.wage'), icon: 'users', route: '/add-wage', bg: colors.wagesLight, iconBg: colors.wages + '20', color: colors.wages, textColor: colors.wagesDark },
    { label: t('common.withdraw'), icon: 'arrow-down-circle', route: '/add-withdrawal', bg: colors.withdrawalsLight, iconBg: colors.withdrawals + '20', color: colors.withdrawals, textColor: colors.withdrawalsDark },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 120 : 100) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} tintColor={colors.primary} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.brandName, { color: colors.primary }]}>{t('home.brandName')}</Text>
            <Text style={[styles.brandSub, { color: colors.mutedForeground }]}>{t('home.brandSub')}</Text>
          </View>
          {hasRecurring && (
            <TouchableOpacity
              onPress={handlePayRecurring}
              style={[styles.recurBtn, { backgroundColor: colors.wagesLight, borderColor: colors.wages + '40' }]}
              activeOpacity={0.7}
            >
              <Feather name="repeat" size={14} color={colors.wages} />
              <Text style={[styles.recurBtnText, { color: colors.wages }]}>{t('home.payRecurring')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {hasLowBalance && (
          <View style={[styles.warning, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '40' }]}>
            <Feather name="alert-triangle" size={16} color={colors.destructive} />
            <Text style={[styles.warningText, { color: colors.destructive }]}>
              {t('home.lowBalanceWarning', { amount: formatted(settings.lowBalanceThreshold ?? 0) })}
            </Text>
          </View>
        )}

        <PeriodSwitcher value={period} onChange={setPeriod} />

        <View style={styles.cardsRow}>
          <SummaryCard label={t('common.income')} amount={totalIncome} color={colors.income} lightColor={colors.incomeLight} />
          <SummaryCard label={t('common.purchases')} amount={totalPurchases} color={colors.purchases} lightColor={colors.purchasesLight} />
        </View>

        <View style={styles.cardsRow}>
          <SummaryCard label={t('common.wages')} amount={totalWages} color={colors.wages} lightColor={colors.wagesLight} />
          <SummaryCard label={t('common.withdrawals')} amount={totalWithdrawals} color={colors.withdrawals} lightColor={colors.withdrawalsLight} />
        </View>

        <View style={[styles.netCard, {
          backgroundColor: netBalance >= 0 ? colors.incomeLight : colors.destructive + '18',
          borderColor: (netBalance >= 0 ? colors.income : colors.destructive) + '40',
        }]}>
          <View>
            <Text style={[styles.netLabel, { color: netBalance >= 0 ? colors.incomeDark : colors.destructive }]}>{t('home.netBalance')}</Text>
            <Text style={[styles.netSub, { color: colors.mutedForeground }]}>{t('home.netFormula')}</Text>
          </View>
          <Text style={[styles.netAmount, { color: netBalance >= 0 ? colors.positive : colors.negative }]}>
            {netBalance < 0 ? '-' : ''}JD {formatted(Math.abs(netBalance))}
          </Text>
        </View>

        {settings.incomeGoal ? (
          <GoalProgress current={totalIncome} goal={settings.incomeGoal} />
        ) : null}

        <View style={[styles.quickAddSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.quickAddHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('home.quickAdd')}</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAiOpen(true); }}
                style={[styles.templatesBtn, { backgroundColor: colors.incomeLight, borderColor: colors.income + '40' }]}
              >
                <Feather name="zap" size={14} color={colors.income} />
                <Text style={[styles.templatesBtnText, { color: colors.income }]}>{t('ai.quickAdd')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTemplatesOpen(true); }}
                style={[styles.templatesBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <Feather name="bookmark" size={14} color={colors.primary} />
                <Text style={[styles.templatesBtnText, { color: colors.primary }]}>{t('home.templates')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.quickRow}>
            {quickActions.map(a => (
              <TouchableOpacity
                key={a.route}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(a.route as any); }}
                style={[styles.quickBtn, { backgroundColor: a.bg, borderColor: a.color + '30' }]}
                activeOpacity={0.7}
              >
                <View style={[styles.quickIcon, { backgroundColor: a.iconBg }]}>
                  <Feather name={a.icon as any} size={18} color={a.color} />
                </View>
                <Text style={[styles.quickBtnText, { color: a.textColor }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
      <TemplatePickerSheet visible={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      <AiQuickAddSheet visible={aiOpen} onClose={() => setAiOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  brandName: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  brandSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  recurBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  recurBtnText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningText: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },
  cardsRow: { flexDirection: 'row', gap: 10 },
  netCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  netLabel: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  netSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  netAmount: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  quickAddSection: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  quickAddHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chipRow: { flexDirection: 'row', gap: 6, flexShrink: 1 },
  templatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  templatesBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
});
