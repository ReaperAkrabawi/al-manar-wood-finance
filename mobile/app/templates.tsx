import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTemplates } from '@/context/TemplatesContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/context/ToastContext';
import type { TemplateType } from '@/types';

export default function TemplatesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { templates, addTemplate, deleteTemplate } = useTemplates();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<TemplateType>('purchase');

  const topPad = Platform.OS === 'web' ? insets.top + 67 : insets.top;

  function confirmDelete(id: string, name: string) {
    Alert.alert(t('delete.title'), name, [
      { text: t('delete.cancel'), style: 'cancel' },
      {
        text: t('delete.confirm'),
        style: 'destructive',
        onPress: async () => {
          await deleteTemplate(id);
          showToast(t('templates.deleted'));
        },
      },
    ]);
  }

  async function handleAdd() {
    if (!label.trim()) return;
    await addTemplate({ type, label: label.trim(), payload: {} });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLabel('');
    showToast(t('templates.saved'));
  }

  const types: TemplateType[] = ['income', 'purchase', 'wage', 'withdrawal'];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t('templates.manage')}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('templates.label')}</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
            value={label}
            onChangeText={setLabel}
            placeholder={t('templates.labelPlaceholder')}
            placeholderTextColor={colors.mutedForeground}
          />
          <View style={styles.typeRow}>
            {types.map(tp => (
              <TouchableOpacity
                key={tp}
                onPress={() => setType(tp)}
                style={[styles.typeChip, {
                  backgroundColor: type === tp ? colors.income : colors.secondary,
                  borderColor: type === tp ? colors.income : colors.border,
                }]}
              >
                <Text style={{ color: type === tp ? '#fff' : colors.mutedForeground, fontSize: 12, fontFamily: 'Inter_500Medium' }}>
                  {tp}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={handleAdd} style={[styles.addBtn, { backgroundColor: colors.income }]}>
            <Text style={styles.addBtnText}>{t('templates.add')}</Text>
          </TouchableOpacity>
        </View>

        {templates.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>{t('templates.empty')}</Text>
        ) : (
          templates.map(tpl => (
            <View key={tpl.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{tpl.label}</Text>
                <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{tpl.type}</Text>
              </View>
              <TouchableOpacity onPress={() => confirmDelete(tpl.id, tpl.label)} hitSlop={8}>
                <Feather name="trash-2" size={18} color={colors.destructive} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  content: { padding: 16, gap: 10 },
  form: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  label: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: 'Inter_400Regular' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  addBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 14, fontFamily: 'Inter_400Regular' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  rowTitle: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  rowSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
});
