import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface GoalProgressProps {
  current: number;
  goal: number;
}

export function GoalProgress({ current, goal }: GoalProgressProps) {
  const colors = useColors();
  if (!goal) return null;
  const pct = Math.min((current / goal) * 100, 100);
  const formatted = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const barColor = pct >= 100 ? colors.positive : pct >= 60 ? colors.primary : colors.warning;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Monthly Goal</Text>
        <Text style={[styles.values, { color: colors.foreground }]}>
          <Text style={{ color: barColor, fontFamily: 'Inter_700Bold' }}>JD {formatted(current)}</Text>
          <Text style={{ color: colors.mutedForeground }}> / JD {formatted(goal)}</Text>
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.muted }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[styles.pctText, { color: barColor }]}>{pct.toFixed(0)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  values: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  pctText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'right',
  },
});
