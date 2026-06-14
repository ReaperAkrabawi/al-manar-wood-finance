import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { useColors } from '@/hooks/useColors';
import { formatNumber } from '@/utils/format';

interface BarChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  maxValue?: number;
  showValues?: boolean;
}

export function BarChart({ data, maxValue, showValues = true }: BarChartProps) {
  const colors = useColors();
  const { language } = useSettings();
  const max = maxValue ?? Math.max(...data.map(d => d.value), 1);

  return (
    <View style={styles.container}>
      {data.map((item, i) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0;
        const formatted = formatNumber(item.value, language, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        return (
          <View key={i} style={styles.row}>
            <Text style={[styles.label, { color: colors.foreground }]} numberOfLines={1}>{item.label}</Text>
            <View style={styles.barWrap}>
              <View style={[styles.track, { backgroundColor: colors.muted }]}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: item.color }]} />
              </View>
              {showValues && (
                <Text style={[styles.value, { color: colors.mutedForeground }]}>JD {formatted}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

interface MonthlyBarChartProps {
  data: Array<{ label: string; income: number; expenses: number }>;
}

export function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  const colors = useColors();
  const max = Math.max(...data.flatMap(d => [d.income, d.expenses]), 1);

  return (
    <View style={styles.monthlyContainer}>
      {data.map((item, i) => (
        <View key={i} style={styles.monthCol}>
          <View style={styles.barsWrap}>
            <View
              style={[
                styles.monthBar,
                {
                  height: Math.max((item.income / max) * 100, 2),
                  backgroundColor: colors.income,
                  opacity: 0.85,
                },
              ]}
            />
            <View
              style={[
                styles.monthBar,
                {
                  height: Math.max((item.expenses / max) * 100, 2),
                  backgroundColor: colors.purchases,
                  opacity: 0.85,
                },
              ]}
            />
          </View>
          <Text style={[styles.monthLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  row: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  barWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  value: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    width: 72,
    textAlign: 'right',
  },
  monthlyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingBottom: 20,
  },
  monthCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barsWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 100,
  },
  monthBar: {
    width: 10,
    borderRadius: 4,
  },
  monthLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    position: 'absolute',
    bottom: 0,
  },
});
