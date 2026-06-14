import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { useColors } from '@/hooks/useColors';
import { useTranslation } from '@/hooks/useTranslation';

export default function TabLayout() {
  const colors = useColors();
  const { isDark } = useSettings();
  const { t } = useTranslation();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : undefined,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Inter_500Medium',
          marginBottom: isWeb ? 10 : 0,
        },
        tabBarIconStyle: {
          marginTop: isWeb ? 10 : 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="entries"
        options={{
          title: t('tabs.entries'),
          tabBarIcon: ({ color }) => <Feather name="list" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('tabs.stats'),
          tabBarIcon: ({ color }) => <Feather name="bar-chart-2" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color }) => <Feather name="settings" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
