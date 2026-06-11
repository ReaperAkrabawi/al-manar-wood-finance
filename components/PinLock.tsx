import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

interface PinLockProps {
  correctPin: string;
  onUnlock: () => void;
}

const DIGITS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

export function PinLock({ correctPin, onUnlock }: PinLockProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [entered, setEntered] = useState('');
  const [shake, setShake] = useState(false);
  const [error, setError] = useState(false);

  function handleDigit(d: string) {
    if (d === 'del') {
      setEntered(prev => prev.slice(0, -1));
      return;
    }
    if (entered.length >= 4) return;
    const next = entered + d;
    setEntered(next);
    if (next.length === 4) {
      if (next === correctPin) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onUnlock();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(true);
        setTimeout(() => {
          setEntered('');
          setError(false);
        }, 700);
      }
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  const topPad = Platform.OS === 'web' ? insets.top + 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad, paddingBottom: insets.bottom + 34 }]}>
      <View style={styles.header}>
        <View style={[styles.logoWrap, { backgroundColor: colors.secondary }]}>
          <Feather name="lock" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Al Manar Finance</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Enter your PIN to continue</Text>
      </View>

      <View style={styles.dots}>
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < entered.length
                  ? (error ? colors.destructive : colors.primary)
                  : colors.muted,
                borderColor: i < entered.length
                  ? (error ? colors.destructive : colors.primary)
                  : colors.border,
              },
            ]}
          />
        ))}
      </View>

      {error && (
        <Text style={[styles.errorText, { color: colors.destructive }]}>Incorrect PIN</Text>
      )}

      <View style={styles.pad}>
        {DIGITS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((d, di) => (
              d === '' ? (
                <View key={di} style={styles.emptyKey} />
              ) : (
                <TouchableOpacity
                  key={di}
                  onPress={() => handleDigit(d)}
                  style={[styles.key, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.6}
                >
                  {d === 'del' ? (
                    <Feather name="delete" size={22} color={colors.foreground} />
                  ) : (
                    <Text style={[styles.keyText, { color: colors.foreground }]}>{d}</Text>
                  )}
                </TouchableOpacity>
              )
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 10,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  dots: {
    flexDirection: 'row',
    gap: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginTop: -16,
  },
  pad: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  key: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  emptyKey: {
    width: 80,
    height: 80,
  },
  keyText: {
    fontSize: 28,
    fontFamily: 'Inter_400Regular',
  },
});
