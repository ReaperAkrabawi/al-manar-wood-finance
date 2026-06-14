import React from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSettings } from '@/context/SettingsContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber, getLocale } from '@/utils/format';
import { resolvePhotoUri } from '@/utils/photoUri';

interface EntryCardProps {
  type: 'income' | 'purchase' | 'wage' | 'withdrawal';
  title: string;
  subtitle?: string;
  amount: number;
  date: string;
  photo?: string;
  badge?: string;
  isRecurring?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onPhotoPress?: () => void;
}

export function EntryCard({
  type, title, subtitle, amount, date, photo, badge, isRecurring,
  onEdit, onDelete, onDuplicate, onPhotoPress,
}: EntryCardProps) {
  const colors = useColors();
  const { language } = useSettings();
  const { t } = useTranslation();

  const typeColor = type === 'income' ? colors.income : type === 'purchase' ? colors.purchases : type === 'wage' ? colors.wages : colors.withdrawals;
  const amountSign = type === 'income' ? '+' : '-';

  const formattedDate = new Date(date).toLocaleDateString(getLocale(language), { month: 'short', day: 'numeric', year: 'numeric' });
  const formattedAmount = formatNumber(amount, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function handleDelete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t('delete.title'), t('delete.message'), [
      { text: t('delete.cancel'), style: 'cancel' },
      { text: t('delete.confirm'), style: 'destructive', onPress: onDelete },
    ]);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        {photo ? (
          <TouchableOpacity onPress={onPhotoPress} activeOpacity={0.8}>
            <Image source={{ uri: resolvePhotoUri(photo)! }} style={styles.thumb} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.iconWrap, {
            backgroundColor: type === 'income' ? colors.incomeLight : type === 'purchase' ? colors.purchasesLight : type === 'wage' ? colors.wagesLight : colors.withdrawalsLight,
          }]}>
            <Feather
              name={type === 'income' ? 'trending-up' : type === 'purchase' ? 'shopping-bag' : type === 'wage' ? 'users' : 'arrow-down-circle'}
              size={18}
              color={typeColor}
            />
          </View>
        )}

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
            {isRecurring && (
              <View style={[styles.recurBadge, { backgroundColor: colors.wagesLight }]}>
                <Feather name="repeat" size={10} color={colors.wages} />
              </View>
            )}
          </View>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]} numberOfLines={1}>{subtitle}</Text>
          ) : null}
          <View style={styles.metaRow}>
            <Text style={[styles.date, { color: colors.mutedForeground }]}>{formattedDate}</Text>
            {badge ? (
              <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{badge}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.right}>
          <Text style={[styles.amount, { color: type === 'income' ? colors.positive : colors.negative }]}>
            {amountSign}JD {formattedAmount}
          </Text>
          <View style={styles.actions}>
            {onDuplicate ? (
              <TouchableOpacity onPress={onDuplicate} style={[styles.actionBtn, { backgroundColor: colors.secondary }]} hitSlop={8}>
                <Feather name="copy" size={13} color={colors.mutedForeground} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={onEdit} style={[styles.actionBtn, { backgroundColor: colors.secondary }]} hitSlop={8}>
              <Feather name="edit-2" size={13} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={[styles.actionBtn, { backgroundColor: colors.secondary }]} hitSlop={8}>
              <Feather name="trash-2" size={13} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  recurBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  right: {
    alignItems: 'flex-end',
    gap: 8,
  },
  amount: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
