import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useToast } from '@/context/ToastContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';

export default function JoinWorkspaceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { createWorkspace, joinWorkspace } = useWorkspace();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      await createWorkspace(workspaceName.trim() || t('workspace.defaultName'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('workspace.created'));
      router.replace('/');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('workspace.createFailed'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (inviteCode.trim().length < 6) {
      showToast(t('workspace.invalidCode'), 'error');
      return;
    }
    setLoading(true);
    try {
      await joinWorkspace(inviteCode.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('workspace.joined'));
      router.replace('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('workspace.joinFailed');
      showToast(msg === 'Already a member' ? t('workspace.alreadyMember') : msg, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/(auth)/login' as Href);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.logoWrap, { backgroundColor: colors.incomeLight }]}>
            <Feather name="users" size={28} color={colors.income} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('workspace.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{t('workspace.subtitle')}</Text>
        </View>

        {mode === 'choose' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setMode('create')}
            >
              <Feather name="plus-circle" size={24} color={colors.income} />
              <View style={styles.actionText}>
                <Text style={[styles.actionTitle, { color: colors.foreground }]}>{t('workspace.createNew')}</Text>
                <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>{t('workspace.createNewSub')}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setMode('join')}
            >
              <Feather name="link" size={24} color={colors.income} />
              <View style={styles.actionText}>
                <Text style={[styles.actionTitle, { color: colors.foreground }]}>{t('workspace.joinExisting')}</Text>
                <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>{t('workspace.joinExistingSub')}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        {mode === 'create' && (
          <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('workspace.nameLabel')}</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              value={workspaceName}
              onChangeText={setWorkspaceName}
              placeholder={t('workspace.namePlaceholder')}
              placeholderTextColor={colors.mutedForeground}
            />
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.income, opacity: loading ? 0.7 : 1 }]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('workspace.create')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('choose')}>
              <Text style={[styles.backLink, { color: colors.mutedForeground }]}>{t('workspace.back')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'join' && (
          <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{t('workspace.inviteCode')}</Text>
            <TextInput
              style={[styles.input, styles.codeInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.secondary }]}
              value={inviteCode}
              onChangeText={v => setInviteCode(v.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.income, opacity: loading ? 0.7 : 1 }]}
              onPress={handleJoin}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('workspace.join')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode('choose')}>
              <Text style={[styles.backLink, { color: colors.mutedForeground }]}>{t('workspace.back')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={handleSignOut} style={styles.signOut}>
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>{t('auth.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionText: {
    flex: 1,
    gap: 3,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  actionSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  form: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  codeInput: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 4,
    textAlign: 'center',
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  backLink: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    padding: 12,
  },
  signOutText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});
