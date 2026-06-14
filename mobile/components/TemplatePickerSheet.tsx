import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFinance } from '@/context/FinanceContext';
import { useTemplates } from '@/context/TemplatesContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { EntryTemplate, TemplateType } from '@/types';
import { templateParamValue } from '@/utils/addFormPrefill';
import { addRouteForType, getLastEntry, type EntryType } from '@/utils/entryHelpers';

interface TemplatePickerSheetProps {
  visible: boolean;
  onClose: () => void;
}

const REPEAT_TYPES: EntryType[] = ['purchase', 'income', 'wage', 'withdrawal'];

export function TemplatePickerSheet({ visible, onClose }: TemplatePickerSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { templates } = useTemplates();
  const { income, purchases, wages, withdrawals } = useFinance();

  const itemsByType: Record<TemplateType, EntryTemplate[]> = {
    income: templates.filter(tpl => tpl.type === 'income'),
    purchase: templates.filter(tpl => tpl.type === 'purchase'),
    wage: templates.filter(tpl => tpl.type === 'wage'),
    withdrawal: templates.filter(tpl => tpl.type === 'withdrawal'),
  };

  const lastByType: Record<EntryType, { label: string } | null> = {
    income: getLastEntry(income) ? { label: getLastEntry(income)!.desc } : null,
    purchase: getLastEntry(purchases) ? { label: getLastEntry(purchases)!.name } : null,
    wage: getLastEntry(wages) ? { label: getLastEntry(wages)!.worker } : null,
    withdrawal: getLastEntry(withdrawals) ? { label: getLastEntry(withdrawals)!.desc } : null,
  };

  function openTemplate(tpl: EntryTemplate) {
    onClose();
    router.push({
      pathname: addRouteForType(tpl.type) as '/add-income',
      params: { template: templateParamValue(tpl.payload, tpl.defaultAmount) },
    });
  }

  function repeatLast(type: EntryType) {
    const last =
      type === 'income' ? getLastEntry(income)
      : type === 'purchase' ? getLastEntry(purchases)
      : type === 'wage' ? getLastEntry(wages)
      : getLastEntry(withdrawals);
    if (!last) return;
    onClose();
    router.push({
      pathname: addRouteForType(type) as '/add-income',
      params: { duplicateFrom: last.id },
    });
  }

  const typeLabel = (type: EntryType) => {
    if (type === 'income') return t('common.income');
    if (type === 'purchase') return t('common.purchases');
    if (type === 'wage') return t('common.wages');
    return t('common.withdrawals');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>{t('templates.title')}</Text>
            <TouchableOpacity onPress={() => { onClose(); router.push('/templates'); }} hitSlop={8}>
              <Feather name="settings" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {REPEAT_TYPES.map(type => {
              if (!lastByType[type]) return null;
              return (
                <TouchableOpacity
                  key={`repeat-${type}`}
                  style={[styles.row, { borderColor: colors.border }]}
                  onPress={() => repeatLast(type)}
                >
                  <Feather name="repeat" size={18} color={colors.income} />
                  <Text style={[styles.rowText, { color: colors.foreground }]}>
                    {t('templates.repeatLast', { type: typeLabel(type) })}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {lastByType[type]!.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {templates.length === 0 && REPEAT_TYPES.every(type => !lastByType[type]) ? (
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>{t('templates.empty')}</Text>
            ) : null}

            {(['income', 'purchase', 'wage', 'withdrawal'] as TemplateType[]).map(type => {
              const group = itemsByType[type];
              if (group.length === 0) return null;
              return (
                <View key={type} style={styles.group}>
                  <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>{typeLabel(type as EntryType)}</Text>
                  {group.map(tpl => (
                    <TouchableOpacity
                      key={tpl.id}
                      style={[styles.row, { borderColor: colors.border }]}
                      onPress={() => openTemplate(tpl)}
                    >
                      <Feather name="bookmark" size={18} color={colors.primary} />
                      <Text style={[styles.rowText, { color: colors.foreground }]}>{tpl.label}</Text>
                      {tpl.defaultAmount ? (
                        <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>JD {tpl.defaultAmount}</Text>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    maxHeight: '75%',
  },
  handleRow: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowText: { flex: 1, fontSize: 15, fontFamily: 'Inter_500Medium' },
  rowSub: { fontSize: 12, fontFamily: 'Inter_400Regular', maxWidth: 100 },
  group: { marginTop: 8 },
  groupLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.6,
    marginBottom: 4,
    marginTop: 8,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});
