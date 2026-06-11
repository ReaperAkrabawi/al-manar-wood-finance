import React, { useEffect, useState } from 'react';
import {
  Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFinance } from '@/context/FinanceContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';
import type { PurchaseCategory } from '@/types';
import { PURCHASE_CATEGORIES } from '@/types';

type AmountMode = 'unit' | 'total';

export default function AddPurchaseScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { purchases, addPurchase, editPurchase } = useFinance();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = params.id;

  const today = new Date().toISOString().split('T')[0]!;
  const [name, setName] = useState('');
  const [amountMode, setAmountMode] = useState<AmountMode>('total');
  const [totalAmount, setTotalAmount] = useState('');
  const [qty, setQty] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [category, setCategory] = useState<PurchaseCategory>('Wood');
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();

  const computedTotal = amountMode === 'unit'
    ? (parseFloat(qty) || 0) * (parseFloat(unitPrice) || 0)
    : parseFloat(totalAmount) || 0;

  useEffect(() => {
    if (editId) {
      const entry = purchases.find(p => p.id === editId);
      if (entry) {
        setName(entry.name);
        setTotalAmount(entry.amount.toString());
        if (entry.qty) { setQty(entry.qty.toString()); setAmountMode('unit'); }
        if (entry.unitPrice) setUnitPrice(entry.unitPrice.toString());
        setCategory(entry.category);
        setSupplier(entry.supplier ?? '');
        setDate(entry.date);
        setNote(entry.note ?? '');
        setPhoto(entry.photo);
      }
    }
  }, [editId]);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) setPhoto(result.assets[0].base64);
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { showToast('Camera permission denied', 'error'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0]?.base64) setPhoto(result.assets[0].base64);
  }

  async function handleSave() {
    if (!name.trim()) { showToast('Item name is required', 'error'); return; }
    const amt = computedTotal;
    if (amt <= 0) { showToast('Enter a valid amount', 'error'); return; }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = {
      name: name.trim(),
      amount: amt,
      qty: amountMode === 'unit' ? (parseFloat(qty) || undefined) : undefined,
      unitPrice: amountMode === 'unit' ? (parseFloat(unitPrice) || undefined) : undefined,
      category,
      supplier: supplier.trim() || undefined,
      date,
      note: note.trim() || undefined,
      photo,
    };
    if (editId) {
      await editPurchase(editId, data);
      showToast('Purchase updated');
    } else {
      await addPurchase(data);
      showToast('Purchase added');
    }
    router.back();
  }

  const topPad = Platform.OS === 'web' ? insets.top + 67 : insets.top;
  const fmtTotal = computedTotal > 0 ? computedTotal.toFixed(2) : '';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {editId ? 'Edit Purchase' : 'Add Purchase'}
        </Text>
        <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.purchases }]} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        {/* Amount */}
        <View style={[styles.amountSection, { backgroundColor: colors.purchasesLight, borderColor: colors.purchases + '30' }]}>
          <View style={styles.modeToggle}>
            {(['total', 'unit'] as AmountMode[]).map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => setAmountMode(m)}
                style={[styles.modeBtn, { backgroundColor: amountMode === m ? colors.purchases : 'transparent' }]}
              >
                <Text style={[styles.modeBtnText, { color: amountMode === m ? '#fff' : colors.purchases }]}>
                  {m === 'total' ? 'Total Amount' : 'Qty × Price'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {amountMode === 'total' ? (
            <View style={styles.amtRow}>
              <Text style={[styles.amtCurrency, { color: colors.purchases }]}>JD</Text>
              <TextInput
                style={[styles.amtInput, { color: colors.purchases }]}
                value={totalAmount}
                onChangeText={setTotalAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.purchases + '60'}
                autoFocus={!editId}
              />
            </View>
          ) : (
            <View style={styles.unitRow}>
              <TextInput
                style={[styles.unitInput, { color: colors.purchases, borderColor: colors.purchases + '40', backgroundColor: colors.purchasesLight }]}
                value={qty}
                onChangeText={setQty}
                keyboardType="decimal-pad"
                placeholder="Qty"
                placeholderTextColor={colors.purchases + '60'}
              />
              <Text style={[styles.times, { color: colors.purchases }]}>×</Text>
              <TextInput
                style={[styles.unitInput, { color: colors.purchases, borderColor: colors.purchases + '40', backgroundColor: colors.purchasesLight }]}
                value={unitPrice}
                onChangeText={setUnitPrice}
                keyboardType="decimal-pad"
                placeholder="Price"
                placeholderTextColor={colors.purchases + '60'}
              />
              {fmtTotal ? (
                <Text style={[styles.totalCalc, { color: colors.purchases }]}>= JD {fmtTotal}</Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Name & Details */}
        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.purchasesLight }]}>
              <Feather name="package" size={16} color={colors.purchases} />
            </View>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={name}
              onChangeText={setName}
              placeholder="Item name (e.g. Pine wood 2m)"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.fieldRow}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="truck" size={16} color={colors.primary} />
            </View>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={supplier}
              onChangeText={setSupplier}
              placeholder="Supplier (optional)"
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
              placeholder="Note (optional)"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
        </View>

        {/* Category */}
        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border, gap: 10, padding: 14 }]}>
          <Text style={[styles.catTitle, { color: colors.foreground }]}>Category</Text>
          <View style={styles.catGrid}>
            {PURCHASE_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: category === cat ? colors.purchases : colors.secondary,
                    borderColor: category === cat ? colors.purchases : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.catChipText, { color: category === cat ? '#fff' : colors.mutedForeground }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Photo */}
        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border, gap: 12, padding: 16 }]}>
          <Text style={[styles.catTitle, { color: colors.foreground }]}>Receipt / Photo</Text>
          {photo ? (
            <View style={styles.photoPreviewWrap}>
              <Image source={{ uri: `data:image/jpeg;base64,${photo}` }} style={styles.photoPreview} />
              <TouchableOpacity onPress={() => setPhoto(undefined)} style={[styles.removePhoto, { backgroundColor: colors.destructive }]}>
                <Feather name="x" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <TouchableOpacity onPress={takePhoto} style={[styles.photoBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]} activeOpacity={0.7}>
                <Feather name="camera" size={18} color={colors.primary} />
                <Text style={[styles.photoBtnText, { color: colors.foreground }]}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickPhoto} style={[styles.photoBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]} activeOpacity={0.7}>
                <Feather name="image" size={18} color={colors.primary} />
                <Text style={[styles.photoBtnText, { color: colors.foreground }]}>Gallery</Text>
              </TouchableOpacity>
            </View>
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  content: { padding: 16, gap: 14 },
  amountSection: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 14,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modeBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  amtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amtCurrency: {
    fontSize: 28,
    fontFamily: 'Inter_400Regular',
    opacity: 0.6,
  },
  amtInput: {
    fontSize: 48,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -2,
    minWidth: 120,
    textAlign: 'center',
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  unitInput: {
    height: 48,
    width: 90,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  times: {
    fontSize: 22,
    fontFamily: 'Inter_400Regular',
  },
  totalCalc: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  form: {
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 4,
  },
  divider: { height: 1, marginHorizontal: 12 },
  catTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
  },
  photoBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  photoPreviewWrap: { position: 'relative', alignSelf: 'center' },
  photoPreview: { width: 200, height: 160, borderRadius: 12 },
  removePhoto: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
