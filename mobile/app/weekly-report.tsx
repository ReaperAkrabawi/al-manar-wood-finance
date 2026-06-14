import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoModal } from '@/components/PhotoModal';
import { WeeklyReportPreview } from '@/components/WeeklyReportPreview';
import { useAuth } from '@/context/AuthContext';
import { useFinance } from '@/context/FinanceContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import {
  buildPeriodReportData,
  generateWeeklyReportPdf,
  shareWeeklyReportPdf,
  type ReportPeriod,
  type WeeklyReportData,
} from '@/services/weeklyReport';
import { isWorkerConfigured, summarizePeriod } from '@/services/aiService';
import { formatMonthShort, formatWeekRange } from '@/utils/format';

function buildSummarizeLines(data: WeeklyReportData): string[] {
  const lines: string[] = [];
  for (const i of data.income) lines.push(`income: ${i.desc} ${i.amount} JD ${i.date}`);
  for (const p of data.purchases) lines.push(`purchase: ${p.name} ${p.amount} JD ${p.category} ${p.date}`);
  for (const w of data.wages) lines.push(`wage: ${w.worker} ${w.amount} JD ${w.date}`);
  for (const w of data.withdrawals) lines.push(`withdrawal: ${w.desc} ${w.amount} JD ${w.date}`);
  return lines;
}

export default function WeeklyReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ period?: string }>();
  const { income, purchases, wages, withdrawals } = useFinance();
  const { workspace, workspaceId } = useWorkspace();
  const { user } = useAuth();
  const { language, isRTL } = useSettings();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [period, setPeriod] = useState<ReportPeriod>(params.period === 'month' ? 'month' : 'week');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [photoModal, setPhotoModal] = useState<string | null>(null);

  const topPad = Platform.OS === 'web' ? insets.top + 67 : insets.top;

  const reportData = useMemo(
    () => buildPeriodReportData(period, periodOffset, {
      income,
      purchases,
      wages,
      withdrawals,
      workspaceName: workspace?.name ?? t('workspace.defaultName'),
      lang: language,
      isRTL,
    }),
    [period, periodOffset, income, purchases, wages, withdrawals, workspace?.name, language, isRTL, t],
  );

  const periodLabel = period === 'month'
    ? formatMonthShort(reportData.range.start, language)
    : formatWeekRange(reportData.range.start, reportData.range.end, language);

  function changePeriod(delta: number) {
    Haptics.selectionAsync();
    setPeriodOffset(prev => prev + delta);
    setSummary(null);
  }

  function switchPeriod(next: ReportPeriod) {
    Haptics.selectionAsync();
    setPeriod(next);
    setPeriodOffset(0);
    setSummary(null);
  }

  async function handleSummarize() {
    if (!user || !workspaceId || summarizing) return;
    if (!isWorkerConfigured()) {
      showToast(t('ai.notConfigured'), 'error');
      return;
    }
    setSummarizing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const text = await summarizePeriod(
        user,
        workspaceId,
        {
          periodLabel,
          totals: reportData.totals,
          lines: buildSummarizeLines(reportData),
        },
        language,
      );
      setSummary(text);
    } catch (err) {
      console.error('Summary failed:', err);
      showToast(t('ai.summaryFailed'), 'error');
    } finally {
      setSummarizing(false);
    }
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const uri = await generateWeeklyReportPdf(reportData);
      await shareWeeklyReportPdf(uri);
      showToast(t('toasts.reportExported'));
    } catch (err) {
      console.error('PDF export failed:', err);
      showToast(t('toasts.reportExportFailed'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {period === 'month' ? t('report.monthlyTitle') : t('report.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
            {workspace?.name ?? t('workspace.defaultName')}
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <View style={[styles.periodToggle, { backgroundColor: colors.secondary }]}>
        {(['week', 'month'] as ReportPeriod[]).map(p => (
          <TouchableOpacity
            key={p}
            onPress={() => switchPeriod(p)}
            style={[styles.periodBtn, period === p && { backgroundColor: colors.card }]}
          >
            <Text style={[styles.periodBtnText, { color: period === p ? colors.primary : colors.mutedForeground }]}>
              {p === 'week' ? t('report.periodWeek') : t('report.periodMonth')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.weekPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => changePeriod(-1)} style={styles.weekBtn} hitSlop={8}>
          <Feather name={isRTL ? 'chevron-right' : 'chevron-left'} size={22} color={colors.primary} />
          <Text style={[styles.weekBtnText, { color: colors.primary }]}>{t('report.prevWeek')}</Text>
        </TouchableOpacity>
        <Text style={[styles.weekLabel, { color: colors.foreground }]} numberOfLines={2}>
          {periodLabel}
        </Text>
        <TouchableOpacity
          onPress={() => changePeriod(1)}
          style={[styles.weekBtn, periodOffset >= 0 && styles.weekBtnDisabled]}
          disabled={periodOffset >= 0}
          hitSlop={8}
        >
          <Text style={[styles.weekBtnText, { color: periodOffset >= 0 ? colors.mutedForeground : colors.primary }]}>
            {t('report.nextWeek')}
          </Text>
          <Feather
            name={isRTL ? 'chevron-left' : 'chevron-right'}
            size={22}
            color={periodOffset >= 0 ? colors.mutedForeground : colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={handleSummarize}
          disabled={summarizing}
          style={[styles.summarizeBtn, { backgroundColor: colors.incomeLight, borderColor: colors.income + '40', opacity: summarizing ? 0.7 : 1 }]}
        >
          {summarizing ? (
            <ActivityIndicator color={colors.income} />
          ) : (
            <>
              <Feather name="zap" size={16} color={colors.income} />
              <Text style={[styles.summarizeText, { color: colors.income }]}>{t('ai.summarize')}</Text>
            </>
          )}
        </TouchableOpacity>

        {summary ? (
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.summaryTitle, { color: colors.foreground }]}>{t('ai.summaryTitle')}</Text>
            <Text style={[styles.summaryBody, { color: colors.mutedForeground }]}>{summary}</Text>
          </View>
        ) : null}

        <WeeklyReportPreview data={reportData} onPhotoPress={setPhotoModal} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={handleExport}
          disabled={exporting}
          style={[styles.exportBtn, { backgroundColor: colors.primary, opacity: exporting ? 0.7 : 1 }]}
          activeOpacity={0.85}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="share" size={18} color="#fff" />
              <Text style={styles.exportText}>{t('report.exportPdf')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {photoModal && (
        <PhotoModal visible photo={photoModal} onClose={() => setPhotoModal(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { width: 36, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, alignItems: 'center' },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  periodToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  periodBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  weekPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  weekBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 72 },
  weekBtnDisabled: { opacity: 0.5 },
  weekBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  content: { padding: 16, gap: 12 },
  summarizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  summarizeText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  summaryTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  summaryBody: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  exportText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
