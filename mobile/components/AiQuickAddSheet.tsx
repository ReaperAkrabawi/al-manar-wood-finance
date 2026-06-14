import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AiEntryPreview } from '@/components/AiEntryPreview';
import { useAuth } from '@/context/AuthContext';
import { useFinance } from '@/context/FinanceContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { getAiErrorToastKey, isWorkerConfigured, parseText, parseVoice } from '@/services/aiService';
import type { ParsedEntryDraft } from '@/types/ai';

type RecordPhase = 'idle' | 'starting' | 'recording' | 'stopping';

interface AiQuickAddSheetProps {
  visible: boolean;
  onClose: () => void;
}

function mimeFromUri(uri: string): string {
  if (uri.endsWith('.webm')) return 'audio/webm';
  if (uri.endsWith('.3gp')) return 'audio/3gpp';
  if (uri.endsWith('.caf')) return 'audio/x-caf';
  return 'audio/mp4';
}

export function AiQuickAddSheet({ visible, onClose }: AiQuickAddSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { workspaceId } = useWorkspace();
  const { language } = useSettings();
  const { addIncome, addPurchase, addWage, addWithdrawal } = useFinance();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const [text, setText] = useState('');
  const [transcript, setTranscript] = useState<string | null>(null);
  const [entries, setEntries] = useState<ParsedEntryDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [micBusy, setMicBusy] = useState(false);

  const phaseRef = useRef<RecordPhase>('idle');
  const pendingStopRef = useRef(false);

  const reset = useCallback(() => {
    setText('');
    setTranscript(null);
    setEntries([]);
    setLoading(false);
    setSaving(false);
    setRecording(false);
    phaseRef.current = 'idle';
    pendingStopRef.current = false;
  }, []);

  async function stopActiveRecording() {
    if (phaseRef.current === 'idle' || phaseRef.current === 'stopping') return;
    try {
      if (recorderState.isRecording || phaseRef.current === 'recording') {
        await audioRecorder.stop();
      }
    } catch {
      // already stopped
    }
    phaseRef.current = 'idle';
    pendingStopRef.current = false;
    setRecording(false);
    setMicBusy(false);
  }

  const handleClose = useCallback(() => {
    void stopActiveRecording();
    reset();
    onClose();
  }, [onClose, reset]);

  useEffect(() => {
    if (!visible) {
      void stopActiveRecording();
      reset();
    }
  }, [visible, reset]);

  async function ensureAudioMode() {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
    });
  }

  async function handleParse() {
    if (!user || !workspaceId) return;
    if (!isWorkerConfigured()) {
      showToast(t('ai.notConfigured'), 'error');
      return;
    }
    if (!text.trim()) return;

    setLoading(true);
    setTranscript(null);
    setEntries([]);
    try {
      const result = await parseText(user, workspaceId, text.trim(), language);

      if (result.entries.length === 0) {
        showToast(t('ai.noEntries'), 'error');
        return;
      }
      setTranscript(result.transcript ?? null);
      setEntries(result.entries);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('AI parse failed:', err);
      showToast(t(getAiErrorToastKey(err)), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function startRecording() {
    if (Platform.OS === 'web') {
      showToast(t('ai.voiceUnavailable'), 'error');
      return;
    }
    if (!isWorkerConfigured()) {
      showToast(t('ai.notConfigured'), 'error');
      return;
    }
    if (loading || phaseRef.current !== 'idle') return;

    phaseRef.current = 'starting';
    pendingStopRef.current = false;
    setMicBusy(true);

    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        showToast(t('ai.micDenied'), 'error');
        phaseRef.current = 'idle';
        setMicBusy(false);
        return;
      }

      await ensureAudioMode();
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      phaseRef.current = 'recording';
      setRecording(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (pendingStopRef.current) {
        await stopRecordingAndParse();
      }
    } catch (err) {
      console.error('Start recording failed:', err);
      showToast(t(getAiErrorToastKey(err)), 'error');
      await stopActiveRecording();
    } finally {
      if (phaseRef.current === 'starting') {
        phaseRef.current = 'idle';
        setRecording(false);
        setMicBusy(false);
      }
    }
  }

  async function stopRecordingAndParse() {
    if (phaseRef.current === 'starting') {
      pendingStopRef.current = true;
      return;
    }
    if (phaseRef.current !== 'recording') return;
    if (!user || !workspaceId) {
      await stopActiveRecording();
      return;
    }

    phaseRef.current = 'stopping';
    setRecording(false);
    setMicBusy(true);
    setLoading(true);

    try {
      const durationMs = recorderState.durationMillis;
      await audioRecorder.stop();

      const uri = audioRecorder.uri;
      if (!uri) throw new Error('No recording');
      if (durationMs < 400) {
        showToast(t('ai.noEntries'), 'error');
        await FileSystem.deleteAsync(uri, { idempotent: true });
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      await FileSystem.deleteAsync(uri, { idempotent: true });

      const result = await parseVoice(user, workspaceId, base64, mimeFromUri(uri), language);
      if (result.entries.length === 0) {
        showToast(t('ai.noEntries'), 'error');
        return;
      }
      setTranscript(result.transcript ?? null);
      setEntries(result.entries);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Voice parse failed:', err);
      showToast(t(getAiErrorToastKey(err)), 'error');
    } finally {
      phaseRef.current = 'idle';
      pendingStopRef.current = false;
      setLoading(false);
      setMicBusy(false);
    }
  }

  function changeAmount(index: number, value: string) {
    const amt = parseFloat(value);
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, amount: isNaN(amt) ? 0 : amt } : e));
  }

  async function handleConfirm() {
    const valid = entries.filter(e => e.amount > 0);
    if (valid.length === 0) {
      showToast(t('toasts.validAmount'), 'error');
      return;
    }
    setSaving(true);
    try {
      for (const entry of valid) {
        const date = entry.date ?? new Date().toISOString().split('T')[0]!;
        if (entry.type === 'income') {
          await addIncome({ desc: entry.desc ?? 'Income', amount: entry.amount, date, note: entry.note });
        } else if (entry.type === 'purchase') {
          await addPurchase({
            name: entry.name ?? 'Purchase',
            amount: entry.amount,
            category: entry.category ?? 'Other',
            supplier: entry.supplier,
            date,
            note: entry.note,
          });
        } else if (entry.type === 'wage') {
          await addWage({ worker: entry.worker ?? 'Worker', amount: entry.amount, date, note: entry.note });
        } else {
          await addWithdrawal({ desc: entry.desc ?? 'Withdrawal', amount: entry.amount, date, note: entry.note });
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('ai.saved', { count: valid.length }));
      handleClose();
    } catch {
      showToast(t('toasts.syncError'), 'error');
    } finally {
      setSaving(false);
    }
  }

  const micDisabled = micBusy || loading;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>{t('ai.quickAdd')}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              value={text}
              onChangeText={setText}
              placeholder={t('ai.placeholder')}
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.actions}>
              {Platform.OS !== 'web' && (
                <Pressable
                  onPressIn={() => { void startRecording(); }}
                  onPressOut={() => { void stopRecordingAndParse(); }}
                  disabled={micDisabled}
                  style={({ pressed }) => [
                    styles.micBtn,
                    {
                      backgroundColor: recording ? colors.destructive : colors.incomeLight,
                      borderColor: recording ? colors.destructive : colors.income + '40',
                      opacity: micDisabled && !recording ? 0.6 : pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Feather name="mic" size={22} color={recording ? '#fff' : colors.income} />
                  <Text style={[styles.micText, { color: recording ? '#fff' : colors.income }]}>
                    {recording ? t('ai.listening') : t('ai.holdToSpeak')}
                  </Text>
                </Pressable>
              )}

              <TouchableOpacity
                onPress={() => handleParse()}
                disabled={loading || !text.trim()}
                style={[styles.parseBtn, { backgroundColor: colors.primary, opacity: loading || !text.trim() ? 0.6 : 1 }]}
              >
                {loading && !recording ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="zap" size={18} color="#fff" />
                    <Text style={styles.parseText}>{t('ai.parse')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {transcript ? (
              <Text style={[styles.transcript, { color: colors.mutedForeground }]}>
                {t('ai.heard')}: {transcript}
              </Text>
            ) : null}

            <AiEntryPreview
              entries={entries}
              onChangeAmount={changeAmount}
              onRemove={i => setEntries(prev => prev.filter((_, idx) => idx !== i))}
            />

            {entries.length > 0 && (
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={saving}
                style={[styles.confirmBtn, { backgroundColor: colors.income, opacity: saving ? 0.7 : 1 }]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>{t('ai.confirm', { count: entries.length })}</Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    maxHeight: '88%',
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
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    marginBottom: 12,
  },
  actions: { gap: 10, marginBottom: 12 },
  micBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  micText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  parseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  parseText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  transcript: { fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 10, fontStyle: 'italic' },
  confirmBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
