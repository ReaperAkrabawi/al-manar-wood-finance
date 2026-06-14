import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { ParsedEntryDraft } from '@/types/ai';

interface AiEntryPreviewProps {
  entries: ParsedEntryDraft[];
  onChangeAmount: (index: number, amount: string) => void;
  onRemove: (index: number) => void;
}

const TYPE_COLORS: Record<ParsedEntryDraft['type'], string> = {
  income: '#16a34a',
  purchase: '#dc2626',
  wage: '#ca8a04',
  withdrawal: '#9333ea',
};

const TYPE_ICONS: Record<ParsedEntryDraft['type'], string> = {
  income: 'trending-up',
  purchase: 'shopping-bag',
  wage: 'users',
  withdrawal: 'arrow-down-circle',
};

export function AiEntryPreview({ entries, onChangeAmount, onRemove }: AiEntryPreviewProps) {
  const colors = useColors();
  const { t } = useTranslation();

  const typeLabels: Record<ParsedEntryDraft['type'], string> = {
    income: t('common.income'),
    purchase: t('common.purchase'),
    wage: t('common.wage'),
    withdrawal: t('common.withdrawals'),
  };

  if (entries.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {entries.map((entry, index) => {
        const color = TYPE_COLORS[entry.type];
        const title =
          entry.type === 'purchase' ? entry.name
          : entry.type === 'wage' ? entry.worker
          : entry.desc ?? entry.type;

        return (
          <View key={index} style={[styles.card, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
                <Feather name={TYPE_ICONS[entry.type] as 'circle'} size={16} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.typeLabel, { color }]}>{typeLabels[entry.type]}</Text>
                <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>{title}</Text>
              </View>
              <TouchableOpacity onPress={() => onRemove(index)} hitSlop={8}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.amountRow}>
              <Text style={[styles.amtLabel, { color: colors.mutedForeground }]}>JD</Text>
              <TextInput
                style={[styles.amtInput, { color: colors.foreground, borderColor: colors.border }]}
                value={entry.amount.toString()}
                onChangeText={v => onChangeAmount(index, v)}
                keyboardType="decimal-pad"
              />
            </View>
            {entry.note ? (
              <Text style={[styles.note, { color: colors.mutedForeground }]} numberOfLines={2}>{entry.note}</Text>
            ) : null}
            {entry.supplier ? (
              <Text style={[styles.note, { color: colors.mutedForeground }]} numberOfLines={1}>{entry.supplier}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  card: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase' },
  title: { fontSize: 15, fontFamily: 'Inter_500Medium', marginTop: 2 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amtLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  amtInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  note: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
