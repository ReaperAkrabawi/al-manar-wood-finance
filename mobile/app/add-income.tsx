import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFinance } from '@/context/FinanceContext';
import { useTemplates } from '@/context/TemplatesContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { parseTemplateParam } from '@/utils/addFormPrefill';
import { todayIso } from '@/utils/entryHelpers';
import { resolvePhotoUri } from '@/utils/photoUri';

export default function AddIncomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { income, addIncome, editIncome } = useFinance();
  const { addTemplate } = useTemplates();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string; duplicateFrom?: string; template?: string }>();
  const editId = params.id;
  const templateData = useMemo(() => parseTemplateParam(params.template), [params.template]);
  const isNewEntry = !editId;

  const today = todayIso();
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();

  useEffect(() => {
    if (editId) {
      const entry = income.find(i => i.id === editId);
      if (entry) {
        setDesc(entry.desc);
        setAmount(entry.amount.toString());
        setDate(entry.date);
        setNote(entry.note ?? '');
        setPhoto(entry.photo);
      }
      return;
    }
    if (params.duplicateFrom) {
      const entry = income.find(i => i.id === params.duplicateFrom);
      if (entry) {
        setDesc(entry.desc);
        setAmount(entry.amount.toString());
        setDate(today);
        setNote(entry.note ?? '');
        setPhoto(undefined);
      }
      return;
    }
    if (templateData) {
      setDesc(templateData.payload.desc ?? '');
      if (templateData.defaultAmount) setAmount(templateData.defaultAmount.toString());
      setNote(templateData.payload.note ?? '');
    }
  }, [editId, params.duplicateFrom, templateData, income, today]);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setPhoto(result.assets[0].base64);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { showToast(t('toasts.cameraDenied'), 'error'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setPhoto(result.assets[0].base64);
    }
  }

  async function handleSaveAsTemplate() {
    if (!desc.trim()) {
      showToast(t('toasts.descriptionRequired'), 'error');
      return;
    }
    const save = async (label: string) => {
      await addTemplate({
        type: 'income',
        label: label.trim(),
        payload: { desc: desc.trim(), note: note.trim() || undefined },
        defaultAmount: parseFloat(amount) || undefined,
      });
      showToast(t('templates.saved'));
    };
    if (Platform.OS === 'android') {
      await save(desc.trim());
      return;
    }
    Alert.prompt(
      t('templates.saveAsTemplate'),
      t('templates.label'),
      async (label) => {
        if (!label?.trim()) return;
        await save(label);
      },
      'plain-text',
      desc.trim(),
    );
  }

  async function handleSave() {
    if (!desc.trim()) { showToast(t('toasts.descriptionRequired'), 'error'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { showToast(t('toasts.validAmount'), 'error'); return; }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (editId) {
        await editIncome(editId, { desc: desc.trim(), amount: amt, date, note: note.trim() || undefined, photo });
        showToast(t('toasts.incomeUpdated'));
      } else {
        await addIncome({ desc: desc.trim(), amount: amt, date, note: note.trim() || undefined, photo });
        showToast(t('toasts.incomeAdded'));
      }
      router.back();
    } catch {
      // Error toast shown by FinanceContext
    }
  }

  const topPad = Platform.OS === 'web' ? insets.top + 67 : insets.top;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {editId ? t('forms.editIncome') : t('forms.addIncome')}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          onLongPress={isNewEntry ? handleSaveAsTemplate : undefined}
          style={[styles.saveBtn, { backgroundColor: colors.income }]}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>{t('common.save')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.amountSection, { backgroundColor: colors.incomeLight, borderColor: colors.income + '30' }]}>
          <Text style={[styles.amtLabel, { color: colors.income }]}>{t('forms.amountJd')}</Text>
          <View style={styles.amtRow}>
            <Text style={[styles.amtCurrency, { color: colors.income }]}>JD</Text>
            <TextInput
              style={[styles.amtInput, { color: colors.income }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder={t('common.amountPlaceholder')}
              placeholderTextColor={colors.income + '60'}
              autoFocus={isNewEntry}
            />
          </View>
        </View>

        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FieldRow icon="file-text" label="Description" iconBg={colors.incomeLight} iconColor={colors.income}>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={desc}
              onChangeText={setDesc}
              placeholder={t('forms.customerDesc')}
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
            />
          </FieldRow>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <FieldRow icon="calendar" label="Date" iconBg={colors.secondary} iconColor={colors.primary}>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={date}
              onChangeText={setDate}
              placeholder={t('common.datePlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
            />
          </FieldRow>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <FieldRow icon="message-square" label="Note" iconBg={colors.secondary} iconColor={colors.mutedForeground}>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={note}
              onChangeText={setNote}
              placeholder={t('common.optionalNote')}
              placeholderTextColor={colors.mutedForeground}
            />
          </FieldRow>
        </View>

        {/* Photo */}
        <View style={[styles.photoSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.photoLabel, { color: colors.foreground }]}>{t('common.photo')}</Text>
          {photo ? (
            <View style={styles.photoPreviewWrap}>
              <Image source={{ uri: resolvePhotoUri(photo)! }} style={styles.photoPreview} />
              <TouchableOpacity
                onPress={() => setPhoto(undefined)}
                style={[styles.removePhoto, { backgroundColor: colors.destructive }]}
              >
                <Feather name="x" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <TouchableOpacity
                onPress={takePhoto}
                style={[styles.photoBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Feather name="camera" size={18} color={colors.primary} />
                <Text style={[styles.photoBtnText, { color: colors.foreground }]}>{t('common.camera')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={pickPhoto}
                style={[styles.photoBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Feather name="image" size={18} color={colors.primary} />
                <Text style={[styles.photoBtnText, { color: colors.foreground }]}>{t('common.gallery')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FieldRow({ icon, label, iconBg, iconColor, children }: any) {
  return (
    <View style={styles.fieldRow}>
      <View style={[styles.fieldIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </View>
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
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  amtLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 4,
  },
  divider: { height: 1, marginHorizontal: 12 },
  photoSection: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  photoLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
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
