import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { useColors } from '@/hooks/useColors';
import { formatNumber } from '@/utils/format';

interface SummaryCardProps {
  label: string;
  amount: number;
  color: string;
  lightColor: string;
  iconName?: string;
}

export function SummaryCard({ label, amount, color, lightColor }: SummaryCardProps) {
  const colors = useColors();
  const { language } = useSettings();
  const formatted = formatNumber(amount, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <View style={[styles.card, { backgroundColor: lightColor, borderColor: color + '30' }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
      <Text style={[styles.amount, { color }]}>
        <Text style={styles.currency}>JD </Text>
        {formatted}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    opacity: 0.8,
  },
  currency: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  amount: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
});
