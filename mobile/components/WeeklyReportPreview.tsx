import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { WeeklyReportData } from '@/services/weeklyReport';
import { formatCurrency, formatDateShort } from '@/utils/format';
import { resolvePhotoUri } from '@/utils/photoUri';

interface WeeklyReportPreviewProps {
  data: WeeklyReportData;
  onPhotoPress?: (photo: string) => void;
}

export function WeeklyReportPreview({ data, onPhotoPress }: WeeklyReportPreviewProps) {
  const colors = useColors();
  const { categoryLabel, lang } = useTranslation();
  const { totals, labels } = data;

  const hasEntries =
    data.income.length + data.purchases.length + data.wages.length + data.withdrawals.length > 0;

  const summaryCards = [
    { label: labels.income, value: totals.income, color: colors.income, bg: colors.incomeLight },
    { label: labels.purchases, value: totals.purchases, color: colors.purchases, bg: colors.purchasesLight },
    { label: labels.wages, value: totals.wages, color: colors.wages, bg: colors.wagesLight },
    { label: labels.withdrawals, value: totals.withdrawals, color: colors.withdrawals, bg: colors.withdrawalsLight },
    {
      label: labels.netBalance,
      value: totals.net,
      color: totals.net >= 0 ? colors.positive : colors.negative,
      bg: totals.net >= 0 ? colors.incomeLight : colors.destructive + '18',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.summaryGrid}>
        {summaryCards.map((c, i) => (
          <View
            key={i}
            style={[
              styles.summaryCard,
              { backgroundColor: c.bg, borderColor: c.color + '30' },
              i === summaryCards.length - 1 && styles.summaryCardFull,
            ]}
          >
            <Text style={[styles.summaryLabel, { color: c.color }]}>{c.label}</Text>
            <Text style={[styles.summaryValue, { color: c.color }]}>
              {c.value < 0 ? '-' : ''}{formatCurrency(Math.abs(c.value), lang)}
            </Text>
          </View>
        ))}
      </View>

      {!hasEntries && (
        <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="calendar" size={32} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{labels.emptyWeek}</Text>
        </View>
      )}

      {data.income.length > 0 && (
        <Section title={labels.income} colors={colors}>
          {data.income.map(item => (
            <PreviewRow
              key={item.id}
              title={item.desc}
              amount={item.amount}
              date={item.date}
              note={item.note}
              photo={item.photo}
              typeColor={colors.income}
              lang={lang}
              onPhotoPress={onPhotoPress}
            />
          ))}
        </Section>
      )}

      {data.purchases.length > 0 && (
        <Section title={labels.purchases} colors={colors}>
          {data.purchases.map(item => (
            <PreviewRow
              key={item.id}
              title={item.name}
              subtitle={[categoryLabel(item.category), item.supplier].filter(Boolean).join(' · ')}
              amount={item.amount}
              date={item.date}
              note={item.note}
              photo={item.photo}
              typeColor={colors.purchases}
              lang={lang}
              onPhotoPress={onPhotoPress}
            />
          ))}
        </Section>
      )}

      {data.wages.length > 0 && (
        <Section title={labels.wages} colors={colors}>
          {data.wages.map(item => (
            <PreviewRow
              key={item.id}
              title={item.worker}
              amount={item.amount}
              date={item.date}
              note={item.note}
              typeColor={colors.wages}
              lang={lang}
            />
          ))}
        </Section>
      )}

      {data.withdrawals.length > 0 && (
        <Section title={labels.withdrawals} colors={colors}>
          {data.withdrawals.map(item => (
            <PreviewRow
              key={item.id}
              title={item.desc}
              amount={item.amount}
              date={item.date}
              note={item.note}
              typeColor={colors.withdrawals}
              lang={lang}
            />
          ))}
        </Section>
      )}

      {data.categoryBreakdown.length > 0 && (
        <Section title={labels.categoryBreakdown} colors={colors}>
          {data.categoryBreakdown.map(item => (
            <View key={item.category} style={[styles.catRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.catLabel, { color: colors.foreground }]}>{item.categoryLabel}</Text>
              <Text style={[styles.catAmount, { color: colors.purchases }]}>{formatCurrency(item.total, lang)}</Text>
            </View>
          ))}
        </Section>
      )}
    </View>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {children}
    </View>
  );
}

function PreviewRow({
  title,
  subtitle,
  amount,
  date,
  note,
  photo,
  typeColor,
  lang,
  onPhotoPress,
}: {
  title: string;
  subtitle?: string;
  amount: number;
  date: string;
  note?: string;
  photo?: string;
  typeColor: string;
  lang: WeeklyReportData['lang'];
  onPhotoPress?: (photo: string) => void;
}) {
  const colors = useColors();
  const uri = resolvePhotoUri(photo);

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      {uri ? (
        <TouchableOpacity
          onPress={() => photo && onPhotoPress?.(photo)}
          activeOpacity={0.8}
          disabled={!onPhotoPress}
        >
          <Image source={{ uri }} style={styles.thumb} />
        </TouchableOpacity>
      ) : (
        <View style={[styles.iconWrap, { backgroundColor: typeColor + '18' }]}>
          <Feather name="file-text" size={16} color={typeColor} />
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={2}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>{subtitle}</Text>
        ) : null}
        <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
          {formatDateShort(date, lang)}
          {note ? ` · ${note}` : ''}
        </Text>
      </View>
      <Text style={[styles.rowAmount, { color: typeColor }]}>{formatCurrency(amount, lang)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: { width: '47.5%', borderRadius: 16, padding: 14, borderWidth: 1, gap: 6 },
  summaryCardFull: { width: '100%' },
  summaryLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.4, textTransform: 'uppercase', opacity: 0.8 },
  summaryValue: { fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: -0.3 },
  emptyBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyText: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  section: { borderRadius: 16, padding: 14, borderWidth: 1, gap: 0 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 44, height: 44, borderRadius: 8 },
  iconWrap: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  rowSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  rowMeta: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  rowAmount: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catLabel: { fontSize: 14, fontFamily: 'Inter_500Medium', flex: 1 },
  catAmount: { fontSize: 14, fontFamily: 'Inter_700Bold' },
});
