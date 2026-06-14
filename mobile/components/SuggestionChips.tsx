import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (value: string) => void;
}

export function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  const colors = useColors();
  if (suggestions.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {suggestions.slice(0, 8).map(s => (
        <TouchableOpacity
          key={s}
          onPress={() => onSelect(s)}
          style={[styles.chip, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        >
          <Text style={[styles.chipText, { color: colors.mutedForeground }]} numberOfLines={1}>{s}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 140,
  },
  chipText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});
