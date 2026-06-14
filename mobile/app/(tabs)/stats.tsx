import React, { useMemo, useState } from 'react';
import {
  FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { BarChart, MonthlyBarChart } from '@/components/BarChart';
import { EntryCard } from '@/components/EntryCard';
import { PhotoModal } from '@/components/PhotoModal';
import { useFinance } from '@/context/FinanceContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { PurchaseCategory } from '@/types';
import { formatNumber } from '@/utils/format';

type StatsTab = 'overview' | 'history';

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { language } = useSettings();
  const {
    allTimeIncome, allTimePurchases, allTimeWages, allTimeWithdrawals, allTimeNet,
    getMonthlyTrend, getPurchasesByCategory, getWagesByWorker,
    purchases, deletePurchase,
  } = useFinance();
  const { showToast } = useToast();
  const { t, categoryLabel } = useTranslation();
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');
  const [photoModal, setPhotoModal] = useState<string | null>(null);

  const topPad = Platform.OS === 'web' ? insets.top + 67 : insets.top;
  const monthly = useMemo(() => getMonthlyTrend(), [getMonthlyTrend]);
  const catBreakdown = useMemo(() => getPurchasesByCategory(), [getPurchasesByCategory]);
  const workerWages = useMemo(() => getWagesByWorker(), [getWagesByWorker]);

  const fmt = (n: number) => formatNumber(n, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const summaryCards = [
    { label: t('stats.totalIncome'), value: allTimeIncome, color: colors.income, bg: colors.incomeLight },
    { label: t('stats.totalPurchases'), value: allTimePurchases, color: colors.purchases, bg: colors.purchasesLight },
    { label: t('stats.totalWages'), value: allTimeWages, color: colors.wages, bg: colors.wagesLight },
    { label: t('stats.totalWithdrawals'), value: allTimeWithdrawals, color: colors.withdrawals, bg: colors.withdrawalsLight },
    { label: t('home.netBalance'), value: allTimeNet, color: allTimeNet >= 0 ? colors.positive : colors.negative, bg: allTimeNet >= 0 ? colors.incomeLight : colors.destructive + '18' },
  ];

  const catBarData = catBreakdown.map(c => ({
    label: categoryLabel(c.category as PurchaseCategory),
    value: c.total,
    color: colors.purchases,
  }));

  const sortedPurchases = useMemo(() =>
    [...purchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [purchases]
  );

  const totalPurchasesHistory = sortedPurchases.reduce((s, p) => s + p.amount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>{t('stats.title')}</Text>
        <View style={[styles.tabBar, { backgroundColor: colors.secondary }]}>
          {(['overview', 'history'] as StatsTab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabBtn, activeTab === tab && { backgroundColor: colors.card, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }]}
            >
              <Text style={[styles.tabLabel, { color: activeTab === tab ? colors.primary : colors.mutedForeground }]}>
                {tab === 'overview' ? t('stats.overview') : t('stats.purchasesHistory')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {activeTab === 'overview' ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 120 : 100) }]}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => router.push('/weekly-report')}
            style={[styles.reportBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Feather name="file-text" size={18} color="#fff" />
            <Text style={styles.reportBtnText}>{t('stats.weeklyReport')}</Text>
            <Feather name={language === 'ar' ? 'chevron-left' : 'chevron-right'} size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/weekly-report', params: { period: 'month' } })}
            style={[styles.reportBtn, { backgroundColor: colors.income, marginTop: 10 }]}
            activeOpacity={0.85}
          >
            <Feather name="calendar" size={18} color="#fff" />
            <Text style={styles.reportBtnText}>{t('stats.monthlyReport')}</Text>
            <Feather name={language === 'ar' ? 'chevron-left' : 'chevron-right'} size={18} color="#fff" />
          </TouchableOpacity>

          <View style={styles.summaryGrid}>
            {summaryCards.map((c, i) => (
              <View
                key={i}
                style={[
                  styles.statCard,
                  { backgroundColor: c.bg, borderColor: c.color + '30' },
                  i === summaryCards.length - 1 && styles.statCardFull,
                ]}
              >
                <Text style={[styles.statLabel, { color: c.color }]}>{c.label}</Text>
                <Text style={[styles.statValue, { color: c.color }]}>
                  {c.value < 0 ? '-' : ''}JD {fmt(Math.abs(c.value))}
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.formulaCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formulaTitle, { color: colors.mutedForeground }]}>{t('stats.netBalanceFormula')}</Text>
            <View style={styles.formulaRow}>
              <FormulaItem label={t('common.income')} value={allTimeIncome} color={colors.income} sign="+" fmt={fmt} />
              <Text style={[styles.formulaOp, { color: colors.mutedForeground }]}>−</Text>
              <FormulaItem label={t('common.purchases')} value={allTimePurchases} color={colors.purchases} fmt={fmt} />
              <Text style={[styles.formulaOp, { color: colors.mutedForeground }]}>−</Text>
              <FormulaItem label={t('common.wages')} value={allTimeWages} color={colors.wages} fmt={fmt} />
              <Text style={[styles.formulaOp, { color: colors.mutedForeground }]}>−</Text>
              <FormulaItem label={t('common.withdrawals')} value={allTimeWithdrawals} color={colors.withdrawals} fmt={fmt} />
            </View>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('stats.monthlyTrend')}</Text>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
                  <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>{t('common.income')}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: colors.purchases }]} />
                  <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>{t('common.expenses')}</Text>
                </View>
              </View>
            </View>
            <MonthlyBarChart data={monthly} />
          </View>

          {catBarData.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('stats.purchasesByCategory')}</Text>
              <BarChart data={catBarData} />
            </View>
          )}

          {workerWages.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('stats.wagesByWorker')}</Text>
              <BarChart data={workerWages.map(w => ({ label: w.worker, value: w.total, color: colors.wages }))} />
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={[styles.historyHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Text style={[styles.histCount, { color: colors.mutedForeground }]}>{t('stats.purchasesCount', { count: sortedPurchases.length })}</Text>
            <Text style={[styles.histTotal, { color: colors.purchases }]}>JD {fmt(totalPurchasesHistory)}</Text>
          </View>
          <FlatList
            data={sortedPurchases}
            keyExtractor={p => p.id}
            scrollEnabled={!!sortedPurchases.length}
            contentContainerStyle={[
              styles.histList,
              { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 120 : 100) },
              !sortedPurchases.length && styles.emptyList,
            ]}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Feather name="shopping-bag" size={40} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t('stats.noPurchases')}</Text>
              </View>
            }
            renderItem={({ item: p }) => (
              <EntryCard
                type="purchase"
                title={p.name}
                subtitle={p.supplier}
                amount={p.amount}
                date={p.date}
                photo={p.photo}
                badge={categoryLabel(p.category)}
                onEdit={() => router.push({ pathname: '/add-purchase', params: { id: p.id } })}
                onDuplicate={() => router.push({ pathname: '/add-purchase', params: { duplicateFrom: p.id } })}
                onDelete={() => { deletePurchase(p.id); showToast(t('toasts.purchaseDeleted')); }}
                onPhotoPress={() => p.photo && setPhotoModal(p.photo)}
              />
            )}
          />
          {photoModal && <PhotoModal visible photo={photoModal} onClose={() => setPhotoModal(null)} />}
        </View>
      )}
    </View>
  );
}

function FormulaItem({ label, value, color, sign, fmt }: { label: string; value: number; color: string; sign?: string; fmt: (n: number) => string }) {
  return (
    <View style={formulaStyles.item}>
      <Text style={[formulaStyles.label, { color }]}>{label}</Text>
      <Text style={[formulaStyles.value, { color }]}>{sign}{fmt(value)}</Text>
    </View>
  );
}

const formulaStyles = StyleSheet.create({
  item: { alignItems: 'center', flex: 1 },
  label: { fontSize: 10, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  value: { fontSize: 12, fontFamily: 'Inter_700Bold', marginTop: 2, textAlign: 'center' },
});

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12, gap: 10, borderBottomWidth: 1 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  tabBar: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  content: { padding: 16, gap: 14 },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  reportBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold', flex: 1, textAlign: 'center' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47.5%', borderRadius: 16, padding: 14, borderWidth: 1, gap: 6 },
  statCardFull: { width: '100%' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.4, textTransform: 'uppercase', opacity: 0.8 },
  statValue: { fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  formulaCard: { borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
  formulaTitle: { fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  formulaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formulaOp: { fontSize: 18, fontFamily: 'Inter_400Regular' },
  section: { borderRadius: 20, padding: 16, borderWidth: 1, gap: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  legend: { flexDirection: 'row', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  historyHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  histCount: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  histTotal: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  histList: { padding: 16 },
  emptyList: { flex: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 60 },
  emptyText: { fontSize: 16, fontFamily: 'Inter_400Regular' },
});
