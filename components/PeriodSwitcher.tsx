import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { Period } from '@/types';

const PERIODS: Array<{ key: Period; label: string }> = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
];

interface PeriodSwitcherProps {
  value: Period;
  onChange: (p: Period) => void;
}

export function PeriodSwitcher({ value, onChange }: PeriodSwitcherProps) {
  const colors = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {PERIODS.map(p => (
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
            {p.label}
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
