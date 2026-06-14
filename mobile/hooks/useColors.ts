import colorTokens from '@/constants/colors';
import { useSettings } from '@/context/SettingsContext';

export type ColorTokens = typeof colorTokens.light & { radius: number };

export function useColors(): ColorTokens {
  const { isDark } = useSettings();
  if (isDark) {
    return { ...colorTokens.dark, radius: colorTokens.radius };
  }
  return { ...colorTokens.light, radius: colorTokens.radius };
}
