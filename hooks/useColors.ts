import { useColorScheme } from 'react-native';
import colorTokens from '@/constants/colors';

export type ColorTokens = typeof colorTokens.light & { radius: number };

export function useColors(): ColorTokens {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  if (isDark) {
    return { ...colorTokens.dark, radius: colorTokens.radius };
  }
  return { ...colorTokens.light, radius: colorTokens.radius };
}
