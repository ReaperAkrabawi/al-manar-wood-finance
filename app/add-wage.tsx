import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFinance } from '@/context/FinanceContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';

export default function AddWageScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { wages, addWage, editWage } = useFinance();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id;

  const today = new Date().toISOString().split('T')[0]!;
  const [worker, setWorker] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    if (editId) {
      const entry = wages.find(w => w.id === editId);
      if (entry) {
        setWorker(entry.worker);
        setAmount(entry.amount.toString());
        setDate(entry.date);
        setNote(entry.note ?? '');
        setRecurring(entry.recurring ?? false);
        setRecurringType(entry.recurringType ?? 'weekly');
      }
    }
  }, [editId]);

  async function handleSave() {
    if (!worker.trim()) { showToast('Worker name is required', 'error'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { showToast('Enter a valid amount', 'error'); return; }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = {
      worker: worker.trim(),
      amount: amt,
      date,
      note: note.trim() || undefined,
      recurring,
      recurringType: recurring ? recurringType : undefined,
    };
    if (editId) {
      await editWage(editId, data);
      showToast('Wage updated');
    } else {
      await addWage(data);
      showToast('Wage added');
    }
    router.back();
  }

  const topPad = Platform.OS === 'web' ? insets.top + 67 : insets.top;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {editId ? 'Edit Wage' : 'Add Wage'}
        </Text>
        <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.wages }]} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {/* Amount */}
        <View style={[styles.amountSection, { backgroundColor: colors.wagesLight, borderColor: colors.wages + '30' }]}>
          <Text style={[styles.amtLabel, { color: colors.wages }]}>Amount Paid (JD)</Text>
          <View style={styles.amtRow}>
            <Text style={[styles.amtCurrency, { color: colors.wages }]}>JD</Text>
            <TextInput
              style={[styles.amtInput, { color: colors.wages }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.wages + '60'}
              autoFocus={!editId}
            />
          </View>
        </View>

        {/* Fields */}
        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.wagesLight }]}>
              <Feather name="user" size={16} color={colors.wages} />
            </View>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={worker}
              onChangeText={setWorker}
              placeholder="Worker name"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="calendar" size={16} color={colors.primary} />
            </View>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="message-square" size={16} color={colors.mutedForeground} />
            </View>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={note}
              onChangeText={setNote}
              placeholder="Note (e.g. week of June 1)"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
        </View>

        {/* Recurring */}
        <View style={[styles.recurSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.recurRow}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.wagesLight }]}>
              <Feather name="repeat" size={16} color={colors.wages} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.recurTitle, { color: colors.foreground }]}>Recurring Wage</Text>
              <Text style={[styles.recurSub, { color: colors.mutedForeground }]}>Auto-suggest on next payment date</Text>
            </View>
            <Switch
              value={recurring}
              onValueChange={v => { setRecurring(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              thumbColor={recurring ? colors.wages : '#f4f3f4'}
              trackColor={{ false: colors.muted, true: colors.wages + '70' }}
            />
          </View>

          {recurring && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.recurTypeRow}>
                {(['weekly', 'monthly'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setRecurringType(t)}
                    style={[
                      styles.recurTypeBtn,
                      {
                        backgroundColor: recurringType === t ? colors.wages : colors.secondary,
                        borderColor: recurringType === t ? colors.wages : colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={t === 'weekly' ? 'calendar' : 'refresh-cw'}
                      size={14}
                      color={recurringType === t ? '#fff' : colors.mutedForeground}
                    />
                    <Text style={[styles.recurTypeText, { color: recurringType === t ? '#fff' : colors.mutedForeground }]}>
                      {t === 'weekly' ? 'Every Week' : 'Every Month'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
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
  headerTitle: { flex: 1, fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  content: { padding: 16, gap: 14 },
  amountSection: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  amtLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5, textTransform: 'uppercase' },
  amtRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amtCurrency: { fontSize: 28, fontFamily: 'Inter_400Regular', opacity: 0.6 },
  amtInput: { fontSize: 48, fontFamily: 'Inter_700Bold', letterSpacing: -2, minWidth: 120, textAlign: 'center' },
  form: { borderRadius: 20, padding: 4, borderWidth: 1 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  fieldIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fieldInput: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', paddingVertical: 4 },
  divider: { height: 1, marginHorizontal: 12 },
  recurSection: { borderRadius: 20, padding: 16, borderWidth: 1, gap: 12 },
  recurRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recurTitle: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  recurSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  recurTypeRow: { flexDirection: 'row', gap: 10 },
  recurTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  recurTypeText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
