import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { Period } from '@/types';

const PERIOD_KEYS: Array<{ key: Period; labelKey: 'periods.week' | 'periods.month' | 'periods.year' | 'periods.all' }> = [
  { key: 'week', labelKey: 'periods.week' },
  { key: 'month', labelKey: 'periods.month' },
  { key: 'year', labelKey: 'periods.year' },
  { key: 'all', labelKey: 'periods.all' },
];

interface PeriodSwitcherProps {
  value: Period;
  onChange: (p: Period) => void;
}

export function PeriodSwitcher({ value, onChange }: PeriodSwitcherProps) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {PERIOD_KEYS.map(p => (
        <TouchableOpacity
          key={p.key}
          onPress={() => onChange(p.key)}
          style={[
            styles.chip,
            {
              backgroundColor: p.key === value ? colors.primary : colors.secondary,
              borderColor: p.key === value ? colors.primary : colors.border,
            },
          ]}
          activeOpacity={0.7}
        >
          <Text style={[styles.chipText, { color: p.key === value ? colors.primaryForeground : colors.mutedForeground }]}>
            {t(p.labelKey)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingHorizontal: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
});
