import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFinance } from '@/context/FinanceContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';

export default function AddWithdrawalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { withdrawals, addWithdrawal, editWithdrawal } = useFinance();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id;

  const today = new Date().toISOString().split('T')[0]!;
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (editId) {
      const entry = withdrawals.find(w => w.id === editId);
      if (entry) {
        setDesc(entry.desc);
        setAmount(entry.amount.toString());
        setDate(entry.date);
        setNote(entry.note ?? '');
      }
    }
  }, [editId]);

  async function handleSave() {
    if (!desc.trim()) { showToast('Description is required', 'error'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { showToast('Enter a valid amount', 'error'); return; }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editId) {
      await editWithdrawal(editId, { desc: desc.trim(), amount: amt, date, note: note.trim() || undefined });
      showToast('Withdrawal updated');
    } else {
      await addWithdrawal({ desc: desc.trim(), amount: amt, date, note: note.trim() || undefined });
      showToast('Withdrawal added');
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
          {editId ? 'Edit Withdrawal' : 'Add Withdrawal'}
        </Text>
        <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.withdrawals }]} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {/* Amount */}
        <View style={[styles.amountSection, { backgroundColor: colors.withdrawalsLight, borderColor: colors.withdrawals + '30' }]}>
          <Text style={[styles.amtLabel, { color: colors.withdrawals }]}>Amount Withdrawn (JD)</Text>
          <View style={styles.amtRow}>
            <Text style={[styles.amtCurrency, { color: colors.withdrawals }]}>JD</Text>
            <TextInput
              style={[styles.amtInput, { color: colors.withdrawals }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.withdrawals + '60'}
              autoFocus={!editId}
            />
          </View>
        </View>

        {/* Info banner */}
        <View style={[styles.infoBanner, { backgroundColor: colors.withdrawalsLight, borderColor: colors.withdrawals + '30' }]}>
          <Feather name="info" size={15} color={colors.withdrawals} />
          <Text style={[styles.infoText, { color: colors.withdrawals }]}>
            Withdrawals are deducted from the net balance. Use this for owner draws, personal use, or cash taken out.
          </Text>
        </View>

        {/* Fields */}
        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.withdrawalsLight }]}>
              <Feather name="file-text" size={16} color={colors.withdrawals} />
            </View>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={desc}
              onChangeText={setDesc}
              placeholder="Reason (e.g. Owner draw, Personal use)"
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
              returnKeyType="next"
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
              placeholder="Note (optional)"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  form: { borderRadius: 20, padding: 4, borderWidth: 1 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  fieldIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fieldInput: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular', paddingVertical: 4 },
  divider: { height: 1, marginHorizontal: 12 },
});
